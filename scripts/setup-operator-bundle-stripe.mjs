import path from "node:path";
import Stripe from "stripe";
import { parseEnvFile, rootDir } from "./env-loader.mjs";
import { operatorBundleProduct } from "../src/data/operatorBundle.js";

const apply = process.argv.includes("--apply");
const envFlagIndex = process.argv.indexOf("--env");
const envPath = path.resolve(
  envFlagIndex >= 0 && process.argv[envFlagIndex + 1]
    ? process.argv[envFlagIndex + 1]
    : path.join(rootDir, ".secrets", "backbone-live-stripe.env"),
);
const env = { ...process.env, ...parseEnvFile(envPath) };
const stripeSecretKey = env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) throw new Error(`Missing STRIPE_SECRET_KEY in ${envPath}`);

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
const metadata = {
  brand: "aiwithmurda",
  product_key: operatorBundleProduct.key,
};

let product = null;
for await (const candidate of stripe.products.list({ limit: 100 })) {
  if (candidate.metadata?.product_key === operatorBundleProduct.key) {
    product = candidate;
    break;
  }
}

if (!product && apply) {
  product = await stripe.products.create({
    name: operatorBundleProduct.name,
    description: operatorBundleProduct.promise,
    active: true,
    metadata,
  });
}

let price = null;
if (product) {
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  price = prices.data.find(
    (candidate) =>
      candidate.type === "one_time" &&
      candidate.currency === "usd" &&
      candidate.unit_amount === operatorBundleProduct.priceCents,
  );
}

if (product && !price && apply) {
  price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: operatorBundleProduct.priceCents,
    metadata,
  });
}

const account = await stripe.accounts.retrieve();
console.log(
  JSON.stringify(
    {
      ok: Boolean(product && price),
      mode: apply ? "apply" : "inspect",
      account: {
        id: account.id,
        name: account.business_profile?.name || account.settings?.dashboard?.display_name || null,
      },
      keyMode: stripeSecretKey.startsWith("sk_live_") ? "live" : "test",
      product: product
        ? {
            id: product.id,
            name: product.name,
            active: product.active,
            metadata: product.metadata,
          }
        : null,
      price: price
        ? {
            id: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            active: price.active,
            livemode: price.livemode,
          }
        : null,
      nextAction: product && price ? "Set STRIPE_LIVE_BUILDS_PRICE_ID to the returned price ID." : "Run again with --apply.",
    },
    null,
    2,
  ),
);
