import path from "node:path";
import Stripe from "stripe";
import { parseEnvFile, rootDir } from "./env-loader.mjs";
import { operatorArsenalProduct } from "../src/data/operatorArsenal.js";
import { operatorUpdatesProduct } from "../src/data/operatorToolkit.js";

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

const arsenalProduct = await ensureProduct({
  productConfig: operatorArsenalProduct,
  description:
    "Permanent shelf library (all standalone zips) plus full Operator Toolkit launch edition and system playbooks.",
});
const updateProduct = await ensureProduct({
  productConfig: operatorUpdatesProduct,
  description: operatorUpdatesProduct.subtitle,
});
const arsenalPrice = await ensurePrice({
  product: arsenalProduct,
  amount: operatorArsenalProduct.priceCents,
  productKey: operatorArsenalProduct.key,
});
const updatePrice = await ensurePrice({
  product: updateProduct,
  amount: operatorUpdatesProduct.priceCents,
  recurring: true,
  productKey: operatorUpdatesProduct.key,
});

const account = await stripe.accounts.retrieve();
const result = {
  ok: Boolean(arsenalProduct && arsenalPrice && updateProduct && updatePrice),
  mode: apply ? "apply" : "inspect",
  account: {
    id: account.id,
    name: account.business_profile?.name || account.settings?.dashboard?.display_name || null,
  },
  keyMode: stripeSecretKey.startsWith("sk_live_") ? "live" : "test",
  arsenal: arsenalProduct && arsenalPrice
    ? {
        productId: arsenalProduct.id,
        priceId: arsenalPrice.id,
        amount: arsenalPrice.unit_amount,
        livemode: arsenalPrice.livemode,
      }
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
  initialCheckoutTotal: operatorArsenalProduct.initialTotalCents,
  envVars: {
    STRIPE_OPERATOR_ARSENAL_PRICE_ID: arsenalPrice?.id || null,
    STRIPE_OPERATOR_UPDATES_PRICE_ID: updatePrice?.id || null,
  },
  nextAction:
    arsenalPrice && updatePrice
      ? "Set STRIPE_OPERATOR_ARSENAL_PRICE_ID and STRIPE_OPERATOR_UPDATES_PRICE_ID on Render."
      : "Run again with --apply.",
};

console.log(JSON.stringify(result, null, 2));
