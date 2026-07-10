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

  const entitlementRows = ["future_proof_method", "new_wave_live_builds"].map((productKey) => ({
    user_id: userId,
    product_key: productKey,
    status: "active",
    revoked_at: null,
  }));
  const entitlements = await admin.from("entitlements").upsert(entitlementRows, {
    onConflict: "user_id,product_key",
  });
  if (entitlements.error) throw entitlements.error;

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
  await saveScreenshot(mobilePage, "07-member-start-mobile");

  await mobilePage.getByRole("link", { name: /Continue module/ }).click();
  await mobilePage.getByRole("heading", { name: "Module 1: Set Up Both AI Builders" }).waitFor();
  await auditLayout(mobilePage, "mobile lesson");
  await saveScreenshot(mobilePage, "08-module-one-mobile");

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
          bothEntitlementsVisible: true,
          twentyStepCurriculum: true,
          buildTrackPersists: true,
          lessonProgressiveDisclosure: true,
          scriptVaultSearch: true,
          operatorBundleAccess: true,
          mobileNavigation: true,
          allWorkspaceDestinationsVisible: true,
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
