import path from "node:path";
import Stripe from "stripe";
import { parseEnvFile, rootDir } from "./env-loader.mjs";
import { operatorToolkitProduct, operatorUpdatesProduct } from "../src/data/operatorToolkit.js";

const apply = process.argv.includes("--apply");
const envFlagIndex = process.argv.indexOf("--env");
const envPath = path.resolve(
  envFlagIndex >= 0 && process.argv[envFlagIndex + 1]
    ? process.argv[envFlagIndex + 1]
    : path.join(rootDir, ".secrets", "backbone-live-stripe.env"),
);
const env = { ...process.env, ...parseEnvFile(envPath) };
const stripeSecretKey = env.STRIPE_SECRET_KEY;
const siteUrl = (env.SITE_URL || "https://aiwithmurda.com").replace(/\/+$/, "");
if (!stripeSecretKey) throw new Error(`Missing STRIPE_SECRET_KEY in ${envPath}`);

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });

async function findProduct(productKey) {
  for await (const product of stripe.products.list({ limit: 100 })) {
    if (product.metadata?.product_key === productKey) return product;
  }
  return null;
}

async function ensureProduct({ productConfig, description }) {
  let product = await findProduct(productConfig.key);
  if (!product && apply) {
    product = await stripe.products.create({
      name: productConfig.name,
      description,
      active: true,
      metadata: { brand: "aiwithmurda", product_key: productConfig.key },
    });
  } else if (
    product &&
    apply &&
    (product.name !== productConfig.name || product.description !== description || !product.active)
  ) {
    product = await stripe.products.update(product.id, {
      name: productConfig.name,
      description,
      active: true,
    });
  }
  return product;
}

async function ensurePrice({ product, amount, recurring = false, productKey }) {
  if (!product) return null;
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find(
    (candidate) =>
      candidate.currency === "usd" &&
      candidate.unit_amount === amount &&
      (recurring
        ? candidate.type === "recurring" && candidate.recurring?.interval === "month"
        : candidate.type === "one_time"),
  );
  if (!price && apply) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: amount,
      ...(recurring ? { recurring: { interval: "month" } } : {}),
      metadata: { brand: "aiwithmurda", product_key: productKey },
    });
  }
  return price;
}

const toolkitProduct = await ensureProduct({
  productConfig: operatorToolkitProduct,
  description: "Permanent launch-edition Claude Code + Codex setup, 24-skill pack, command center, and system playbooks.",
});
const updateProduct = await ensureProduct({
  productConfig: operatorUpdatesProduct,
  description: operatorUpdatesProduct.subtitle,
});
const toolkitPrice = await ensurePrice({
  product: toolkitProduct,
  amount: operatorToolkitProduct.priceCents,
  productKey: operatorToolkitProduct.key,
});
const updatePrice = await ensurePrice({
  product: updateProduct,
  amount: operatorUpdatesProduct.priceCents,
  recurring: true,
  productKey: operatorUpdatesProduct.key,
});

const portalHeadline = "Manage your AI with Murda Operator System Updates";
const portalConfigurations = await stripe.billingPortal.configurations.list({ limit: 100 });
let portalConfiguration = portalConfigurations.data.find(
  (configuration) => configuration.business_profile?.headline === portalHeadline,
);
if (!portalConfiguration && apply) {
  portalConfiguration = await stripe.billingPortal.configurations.create({
    default_return_url: `${siteUrl}/members?product=operator-toolkit`,
    business_profile: { headline: portalHeadline },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "switched_service", "unused", "too_complex", "other"],
        },
      },
    },
  });
}

const requiredWebhookEvents = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];
const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
let webhookEndpoint = webhookEndpoints.data.find((endpoint) => endpoint.url === `${siteUrl}/api/stripe/webhook`) || null;
if (webhookEndpoint && apply && !webhookEndpoint.enabled_events.includes("*")) {
  const enabledEvents = [...new Set([...webhookEndpoint.enabled_events, ...requiredWebhookEvents])].sort();
  webhookEndpoint = await stripe.webhookEndpoints.update(webhookEndpoint.id, { enabled_events: enabledEvents });
}

const account = await stripe.accounts.retrieve();
const result = {
  ok: Boolean(toolkitProduct && toolkitPrice && updateProduct && updatePrice && portalConfiguration),
  mode: apply ? "apply" : "inspect",
  account: {
    id: account.id,
    name: account.business_profile?.name || account.settings?.dashboard?.display_name || null,
  },
  keyMode: stripeSecretKey.startsWith("sk_live_") ? "live" : "test",
  toolkit: toolkitProduct && toolkitPrice
    ? { productId: toolkitProduct.id, priceId: toolkitPrice.id, amount: toolkitPrice.unit_amount, livemode: toolkitPrice.livemode }
    : null,
  updates: updateProduct && updatePrice
    ? {
        productId: updateProduct.id,
        priceId: updatePrice.id,
        amount: updatePrice.unit_amount,
        interval: updatePrice.recurring?.interval || null,
        livemode: updatePrice.livemode,
      }
    : null,
  portal: portalConfiguration
    ? { id: portalConfiguration.id, active: portalConfiguration.active, cancellationMode: portalConfiguration.features?.subscription_cancel?.mode }
    : null,
  webhook: webhookEndpoint
    ? { id: webhookEndpoint.id, url: webhookEndpoint.url, enabledEvents: webhookEndpoint.enabled_events }
    : null,
  initialCheckoutTotal: operatorToolkitProduct.initialTotalCents,
  nextAction:
    toolkitPrice && updatePrice && portalConfiguration
      ? "Set the two price IDs and portal configuration ID on Render."
      : "Run again with --apply.",
};

console.log(JSON.stringify(result, null, 2));
