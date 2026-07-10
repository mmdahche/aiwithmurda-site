import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const supabaseUrl = requireEnv(env, "SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = requireEnv(env, "STRIPE_SECRET_KEY");
const stripeWebhookSecret = requireEnv(env, "STRIPE_WEBHOOK_SECRET");
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = Date.now();
const email = `aiwm-subscription+${runId}@example.com`;
const password = `Subscription-${runId}-${Math.random().toString(36).slice(2)}!`;
const customerId = `cus_smoke_${runId}`;
const subscriptionId = `sub_smoke_${runId}`;
const checkoutSessionId = `cs_smoke_${runId}`;
const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
let userId = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function subscriptionObject(status) {
  return {
    id: subscriptionId,
    object: "subscription",
    customer: customerId,
    status,
    cancel_at_period_end: false,
    current_period_end: periodEnd,
    items: {
      object: "list",
      data: [{ id: `si_smoke_${runId}`, current_period_end: periodEnd }],
    },
    metadata: {
      product_key: "operator_updates",
      permanent_product_key: "operator_toolkit",
      supabase_user_id: userId,
    },
  };
}

async function sendWebhook(type, object) {
  const payload = JSON.stringify({
    id: `evt_smoke_${runId}_${type.replaceAll(".", "_")}`,
    object: "event",
    api_version: "2026-02-25.clover",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    type,
    data: { object },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: stripeWebhookSecret,
  });
  const response = await fetch(`${siteUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: payload,
  });
  const body = await response.text();
  assert(response.ok, `${type} webhook failed (${response.status}): ${body}`);
}

async function accessState() {
  const [entitlements, subscription] = await Promise.all([
    admin
      .from("entitlements")
      .select("product_key,status,revoked_at")
      .eq("user_id", userId)
      .in("product_key", ["operator_toolkit", "operator_updates"]),
    admin
      .from("subscriptions")
      .select("product_key,status,cancel_at_period_end,current_period_end")
      .eq("user_id", userId)
      .eq("product_key", "operator_updates")
      .maybeSingle(),
  ]);
  if (entitlements.error) throw entitlements.error;
  if (subscription.error) throw subscription.error;
  return { entitlements: entitlements.data || [], subscription: subscription.data };
}

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Operator Subscription Smoke Test" },
  });
  if (created.error || !created.data?.user) throw created.error || new Error("User creation failed");
  userId = created.data.user.id;

  const activeSubscription = subscriptionObject("active");
  await sendWebhook("checkout.session.completed", {
    id: checkoutSessionId,
    object: "checkout.session",
    mode: "subscription",
    payment_status: "paid",
    amount_total: 32700,
    currency: "usd",
    customer: customerId,
    customer_details: {},
    subscription: activeSubscription,
    metadata: {
      product_key: "operator_toolkit",
      update_product_key: "operator_updates",
      supabase_user_id: userId,
      billing_model: "297_setup_plus_30_monthly",
    },
  });

  const activeState = await accessState();
  const activeToolkit = activeState.entitlements.find((item) => item.product_key === "operator_toolkit");
  const activeUpdates = activeState.entitlements.find((item) => item.product_key === "operator_updates");
  assert(activeToolkit?.status === "active" && !activeToolkit.revoked_at, "Permanent toolkit was not granted");
  assert(activeUpdates?.status === "active" && !activeUpdates.revoked_at, "Update access was not granted");
  assert(activeState.subscription?.status === "active", "Active subscription was not stored");

  await sendWebhook("invoice.paid", {
    id: `in_smoke_${runId}`,
    object: "invoice",
    billing_reason: "subscription_cycle",
    amount_paid: 3000,
    currency: "usd",
    customer: customerId,
    created: Math.floor(Date.now() / 1000),
    status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
    parent: { subscription_details: { subscription: activeSubscription } },
  });
  const renewalPurchase = await admin
    .from("purchases")
    .select("product_key,amount_total,currency,status")
    .eq("user_id", userId)
    .eq("stripe_checkout_session_id", `invoice:in_smoke_${runId}`)
    .maybeSingle();
  if (renewalPurchase.error) throw renewalPurchase.error;
  assert(
    renewalPurchase.data?.product_key === "operator_updates" &&
      renewalPurchase.data?.amount_total === 3000 &&
      renewalPurchase.data?.status === "paid",
    "The $30 recurring invoice was not recorded in the revenue ledger",
  );

  await sendWebhook("customer.subscription.deleted", subscriptionObject("canceled"));

  const canceledState = await accessState();
  const permanentToolkit = canceledState.entitlements.find((item) => item.product_key === "operator_toolkit");
  const canceledUpdates = canceledState.entitlements.find((item) => item.product_key === "operator_updates");
  assert(
    permanentToolkit?.status === "active" && !permanentToolkit.revoked_at,
    "Canceling updates incorrectly revoked the permanent toolkit",
  );
  assert(
    canceledUpdates?.status === "revoked" && Boolean(canceledUpdates.revoked_at),
    "Canceled update access was not revoked",
  );
  assert(canceledState.subscription?.status === "canceled", "Canceled subscription status was not stored");

  console.log(
    JSON.stringify(
      {
        ok: true,
        siteUrl,
        checks: {
          mixedCheckoutWebhookAccepted: true,
          permanentToolkitGranted: true,
          recurringUpdatesGranted: true,
          subscriptionStored: true,
          recurringRevenueRecorded: true,
          cancellationWebhookAccepted: true,
          permanentToolkitSurvivesCancellation: true,
          recurringUpdatesRevokedAfterCancellation: true,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
}
