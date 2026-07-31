/**
 * Creates a Stripe coupon + promotion code for founder QA purchases at all tiers.
 *
 * Checkout already has allow_promotion_codes: true — this only creates the code in Stripe.
 *
 * Usage:
 *   node scripts/setup-founder-test-promo.mjs              # inspect
 *   node scripts/setup-founder-test-promo.mjs --apply      # create in Stripe
 *   node scripts/setup-founder-test-promo.mjs --apply --percent 99 --code MURAD-QA
 */

import path from "node:path";
import Stripe from "stripe";
import { parseEnvFile, rootDir } from "./env-loader.mjs";

const apply = process.argv.includes("--apply");
const percentIndex = process.argv.indexOf("--percent");
const codeIndex = process.argv.indexOf("--code");
const maxIndex = process.argv.indexOf("--max-redemptions");

const percentOff = percentIndex >= 0 && process.argv[percentIndex + 1]
  ? Number(process.argv[percentIndex + 1])
  : 95;
const promoCode = codeIndex >= 0 && process.argv[codeIndex + 1]
  ? String(process.argv[codeIndex + 1]).trim().toUpperCase()
  : "MURAD-QA";
const maxRedemptions = maxIndex >= 0 && process.argv[maxIndex + 1]
  ? Number(process.argv[maxIndex + 1])
  : 30;

if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
  throw new Error("--percent must be between 1 and 100");
}

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
const couponMetadata = { brand: "aiwithmurda", purpose: "founder_qa_test" };

async function findExistingPromoCode(code) {
  const listed = await stripe.promotionCodes.list({ code, limit: 1, active: true });
  return listed.data[0] || null;
}

let coupon = null;
for await (const candidate of stripe.coupons.list({ limit: 100 })) {
  if (candidate.metadata?.purpose === "founder_qa_test" && candidate.percent_off === percentOff) {
    coupon = candidate;
    break;
  }
}

if (!coupon && apply) {
  coupon = await stripe.coupons.create({
    name: `Founder QA ${percentOff}% off`,
    percent_off: percentOff,
    duration: "once",
    metadata: couponMetadata,
  });
}

let promotion = await findExistingPromoCode(promoCode);
if (!promotion && apply && coupon) {
  promotion = await stripe.promotionCodes.create({
    promotion: {
      type: "coupon",
      coupon: coupon.id,
    },
    code: promoCode,
    max_redemptions: maxRedemptions,
    metadata: couponMetadata,
  });
}

const account = await stripe.accounts.retrieve();
const samplePrices = {
  future_proof_method_47: Math.round(4700 * (1 - percentOff / 100)),
  operator_bundle_97: Math.round(9700 * (1 - percentOff / 100)),
  operator_toolkit_first_327: Math.round(32700 * (1 - percentOff / 100)),
  operator_arsenal_first_497: Math.round(49700 * (1 - percentOff / 100)),
};

console.log(
  JSON.stringify(
    {
      ok: Boolean(coupon && (promotion || !apply)),
      mode: apply ? "apply" : "inspect",
      keyMode: stripeSecretKey.startsWith("sk_live_") ? "live" : "test",
      accountId: account.id,
      percentOff,
      promotionCode: promoCode,
      maxRedemptions,
      coupon: coupon
        ? { id: coupon.id, percent_off: coupon.percent_off, duration: coupon.duration, valid: coupon.valid }
        : null,
      promotion: promotion
        ? {
            id: promotion.id,
            code: promotion.code,
            active: promotion.active,
            times_redeemed: promotion.times_redeemed,
            max_redemptions: promotion.max_redemptions,
          }
        : null,
      approximateFirstCheckoutTotalsUsd: {
        kit: `$${(samplePrices.future_proof_method_47 / 100).toFixed(2)}`,
        bundle: `$${(samplePrices.operator_bundle_97 / 100).toFixed(2)}`,
        toolkit_first: `$${(samplePrices.operator_toolkit_first_327 / 100).toFixed(2)} (setup + first update month)`,
        arsenal_first: `$${(samplePrices.operator_arsenal_first_497 / 100).toFixed(2)} (setup + first update month)`,
      },
      howToTest: [
        "Sign in at https://aiwithmurda.com/members with your email",
        "Open each tier checkout: /kit, /live-builds, /operator-toolkit, /operator-arsenal",
        "On the Stripe page, click Add promotion code and enter the code above",
        "Complete payment — full entitlements unlock regardless of discount",
        "Toolkit/Arsenal: discount applies to first invoice only; renewals are full $30/mo unless you cancel",
      ],
      nextAction: apply
        ? promotion
          ? `Use code ${promoCode} at Stripe Checkout`
          : "Promotion code missing — re-run with --apply"
        : "Re-run with --apply to create coupon + code in Stripe",
    },
    null,
    2,
  ),
);
