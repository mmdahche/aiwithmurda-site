import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { getSiteUrl, loadEnv } from "./env-loader.mjs";

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const outputDir = process.env.TOOLKIT_UI_OUTPUT_DIR || "/tmp/aiwithmurda-operator-toolkit-ui";
const browserErrors = [];
const screenshots = [];
let browser = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function watchPage(page, label) {
  page.on("pageerror", (error) => browserErrors.push(`${label}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`${label}: console: ${message.text()}`);
  });
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
}

async function capture(page, name) {
  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshots.push(filePath);
}

async function verifySalesPage(page, label) {
  await page.goto(`${siteUrl}/operator-toolkit`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "The Operator Toolkit", exact: true }).waitFor({ timeout: 20_000 });
  await page.getByText("$297 setup + $30/month", { exact: true }).waitFor();
  await page.getByText("$327 due today, then $30/month", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Buy the amount of system you are ready to operate." }).waitFor();
  assert((await page.locator(".operator-tier-grid article").count()) === 3, `${label} tier comparison is incomplete`);
  assert((await page.locator(".operator-toolkit-outcomes article").count()) === 4, `${label} outcomes are incomplete`);
  assert((await page.locator(".operator-toolkit-path article").count()) === 5, `${label} install path is incomplete`);
  assert((await page.locator(".operator-toolkit-collections article").count()) === 4, `${label} skill collections are incomplete`);
  await page.getByRole("heading", { name: "No hidden ownership rules." }).waitFor();
  await auditLayout(page, label);
}

try {
  await fs.mkdir(outputDir, { recursive: true });
  browser = await chromium.launch({ headless: true });

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const desktopPage = await desktop.newPage();
  watchPage(desktopPage, "desktop");
  await verifySalesPage(desktopPage, "desktop sales page");
  await capture(desktopPage, "01-operator-toolkit-desktop");
  const checkoutButton = desktopPage.getByRole("button", { name: "Create profile to continue" }).first();
  await checkoutButton.waitFor();
  await checkoutButton.click();
  await desktopPage.waitForURL((url) => {
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
    return normalizedPath === "/members" && url.searchParams.get("next") === "operator-toolkit";
  });
  await desktopPage.getByRole("heading", { name: "Set up. Build. Verify." }).waitFor();
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobile.newPage();
  watchPage(mobilePage, "mobile");
  await verifySalesPage(mobilePage, "mobile sales page");
  await mobilePage.getByRole("button", { name: "Open navigation" }).click();
  await mobilePage
    .getByRole("navigation", { name: "Public navigation" })
    .getByRole("link", { name: "Full System" })
    .waitFor();
  await mobilePage.getByRole("button", { name: "Close navigation" }).click();
  await capture(mobilePage, "02-operator-toolkit-mobile");
  await mobile.close();

  assert(browserErrors.length === 0, `Browser errors detected:\n${browserErrors.join("\n")}`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        siteUrl,
        checks: {
          transparentInitialCharge: true,
          transparentRenewal: true,
          threeTierComparison: true,
          fourOutcomes: true,
          fiveStageInstallation: true,
          fourSkillCollections: true,
          ownershipBoundary: true,
          profileHandoff: true,
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
}
