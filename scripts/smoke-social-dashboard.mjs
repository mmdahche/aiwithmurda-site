import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { getSiteUrl, loadEnv } from "./env-loader.mjs";

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const outputDir = process.env.SOCIAL_UI_OUTPUT_DIR || "/tmp/aiwithmurda-social-dashboard";
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

async function verifyDashboard(page, label) {
  await page.goto(`${siteUrl}/60`, { waitUntil: "domcontentloaded" });
  await page.getByText("Combined audience", { exact: true }).waitFor({ timeout: 20_000 });
  const ticker = page.locator(".public-follower-ticker");
  await ticker.locator("small").waitFor();
  await ticker.locator(".follower-source-strip > *").nth(4).waitFor({ timeout: 20_000 });
  assert((await ticker.locator(".follower-source-strip > *").count()) === 5, `${label} should show five platform cards`);
  for (const labelText of ["Twitch", "TikTok", "Instagram", "YouTube", "X"]) {
    await ticker.getByText(labelText, { exact: true }).waitFor();
  }
  assert(!(await ticker.textContent()).includes("12,996"), `${label} leaked the old seed follower total`);
  await auditLayout(page, label);
}

async function verifyOverlay(page, label) {
  await page.goto(`${siteUrl}/obs/followers`, { waitUntil: "domcontentloaded" });
  await page.getByText("Total followers", { exact: true }).waitFor({ timeout: 20_000 });
  assert((await page.locator(".follower-overlay-sources").count()) === 0, `${label} still exposes per-platform rows`);
  assert((await page.locator(".follower-gain-signal").count()) === 1, `${label} is missing the gain signal`);
  const overlayText = await page.locator(".follower-overlay").textContent();
  for (const platform of ["Twitch", "TikTok", "Instagram", "YouTube"]) {
    assert(!overlayText.includes(platform), `${label} exposes ${platform} instead of the combined-only view`);
  }
  await auditLayout(page, label);
}

try {
  await fs.mkdir(outputDir, { recursive: true });
  browser = await chromium.launch({ headless: true });

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const desktopPage = await desktop.newPage();
  watchPage(desktopPage, "desktop");
  await verifyDashboard(desktopPage, "desktop dashboard");
  await capture(desktopPage, "01-dashboard-desktop");
  await verifyOverlay(desktopPage, "desktop overlay");
  await capture(desktopPage, "02-overlay-desktop");
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobile.newPage();
  watchPage(mobilePage, "mobile");
  await verifyDashboard(mobilePage, "mobile dashboard");
  await capture(mobilePage, "03-dashboard-mobile");
  await verifyOverlay(mobilePage, "mobile overlay");
  await capture(mobilePage, "04-overlay-mobile");
  await mobile.close();

  assert(browserErrors.length === 0, `Browser errors detected:\n${browserErrors.join("\n")}`);
  console.log(JSON.stringify({ ok: true, siteUrl, screenshots, browserErrors: 0 }, null, 2));
} finally {
  if (browser) await browser.close().catch(() => {});
}
