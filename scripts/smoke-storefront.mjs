// Local UI contract tests. Auth, API calls, and checkout are mocked;
// this never creates a customer, charges a card, or contacts production.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { coreMemberAssets, operatorBundleAssets, operatorToolkitAssets } from "../src/data/memberAssets.js";
import { getStorefrontReturnPath } from "../src/data/storefront.js";
import { catalogViews, featuredToolKeys, getCatalogView, storefrontShelf } from "../src/data/storefrontCatalog.js";

const base = process.env.STOREFRONT_TEST_URL || "http://127.0.0.1:5173";
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Tests must target a local preview");
const output = process.env.STOREFRONT_TEST_OUTPUT || "/private/tmp/aiwm-storefront-tests";
const widths = process.env.STOREFRONT_SKIP_LAYOUTS ? [] : [1440, 1920, 768, 390, 360];
const layoutRoutes = ["/", "/store", "/store?view=free", "/store?view=paid", "/about", "/start", "/store/future-proof-method", "/store/operator-bundle", "/store/operator-toolkit", "/store/memory-os", "/members"];
await fs.mkdir(output, { recursive: true });
assert.equal(getStorefrontReturnPath("?next=store-operator-bundle"), "/store/operator-bundle");
assert.equal(getStorefrontReturnPath("?next=https://example.com"), null);
assert.equal(getStorefrontReturnPath("?next=store-../../admin"), null);
assert.equal(getCatalogView("?view=not-a-view"), "all");
for (const { key } of catalogViews) assert.equal(getCatalogView(`?view=${key}`), key);
assert.equal(storefrontShelf.length, 17);
assert.equal(new Set(storefrontShelf.map((file) => file.key)).size, 17);
for (const file of storefrontShelf) {
  assert.equal(file.includes.length, 3, `${file.key}: three concise inclusions`);
  assert(!Object.hasOwn(file, "price"), "Unconfigured standalone prices must not enter the public catalog");
  for (const path of file.files) await fs.access(new URL(`../products/${file.key}/${path}`, import.meta.url));
  if (file.preview) {
    const source = await fs.readFile(new URL(`../products/${file.key}/${file.preview.source}`, import.meta.url), "utf8");
    const normalize = (text) => text.replace(/\s+/g, " ").trim();
    assert(normalize(source).includes(normalize(file.preview.excerpt)), `${file.key}: preview must match its actual source`);
    assert(file.preview.excerpt.length < 250, "Paid previews must stay limited, not publish full payloads");
  }
}
assert(featuredToolKeys.every((key) => storefrontShelf.find((file) => file.key === key)?.preview));

const mockAuth = `
let listener;
const session = { access_token: "storefront-test-token", user: { id: "test-user", email: "buyer@example.com" } };
const current = () => localStorage.getItem("sf-test-auth") ? session : null;
export const isSupabaseConfigured = () => true;
export const getSupabaseClient = () => ({auth: {
  getSession: async () => ({data: {session: current()}}),
  onAuthStateChange: (fn) => { listener = fn; return {data:{subscription:{unsubscribe(){}}}}; },
  signInWithPassword: async () => {localStorage.setItem("sf-test-auth","yes"); listener?.("SIGNED_IN",session); return {data:{session},error:null};},
  signUp: async ({options}) => {window.__testEmailRedirect=options.emailRedirectTo; return {data:{session:null},error:null};},
  signInWithOtp: async ({options}) => {window.__testEmailRedirect=options.emailRedirectTo; return {error:null};},
  signOut: async () => {localStorage.removeItem("sf-test-auth");listener?.("SIGNED_OUT",null);return {error:null};}
}});
`;
let entitlements = [];
let failCheckout = false;
let failDownload = false;
let failSubscribe = false;
let checkoutState = "paid";
let adminAllowed = false;
const memberFixture = () => ({
  profile: { email: "buyer@example.com" },
  entitlements: entitlements.map((key) => ({ product_key: key, status: "active" })),
  product: { assets: coreMemberAssets },
  operatorBundle: { assets: operatorBundleAssets },
  operatorToolkit: { assets: operatorToolkitAssets },
});
const requests = [];
const pageErrors = [];
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
await context.route("**/*", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== new URL(base).origin) return route.abort();
  if (url.pathname === "/src/lib/supabase.js") return route.fulfill({ contentType: "application/javascript", body: mockAuth });
  if (url.pathname === "/__checkout_test") return route.fulfill({ contentType: "text/html", body: "<h1>Checkout redirect verified</h1>" });
  if (!url.pathname.startsWith("/api/")) return route.continue();
  requests.push({ path: url.pathname, method: request.method(), auth: request.headers().authorization });
  if (url.pathname === "/api/admin/session") {
    assert.equal(request.headers().authorization, "Bearer storefront-test-token");
    return route.fulfill(adminAllowed ? { json: { ok: true, admin: { email: "owner@example.com" } } } : { status: 403, json: { error: "admin_email_not_allowed" } });
  }
  if (url.pathname === "/api/me") return route.fulfill({ json: memberFixture() });
  if (url.pathname.startsWith("/api/access/session/")) {
    assert.equal(request.headers().authorization, "Bearer storefront-test-token");
    if (checkoutState === "pending") return route.fulfill({ status: 409, json: { error: "checkout_not_paid" } });
    if (checkoutState === "mismatch") return route.fulfill({ status: 403, json: { error: "checkout_user_mismatch" } });
    return route.fulfill({ json: { ok: true, payment_status: "paid", access: memberFixture() } });
  }
  if (url.pathname.startsWith("/api/checkout/")) {
    assert.equal(request.headers().authorization, "Bearer storefront-test-token");
    return route.fulfill(failCheckout ? { status: 503, json: { error: "Checkout temporarily unavailable" } } : { json: { url: `${base}/__checkout_test` } });
  }
  if (url.pathname.startsWith("/api/member-assets/")) {
    assert.equal(request.headers().authorization, "Bearer storefront-test-token");
    return route.fulfill(failDownload ? { status: 403, json: { error: "access_required" } } : { contentType: "text/markdown", body: "# Test-only start guide\n" });
  }
  if (url.pathname === "/api/subscribe") return route.fulfill(failSubscribe ? { status: 503, json: { error: "unavailable" } } : { json: { ok: true } });
  return route.fulfill({ json: {} });
});
const page = await context.newPage();
page.setDefaultTimeout(10_000);
page.on("pageerror", (error) => pageErrors.push(error.message));

async function visit(path) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.locator("main").waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function auditLayout(label) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth, width: document.documentElement.scrollWidth,
    brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src),
    overflows: [...document.querySelectorAll("h1,h2,h3,button,.sf-button,.nav-cta")].filter((element) => element.getBoundingClientRect().width && element.scrollWidth > element.clientWidth + 2).map((element) => element.textContent),
  }));
  assert(result.width <= result.viewport + 1, `${label}: horizontal overflow`);
  assert.deepEqual(result.brokenImages, [], `${label}: broken images`);
  assert.deepEqual(result.overflows, [], `${label}: text overflow`);
}
async function screenshot(name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }); }

try {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    for (const path of layoutRoutes) {
      await visit(path);
      await auditLayout(`${width} ${path}`);
      if ([1440, 390].includes(width)) await screenshot(`${width}-${path.replace(/[/?=]/g, "_") || "home"}`);
      assert(!(await page.title()).includes("60-Day AI Operator Sprint"));
    }
    console.log(`PASS: ${width}px layouts`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit("/");
  await page.screenshot({ path: `${output}/home-first-viewport.png` });
  await page.locator(".sf-free-pack").screenshot({ path: `${output}/free-pack-desktop.png` });
  await page.locator(".sf-tool-grid").screenshot({ path: `${output}/featured-tools-desktop.png` });
  await page.locator(".sf-offer-grid").screenshot({ path: `${output}/packages-desktop.png` });
  assert(!(await page.locator("main").innerText()).includes("LIVE NOW"));
  assert(!requests.some((request) => /followers|campaign|daily-logs/.test(request.path)), "Shop must not poll campaign metrics");
  assert.equal(await page.locator(".sf-tool-card").count(), 3);
  assert.equal(await page.locator("[data-catalog-item='free-pack']").count(), 1);
  assert.equal(await page.locator(".sf-sample-grid article").count(), 3);
  await page.locator("summary").filter({ hasText: "Is there a monthly charge?" }).click();
  assert((await page.locator("details[open]").innerText()).includes("$327 today"));

  await visit("/store");
  assert.equal(await page.locator(".sf-tool-card").count(), 17);
  assert.equal(await page.locator("[data-catalog-item]").count(), 18, "One pack plus 17 paid tools; no double counting");
  await page.getByRole("button", { name: "Free Tools", exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get("view"), "free");
  assert.equal(await page.locator(".sf-tool-card, .sf-offer").count(), 0);
  assert.equal(await page.locator("[data-catalog-item]").count(), 1);
  await page.getByRole("button", { name: "Paid Packages", exact: true }).click();
  assert.equal(await page.locator(".sf-offer").count(), 3);
  assert.equal(await page.locator(".sf-free-pack, .sf-tool-card").count(), 0);
  assert((await page.locator(".sf-offer.sf-yellow").innerText()).includes("$327 today"));
  assert((await page.locator(".sf-offer.sf-yellow").innerText()).includes("Then $30/month"));
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("button", { name: "Paid Packages", exact: true }).getAttribute("aria-pressed"), "true");
  await page.goBack();
  assert.equal(await page.getByRole("button", { name: "Free Tools", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "All Tools", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search tools" }).fill("memory");
  assert.equal(await page.locator(".sf-tool-card").count(), 1);
  assert.equal(await page.locator(".sf-free-pack").count(), 0, "A nonmatching free pack must not remain in search results");
  await page.getByRole("searchbox", { name: "Search tools" }).fill("no-matching-tool");
  await page.getByRole("heading", { name: "No matching tools." }).waitFor();
  await page.getByRole("button", { name: "Reset filters" }).click();
  assert.equal(await page.locator(".sf-tool-card").count(), 17);
  await page.getByRole("button", { name: "Business and content", exact: true }).click();
  assert.equal(await page.locator(".sf-tool-card").count(), 5);
  await visit("/store?view=free");
  await page.getByRole("link", { name: "Read the sample", exact: true }).nth(2).click();
  await page.getByLabel("Contents of daily-operator-checklist.md").waitFor();
  await page.getByRole("button", { name: /Make AI check its work/ }).click();
  assert.equal(await page.getByRole("button", { name: /Make AI check its work/ }).getAttribute("aria-pressed"), "true");
  await page.getByLabel("Contents of verify-before-claiming.md").waitFor();
  await visit("/start?file=999#preview");
  await page.getByLabel("Contents of inspect-before-edit.md").waitFor();
  for (const file of storefrontShelf) {
    await visit(`/store/${file.key}`);
    await page.getByRole("heading", { level: 1, name: file.name, exact: true }).waitFor();
    const packageLink = page.getByRole("link", { name: "Review the package", exact: true });
    assert.equal(await packageLink.getAttribute("href"), file.offer ? `/store/${file.offer.slug}` : "/operator-arsenal");
    assert.equal(await page.getByRole("button", { name: /Continue to checkout/ }).count(), 0);
    await auditLayout(`detail ${file.key}`);
  }
  await visit("/store/not-a-product");
  await page.getByRole("heading", { name: "That tool isn't on the shelf." }).waitFor();

  await visit("/start");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download the free starter pack", exact: true }).click();
  const freeDownload = await downloadEvent;
  assert.equal(freeDownload.suggestedFilename(), "operator-sampler.zip");
  assert.equal(await freeDownload.failure(), null);
  const bytes = await fs.readFile(await freeDownload.path());
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
  failSubscribe = true;
  await page.getByLabel("Email address", { exact: true }).fill("test@example.com");
  await page.getByRole("button", { name: "Subscribe to updates" }).click();
  await page.getByRole("alert").waitFor();
  failSubscribe = false;
  await page.getByRole("button", { name: "Subscribe to updates" }).click();
  await page.getByRole("heading", { name: "You're on the list." }).waitFor();

  // A buyer must retain the selected bundle through password and email login.
  await visit("/store/operator-bundle");
  await page.getByRole("link", { name: "Sign in to buy" }).click();
  assert(page.url().endsWith("/members?next=store-operator-bundle"));
  await page.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await page.getByRole("button", { name: "Email me a secure sign-in link" }).click();
  assert.equal(await page.evaluate(() => window.__testEmailRedirect), `${base}/members?next=store-operator-bundle`);
  await page.getByLabel("Password", { exact: true }).fill("Test-only-password-123!");
  await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${base}/store/operator-bundle`);
  failCheckout = true;
  await page.getByRole("button", { name: /Continue to checkout/ }).click();
  await page.getByRole("alert").waitFor();
  failCheckout = false;
  await page.getByRole("button", { name: /Continue to checkout/ }).click();
  await page.getByRole("heading", { name: "Checkout redirect verified" }).waitFor();
  assert(requests.some((request) => request.path === "/api/checkout/live-builds"));

  for (const [slug, endpoint] of [["future-proof-method", "future-proof-method"], ["operator-toolkit", "operator-toolkit"]]) {
    await visit(`/store/${slug}`);
    await page.getByRole("button", { name: /Continue to checkout/ }).click();
    await page.waitForURL(`${base}/__checkout_test`);
    assert(requests.some((request) => request.path === `/api/checkout/${endpoint}`));
  }

  // A callback must remain retryable until the server verifies ownership and payment.
  for (const [state, heading] of [["pending", "Payment not finished yet"], ["mismatch", "Access check needs attention"]]) {
    checkoutState = state;
    await visit("/members?checkout=success&session_id=cs_test_callback");
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    assert(new URL(page.url()).searchParams.has("session_id"));
    assert.equal(await page.getByRole("heading", { name: "Your files", exact: true }).count(), 0);
    assert(!(await page.locator("main").innerText()).includes("Payment verified."));
  }
  entitlements = ["new_wave_live_builds"];
  checkoutState = "paid";
  await page.getByRole("button", { name: "Refresh access", exact: true }).click();
  await page.getByRole("heading", { name: "Your files", exact: true }).waitFor();
  assert.equal(new URL(page.url()).search, "?checkout=success");
  const verifiedRequests = requests.filter((request) => request.path.startsWith("/api/access/session/")).length;
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Your files", exact: true }).waitFor();
  assert.equal(requests.filter((request) => request.path.startsWith("/api/access/session/")).length, verifiedRequests);

  entitlements = ["future_proof_method"];
  await visit("/members");
  await page.getByRole("heading", { name: "Your files", exact: true }).waitFor();
  assert.equal(await page.locator(".sf-library-files article").count(), 12);
  await page.getByRole("button", { name: "Next download page" }).click();
  assert.equal(await page.locator(".sf-library-files article").count(), coreMemberAssets.length - 12);
  await page.getByRole("button", { name: "Previous download page" }).click();
  assert.equal(await page.getByRole("group", { name: "Download collections" }).getByRole("button", { name: "Operator Toolkit", exact: true }).count(), 0, "Unowned toolkit must not appear in library");
  failDownload = true;
  await page.getByRole("button", { name: "Download start guide" }).click();
  await page.locator(".sf-library-start").getByRole("alert").waitFor();
  failDownload = false;
  const memberEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download start guide" }).click();
  const memberDownload = await memberEvent;
  assert.equal(memberDownload.suggestedFilename(), "future-proof-method-60-minute-quickstart.md");
  assert.equal(await memberDownload.failure(), null);
  await page.getByRole("searchbox", { name: "Search your downloads" }).fill("quickstart");
  assert.equal(await page.locator(".sf-library-files article").count(), 1);
  await screenshot("library-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await auditLayout("member library mobile");
  await screenshot("library-mobile");
  await page.getByRole("button", { name: "Open my workspace" }).click();
  await page.getByRole("heading", { name: "Get both builders working." }).waitFor();
  await auditLayout("existing member workspace");
  await visit("/store/future-proof-method");
  await page.getByRole("link", { name: /Already yours/ }).waitFor();
  assert.equal(await page.getByRole("button", { name: /Continue to checkout/ }).count(), 0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "About Murad" }).click();
  await page.waitForURL(`${base}/about`);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit("/");
  await auditLayout("reduced motion homepage");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => localStorage.removeItem("sf-test-auth"));
  await visit("/admin?view=overlay");
  await page.getByRole("heading", { name: "Admin login required" }).waitFor();
  assert.equal(await page.locator(".app-shell, .overlay-route").count(), 0, "Admin overlay must stay behind login");
  await page.getByLabel("Admin email").fill("buyer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Test-only-password-123!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByText("This Supabase profile is signed in, but it is not on the admin allowlist.").waitFor();
  assert.equal(await page.locator(".app-shell").count(), 0, "A paid customer is not an admin");
  adminAllowed = true;
  await visit("/admin?view=overlay");
  await page.getByRole("heading", { name: "OBS Overlay", exact: true }).waitFor();
  assert.equal(await page.locator(".overlay-showcase").count(), 2, "Both scoreboard and follower overlays remain available");
  await screenshot("admin-overlay-desktop");
  const adminNav = page.getByRole("navigation", { name: "Main navigation", exact: true });
  assert.equal(await adminNav.getByRole("button").count(), 5);
  await adminNav.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.locator(".dashboard-grid").waitFor();
  await screenshot("admin-dashboard-desktop");
  for (const [label, heading] of [["Daily Log", "Today’s Command"], ["Deck", "Proof Deck"], ["Settings", "Settings"]]) {
    await adminNav.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
  }
  for (const path of ["/obs", "/overlay", "/obs/followers", "/overlay/followers", "/?view=overlay"]) {
    const from = requests.length;
    await visit(path);
    assert.equal(await page.locator(".overlay-route").count(), 1);
    assert(requests.slice(from).some((request) => request.path === "/api/daily-logs"), `${path}: broadcast data still loads`);
  }
  await visit("/");
  assert.equal(await page.locator(".app-shell, .overlay-route").count(), 0, "Owner's public homepage remains the shop");
  assert.deepEqual(pageErrors, [], "No browser runtime errors");
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ result: "PASS", publicLayouts: widths.length * layoutRoutes.length, tests: ["responsive layouts", "free/paid filters and history", "honest catalog counts", "source-verified previews and files", "all 17 product details", "file preview", "FAQ", "search and filters", "free ZIP", "signup error and retry", "login continuation", "checkout routing and retry", "owned-product protection", "library filtering and pagination", "download retry", "existing course access", "mobile navigation", "admin login and customer denial", "full owner dashboard navigation", "both admin overlays", "existing OBS routes and data feeds"], requests, pageErrors, scope: "Local UI tests with mocked auth/API. No real payment or production mutation." }, null, 2));
  console.log(`PASS: Storefront UI contracts and ${widths.length * layoutRoutes.length} responsive layouts. Report: ${output}/report.json`);
} finally { await browser.close(); }
