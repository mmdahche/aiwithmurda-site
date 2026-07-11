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
let liveBuildCheckoutSessionId = null;
let operatorToolkitCheckoutSessionId = null;
let testCheckoutSessionId = null;
let billingCustomerId = null;

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

  const liveBuildCheckout = await fetchJson(`${siteUrl}/api/checkout/live-builds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!liveBuildCheckout.response.ok || !liveBuildCheckout.data?.session_id || !liveBuildCheckout.data?.url) {
    throw new Error(`Live build checkout creation failed: ${JSON.stringify(liveBuildCheckout.data)}`);
  }
  liveBuildCheckoutSessionId = liveBuildCheckout.data.session_id;
  const liveBuildCheckoutSession = await stripe.checkout.sessions.retrieve(liveBuildCheckoutSessionId);
  if (
    liveBuildCheckoutSession.amount_total !== 9700 ||
    liveBuildCheckoutSession.metadata?.product_key !== "new_wave_live_builds"
  ) {
    throw new Error(`Live build checkout session shape failed: ${JSON.stringify(liveBuildCheckoutSession)}`);
  }
  const operatorBundleLineItems = await stripe.checkout.sessions.listLineItems(liveBuildCheckoutSessionId, {
    limit: 1,
    expand: ["data.price.product"],
  });
  const operatorBundleStripeProduct = operatorBundleLineItems.data[0]?.price?.product;
  if (
    !operatorBundleStripeProduct ||
    typeof operatorBundleStripeProduct === "string" ||
    operatorBundleStripeProduct.name !== "New Wave Operator Bundle"
  ) {
    throw new Error(`Operator Bundle Stripe display failed: ${JSON.stringify(operatorBundleLineItems.data[0])}`);
  }

  const operatorToolkitCheckout = await fetchJson(`${siteUrl}/api/checkout/operator-toolkit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (
    !operatorToolkitCheckout.response.ok ||
    !operatorToolkitCheckout.data?.session_id ||
    !operatorToolkitCheckout.data?.url
  ) {
    throw new Error(`Operator Toolkit checkout creation failed: ${JSON.stringify(operatorToolkitCheckout.data)}`);
  }
  operatorToolkitCheckoutSessionId = operatorToolkitCheckout.data.session_id;
  const operatorToolkitSession = await stripe.checkout.sessions.retrieve(operatorToolkitCheckoutSessionId);
  if (
    operatorToolkitSession.mode !== "subscription" ||
    operatorToolkitSession.amount_total !== 32700 ||
    operatorToolkitSession.metadata?.product_key !== "operator_toolkit" ||
    operatorToolkitSession.metadata?.update_product_key !== "operator_updates"
  ) {
    throw new Error(`Operator Toolkit checkout shape failed: ${JSON.stringify(operatorToolkitSession)}`);
  }
  const operatorToolkitLineItems = await stripe.checkout.sessions.listLineItems(operatorToolkitCheckoutSessionId, {
    limit: 10,
    expand: ["data.price.product"],
  });
  const setupItem = operatorToolkitLineItems.data.find((item) => item.price?.unit_amount === 29700);
  const updateItem = operatorToolkitLineItems.data.find((item) => item.price?.unit_amount === 3000);
  const setupProduct = setupItem?.price?.product;
  const updateProduct = updateItem?.price?.product;
  if (
    operatorToolkitLineItems.data.length !== 2 ||
    !setupItem ||
    !updateItem ||
    setupItem.price?.recurring ||
    updateItem.price?.recurring?.interval !== "month" ||
    !setupProduct ||
    typeof setupProduct === "string" ||
    setupProduct.name !== "The Operator Toolkit" ||
    !updateProduct ||
    typeof updateProduct === "string" ||
    updateProduct.name !== "Operator System Updates"
  ) {
    throw new Error(`Operator Toolkit Stripe display failed: ${JSON.stringify(operatorToolkitLineItems.data)}`);
  }

  const testCheckout = await fetchJson(`${siteUrl}/api/checkout/test-purchase`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!testCheckout.response.ok || !testCheckout.data?.session_id || !testCheckout.data?.url) {
    throw new Error(`Test checkout creation failed: ${JSON.stringify(testCheckout.data)}`);
  }
  testCheckoutSessionId = testCheckout.data.session_id;

  const testCheckoutSession = await stripe.checkout.sessions.retrieve(testCheckoutSessionId);
  if (
    testCheckoutSession.amount_total !== 200 ||
    testCheckoutSession.metadata?.checkout_kind !== "live_test_purchase" ||
    testCheckoutSession.metadata?.product_key !== "future_proof_method"
  ) {
    throw new Error(`Test checkout session shape failed: ${JSON.stringify(testCheckoutSession)}`);
  }

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
  const billingCustomer = await stripe.customers.create({
    email,
    metadata: { smoke_test: "aiwithmurda_billing_portal" },
  });
  billingCustomerId = billingCustomer.id;
  const billingProfile = await admin
    .from("profiles")
    .update({ stripe_customer_id: billingCustomerId })
    .eq("id", userId);
  if (billingProfile.error) throw billingProfile.error;
  const billingPortal = await fetchJson(`${siteUrl}/api/billing/portal`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (
    !billingPortal.response.ok ||
    !billingPortal.data?.url ||
    !billingPortal.data.url.startsWith("https://billing.stripe.com/")
  ) {
    throw new Error(`Billing portal creation failed: ${JSON.stringify(billingPortal.data)}`);
  }
  const productAssets = profile.data?.product?.assets;
  if (!Array.isArray(productAssets) || productAssets.length < 12) {
    throw new Error(`Product assets were not exposed on profile: ${JSON.stringify(profile.data?.product)}`);
  }
  if (!productAssets.some((asset) => asset.key === "module-roadmap")) {
    throw new Error(`Module roadmap asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "module-field-guide")) {
    throw new Error(`Module field guide asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "install-verify-pack")) {
    throw new Error(`Install and verify asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "dual-agent-project-starter")) {
    throw new Error(`Dual-agent project starter was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "core-prompt-scripts")) {
    throw new Error(`Core prompt scripts were not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "starter-skill-pack")) {
    throw new Error(`Starter skill pack was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "premium-course-workbook")) {
    throw new Error(`Course workbook asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "first-build-lab")) {
    throw new Error(`First Build Lab was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "course-completion-kit")) {
    throw new Error(`Course completion kit asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "council-decision-engine")) {
    throw new Error(`Council decision engine asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "skill-authoring-kit")) {
    throw new Error(`Skill authoring kit asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  if (!productAssets.some((asset) => asset.key === "daily-operator-checklist")) {
    throw new Error(`Daily operator checklist asset was not exposed on profile: ${JSON.stringify(productAssets)}`);
  }
  const operatorBundle = profile.data?.operatorBundle;
  if (
    operatorBundle?.key !== "new_wave_live_builds" ||
    operatorBundle?.price_cents !== 9700 ||
    !operatorBundle?.accessPlan?.activationPromise ||
    !Array.isArray(operatorBundle?.accessPlan?.setupChecklist) ||
    operatorBundle.accessPlan.setupChecklist.length < 4 ||
    !Array.isArray(operatorBundle?.assets) ||
    operatorBundle.assets.length < 7
  ) {
    throw new Error(`Operator Bundle was not exposed on profile: ${JSON.stringify(operatorBundle)}`);
  }
  if (!operatorBundle.assets.some((asset) => asset.key === "operator-skill-vault")) {
    throw new Error(`Operator skill vault missing: ${JSON.stringify(operatorBundle.assets)}`);
  }
  if (!operatorBundle.assets.some((asset) => asset.key === "deployment-runbook")) {
    throw new Error(`Deployment runbook missing: ${JSON.stringify(operatorBundle.assets)}`);
  }
  const operatorToolkit = profile.data?.operatorToolkit;
  if (
    operatorToolkit?.key !== "operator_toolkit" ||
    operatorToolkit?.price_cents !== 29700 ||
    operatorToolkit?.monthly_price_cents !== 3000 ||
    operatorToolkit?.initial_total_cents !== 32700 ||
    operatorToolkit?.updateProduct?.key !== "operator_updates" ||
    !operatorToolkit?.accessPlan?.activationPromise ||
    !Array.isArray(operatorToolkit?.assets) ||
    operatorToolkit.assets.length < 11 ||
    !Array.isArray(operatorToolkit?.updateAssets) ||
    operatorToolkit.updateAssets.length < 3 ||
    !Array.isArray(operatorToolkit?.releases) ||
    operatorToolkit.releases.length < 1
  ) {
    throw new Error(`Operator Toolkit was not exposed on profile: ${JSON.stringify(operatorToolkit)}`);
  }
  if (!operatorToolkit.assets.some((asset) => asset.key === "full-skill-pack")) {
    throw new Error(`Operator Toolkit skill pack missing: ${JSON.stringify(operatorToolkit.assets)}`);
  }
  if (!operatorToolkit.updateAssets.some((asset) => asset.key === "founding-update-001")) {
    throw new Error(`Operator Toolkit update pack missing: ${JSON.stringify(operatorToolkit.updateAssets)}`);
  }
  const productModules = profile.data?.product?.modules;
  if (!Array.isArray(productModules) || productModules.length < 5) {
    throw new Error(`Product modules were not exposed on profile: ${JSON.stringify(profile.data?.product)}`);
  }
  const onboardingEmails = profile.data?.product?.onboardingEmails;
  if (!Array.isArray(onboardingEmails) || onboardingEmails.length < 4) {
    throw new Error(`Buyer onboarding emails were not exposed on profile: ${JSON.stringify(profile.data?.product)}`);
  }
  const courseCompletion = profile.data?.product?.courseCompletion;
  if (
    !courseCompletion?.capstone?.prompt ||
    !Array.isArray(courseCompletion?.criteria) ||
    courseCompletion.criteria.length < 5 ||
    !Array.isArray(courseCompletion?.finalReceiptSections) ||
    courseCompletion.finalReceiptSections.length < 7
  ) {
    throw new Error(`Course completion data was not exposed on profile: ${JSON.stringify(profile.data?.product)}`);
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
      !module.operatorBrief?.why ||
      !module.actionKit?.timebox ||
      !module.actionKit?.todayMove ||
      !module.actionKit?.runCommand ||
      !module.actionKit?.proofCheckpoint ||
      !module.actionKit?.stopRule ||
      !module.premium?.headline ||
      !module.premium?.promise ||
      !Array.isArray(module.premium?.framework) ||
      module.premium.framework.length < 3 ||
      !Array.isArray(module.premium?.lessonBlocks) ||
      module.premium.lessonBlocks.length < 3 ||
      !Array.isArray(module.premium?.workshop) ||
      module.premium.workshop.length < 3 ||
      !module.premium?.example?.before ||
      !module.premium?.example?.after ||
      !Array.isArray(module.premium?.qualityBar) ||
      module.premium.qualityBar.length < 3 ||
      !Array.isArray(module.todos) ||
      module.todos.length < 4 ||
      module.todos.some((todo) => !todo.key || !todo.label || !todo.proof),
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
  const blockedBundleAsset = await fetchJson(`${siteUrl}/api/member-assets/new-wave-live-builds/operator-skill-vault`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (blockedBundleAsset.response.status !== 403 || blockedBundleAsset.data?.error !== "entitlement_required") {
    throw new Error(
      `Expected bundle asset entitlement guard, got ${blockedBundleAsset.response.status}: ${JSON.stringify(blockedBundleAsset.data)}`,
    );
  }
  const blockedToolkitAsset = await fetchJson(
    `${siteUrl}/api/member-assets/operator-toolkit/system-installation-guide`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (blockedToolkitAsset.response.status !== 403 || blockedToolkitAsset.data?.error !== "entitlement_required") {
    throw new Error(
      `Expected toolkit asset entitlement guard, got ${blockedToolkitAsset.response.status}: ${JSON.stringify(blockedToolkitAsset.data)}`,
    );
  }
  const blockedUpdateAsset = await fetchJson(`${siteUrl}/api/member-assets/operator-updates/founding-update-001`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (blockedUpdateAsset.response.status !== 403 || blockedUpdateAsset.data?.error !== "active_subscription_required") {
    throw new Error(
      `Expected update asset entitlement guard, got ${blockedUpdateAsset.response.status}: ${JSON.stringify(blockedUpdateAsset.data)}`,
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

  const operatorBundleEntitlement = await admin
    .from("entitlements")
    .upsert(
      {
        user_id: userId,
        product_key: "new_wave_live_builds",
        status: "active",
        revoked_at: null,
      },
      { onConflict: "user_id,product_key" },
    )
    .select("id")
    .single();
  if (operatorBundleEntitlement.error || !operatorBundleEntitlement.data?.id) {
    throw operatorBundleEntitlement.error || new Error("Failed to grant Operator Bundle smoke entitlement");
  }

  const operatorToolkitEntitlement = await admin
    .from("entitlements")
    .upsert(
      {
        user_id: userId,
        product_key: "operator_toolkit",
        status: "active",
        revoked_at: null,
      },
      { onConflict: "user_id,product_key" },
    )
    .select("id")
    .single();
  if (operatorToolkitEntitlement.error || !operatorToolkitEntitlement.data?.id) {
    throw operatorToolkitEntitlement.error || new Error("Failed to grant Operator Toolkit smoke entitlement");
  }

  const operatorUpdatesEntitlement = await admin
    .from("entitlements")
    .upsert(
      {
        user_id: userId,
        product_key: "operator_updates",
        status: "active",
        revoked_at: null,
      },
      { onConflict: "user_id,product_key" },
    )
    .select("id")
    .single();
  if (operatorUpdatesEntitlement.error || !operatorUpdatesEntitlement.data?.id) {
    throw operatorUpdatesEntitlement.error || new Error("Failed to grant Operator Updates smoke entitlement");
  }

  const operatorSubscription = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      product_key: "operator_updates",
      stripe_subscription_id: `sub_smoke_${runId}`,
      status: "active",
      cancel_at_period_end: false,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "user_id,product_key" },
  );
  if (operatorSubscription.error) throw operatorSubscription.error;

  const assetResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/quickstart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const assetText = await assetResponse.text();
  if (!assetResponse.ok || !assetText.includes("The Future Proof Method - 60-Minute Quickstart")) {
    throw new Error(`Asset download failed: ${assetResponse.status} ${assetText.slice(0, 120)}`);
  }
  const operatorVaultResponse = await fetch(`${siteUrl}/api/member-assets/new-wave-live-builds/operator-skill-vault`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const operatorVaultText = await operatorVaultResponse.text();
  if (
    !operatorVaultResponse.ok ||
    !operatorVaultText.includes("New Wave Operator Skill Vault") ||
    !operatorVaultText.includes("## 2. Debug Loop")
  ) {
    throw new Error(
      `Operator skill vault download failed: ${operatorVaultResponse.status} ${operatorVaultText.slice(0, 160)}`,
    );
  }
  const blueprintsResponse = await fetch(`${siteUrl}/api/member-assets/new-wave-live-builds/project-blueprints`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blueprintsText = await blueprintsResponse.text();
  if (
    !blueprintsResponse.ok ||
    !blueprintsText.includes("Reusable Project Blueprints") ||
    !blueprintsText.includes("Blueprint 7 - Daily report generator")
  ) {
    throw new Error(
      `Project blueprints download failed: ${blueprintsResponse.status} ${blueprintsText.slice(0, 160)}`,
    );
  }
  const fieldGuideResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/module-field-guide`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const fieldGuideText = await fieldGuideResponse.text();
  if (!fieldGuideResponse.ok || !fieldGuideText.includes("The Future Proof Method - Module Field Guide")) {
    throw new Error(`Module field guide download failed: ${fieldGuideResponse.status} ${fieldGuideText.slice(0, 120)}`);
  }
  if (
    !fieldGuideText.includes("Operating question:") ||
    !fieldGuideText.includes("Questions before completion:") ||
    !fieldGuideText.includes("Evidence to capture:") ||
    !fieldGuideText.includes("Traps to avoid:") ||
    !fieldGuideText.includes("Stop rule:")
  ) {
    throw new Error("Module field guide is missing generated lesson depth sections");
  }
  const premiumWorkbookResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/premium-course-workbook`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const premiumWorkbookText = await premiumWorkbookResponse.text();
  if (
    !premiumWorkbookResponse.ok ||
    !premiumWorkbookText.includes("The Future Proof Method - Course Workbook") ||
    !premiumWorkbookText.includes("## Deep lesson") ||
    !premiumWorkbookText.includes("Framework:") ||
    !premiumWorkbookText.includes("Quality bar:")
  ) {
    throw new Error(
      `Premium workbook download failed: ${premiumWorkbookResponse.status} ${premiumWorkbookText.slice(0, 160)}`,
    );
  }
  const promptScriptsResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/core-prompt-scripts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const promptScriptsText = await promptScriptsResponse.text();
  if (
    !promptScriptsResponse.ok ||
    !promptScriptsText.includes("Core Prompt Scripts") ||
    !promptScriptsText.includes("Script 5 - Second-agent review")
  ) {
    throw new Error(`Core prompt scripts download failed: ${promptScriptsResponse.status} ${promptScriptsText.slice(0, 160)}`);
  }
  const completionKitResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/course-completion-kit`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const completionKitText = await completionKitResponse.text();
  if (
    !completionKitResponse.ok ||
    !completionKitText.includes("The Future Proof Method - Completion Kit") ||
    !completionKitText.includes("Completion criteria") ||
    !completionKitText.includes("First-build handoff")
  ) {
    throw new Error(
      `Course completion kit download failed: ${completionKitResponse.status} ${completionKitText.slice(0, 160)}`,
    );
  }
  const installPackResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/install-verify-pack`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const installPackText = await installPackResponse.text();
  if (!installPackResponse.ok || !installPackText.includes("Install + Verify Pack")) {
    throw new Error(`Install pack download failed: ${installPackResponse.status} ${installPackText.slice(0, 120)}`);
  }
  const skillPackResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/starter-skill-pack`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const skillPackText = await skillPackResponse.text();
  if (!skillPackResponse.ok || !skillPackText.includes("Starter Skill Pack") || !skillPackText.includes("Skill 3 - Verify Before Done")) {
    throw new Error(`Starter skill pack download failed: ${skillPackResponse.status} ${skillPackText.slice(0, 120)}`);
  }
  const firstBuildLabResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/first-build-lab`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const firstBuildLabText = await firstBuildLabResponse.text();
  if (!firstBuildLabResponse.ok || !firstBuildLabText.includes("First Build Lab") || !firstBuildLabText.includes("Track C - Automate a workflow")) {
    throw new Error(
      `First Build Lab download failed: ${firstBuildLabResponse.status} ${firstBuildLabText.slice(0, 120)}`,
    );
  }
  const dailyChecklistResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/daily-operator-checklist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dailyChecklistText = await dailyChecklistResponse.text();
  if (
    !dailyChecklistResponse.ok ||
    !dailyChecklistText.includes("The Daily Operator Checklist") ||
    !dailyChecklistText.includes("Verification gates")
  ) {
    throw new Error(
      `Daily operator checklist download failed: ${dailyChecklistResponse.status} ${dailyChecklistText.slice(0, 120)}`,
    );
  }
  const councilZipResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/council-decision-engine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const councilZipBytes = new Uint8Array(await councilZipResponse.arrayBuffer());
  if (!councilZipResponse.ok || councilZipBytes.length < 1000 || councilZipBytes[0] !== 0x50 || councilZipBytes[1] !== 0x4b) {
    throw new Error(
      `Council decision engine ZIP download failed: ${councilZipResponse.status} ${councilZipBytes.length} bytes`,
    );
  }
  const authoringZipResponse = await fetch(`${siteUrl}/api/member-assets/future-proof-method/skill-authoring-kit`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const authoringZipBytes = new Uint8Array(await authoringZipResponse.arrayBuffer());
  if (!authoringZipResponse.ok || authoringZipBytes.length < 1000 || authoringZipBytes[0] !== 0x50 || authoringZipBytes[1] !== 0x4b) {
    throw new Error(
      `Skill authoring kit ZIP download failed: ${authoringZipResponse.status} ${authoringZipBytes.length} bytes`,
    );
  }

  const toolkitGuideResponse = await fetch(
    `${siteUrl}/api/member-assets/operator-toolkit/system-installation-guide`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const toolkitGuideText = await toolkitGuideResponse.text();
  if (
    !toolkitGuideResponse.ok ||
    !toolkitGuideText.includes("Operator Toolkit - System Installation Guide") ||
    !toolkitGuideText.includes("## Stage 5 - Run the first system test")
  ) {
    throw new Error(
      `Operator Toolkit guide download failed: ${toolkitGuideResponse.status} ${toolkitGuideText.slice(0, 160)}`,
    );
  }
  const toolkitSkillPackResponse = await fetch(`${siteUrl}/api/member-assets/operator-toolkit/full-skill-pack`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const toolkitSkillPackBytes = new Uint8Array(await toolkitSkillPackResponse.arrayBuffer());
  if (
    !toolkitSkillPackResponse.ok ||
    toolkitSkillPackBytes.length < 1000 ||
    toolkitSkillPackBytes[0] !== 0x50 ||
    toolkitSkillPackBytes[1] !== 0x4b
  ) {
    throw new Error(
      `Operator Toolkit ZIP download failed: ${toolkitSkillPackResponse.status} ${toolkitSkillPackBytes.length} bytes`,
    );
  }
  const operatorUpdateResponse = await fetch(`${siteUrl}/api/member-assets/operator-updates/founding-update-001`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const operatorUpdateBytes = new Uint8Array(await operatorUpdateResponse.arrayBuffer());
  if (
    !operatorUpdateResponse.ok ||
    operatorUpdateBytes.length < 500 ||
    operatorUpdateBytes[0] !== 0x50 ||
    operatorUpdateBytes[1] !== 0x4b
  ) {
    throw new Error(
      `Operator update ZIP download failed: ${operatorUpdateResponse.status} ${operatorUpdateBytes.length} bytes`,
    );
  }

  const entitledProfile = await fetchJson(`${siteUrl}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (
    !entitledProfile.response.ok ||
    !entitledProfile.data?.entitlements?.some(
      (item) => item.product_key === "operator_toolkit" && item.status === "active",
    ) ||
    !entitledProfile.data?.entitlements?.some(
      (item) => item.product_key === "operator_updates" && item.status === "active",
    ) ||
    !entitledProfile.data?.subscriptions?.some(
      (item) => item.product_key === "operator_updates" && item.status === "active",
    )
  ) {
    throw new Error(`Operator Toolkit access state failed: ${JSON.stringify(entitledProfile.data)}`);
  }

  const staleProgress = await admin.from("member_task_progress").upsert(
    {
      user_id: userId,
      product_key: "future_proof_method",
      module_key: "command-setup",
      task_key: "command-folders",
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_key,module_key,task_key" },
  );
  if (staleProgress.error) throw staleProgress.error;

  const progress = await fetchJson(`${siteUrl}/api/member-progress/future-proof-method`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (
    !progress.response.ok ||
    progress.data?.progress?.summary?.total !== 20 ||
    progress.data?.progress?.summary?.completed !== 0 ||
    progress.data?.progress?.items?.some((item) => item.moduleKey === "command-setup")
  ) {
    throw new Error(`Progress lookup failed: ${JSON.stringify(progress.data)}`);
  }

  const taskUpdate = await fetchJson(`${siteUrl}/api/member-progress/future-proof-method`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      moduleKey: "setup-both-builders",
      taskKey: "choose-surfaces",
      completed: true,
    }),
  });
  if (
    !taskUpdate.response.ok ||
    taskUpdate.data?.item?.completed !== true ||
    taskUpdate.data?.progress?.summary?.completed !== 1 ||
    taskUpdate.data?.progress?.summary?.percent !== 5
  ) {
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
          operatorBundleCheckoutSessionCreated: true,
          operatorBundleCheckoutAmountVerified: true,
          operatorBundleStripeDisplayVerified: true,
          operatorToolkitCheckoutSessionCreated: true,
          operatorToolkitCheckoutAmountVerified: true,
          operatorToolkitMixedBillingVerified: true,
          operatorToolkitStripeDisplayVerified: true,
          testCheckoutSessionCreated: true,
          testCheckoutAmountVerified: true,
          unpaidAccessGuard: true,
          profileLookup: true,
          billingPortalCreated: true,
          productAssetsExposed: true,
          productModulesExposed: true,
          moduleOperatorBriefsExposed: true,
          moduleActionKitsExposed: true,
          premiumModuleDepthExposed: true,
          buyerOnboardingEmailsExposed: true,
          courseCompletionExposed: true,
          operatorBundleExposed: true,
          operatorBundleAccessPlanExposed: true,
          operatorBundleAssetsExposed: true,
          operatorToolkitExposed: true,
          operatorToolkitAccessPlanExposed: true,
          operatorToolkitAssetsExposed: true,
          operatorUpdateAssetsExposed: true,
          moduleRoadmapExposed: true,
          moduleFieldGuideExposed: true,
          premiumWorkbookExposed: true,
          corePromptScriptsExposed: true,
          courseCompletionKitExposed: true,
          installVerifyPackExposed: true,
          starterSkillPackExposed: true,
          firstBuildLabExposed: true,
          generatedFieldGuideDepth: true,
          generatedOperatorBriefs: true,
          lockedAssetsBlocked: true,
          lockedOperatorBundleAssetsBlocked: true,
          lockedOperatorToolkitAssetsBlocked: true,
          lockedOperatorUpdateAssetsBlocked: true,
          entitledAssetDownload: true,
          entitledOperatorVaultDownload: true,
          entitledProjectBlueprintsDownload: true,
          entitledFieldGuideDownload: true,
          entitledPremiumWorkbookDownload: true,
          entitledCorePromptScriptsDownload: true,
          entitledCompletionKitDownload: true,
          entitledInstallPackDownload: true,
          entitledStarterSkillPackDownload: true,
          entitledFirstBuildLabDownload: true,
          entitledOperatorToolkitGuideDownload: true,
          entitledOperatorToolkitZipDownload: true,
          entitledOperatorUpdateZipDownload: true,
          operatorSubscriptionExposed: true,
          memberProgressLookup: true,
          staleProgressIgnored: true,
          memberProgressUpdate: true,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (testCheckoutSessionId) {
    await stripe.checkout.sessions.expire(testCheckoutSessionId).catch(() => {});
  }
  if (billingCustomerId) {
    await stripe.customers.del(billingCustomerId).catch(() => {});
  }
  if (liveBuildCheckoutSessionId) {
    await stripe.checkout.sessions.expire(liveBuildCheckoutSessionId).catch(() => {});
  }
  if (operatorToolkitCheckoutSessionId) {
    await stripe.checkout.sessions.expire(operatorToolkitCheckoutSessionId).catch(() => {});
  }
  if (checkoutSessionId) {
    await stripe.checkout.sessions.expire(checkoutSessionId).catch(() => {});
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}
