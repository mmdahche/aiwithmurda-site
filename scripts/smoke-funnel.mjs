import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const supabaseUrl = requireEnv(env, "SUPABASE_URL");
const supabaseAnonKey = requireEnv(env, "VITE_SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = requireEnv(env, "STRIPE_SECRET_KEY");

const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });

const runId = Date.now();
const email = `aiwm-smoke+${runId}@example.com`;
const password = `Smoke-${runId}-${Math.random().toString(36).slice(2)}!`;
let userId = null;
let checkoutSessionId = null;

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "AI with Murda Smoke Test" },
  });
  if (created.error || !created.data?.user) throw created.error || new Error("User creation failed");
  userId = created.data.user.id;

  const signedIn = await publicClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data?.session?.access_token) {
    throw signedIn.error || new Error("Smoke user sign-in failed");
  }

  const token = signedIn.data.session.access_token;
  const checkout = await fetchJson(`${siteUrl}/api/checkout/future-proof-method`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!checkout.response.ok || !checkout.data?.session_id || !checkout.data?.url) {
    throw new Error(`Checkout creation failed: ${JSON.stringify(checkout.data)}`);
  }
  checkoutSessionId = checkout.data.session_id;

  const access = await fetchJson(`${siteUrl}/api/access/session/${encodeURIComponent(checkoutSessionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (access.response.status !== 409 || access.data?.error !== "checkout_not_paid") {
    throw new Error(`Expected unpaid checkout guard, got ${access.response.status}: ${JSON.stringify(access.data)}`);
  }

  const profile = await fetchJson(`${siteUrl}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!profile.response.ok || profile.data?.profile?.email !== email) {
    throw new Error(`Profile lookup failed: ${JSON.stringify(profile.data)}`);
  }
  const productAssets = profile.data?.product?.assets;
  if (!Array.isArray(productAssets) || productAssets.length < 5) {
    throw new Error(`Product assets were not exposed on profile: ${JSON.stringify(profile.data?.product)}`);
  }
  if (!productAssets.some((asset) => asset.key === "module-roadmap")) {
    throw new Error(`Module roadmap asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }

  const blockedAsset = await fetchJson(`${siteUrl}/api/member-assets/future-proof-method/quickstart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (blockedAsset.response.status !== 403 || blockedAsset.data?.error !== "entitlement_required") {
    throw new Error(
      `Expected asset entitlement guard, got ${blockedAsset.response.status}: ${JSON.stringify(blockedAsset.data)}`,
    );
  }

  const entitlement = await admin
    .from("entitlements")
    .upsert(
      {
        user_id: userId,
        product_key: "future_proof_method",
        status: "active",
        revoked_at: null,
      },
      { onConflict: "user_id,product_key" },
    )
    .select("id")
    .single();
  if (entitlement.error || !entitlement.data?.id) {
    throw entitlement.error || new Error("Failed to grant smoke entitlement");
  }

  const assetResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/quickstart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const assetText = await assetResponse.text();
  if (!assetResponse.ok || !assetText.includes("The Future Proof Method - Quickstart Map")) {
    throw new Error(`Asset download failed: ${assetResponse.status} ${assetText.slice(0, 120)}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        siteUrl,
        checks: {
          authProfileCreated: true,
          checkoutSessionCreated: true,
          unpaidAccessGuard: true,
          profileLookup: true,
          productAssetsExposed: true,
          lockedAssetsBlocked: true,
          entitledAssetDownload: true,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (checkoutSessionId) {
    await stripe.checkout.sessions.expire(checkoutSessionId).catch(() => {});
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}
