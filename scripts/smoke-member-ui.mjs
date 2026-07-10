import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const supabaseUrl = requireEnv(env, "SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
const outputDir = process.env.MEMBER_UI_OUTPUT_DIR || "/tmp/aiwithmurda-member-ui";
const runId = Date.now();
const email = `aiwm-member-ui+${runId}@example.com`;
const password = `Member-${runId}-${Math.random().toString(36).slice(2)}!`;
const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let userId = null;
let browser = null;
const browserErrors = [];
const screenshots = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function watchPage(page, label) {
  page.on("pageerror", (error) => browserErrors.push(`${label}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`${label}: console: ${message.text()}`);
  });
}

async function saveScreenshot(page, name) {
  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshots.push(filePath);
}

async function auditLayout(page, label) {
  const result = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert(
    result.pageWidth <= result.viewportWidth + 1 && result.bodyWidth <= result.viewportWidth + 1,
    `${label} has horizontal overflow: ${JSON.stringify(result)}`,
  );
  return result;
}

async function signIn(page) {
  await page.goto(`${siteUrl}/members`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Get both builders working." }).waitFor({ timeout: 20_000 });
}

try {
  await fs.mkdir(outputDir, { recursive: true });

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Member UI Smoke Test" },
  });
  if (created.error || !created.data?.user) throw created.error || new Error("UI smoke user creation failed");
  userId = created.data.user.id;

  const entitlementRows = [
    "future_proof_method",
    "new_wave_live_builds",
    "operator_toolkit",
    "operator_updates",
  ].map((productKey) => ({
    user_id: userId,
    product_key: productKey,
    status: "active",
    revoked_at: null,
  }));
  const entitlements = await admin.from("entitlements").upsert(entitlementRows, {
    onConflict: "user_id,product_key",
  });
  if (entitlements.error) throw entitlements.error;
  const subscription = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      product_key: "operator_updates",
      stripe_subscription_id: `sub_member_ui_${runId}`,
      status: "active",
      cancel_at_period_end: false,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "user_id,product_key" },
  );
  if (subscription.error) throw subscription.error;

  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const desktopPage = await desktop.newPage();
  watchPage(desktopPage, "desktop");

  await signIn(desktopPage);
  await desktopPage.getByRole("navigation", { name: "Your products" }).waitFor();
  await desktopPage.getByText("0 of 20 implementation steps complete", { exact: true }).waitFor();
  await auditLayout(desktopPage, "desktop start");
  await saveScreenshot(desktopPage, "01-member-start-desktop");

  await desktopPage.getByRole("button", { name: /Start something new/ }).click();
  await desktopPage.getByRole("heading", { name: "Build a small web tool" }).waitFor();
  await desktopPage.reload({ waitUntil: "domcontentloaded" });
  await desktopPage.getByRole("heading", { name: "Build a small web tool" }).waitFor({ timeout: 20_000 });
  await saveScreenshot(desktopPage, "02-personalized-start-desktop");

  await desktopPage.getByRole("link", { name: /Continue module/ }).click();
  await desktopPage.getByRole("heading", { name: "Module 1: Set Up Both AI Builders" }).waitFor();
  await auditLayout(desktopPage, "desktop lesson");
  await saveScreenshot(desktopPage, "03-module-one-desktop");
  await desktopPage.getByText("Open the full lesson", { exact: true }).click();
  await desktopPage.getByText("Premium lesson", { exact: true }).waitFor();
  await saveScreenshot(desktopPage, "04-module-one-expanded-desktop");

  await desktopPage.goto(`${siteUrl}/members`, { waitUntil: "domcontentloaded" });
  await desktopPage.getByRole("heading", { name: "Build a small web tool" }).waitFor({ timeout: 20_000 });
  await desktopPage.getByRole("button", { name: /Script vault/ }).click();
  const search = desktopPage.getByRole("searchbox", { name: "Search member scripts and skills" });
  await search.fill("skill");
  await desktopPage.getByRole("heading", { name: "Starter Skill Pack" }).waitFor();
  await saveScreenshot(desktopPage, "05-script-vault-desktop");

  await desktopPage.getByRole("button", { name: /New Wave Operator Bundle/ }).click();
  await desktopPage.getByRole("heading", { name: "Your advanced operator vault is active." }).waitFor();
  await auditLayout(desktopPage, "desktop operator bundle");
  await saveScreenshot(desktopPage, "06-operator-bundle-desktop");

  await desktopPage
    .getByRole("navigation", { name: "Your products" })
    .getByRole("button", { name: /The Operator Toolkit/ })
    .click();
  await desktopPage.getByRole("heading", { name: "Your full operator system is ready." }).waitFor();
  const toolkitNav = desktopPage.getByRole("navigation", { name: "Operator Toolkit sections" });
  assert((await toolkitNav.getByRole("button").count()) === 4, "Toolkit navigation does not expose four focused views");
  await desktopPage.getByRole("button", { name: "Automate business", exact: true }).click();
  await desktopPage.getByRole("button", { name: "Codex", exact: true }).click();
  await desktopPage.locator(".operator-toolkit-setup-checks input").first().check();
  await auditLayout(desktopPage, "desktop toolkit setup");
  await saveScreenshot(desktopPage, "07-operator-toolkit-setup-desktop");

  await desktopPage.goto(`${siteUrl}/members?product=operator-toolkit`, { waitUntil: "domcontentloaded" });
  await desktopPage.getByRole("heading", { name: "Your full operator system is ready." }).waitFor({ timeout: 20_000 });
  assert(
    await desktopPage.getByRole("button", { name: "Automate business", exact: true }).evaluate((node) =>
      node.classList.contains("active"),
    ),
    "Toolkit goal did not persist after reload",
  );
  assert(
    await desktopPage.getByRole("button", { name: "Codex", exact: true }).evaluate((node) => node.classList.contains("active")),
    "Toolkit agent choice did not persist after reload",
  );
  assert(await desktopPage.locator(".operator-toolkit-setup-checks input").first().isChecked(), "Toolkit setup check did not persist");

  await toolkitNav.getByRole("button", { name: "System files", exact: true }).click();
  await desktopPage.getByRole("heading", { name: "Your owned system files." }).waitFor();
  assert((await desktopPage.locator(".operator-toolkit-asset-grid article").count()) >= 11, "Owned toolkit files are incomplete");
  await auditLayout(desktopPage, "desktop toolkit files");
  await saveScreenshot(desktopPage, "08-operator-toolkit-files-desktop");

  await toolkitNav.getByRole("button", { name: "Updates", exact: true }).click();
  await desktopPage.getByRole("heading", { name: "Your update channel is active." }).waitFor();
  assert((await desktopPage.locator(".operator-toolkit-update-assets article").count()) >= 3, "Update assets are incomplete");
  await saveScreenshot(desktopPage, "09-operator-toolkit-updates-desktop");

  await toolkitNav.getByRole("button", { name: "Billing", exact: true }).click();
  await desktopPage.getByRole("heading", { name: "The toolkit and update channel are separate." }).waitFor();
  await desktopPage.getByText("Owned", { exact: true }).waitFor();
  await desktopPage.getByText("$30/month", { exact: true }).waitFor();
  await auditLayout(desktopPage, "desktop toolkit billing");
  await saveScreenshot(desktopPage, "10-operator-toolkit-billing-desktop");

  const storageState = await desktop.storageState();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    storageState,
  });
  const mobilePage = await mobile.newPage();
  watchPage(mobilePage, "mobile");
  await mobilePage.goto(`${siteUrl}/members`, { waitUntil: "domcontentloaded" });
  await mobilePage.getByRole("heading", { name: "Build a small web tool" }).waitFor({ timeout: 20_000 });
  await mobilePage.getByRole("button", { name: "Open navigation" }).click();
  await mobilePage.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Tools" }).waitFor();
  await mobilePage.getByRole("button", { name: "Close navigation" }).click();
  const workspaceButtons = mobilePage.getByRole("navigation", { name: "Member workspace sections" }).getByRole("button");
  assert((await workspaceButtons.count()) === 5, "Mobile member navigation does not expose all five destinations");
  const workspaceButtonsFit = await workspaceButtons.evaluateAll((buttons) =>
    buttons.every((button) => {
      const rect = button.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    }),
  );
  assert(workspaceButtonsFit, "One or more mobile member destinations are outside the viewport");
  await auditLayout(mobilePage, "mobile start");
  await saveScreenshot(mobilePage, "11-member-start-mobile");

  await mobilePage.getByRole("link", { name: /Continue module/ }).click();
  await mobilePage.getByRole("heading", { name: "Module 1: Set Up Both AI Builders" }).waitFor();
  await auditLayout(mobilePage, "mobile lesson");
  await saveScreenshot(mobilePage, "12-module-one-mobile");

  await mobilePage.goto(`${siteUrl}/members?product=operator-toolkit`, { waitUntil: "domcontentloaded" });
  await mobilePage.getByRole("heading", { name: "Your full operator system is ready." }).waitFor({ timeout: 20_000 });
  const mobileToolkitButtons = mobilePage
    .getByRole("navigation", { name: "Operator Toolkit sections" })
    .getByRole("button");
  assert((await mobileToolkitButtons.count()) === 4, "Mobile toolkit navigation is incomplete");
  const mobileToolkitButtonsFit = await mobileToolkitButtons.evaluateAll((buttons) =>
    buttons.every((button) => {
      const rect = button.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    }),
  );
  assert(mobileToolkitButtonsFit, "One or more mobile toolkit destinations are outside the viewport");
  await auditLayout(mobilePage, "mobile toolkit setup");
  await saveScreenshot(mobilePage, "13-operator-toolkit-mobile");

  await mobile.close();
  await desktop.close();

  assert(browserErrors.length === 0, `Browser errors detected:\n${browserErrors.join("\n")}`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        siteUrl,
        checks: {
          passwordLogin: true,
          allProductEntitlementsVisible: true,
          twentyStepCurriculum: true,
          buildTrackPersists: true,
          lessonProgressiveDisclosure: true,
          scriptVaultSearch: true,
          operatorBundleAccess: true,
          operatorToolkitAccess: true,
          operatorToolkitFourViewNavigation: true,
          operatorToolkitSetupPersists: true,
          operatorToolkitOwnedFiles: true,
          operatorToolkitUpdates: true,
          operatorToolkitBillingBoundary: true,
          mobileNavigation: true,
          allWorkspaceDestinationsVisible: true,
          allToolkitDestinationsVisible: true,
          desktopOverflow: false,
          mobileOverflow: false,
          browserErrors: 0,
        },
        screenshots,
      },
      null,
      2,
    ),
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
}
