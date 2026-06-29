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
  if (!Array.isArray(productAssets) || productAssets.length < 8) {
    throw new Error(`Product assets were not exposed on profile: ${JSON.stringify(profile.data?.product)}`);
  }
  if (!productAssets.some((asset) => asset.key === "module-roadmap")) {
    throw new Error(`Module roadmap asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "module-field-guide")) {
    throw new Error(`Module field guide asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "launch-day-runbook")) {
    throw new Error(`Launch day runbook asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "launch-copy-pack")) {
    throw new Error(`Launch copy pack asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "proof-to-offer-canvas")) {
    throw new Error(`Proof to offer canvas asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  const productModules = profile.data?.product?.modules;
  if (!Array.isArray(productModules) || productModules.length < 5) {
    throw new Error(`Product modules were not exposed on profile: ${JSON.stringify(profile.data?.product)}`);
  }
  const onboardingEmails = profile.data?.product?.onboardingEmails;
  if (!Array.isArray(onboardingEmails) || onboardingEmails.length < 4) {
    throw new Error(`Buyer onboarding emails were not exposed on profile: ${JSON.stringify(profile.data?.product)}`);
  }
  const moduleWithoutLesson = productModules.find(
    (module) =>
      !module.key ||
      !module.lesson?.starterPrompt ||
      !module.lesson?.output ||
      !Array.isArray(module.lesson?.deliverables) ||
      module.lesson.deliverables.length < 3 ||
      !Array.isArray(module.lesson?.proofQuestions) ||
      module.lesson.proofQuestions.length < 3 ||
      !Array.isArray(module.lesson?.failureTraps) ||
      module.lesson.failureTraps.length < 3 ||
      !module.operatorBrief?.window ||
      !module.operatorBrief?.mode ||
      !module.operatorBrief?.proof ||
      !module.operatorBrief?.streamBeat ||
      !Array.isArray(module.todos),
  );
  if (moduleWithoutLesson) {
    throw new Error(`Product module lesson data is incomplete: ${JSON.stringify(moduleWithoutLesson)}`);
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
  const fieldGuideResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/module-field-guide`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const fieldGuideText = await fieldGuideResponse.text();
  if (!fieldGuideResponse.ok || !fieldGuideText.includes("The Future Proof Method - Module Field Guide")) {
    throw new Error(`Module field guide download failed: ${fieldGuideResponse.status} ${fieldGuideText.slice(0, 120)}`);
  }
  if (
    !fieldGuideText.includes("Module deliverables:") ||
    !fieldGuideText.includes("Proof questions:") ||
    !fieldGuideText.includes("Operator brief:") ||
    !fieldGuideText.includes("Traps to avoid:")
  ) {
    throw new Error("Module field guide is missing generated lesson depth sections");
  }
  const runbookResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/launch-day-runbook`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const runbookText = await runbookResponse.text();
  if (!runbookResponse.ok || !runbookText.includes("The Future Proof Method - Launch Day Runbook")) {
    throw new Error(`Launch day runbook download failed: ${runbookResponse.status} ${runbookText.slice(0, 120)}`);
  }
  const copyPackResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/launch-copy-pack`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const copyPackText = await copyPackResponse.text();
  if (!copyPackResponse.ok || !copyPackText.includes("The Future Proof Method - Launch Copy Pack")) {
    throw new Error(`Launch copy pack download failed: ${copyPackResponse.status} ${copyPackText.slice(0, 120)}`);
  }

  const progress = await fetchJson(`${siteUrl}/api/member-progress/future-proof-method`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!progress.response.ok || progress.data?.progress?.summary?.total < 20) {
    throw new Error(`Progress lookup failed: ${JSON.stringify(progress.data)}`);
  }

  const taskUpdate = await fetchJson(`${siteUrl}/api/member-progress/future-proof-method`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      moduleKey: "command-setup",
      taskKey: "command-folders",
      completed: true,
    }),
  });
  if (!taskUpdate.response.ok || taskUpdate.data?.item?.completed !== true) {
    throw new Error(`Progress update failed: ${JSON.stringify(taskUpdate.data)}`);
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
          productModulesExposed: true,
          moduleOperatorBriefsExposed: true,
          buyerOnboardingEmailsExposed: true,
          moduleRoadmapExposed: true,
          moduleFieldGuideExposed: true,
          launchDayRunbookExposed: true,
          launchCopyPackExposed: true,
          generatedFieldGuideDepth: true,
          generatedOperatorBriefs: true,
          lockedAssetsBlocked: true,
          entitledAssetDownload: true,
          entitledFieldGuideDownload: true,
          entitledRunbookDownload: true,
          entitledCopyPackDownload: true,
          memberProgressLookup: true,
          memberProgressUpdate: true,
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
