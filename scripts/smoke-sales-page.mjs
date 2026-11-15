// Local UI contract tests for the public site: the home page, /tools, /about, Terms and Privacy in the live
// site look, the Muse Control Kit sales page at /tools/musekit with its own focused header and footer,
// plus the admin workspace and OBS overlay routes that must stay as they were.
// Runs against the Vite dev server. Auth and every /api route are mocked, cross-origin requests are blocked;
// nothing here charges a card, creates a customer or contacts production.
//
//   npx vite --port 5301 --host 127.0.0.1 --strictPort
//   SALES_TEST_URL=http://127.0.0.1:5301 node scripts/smoke-sales-page.mjs
//
// Optional: SALES_TEST_OUTPUT (screenshots + report.json), PLAYWRIGHT_CHANNEL (default "chrome").
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { checkoutHref, checkoutIsPlaceholder, faq, footerNotes, kitPieces, museKit, setups } from "../src/data/museKit.js";
import { publicPageMetadata } from "../src/data/siteMetadata.js";
import { featuredTool, tools } from "../src/data/tools.js";

const base = (process.env.SALES_TEST_URL || "http://127.0.0.1:5301").replace(/\/+$/, "");
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Tests must target a local dev server");
const output = process.env.SALES_TEST_OUTPUT || path.join(os.tmpdir(), "aiwm-sales-tests");
await fs.mkdir(output, { recursive: true });

// Viewports where layout matters (phone first: almost every visitor comes from Instagram).
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const phone = { width: 390, height: 844 };
const salesH1 = "Muse writes the listing. You say yes.";
const homeH1 = "Download it. Make it yours.";
const KIT = "/tools/musekit";
// Site pages: the live look, with the site header (Tools, About Murad) and the site footer.
const sitePages = [
  { route: "/", h1: homeH1 },
  { route: "/tools", h1: "Tools" },
  { route: "/about", h1: "I'm Murad. I build around real problems." },
  { route: "/terms", h1: "Terms of Service" },
  { route: "/privacy", h1: "Privacy Policy" },
];
// Old products and pages taken off the site: their names may not appear in public text or links.
const oldProductNames = ["Future Proof Method", "New Wave", "Operator Bundle", "Operator Toolkit", "Operator Arsenal", "Operator Sampler", "Starter Pack", "Check It First", "Inbox Cleanup", "Operator Updates", "My Downloads", "Build log archive"];

// The owner's brief, section 6: the two setups, word for word.
const briefSetups = [
  { name: "Ask me first", text: "Muse writes your listings and drafts every reply to buyers. Nothing goes out until you say yes. Best if you're new to Muse." },
  { name: "Automatic", text: "You still approve every listing and its price. Once you've answered Muse's questions about an item, Muse answers buyers about that item by itself. Every price you agree to waits for your yes, and when a buyer asks to come by, Muse asks you which day and time work before it tells them." },
];
// The brief, section 11: questions the FAQ must include.
const requiredQuestions = [
  "Do I need Muse?",
  "Will Muse post or message buyers without my approval?",
  "Which setup should I pick?",
  "Does this guarantee sales?",
];
// The brief's copy rules. "guarantee" is allowed only where the brief itself asks for it.
const bannedCopy = [
  [/\bguaranteed\b/i, '"guaranteed"'],
  [/\bproven\b/i, '"proven"'],
  [/battle[-\s]?tested/i, '"battle-tested"'],
  [/\bverified\b/i, '"verified"'],
  [/fully[-\s]?automated/i, '"fully automated"'],
  [/draft[-\s]?only/i, '"draft-only"'],
  [/you hit send yourself/i, '"you hit send yourself"'],
  [/most popular/i, '"Most Popular"'],
  [/\blimited\b/i, '"limited"'],
  [/count\s?down/i, "countdown"],
  [/\bspots? (left|remaining)\b/i, "scarcity"],
  [/\bonly \d+ (left|remaining)\b/i, "scarcity"],
  [/\bbonus(es)?\b/i, "bonuses"],
  [/\bworth \$|\bvalued? at\b|\btotal value\b/i, "value totals"],
  [/\b(earn|make) (\$|money|more money|extra money)/i, "income promise"],
];
const allowedGuaranteeCopy = [/doesn['’]t guarantee sales/gi, /does this guarantee sales\?/gi, /refund or guarantee terms/gi];
// Server-side redirects in server/index.mjs (the old shop, retiredPagePaths and the kit aliases); no public
// page may link to one.
const retiredPagePaths = [
  /^\/(store|kit|live-builds|operator-toolkit|operator-arsenal|start|members|60|live|free|day|downloads|musekit|muse-kit)\/?$/i,
  /^\/tools\/(muse|muse-kit)\/?$/i,
  /^\/store\/[^/]+\/?$/,
  /^\/free\/[^/]+\/?$/,
  /^\/members\/module\/[^/]+\/?$/,
  /^\/day\/[^/]+\/?$/,
  /^\/downloads\/[^/]+$/,
];
// Cross-origin hosts the page may load: none, unless the owner has set the YouTube sales video.
const allowedCrossOrigin = museKit.salesVideoYouTubeId
  ? [/(^|\.)youtube-nocookie\.com$/, /(^|\.)youtube\.com$/, /(^|\.)ytimg\.com$/, /(^|\.)googlevideo\.com$/, /(^|\.)ggpht\.com$/, /(^|\.)google\.com$/, /(^|\.)gstatic\.com$/, /(^|\.)doubleclick\.net$/]
  : [];

const mockAuth = `
let listener;
const session = { access_token: "sales-test-token", user: { id: "test-user", email: "buyer@example.com" } };
const current = () => localStorage.getItem("sp-test-auth") ? session : null;
export const isSupabaseConfigured = () => true;
export const getSupabaseClient = () => ({auth: {
  getSession: async () => ({data: {session: current()}}),
  onAuthStateChange: (fn) => { listener = fn; return {data:{subscription:{unsubscribe(){}}}}; },
  signInWithPassword: async () => {localStorage.setItem("sp-test-auth","yes"); listener?.("SIGNED_IN",session); return {data:{session},error:null};},
  signUp: async () => ({data: {session: null}, error: null}),
  signInWithOtp: async () => ({error: null}),
  signOut: async () => {localStorage.removeItem("sp-test-auth");listener?.("SIGNED_OUT",null);return {error:null};}
}});
`;

let adminAllowed = false;
const requests = [];
const consoleErrors = [];
const pageErrors = [];
const results = [];

const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
const context = await browser.newContext({ viewport: phone });
await context.route("**/*", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const sameOrigin = url.origin === new URL(base).origin;
  requests.push({ url: url.href, path: url.pathname, sameOrigin, host: url.hostname, method: request.method(), page: pageUrl() });
  if (!sameOrigin) return allowedCrossOrigin.some((host) => host.test(url.hostname)) ? route.continue() : route.abort();
  if (url.pathname === "/src/lib/supabase.js") return route.fulfill({ contentType: "application/javascript", body: mockAuth });
  if (!url.pathname.startsWith("/api/")) return route.continue();
  if (url.pathname === "/api/admin/session") {
    if (request.headers().authorization !== "Bearer sales-test-token") return route.fulfill({ status: 401, json: { error: "missing_bearer_token" } });
    return route.fulfill(adminAllowed ? { json: { ok: true, admin: { email: "owner@example.com" } } } : { status: 403, json: { error: "admin_email_not_allowed" } });
  }
  return route.fulfill({ json: {} });
});
const page = await context.newPage();
page.setDefaultTimeout(10_000);
page.on("pageerror", (error) => pageErrors.push({ message: error.message, page: pageUrl() }));
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), page: pageUrl() }); });
function pageUrl() { try { return page ? new URL(page.url()).pathname + new URL(page.url()).search : ""; } catch { return ""; } }

// ---------- harness ----------
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, result: "PASS" });
    console.log(`PASS: ${name}`);
  } catch (error) {
    results.push({ name, result: "FAIL", error: error.message });
    console.log(`FAIL: ${name}\n      ${String(error.message).split("\n").join("\n      ")}`);
  }
}
function none(list, label) {
  assert(list.length === 0, `${label}: ${JSON.stringify(list, null, 1).slice(0, 1500)}`);
}
const mark = () => ({ r: requests.length, c: consoleErrors.length, p: pageErrors.length });
const since = (m) => ({ requests: requests.slice(m.r), consoleErrors: consoleErrors.slice(m.c), pageErrors: pageErrors.slice(m.p) });
const norm = (text) => String(text || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

async function visit(route, { settle = 0 } = {}) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.locator("main").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (settle) await page.waitForTimeout(settle);
}
async function setViewport(viewport) { await page.setViewportSize(viewport); }
async function screenshot(name) { await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true }); }

// Layout audit of the current page. Opens every <details> first so FAQ answers are measured too.
async function auditLayout(label, { tapTargets = false } = {}) {
  const result = await page.evaluate(() => {
    for (const details of document.querySelectorAll("details")) details.open = true;
    const vw = window.innerWidth;
    const box = (el) => el.getBoundingClientRect();
    const describe = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)}"`;
    const rendered = (el) => { const b = box(el); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== "hidden"; };

    const clipped = [];
    for (const el of document.querySelectorAll("h1,h2,h3,h4,h5,h6,a,button,summary,.mx-btn,[data-checkout-link],.sp-price-amount")) {
      if (!rendered(el)) continue;
      const style = getComputedStyle(el);
      const b = box(el);
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) clipped.push(`${describe(el)} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
      if (/(hidden|clip)/.test(style.overflowY + style.overflow) && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) clipped.push(`${describe(el)} scrollHeight ${el.scrollHeight} > ${el.clientHeight}`);
      if (style.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth) clipped.push(`${describe(el)} ellipsis`);
      if (!el.closest(".mx-skip") && (b.left < -1 || b.right > vw + 1)) clipped.push(`${describe(el)} outside the viewport (${Math.round(b.left)}..${Math.round(b.right)} of ${vw})`);
    }

    const smallText = [];
    const offscreenText = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,noscript,template")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (!rects.length || getComputedStyle(parent).visibility === "hidden") continue;
      const size = parseFloat(getComputedStyle(parent).fontSize);
      if (size < 12) smallText.push(`${size}px ${describe(parent)}`);
      if (!parent.closest(".mx-skip") && rects.some((r) => r.left < -1 || r.right > vw + 1)) offscreenText.push(describe(parent));
    }

    const smallTargets = [];
    for (const el of document.querySelectorAll("a[href],button,summary,input,select,textarea,[role=button],[tabindex]:not([tabindex='-1'])")) {
      if (!rendered(el)) continue;
      // Links inside a sentence are exempt (WCAG 2.5.8): the email address in the legal text, the Backbone Solutions credit.
      if (el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p")) continue;
      const b = box(el);
      if (b.width < 44 - 0.01 || b.height < 44 - 0.01) smallTargets.push(`${describe(el)} ${Math.round(b.width * 10) / 10}x${Math.round(b.height * 10) / 10}`);
    }

    return {
      viewport: vw,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src),
      clipped, smallText, offscreenText, smallTargets,
    };
  });
  assert(result.scrollWidth <= result.viewport && result.bodyScrollWidth <= result.viewport, `${label}: horizontal overflow (document ${result.scrollWidth}px, body ${result.bodyScrollWidth}px, viewport ${result.viewport}px)`);
  none(result.brokenImages, `${label}: broken images`);
  none(result.clipped, `${label}: clipped heading or button text`);
  none(result.offscreenText, `${label}: text outside the viewport`);
  none(result.smallText, `${label}: text under 12px`);
  if (tapTargets) none(result.smallTargets, `${label}: tap targets under 44x44`);
}

async function videoRatio() {
  return page.evaluate(() => {
    const video = document.querySelector("main .sp-video");
    if (!video) return null;
    const b = video.getBoundingClientRect();
    return b.width / b.height;
  });
}

// Everything a link needs to be classified, in document order.
async function linkInventory() {
  return page.evaluate(() => [...document.querySelectorAll("a")].map((a, index) => {
    const b = a.getBoundingClientRect();
    const siteHeader = [...document.querySelectorAll("header")].find((h) => !h.closest("main"));
    return {
      index,
      text: (a.textContent || "").replace(/\s+/g, " ").trim(),
      href: a.getAttribute("href"),
      checkout: a.hasAttribute("data-checkout-link"),
      inSiteHeader: Boolean(siteHeader && siteHeader.contains(a)),
      inMain: Boolean(a.closest("main")),
      inFooter: Boolean(a.closest("footer") && !a.closest("main")),
      section: a.closest("main > section")?.id ?? null,
      top: b.top + window.scrollY, bottom: b.bottom + window.scrollY, viewportTop: b.top, viewportBottom: b.bottom, width: b.width, height: b.height,
    };
  }));
}
const isBuyLink = (link) => link.checkout || link.href === checkoutHref || /get the kit|buy|checkout/i.test(link.text) || /whop\.com|checkout\.stripe|buy\.stripe/i.test(link.href || "");

async function chromeHtml() {
  return page.evaluate(() => {
    const header = [...document.querySelectorAll("header")].filter((h) => !h.closest("main"));
    const footer = [...document.querySelectorAll("footer")].filter((f) => !f.closest("main"));
    return { headers: header.length, footers: footer.length, header: header[0]?.outerHTML || "", footer: footer[0]?.outerHTML || "", skip: document.querySelector(".mx-skip")?.outerHTML || "" };
  });
}

// Visible copy of the page: title, description, all text with every <details> opened, alt and aria labels.
async function visibleCopy() {
  return page.evaluate(() => {
    for (const details of document.querySelectorAll("details")) details.open = true;
    const attributes = [...document.querySelectorAll("[alt],[aria-label],[title]")].flatMap((el) => [el.getAttribute("alt"), el.getAttribute("aria-label"), el.getAttribute("title")]).filter(Boolean);
    const text = [document.title, document.querySelector('meta[name="description"]')?.content || "", document.body.innerText, ...attributes].join("\n");
    for (const details of document.querySelectorAll("details")) details.open = false;
    return text;
  });
}

try {
  // ---------- data contracts (museKit.js against the brief) ----------
  await check("museKit.js: the two setups match the brief word for word", async () => {
    assert.deepEqual(setups.map(({ name, text }) => ({ name, text })), briefSetups);
  });
  await check("museKit.js: one offer, $27 one time, checkout link is Whop or a marked placeholder", async () => {
    assert.equal(museKit.price, "$27");
    assert.equal(museKit.priceCents, 2700);
    assert.match(museKit.billing, /^one time$/i);
    if (museKit.checkoutUrl) {
      const url = new URL(museKit.checkoutUrl);
      assert.equal(url.protocol, "https:");
      assert.match(url.hostname, /(^|\.)whop\.com$/, "Checkout must be the Whop link");
      assert.equal(checkoutHref, museKit.checkoutUrl);
      assert.equal(checkoutIsPlaceholder, false);
    } else {
      assert.equal(checkoutIsPlaceholder, true);
      assert.match(checkoutHref, /placeholder/i);
    }
    assert.equal(kitPieces.length, 4);
  });

  // ---------- layouts ----------
  for (const viewport of viewports) {
    await setViewport(viewport);
    const label = `${viewport.width}x${viewport.height}`;
    await check(`${label} layout of ${KIT} (no overflow, no clipped text, no text under 12px${viewport.width === 390 ? ", tap targets 44x44" : ""}; 16:9 video)`, async () => {
      await visit(KIT);
      if ([390, 1440].includes(viewport.width)) {
        await page.screenshot({ path: path.join(output, `${viewport.width}-kit-first-viewport.png`) });
        await screenshot(`${viewport.width}-kit`);
      }
      const ratio = await videoRatio();
      assert(ratio, "video spot missing");
      assert(Math.abs(ratio / (16 / 9) - 1) <= 0.01, `video spot is ${ratio.toFixed(4)}:1, not 16:9 within 1%`);
      const image = await page.evaluate(() => {
        const img = document.querySelector("main .sp-product img, main img[src*='muse-control-kit']");
        if (!img) return null;
        const b = img.getBoundingClientRect();
        return { natural: img.naturalWidth / img.naturalHeight, rendered: b.width / b.height };
      });
      assert(image, "product image missing");
      assert(Math.abs(image.natural / (16 / 9) - 1) <= 0.01 && Math.abs(image.rendered / (16 / 9) - 1) <= 0.01, `product image is not 16:9 (${JSON.stringify(image)})`);
      await auditLayout(`${label} ${KIT}`, { tapTargets: viewport.width === 390 });
    });
    for (const { route } of sitePages) {
      await check(`${label} layout of ${route}${viewport.width === 390 ? " (tap targets 44x44)" : ""}`, async () => {
        await visit(route);
        if ([390, 1440].includes(viewport.width)) await screenshot(`${viewport.width}-${route === "/" ? "home" : route.slice(1)}`);
        await auditLayout(`${label} ${route}`, { tapTargets: viewport.width === 390 });
      });
    }
  }

  // ---------- the sales page (/tools/musekit) at phone width ----------
  await setViewport(phone);
  const kitMark = mark();
  await visit(KIT, { settle: 1500 });
  const kit = since(kitMark);

  await check(`${KIT}: one <main>, one <h1> with the result headline`, async () => {
    const counts = await page.evaluate(() => ({ mains: document.querySelectorAll("main").length, h1s: [...document.querySelectorAll("h1")].map((h) => h.textContent.replace(/\s+/g, " ").trim()) }));
    assert.equal(counts.mains, 1, "exactly one <main>");
    assert.deepEqual(counts.h1s, [salesH1], "exactly one <h1>");
    assert.equal(await page.title(), publicPageMetadata[KIT].title);
    assert.equal(await page.getAttribute('link[rel="canonical"]', "href"), `https://aiwithmurda.com${KIT}`);
    assert.equal(await page.getAttribute('meta[property="og:image"]', "content"), "https://aiwithmurda.com/og-muse-kit.png");
  });

  await check(`${KIT}: sections in the brief's order (headline+video+button, problem, for/not for, what you get, how it works, which setup, story, price, refunds, questions)`, async () => {
    const sections = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((section) => {
      const video = section.querySelector(".sp-video");
      const h1 = section.querySelector("h1");
      const buy = section.querySelector("[data-checkout-link]");
      const order = (a, b) => Boolean(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
      return {
        id: section.id,
        heading: (section.querySelector("h1, h2")?.textContent || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim(),
        text: section.textContent.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim(),
        h1: Boolean(h1), video: Boolean(video), buy: Boolean(buy),
        heroOrder: order(h1, video) && order(video, buy),
        steps: section.querySelectorAll("ol.sp-steps > li").length,
        details: section.querySelectorAll("details").length,
      };
    }));
    const expected = [
      ["headline, video, button", (s) => s.h1 && s.video && s.buy && s.heroOrder],
      ["the problem", (s) => s.id === "problem" && /time/i.test(s.text) && /unposted|sit/i.test(s.text)],
      ["who it's for and not for", (s) => /who it's for/i.test(s.heading) && /who it's not for/i.test(s.text)],
      ["what you get", (s) => /what you get/i.test(s.heading) && kitPieces.every((piece) => s.text.includes(piece))],
      ["how it works (3 or 4 steps)", (s) => /how it works/i.test(s.heading) && s.steps >= 3 && s.steps <= 4],
      ["which setup", (s) => /which setup/i.test(s.heading)],
      ["my story", (s) => /story/i.test(s.heading)],
      ["price", (s) => s.id === "price" && s.text.includes(museKit.price) && s.buy],
      ["refunds", (s) => /refund|guarantee/i.test(s.heading)],
      ["questions", (s) => /question/i.test(s.heading) && s.details > 0],
    ];
    assert.equal(sections.length, expected.length, `expected ${expected.length} sections, found ${sections.length}: ${sections.map((s) => s.id || s.heading).join(", ")}`);
    expected.forEach(([name, test], index) => assert(test(sections[index]), `section ${index + 1} (id "${sections[index].id}", heading "${sections[index].heading}") does not meet the contract for "${name}"`));
  });

  await check(`${KIT}: no proof, testimonial, rating or customer-count section`, async () => {
    const found = await page.evaluate(() => {
      const hits = [];
      for (const el of document.querySelectorAll("main *")) {
        const marker = `${el.id} ${typeof el.className === "string" ? el.className : ""}`;
        if (/proof|testimonial|review|rating|stars?\b|logo-?wall/i.test(marker)) hits.push(`element ${el.tagName} ${marker.trim()}`);
      }
      for (const h of document.querySelectorAll("main h1, main h2, main h3")) if (/proof|testimonial|review|what (people|buyers|customers|sellers) (say|said)|results|rated|trusted by/i.test(h.textContent)) hits.push(`heading "${h.textContent.trim()}"`);
      if (document.querySelectorAll("main blockquote").length) hits.push("blockquote");
      const text = document.querySelector("main").innerText;
      if (/[★☆⭐]/.test(text)) hits.push("star characters");
      if (/\b\d+(\.\d+)?\s*(\/\s*5|out of 5|stars?)\b/i.test(text)) hits.push("rating");
      if (/\b\d[\d,.]*\s*k?\+?\s+(happy |real )?(customers|sellers|buyers|users|members|students|shops)\b/i.test(text)) hits.push("customer count");
      return hits;
    });
    none(found, "proof section");
  });

  await check(`${KIT}: every buy link has the same href, equal to museKit.js checkoutHref`, async () => {
    const links = await linkInventory();
    const buy = links.filter(isBuyLink);
    assert(buy.length >= 4, `expected the header, hero, price and FAQ buy links, found ${buy.length}`);
    none(buy.filter((link) => link.href !== checkoutHref || !link.checkout).map((link) => `${link.text} -> ${link.href}`), `buy links must all be <a data-checkout-link href="${checkoutHref}">`);
    if (checkoutIsPlaceholder) {
      const notes = await page.locator("main").getByText("Placeholder: the Whop checkout link goes here.").count();
      assert(notes >= 1, "the placeholder checkout link must be visibly marked");
    }
  });

  await check(`${KIT}: a buy button above the fold at 390x844, right under the video`, async () => {
    const links = await linkInventory();
    const hero = links.filter((link) => isBuyLink(link) && link.inMain && link.section === "");
    assert(hero.length >= 1, "no buy link in the hero section");
    const video = await page.evaluate(() => { const b = document.querySelector("main .sp-video").getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; });
    const first = hero[0];
    assert(first.viewportTop >= 0 && first.viewportBottom <= phone.height, `hero buy link is not fully above the fold (${Math.round(first.viewportTop)}..${Math.round(first.viewportBottom)} of ${phone.height})`);
    assert(first.viewportTop >= video.bottom - 1 && first.viewportTop - video.bottom <= 48, `hero buy link is not right under the video (video bottom ${Math.round(video.bottom)}, button top ${Math.round(first.viewportTop)})`);
  });

  await check(`${KIT}: a buy link in the price section and one after the last FAQ answer`, async () => {
    const links = await linkInventory();
    assert(links.some((link) => isBuyLink(link) && link.section === "price"), "no buy link in the price section");
    const afterLastAnswer = await page.evaluate(() => {
      const all = [...document.querySelectorAll("main details")];
      const last = all.at(-1);
      if (!last) return false;
      return [...document.querySelectorAll("main [data-checkout-link]")].some((a) => (last.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) && a.closest("main > section") === last.closest("main > section") && a.getBoundingClientRect().top >= last.getBoundingClientRect().bottom);
    });
    assert(afterLastAnswer, "no buy link under the last FAQ answer");
  });

  await check(`${KIT}: header has the logo link and one buy link, no other navigation`, async () => {
    const header = await page.evaluate(() => {
      const headers = [...document.querySelectorAll("header")].filter((h) => !h.closest("main"));
      const h = headers[0];
      return {
        count: headers.length,
        links: h ? [...h.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.replace(/\s+/g, " ").trim(), checkout: a.hasAttribute("data-checkout-link"), label: a.getAttribute("aria-label") })) : [],
        other: h ? [...h.querySelectorAll("nav, button, summary, input, select, [role=navigation], [role=menu], [role=button]")].map((el) => el.outerHTML.slice(0, 80)) : [],
      };
    });
    assert.equal(header.count, 1, "one site header");
    assert.equal(header.links.length, 2, `header links: ${JSON.stringify(header.links)}`);
    const [logo, buy] = header.links;
    assert.equal(logo.href, "/", "the first header link is the logo, linking home");
    assert.match(`${logo.label} ${logo.text}`, /murda/i);
    assert(buy.checkout && buy.href === checkoutHref, "the second header link is the buy link");
    none(header.other, "header navigation");
  });

  await check(`${KIT}: the price $27 and \"one time\" appear in the price section and under the hero button; no other price`, async () => {
    const price = norm(await page.locator("#price").innerText());
    assert(price.includes(museKit.price), "price section shows $27");
    assert(/one time/i.test(price), 'price section says "one time"');
    const hero = norm(await page.locator("main > section").first().innerText());
    assert(hero.includes(museKit.price) && /one time/i.test(hero), "hero shows $27, one time");
    const amounts = [...new Set((await visibleCopy()).match(/\$\s?\d+(?:[.,]\d+)*/g) || [])];
    assert.deepEqual(amounts, [museKit.price], `only one price on the page, found ${amounts.join(", ")}`);
  });

  await check(`${KIT}: the two setup texts appear word for word as in museKit.js`, async () => {
    const shown = await page.evaluate(() => [...document.querySelectorAll("#setups article, #setups [class*='setup']")].map((el) => ({
      name: (el.querySelector("h3, h4")?.textContent || "").replace(/\s+/g, " ").trim(),
      text: [...el.querySelectorAll("p")].map((p) => p.textContent.replace(/\s+/g, " ").trim()),
    })));
    for (const setup of setups) {
      assert(shown.some((card) => card.name === setup.name && card.text.includes(setup.text)), `setup "${setup.name}" is not shown word for word`);
    }
  });

  await check(`${KIT}: FAQ closed on load, each answer opens on click, required questions present`, async () => {
    const items = page.locator("#faq details");
    const count = await items.count();
    assert.equal(count, faq.length, "one <details> per FAQ item");
    const openOnLoad = await page.evaluate(() => [...document.querySelectorAll("details")].filter((d) => d.open).length);
    assert.equal(openOnLoad, 0, "every <details> is closed on load");
    const questions = [];
    for (let index = 0; index < count; index += 1) {
      const item = items.nth(index);
      const summary = item.locator("summary");
      const question = norm(await summary.innerText());
      questions.push(question);
      const answer = item.locator(".sp-faq-a, summary ~ *").first();
      assert.equal(await answer.isVisible(), false, `"${question}" answer hidden before click`);
      await summary.click();
      assert.equal(await item.evaluate((d) => d.open), true, `"${question}" opens on click`);
      assert.equal(await answer.isVisible(), true, `"${question}" answer visible after click`);
      const expected = faq.find((entry) => norm(entry.q) === question);
      assert(expected, `"${question}" is not in museKit.js`);
      const answerText = norm(await answer.innerText());
      if (expected.a) assert(answerText.includes(norm(expected.a)), `"${question}" shows its answer`);
      await summary.click();
      assert.equal(await item.evaluate((d) => d.open), false, `"${question}" closes on a second click`);
    }
    for (const question of requiredQuestions) assert(questions.includes(question), `required question missing: ${question}`);
    const guarantee = faq.find((entry) => entry.q === "Does this guarantee sales?");
    assert.match(guarantee.a || "", /^No\b/, '"Does this guarantee sales?" is answered no');
  });

  await check(`${KIT}: copy rules (no em or en dash, no banned words or phrases, no Most Popular, no countdown or limited)`, async () => {
    const copy = await visibleCopy();
    none([...copy.matchAll(/.{0,30}[—–].{0,30}/g)].map((m) => m[0]), "em or en dash");
    const hits = bannedCopy.flatMap(([pattern, name]) => (copy.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)) || []).map((m) => `${name}: "${m}"`));
    none(hits, "banned copy");
    const stray = allowedGuaranteeCopy.reduce((text, allowed) => text.replace(allowed, ""), copy).match(/.{0,30}guarantee.{0,30}/gi) || [];
    none(stray, '"guarantee" outside the FAQ question, footer and refunds placeholder');
    const timers = await page.evaluate(() => [...document.querySelectorAll("[class*='countdown' i], [id*='countdown' i], [class*='timer' i], [id*='timer' i], [class*='badge' i], [class*='ribbon' i]")].map((el) => el.outerHTML.slice(0, 80)));
    none(timers, "countdown, timer or badge elements");
    const footer = norm(await page.locator("footer").last().innerText());
    for (const note of footerNotes) assert(footer.includes(norm(note)), `footer note missing: ${note}`);
    assert(/doesn't guarantee sales/i.test(footer) && /differ by phone and country/i.test(footer) && /isn't made by or connected to Meta or Facebook/i.test(footer), "footer carries the brief's three notes");
  });

  await check(`${KIT}: marked placeholders for the video, story, refunds and kit list`, async () => {
    const placeholders = await page.evaluate(() => ({
      video: Boolean(document.querySelector("main .sp-video iframe")) || /placeholder/i.test(document.querySelector("main .sp-video")?.textContent || ""),
      story: /placeholder/i.test(document.querySelector("#story")?.textContent || ""),
      refunds: /placeholder/i.test(document.querySelector("#refunds")?.textContent || ""),
    }));
    if (!museKit.salesVideoYouTubeId) assert(placeholders.video, "video placeholder is marked");
    assert(placeholders.story, "story placeholder is marked");
    assert(placeholders.refunds, "refunds placeholder is marked");
  });

  await check(`${KIT}: no /api/ request, no cross-origin request, no console error, no page error`, async () => {
    none(kit.requests.filter((r) => r.path.startsWith("/api/")).map((r) => r.path), `/api/ requests from ${KIT}`);
    none(kit.requests.filter((r) => !r.sameOrigin && !allowedCrossOrigin.some((host) => host.test(r.host))).map((r) => r.url), `cross-origin requests from ${KIT}`);
    none(kit.consoleErrors.map((e) => e.text), `console errors on ${KIT}`);
    none(kit.pageErrors.map((e) => e.message), `page errors on ${KIT}`);
  });

  const kitLinks = await linkInventory();
  await check(`${KIT}: no link to a retired page; the footer is the short kit footer (notes, Terms, Privacy, Contact)`, async () => {
    none(kitLinks.filter((link) => link.href && link.href.startsWith("/") && retiredPagePaths.some((p) => p.test(link.href.split(/[?#]/)[0]))).map((link) => `"${link.text}" -> ${link.href}`), `${KIT}: links to retired pages`);
    const footerLinks = kitLinks.filter((link) => link.inFooter).map((link) => link.href);
    assert.deepEqual(footerLinks, ["/terms", "/privacy", "mailto:murad@aiwithmurda.com"]);
  });
  await check(`${KIT}: no old product names`, async () => {
    const copy = await visibleCopy();
    none(oldProductNames.filter((name) => copy.includes(name)), `${KIT}: old product names`);
  });

  // ---------- site pages: home, /tools, /about, Terms, Privacy (the live look) ----------
  const stripState = (html) => html.replace(/\s*aria-current="page"/g, "").replace(/\s*aria-expanded="(true|false)"/g, "").replace(/\s*class="mx-nav is-open"/g, ' class="mx-nav"');
  const siteNav = async () => page.evaluate(() => {
    const header = [...document.querySelectorAll("header")].find((h) => !h.closest("main"));
    const nav = header?.querySelector("nav#public-navigation-links");
    return {
      label: nav?.getAttribute("aria-label") || null,
      links: nav ? [...nav.querySelectorAll("a")].map((a) => ({ text: a.textContent.replace(/\s+/g, " ").trim(), href: a.getAttribute("href"), current: a.getAttribute("aria-current") })) : [],
      headerLinks: header ? [...header.querySelectorAll("a")].map((a) => ({ text: a.textContent.replace(/\s+/g, " ").trim(), href: a.getAttribute("href"), checkout: a.hasAttribute("data-checkout-link") })) : [],
      toggle: header?.querySelector("button.mx-nav-toggle")?.getAttribute("aria-label") || null,
    };
  });
  let siteChrome = null;
  for (const { route, h1 } of sitePages) {
    await check(`${route}: one <main>, h1 "${h1}", the site header (Tools, About Murad) and the site footer`, async () => {
      const m = mark();
      await visit(route, { settle: 500 });
      const h1s = await page.evaluate(() => [...document.querySelectorAll("h1")].map((h) => h.innerText.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase()));
      assert.deepEqual(h1s, [h1.toLowerCase()]);
      assert.equal(await page.locator("main").count(), 1);
      assert.equal(await page.title(), publicPageMetadata[route].title);
      assert.equal(await page.getAttribute('link[rel="canonical"]', "href"), `https://aiwithmurda.com${route}`);
      assert.equal(await page.getAttribute('meta[property="og:image"]', "content"), "https://aiwithmurda.com/og-card.png");
      const nav = await siteNav();
      assert.equal(nav.label, "Public navigation");
      assert.equal(nav.toggle, "Open navigation");
      assert.deepEqual(nav.links.map(({ text, href }) => ({ text, href })), [{ text: "Tools", href: "/tools" }, { text: "About Murad", href: "/about" }]);
      const current = nav.links.filter((link) => link.current === "page").map((link) => link.href);
      assert.deepEqual(current, route === "/tools" || route === "/about" ? [route] : [], "aria-current marks the page you are on");
      assert.deepEqual(nav.headerLinks.map((link) => link.href), ["/", "/tools", "/about"], "the header holds the logo and the two nav links only (no My Downloads, no Free Starter Pack, no buy button)");
      assert(!nav.headerLinks.some((link) => link.checkout), "no checkout link in the site header");
      const chrome = await chromeHtml();
      assert.equal(chrome.headers, 1);
      assert.equal(chrome.footers, 1);
      if (!siteChrome) siteChrome = chrome;
      assert.equal(stripState(chrome.header), stripState(siteChrome.header), "header differs from the home page");
      assert.equal(chrome.footer, siteChrome.footer, "footer differs from the home page");
      const footer = await page.evaluate(() => {
        const f = [...document.querySelectorAll("footer")].find((el) => !el.closest("main"));
        return {
          text: f.innerText,
          cols: [...f.querySelectorAll(".mx-footer-cols > div")].map((col) => ({ head: col.querySelector(".mx-foot-h")?.textContent.trim(), links: [...col.querySelectorAll("a")].map((a) => ({ text: a.textContent.replace(/\s+/g, " ").trim(), href: a.getAttribute("href") })) })),
        };
      });
      assert(footer.text.includes("Practical AI tools and setup kits. Download it. Make it yours."), "footer blurb");
      assert.deepEqual(footer.cols.map((col) => col.head), ["Tools", "Murad", "Follow", "Fine print"]);
      assert.deepEqual(footer.cols[0].links, [{ text: "All tools", href: "/tools" }, ...tools.map((tool) => ({ text: tool.shortName, href: tool.href }))]);
      assert.deepEqual(footer.cols[1].links, [{ text: "Meet Murad", href: "/about" }, { text: "Contact", href: "mailto:murad@aiwithmurda.com" }]);
      assert.deepEqual(footer.cols[3].links.map((link) => link.href), ["/terms", "/privacy"]);
      const { requests: pageRequests, consoleErrors: errors, pageErrors: crashes } = since(m);
      none(pageRequests.filter((r) => r.path.startsWith("/api/") || !r.sameOrigin).map((r) => r.url), `${route}: /api/ or cross-origin requests`);
      none(errors.map((e) => e.text), `${route}: console errors`);
      none(crashes.map((e) => e.message), `${route}: page errors`);
    });
    await check(`${route}: no link to a retired page, no checkout link, no old product names`, async () => {
      const links = await linkInventory();
      none(links.filter((link) => link.href && link.href.startsWith("/") && retiredPagePaths.some((p) => p.test(link.href.split(/[?#]/)[0]))).map((link) => `"${link.text}" -> ${link.href}`), `${route}: links to retired pages`);
      none(links.filter((link) => link.checkout || /whop\.com|checkout\.stripe|buy\.stripe|placeholder-checkout/i.test(link.href || "")).map((link) => `"${link.text}" -> ${link.href}`), `${route}: checkout links (the buyer reads the kit page first)`);
      const copy = await visibleCopy();
      none(oldProductNames.filter((name) => copy.includes(name)), `${route}: old product names`);
    });
    if (route !== "/terms" && route !== "/privacy") {
      await check(`${route}: copy rules (no em or en dash, no banned words, no "guarantee", no "coming soon")`, async () => {
        const copy = await visibleCopy();
        none([...copy.matchAll(/.{0,30}[—–].{0,30}/g)].map((m) => m[0]), "em or en dash");
        const hits = bannedCopy.flatMap(([pattern, name]) => (copy.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)) || []).map((m) => `${name}: "${m}"`));
        none(hits, "banned copy");
        none(copy.match(/.{0,30}(guarantee|coming soon).{0,30}/gi) || [], '"guarantee" or "coming soon"');
      });
    }
  }

  await check("/: hero (chip, h1, lede, two actions), the shelf from tools.js, the featured tool, the story; panels 01 / 03 to 03 / 03", async () => {
    await visit("/", { settle: 300 });
    const home = await page.evaluate(() => {
      const t = (el) => (el?.textContent || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
      const hero = document.querySelector("main .mx-hero");
      const shelf = document.querySelector('nav.mx-shelf[aria-label="Everything on the shelf"]');
      const featured = document.querySelector("main #featured");
      return {
        counts: [...document.querySelectorAll("main .mx-panel-head .mx-count")].map(t),
        descs: [...document.querySelectorAll("main .mx-panel-head .mx-desc")].map(t),
        chip: t(hero?.querySelector(".mx-chip")),
        lede: t(hero?.querySelector(".mx-lede")),
        actions: [...(hero?.querySelectorAll(".mx-hero-copy .mx-actions a") || [])].map((a) => ({ text: t(a), href: a.getAttribute("href") })),
        meta: Boolean(hero?.querySelector(".mx-hero-copy .mx-meta")),
        caption: t(hero?.querySelector(".mx-portrait figcaption")),
        shelf: shelf ? {
          groups: shelf.querySelectorAll(".mx-shelf-group").length,
          ticker: t(shelf.querySelector(".mx-ticker")),
          note: t(shelf.querySelector(".mx-shelf-note")),
          items: [...shelf.querySelectorAll("a.mx-shelf-item")].map((a) => ({ href: a.getAttribute("href"), name: t(a.querySelector(".mx-shelf-name")), meta: t(a.querySelector(".mx-shelf-meta")), price: t(a.querySelector(".mx-shelf-price")) })),
          cap: t(shelf.querySelector(".mx-shelf-cap")),
        } : null,
        featured: featured ? {
          heading: t(featured.querySelector("h2")),
          text: t(featured),
          img: featured.querySelector("img")?.getAttribute("src"),
          links: [...featured.querySelectorAll("a")].map((a) => ({ text: t(a), href: a.getAttribute("href") })),
        } : null,
        story: t(document.querySelector("main #murad h2")),
      };
    });
    assert.deepEqual(home.counts, ["01 / 03", "02 / 03", "03 / 03"]);
    assert.deepEqual(home.descs, ["Storefront / Tools", "Featured tool", "The person behind the files"]);
    assert.equal(home.chip, "Practical AI tools");
    assert.equal(home.lede, "Practical AI tools and setup kits, from a business owner who builds with AI.");
    assert.deepEqual(home.actions, [{ text: "See the Muse Control Kit", href: KIT }, { text: "All tools", href: "/tools" }]);
    assert.equal(home.meta, false, "no $0 meta line");
    assert.equal(home.caption, "I'm Murad. I started with inventory software. Now I share the tools and habits behind the builds.");
    assert(home.shelf, "the shelf nav");
    assert.equal(home.shelf.groups, 1, "one shelf group");
    assert.equal(home.shelf.ticker, `Tools${String(tools.length).padStart(2, "0")} ${tools.length === 1 ? "tool" : "tools"}`);
    assert.equal(home.shelf.note, "Start with the Muse Control Kit.");
    assert.deepEqual(home.shelf.items, tools.map((tool) => ({ href: tool.href, name: tool.name, meta: tool.audience, price: `${tool.price} ${tool.billing.toLowerCase()}` })));
    assert.equal(home.shelf.cap, "Digital downloads you set up yourself. Not a hosted AI service.");
    assert(home.featured, "the featured tool panel");
    assert.equal(home.featured.heading, featuredTool.name);
    assert.equal(home.featured.img, featuredTool.image);
    for (const part of [featuredTool.audience, featuredTool.summary, featuredTool.price, featuredTool.billing]) assert(home.featured.text.includes(part), `featured panel shows "${part}"`);
    assert.deepEqual(home.featured.links, [{ text: featuredTool.cta, href: KIT }], "the featured panel links to the kit page only, not to checkout");
    assert.equal(home.story, "I started with a store. Then I started building.");
  });

  await check("/tools: one card per tool in tools.js, each one link (one tab stop) to its page", async () => {
    await visit("/tools", { settle: 300 });
    const cards = await page.evaluate(() => [...document.querySelectorAll("main .mx-toolgrid > li")].map((li) => ({
      links: [...li.querySelectorAll("a, button, [tabindex]")].map((a) => a.getAttribute("href")),
      text: li.textContent.replace(/\s+/g, " ").trim(),
      img: li.querySelector("img")?.getAttribute("src"),
    })));
    assert.equal(cards.length, tools.length);
    tools.forEach((tool, index) => {
      assert.deepEqual(cards[index].links, [tool.href], `${tool.slug}: one link`);
      for (const part of [tool.name, tool.audience, tool.summary, tool.price, tool.billing, tool.cta]) assert(cards[index].text.includes(part), `${tool.slug} card shows "${part}"`);
      assert.equal(cards[index].img, tool.image);
    });
    // Label in name (WCAG 2.5.3): the link's name holds the tool name, the price and the visible go-label; the name is a heading.
    const named = await page.evaluate(() => [...document.querySelectorAll("main .mx-toolcard")].map((a) => ({
      ids: (a.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent.replace(/\s+/g, " ").trim()),
      heading: a.querySelector("h2")?.textContent.trim(),
    })));
    tools.forEach((tool, index) => {
      assert.deepEqual(named[index].ids, [tool.name, `${tool.billing}${tool.price}`, tool.cta], `${tool.slug}: the link is named by its name, price and "${tool.cta}"`);
      assert.equal(named[index].heading, tool.name, `${tool.slug}: the tool name is an h2`);
    });
    const snapshot = await page.locator("main .mx-toolgrid").ariaSnapshot();
    assert(snapshot.includes(`link "${tools[0].name} ${tools[0].billing} ${tools[0].price} ${tools[0].cta}"`), `accessible name in ${snapshot}`);
  });

  await check("/about: main's About page with the tools CTA, YouTube and Instagram only, panels 01 / 02 and 02 / 02", async () => {
    await visit("/about", { settle: 300 });
    const about = await page.evaluate(() => ({
      counts: [...document.querySelectorAll("main .mx-panel-head .mx-count")].map((el) => el.textContent.trim()),
      cta: [...document.querySelectorAll("main .mx-about-copy .mx-actions a")].map((a) => ({ text: a.textContent.replace(/[’‘]/g, "'").trim(), href: a.getAttribute("href") })),
      elsewhere: [...document.querySelectorAll("main .mx-about-links a")].map((a) => a.querySelector(".mx-about-link-name")?.textContent.trim()),
      text: document.querySelector("main").innerText.replace(/[’‘]/g, "'"),
    }));
    assert.deepEqual(about.counts, ["01 / 02", "02 / 02"]);
    assert.deepEqual(about.cta, [{ text: "See what I've packaged", href: "/tools" }]);
    assert.deepEqual(about.elsewhere, ["YouTube", "Instagram"]);
    assert(about.text.includes("The tools here are setups you can adapt."));
    assert(about.text.includes("60-day streaming challenge"), "his 60-day challenge history stays");
  });

  await check("/terms and /privacy: the back link goes to /tools", async () => {
    for (const route of ["/terms", "/privacy"]) {
      await visit(route);
      const back = await page.locator("main .mx-legal-end a", { hasText: "Back to the tools" }).getAttribute("href");
      assert.equal(back, "/tools", route);
    }
  });

  await check("site header at 390: the menu opens, Escape closes it and returns focus to the toggle; Tab goes from the toggle into the menu", async () => {
    await visit("/");
    const toggle = page.locator("button.mx-nav-toggle");
    const nav = page.locator("#public-navigation-links");
    assert.equal(await nav.isVisible(), false, "menu closed on load");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-label"), "Close navigation");
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.equal(await nav.isVisible(), true, "menu open");
    await toggle.focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), "Tools", "Tab from the toggle reaches the first menu link");
    await page.keyboard.press("Escape");
    assert.equal(await nav.isVisible(), false, "Escape closes the menu");
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("mx-nav-toggle")), true, "focus returns to the toggle");
    assert.equal(await toggle.getAttribute("aria-label"), "Open navigation");
  });

  await check("site header at 1440: the two links show inline beside the logo, no toggle, nothing else on the right", async () => {
    await setViewport({ width: 1440, height: 900 });
    await visit("/");
    const layout = await page.evaluate(() => {
      const header = document.querySelector("header.mx-header");
      const brand = header.querySelector(".mx-brand").getBoundingClientRect();
      const links = [...header.querySelectorAll("#public-navigation-links a")].map((a) => a.getBoundingClientRect());
      const container = header.querySelector(".mx-header-in").getBoundingClientRect();
      return { toggle: getComputedStyle(header.querySelector(".mx-nav-toggle")).display, brandLeft: brand.left - container.left, lastRight: container.right - links.at(-1).right, visible: links.every((b) => b.width > 0) };
    });
    await setViewport(phone);
    assert.equal(layout.toggle, "none");
    assert(layout.visible, "nav links visible");
    assert(Math.abs(layout.brandLeft) <= 1, "logo flush with the container's left edge");
    assert(layout.lastRight >= -1 && layout.lastRight <= 24, `last nav link ends near the container's right edge (${layout.lastRight}px)`);
  });

  // ---------- paths without a page of their own ----------
  for (const route of ["/kit", "/store/memory-os", "/nope"]) {
    await check(`${route}: renders the home page client-side`, async () => {
      const m = mark();
      await visit(route, { settle: 500 });
      assert.equal(new URL(page.url()).pathname, route, "no client-side redirect");
      const h1s = await page.evaluate(() => [...document.querySelectorAll("h1")].map((h) => h.textContent.replace(/\s+/g, " ").trim()));
      assert.deepEqual(h1s, [homeH1]);
      assert.equal(await page.locator(".app-shell, .overlay-route, .admin-gate-shell, .sp").count(), 0);
      assert.equal(await page.title(), publicPageMetadata["/"].title);
      assert.equal(await page.getAttribute('link[rel="canonical"]', "href"), "https://aiwithmurda.com/");
      const { requests: pageRequests, consoleErrors: errors, pageErrors: crashes } = since(m);
      none(pageRequests.filter((r) => r.path.startsWith("/api/") || !r.sameOrigin).map((r) => r.url), `${route}: /api/ or cross-origin requests`);
      none(errors.map((e) => e.text), `${route}: console errors`);
      none(crashes.map((e) => e.message), `${route}: page errors`);
    });
  }
  // The server 301s these to /tools/musekit (smoke-retired-routes.mjs); the app also reads them case-insensitively.
  for (const route of ["/tools/Musekit", "/TOOLS/MUSEKIT/"]) {
    await check(`${route}: the app renders the kit page (paths are read in lower case)`, async () => {
      await visit(route, { settle: 300 });
      assert.equal(norm(await page.locator("h1").first().textContent()), salesH1);
      assert.equal(await page.locator(".public-site--kit .sp-header [data-checkout-link]").count(), 1);
      assert.equal(await page.getAttribute('link[rel="canonical"]', "href"), `https://aiwithmurda.com${KIT}`);
    });
  }

  // ---------- admin and OBS overlays (contracts carried over from the retired storefront suite) ----------
  await setViewport({ width: 1440, height: 1000 });
  await check("/admin: login gate blocks a signed-out visitor and a signed-in non-admin", async () => {
    await page.evaluate(() => localStorage.removeItem("sp-test-auth"));
    await visit("/admin?view=overlay");
    await page.getByRole("heading", { name: "Admin login required" }).waitFor();
    assert.equal(await page.locator(".app-shell, .overlay-route").count(), 0, "Admin overlay must stay behind login");
    await page.getByLabel("Admin email").fill("buyer@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Test-only-password-123!");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByText("This Supabase profile is signed in, but it is not on the admin allowlist.").waitFor();
    assert.equal(await page.locator(".app-shell").count(), 0, "A paid customer is not an admin");
  });
  await check("/admin: owner workspace with 5 navigation buttons, both overlays, dashboard, daily log, deck, settings", async () => {
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
  });
  for (const route of ["/obs", "/overlay", "/obs/followers", "/overlay/followers", "/?view=overlay"]) {
    await check(`${route}: renders .overlay-route and requests /api/daily-logs`, async () => {
      const m = mark();
      await visit(route);
      assert.equal(await page.locator(".overlay-route").count(), 1);
      assert.equal(await page.locator(".sp, .sp-header").count(), 0, "overlay must not render the sales page");
      assert(since(m).requests.some((request) => request.path === "/api/daily-logs"), `${route}: broadcast data still loads`);
    });
  }
  await check("/ and /tools/musekit: a signed-in owner still gets the public pages, not the workspace", async () => {
    await visit("/");
    assert.equal(await page.locator(".app-shell, .overlay-route").count(), 0);
    assert.equal(norm(await page.locator("h1").first().textContent()), homeH1);
    await visit(KIT);
    assert.equal(await page.locator(".app-shell, .overlay-route").count(), 0);
    assert.equal(norm(await page.locator("h1").first().textContent()), salesH1);
  });
  await check("no browser runtime errors on any route", async () => {
    none(pageErrors, "page errors");
  });
} finally {
  await browser.close();
}

const failed = results.filter((r) => r.result === "FAIL");
await fs.writeFile(path.join(output, "report.json"), JSON.stringify({
  result: failed.length ? "FAIL" : "PASS",
  base,
  checks: results,
  requests: requests.filter((r) => r.path.startsWith("/api/") || !r.sameOrigin),
  consoleErrors,
  pageErrors,
  scope: "Local UI tests against the Vite dev server with mocked auth and /api. No real payment or production request.",
}, null, 2));
if (failed.length) {
  console.log(`FAIL: ${failed.length} of ${results.length} sales page checks failed. Report: ${path.join(output, "report.json")}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: Home, /tools, /about, kit sales page, Terms, Privacy, admin and overlay contracts (${results.length} checks, ${viewports.length} viewports). Report: ${path.join(output, "report.json")}`);
}
