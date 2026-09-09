// Isolated local browser checks. No real accounts, uploads or purchases.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { metadataForPath } from "../src/data/siteMetadata.js";

const base = process.env.STOREFRONT_TEST_URL || "http://127.0.0.1:5173";
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const output = "/private/tmp/aiwm-check-it-first-tests";
await fs.mkdir(output, { recursive: true });
const guide = await fs.readFile(new URL("../public/downloads/CHECK-IT-FIRST.md", import.meta.url), "utf8");
const prompt = guide.slice(guide.indexOf("\n# FOR THE AI\n") + 1).trim() + "\n";
assert(prompt.startsWith("# FOR THE AI\n"));
assert(!guide.includes("[YOUR EMAIL HERE]"));
assert(!/safe to run/i.test(guide));
assert(guide.includes("murad@aiwithmurda.com"));
assert(guide.includes("Legitimate skills and prompts naturally address AI"));
assert(guide.includes("Do not upload passwords"));
assert(!metadataForPath("/free/check-it-first/").noindex);
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
const context = await browser.newContext({ acceptDownloads: true });
let guideMode = "normal";
const mutations = [];
const errors = [];
await context.route("**/*", async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  if (url.origin !== new URL(base).origin) return route.abort();
  if (req.method() !== "GET") mutations.push(`${req.method()} ${url.pathname}`);
  if (url.pathname.startsWith("/api/")) return route.fulfill({ json: {} });
  if (url.pathname === "/downloads/CHECK-IT-FIRST.md" && guideMode !== "normal") {
    if (guideMode === "unavailable") return route.fulfill({ status: 503, body: "Unavailable" });
    if (guideMode === "html") return route.fulfill({ contentType: "text/html", body: "<!doctype html><h1>Fallback</h1>" });
    if (guideMode === "slow") await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(10_000);
page.on("pageerror", (error) => errors.push(error.message));
const text = page.getByRole("textbox", { name: "AI review prompt", exact: true });
async function visit(path = "/free/check-it-first/") {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.locator("main").waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function layout() {
  const data = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, viewport: innerWidth,
    broken: [...document.images].filter((img) => !img.complete || !img.naturalWidth).map((img) => img.src),
    overflow: [...document.querySelectorAll("h1,h2,h3,button,.sf-button")].filter((el) => el.clientWidth && el.scrollWidth > el.clientWidth + 2).map((el) => el.textContent),
  }));
  assert(data.width <= data.viewport + 1);
  assert.deepEqual(data.broken, []);
  assert.deepEqual(data.overflow, []);
}
try {
  for (const width of [360, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await visit();
    await page.getByRole("heading", { level: 1, name: "Check It First" }).waitFor();
    assert.equal(await text.inputValue(), prompt);
    assert.equal(await text.getAttribute("readonly"), "");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://aiwithmurda.com/free/check-it-first");
    assert((await page.title()).startsWith("Check It First:"));
    await layout();
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `${output}/guide-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${output}/first-viewport-${width}.png` });
    }
    await page.getByRole("link", { name: "Get the AI review prompt", exact: true }).click();
    assert.equal(new URL(page.url()).hash, "#ai-review");
    if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/prompt-viewport-${width}.png` });
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value) => { window.__copied = value; } } }));
    const copyButton = page.getByRole("button", { name: "Copy the review prompt", exact: true });
    await copyButton.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Prompt copied", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__copied), prompt);
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Clipboard blocked"); } } }));
    await page.getByRole("button", { name: "Prompt copied", exact: true }).click();
    await page.getByText(/Clipboard unavailable/).waitFor();
    await page.getByRole("button", { name: "Select all text", exact: true }).click();
    const selected = await text.evaluate((el) => ({ start: el.selectionStart, end: el.selectionEnd, length: el.value.length, focused: document.activeElement === el }));
    assert.equal(selected.start, 0);
    assert.equal(selected.end, selected.length);
    assert(selected.focused);
    await layout();
    if ([390, 1440].includes(width)) await page.locator("#ai-review").screenshot({ path: `${output}/prompt-${width}.png` });
    console.log(`PASS: guide, keyboard copy, fallback and layout at ${width}px`);
  }
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download the guide", exact: true }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "CHECK-IT-FIRST.md");
  assert.equal(await fs.readFile(await download.path(), "utf8"), guide);
  assert.equal(await download.failure(), null);

  for (const mode of ["unavailable", "html"]) {
    guideMode = mode;
    await visit();
    await page.getByRole("alert").filter({ hasText: "The prompt could not load" }).waitFor();
    assert.equal(await text.inputValue(), "");
    assert.equal(await page.getByRole("button", { name: "Copy the review prompt" }).count(), 0);
    guideMode = "normal";
    await page.getByRole("button", { name: "Retry loading", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#check-review-prompt")?.value.startsWith("# FOR THE AI"));
    assert.equal(await text.inputValue(), prompt);
  }
  guideMode = "slow";
  await page.goto(base + "/free/check-it-first", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Copy the review prompt", exact: true }).waitFor();
  assert(await page.getByRole("button", { name: "Copy the review prompt", exact: true }).isDisabled());
  await page.waitForFunction(() => document.querySelector("#check-review-prompt")?.value.startsWith("# FOR THE AI"));
  guideMode = "normal";

  for (const path of ["/", "/store", "/store?view=free"]) {
    await visit(path);
    assert.equal(await page.locator("[data-catalog-item]").first().getAttribute("data-catalog-item"), "check-it-first");
  }
  for (const path of ["/start", "/free/inbox-cleanup"]) {
    await visit(path);
    assert.equal(await page.locator(".sf-check-notice a").getAttribute("href"), "/free/check-it-first");
    assert(await page.getByRole("link", { name: /Download the free/ }).isVisible());
  }
  assert.deepEqual(mutations, [], "Review page must not upload or mutate data");
  assert.deepEqual(errors, []);
  console.log("PASS: exact download, failure/retry, loading state, first placement, notices, metadata and no uploads");
} finally {
  await browser.close();
}
