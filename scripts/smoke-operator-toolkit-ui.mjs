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
  await page.getByRole("heading", { level: 1, name: "Organize your full AI setup", exact: true }).waitFor({ timeout: 20_000 });
  await page.getByText("$297 setup + $30/month updates", { exact: true }).waitFor();
  await page.getByText("$327 due today.", { exact: true }).waitFor();
  assert((await page.locator(".sf-contents-list li").count()) === 14, `${label} downloadable contents are incomplete`);
  await page.getByRole("heading", { name: "Your first useful step." }).waitFor();
  await page.getByRole("heading", { name: "Before you buy." }).waitFor();
  assert((await page.locator(".sf-billing-note").innerText()).includes("Keep your purchased edition"), "Cancellation ownership disclosure missing");
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
  const checkoutButton = desktopPage.getByRole("link", { name: "Sign in to buy" });
  await checkoutButton.waitFor();
  await checkoutButton.click();
  await desktopPage.waitForURL((url) => {
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
    return normalizedPath === "/members" && url.searchParams.get("next") === "store-operator-toolkit";
  });
  await desktopPage.getByRole("heading", { name: "My Downloads", exact: true }).waitFor();
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobile.newPage();
  watchPage(mobilePage, "mobile");
  await verifySalesPage(mobilePage, "mobile sales page");
  await mobilePage.getByRole("button", { name: "Open navigation" }).click();
  await mobilePage
    .getByRole("navigation", { name: "Public navigation" })
    .getByRole("link", { name: "Tools", exact: true })
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
          fourteenDownloadsListed: true,
          firstActionExplained: true,
          requirementsDisclosed: true,
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
