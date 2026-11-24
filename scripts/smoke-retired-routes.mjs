// Route and metadata contract for the production Express server (server/index.mjs serving dist/).
// The home page, /tools, the Muse Control Kit page at /tools/musekit, /about, Terms, Privacy and the admin
// answer 200. Case variants and aliases of the kit page answer 301 -> /tools/musekit, the old shop 301 -> /tools,
// the other retired pages and free downloads 301 -> "/", and the prerendered heads carry the right metadata
// (the kit is free since Nov 24: its description ends "Free, through Whop." and no head says "$27" or "one time").
// Read-only GET requests; safe against a local server or the live site.
//
//   ./node_modules/.bin/vite build && node scripts/postbuild.mjs
//   PORT=18801 HOST=127.0.0.1 node server/index.mjs
//   SITE_URL_TEST=http://127.0.0.1:18801 node scripts/smoke-retired-routes.mjs
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { museKit } from "../src/data/museKit.js";
import { metadataForPath, publicPageMetadata } from "../src/data/siteMetadata.js";
import { tools } from "../src/data/tools.js";

const base = (process.env.SITE_URL_TEST || "http://127.0.0.1:18801").replace(/\/+$/, "");
const canonicalOrigin = "https://aiwithmurda.com";
const publicDir = new URL("../public/", import.meta.url);

const kitPath = "/tools/musekit";
// The free kit (Murad via Noor, Nov 24): its description ends "Free, through Whop."; no page head says "$27" or "one time".
const kitHeadline = "This kit makes it a few photos and a yes.";
const kitDescriptionEnd = "Free, through Whop.";
const paidKitCopy = /\$\s?\d|\bone[\s-]time\b/i;
// The Instagram bio link and anything a person might type for it: 301 to the one lower-case path.
const kitAliases = [
  "/tools/Musekit", "/tools/MuseKit", "/TOOLS/MUSEKIT", "/Tools/musekit", "/tools/musekit/", "/tools/Musekit/",
  "/tools/muse-kit", "/tools/muse-kit/", "/tools/muse", "/tools/Muse/", "/musekit", "/musekit/", "/MuseKit", "/muse-kit", "/muse-kit/",
];
const shopPaths = ["/store", "/store/", "/STORE", "/store/memory-os", "/store/future-proof-method/", "/store?view=free"];
const retiredPaths = [
  "/kit", "/live-builds", "/operator-toolkit", "/operator-arsenal",
  "/start", "/free", "/free/check-it-first", "/free/inbox-cleanup", "/members", "/members/module/setup-both-builders",
  "/60", "/60/", "/live", "/day/1", "/downloads",
  "/downloads/operator-sampler.zip", "/downloads/CHECK-IT-FIRST.md", "/downloads/email-cleanup-kit.zip",
];
const htmlPages = ["/", "/tools", "/tools/", kitPath, "/about", "/about/", "/terms", "/terms/", "/privacy", "/privacy/", "/admin", "/admin/"];
// Unchanged routes that fall through to the SPA: the OBS overlays and any unknown path.
const spaPages = ["/overlay", "/obs", "/overlay/followers", "/obs/followers", "/nope"];

const results = [];
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
const get = (route, options = {}) => fetch(`${base}${route}`, { redirect: "manual", ...options });
const decode = (value) => String(value).replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const describe = (response) => `${response.status}${response.headers.get("location") ? ` -> ${response.headers.get("location")}` : ""}`;

function parseHead(html) {
  const head = html.slice(0, html.indexOf("</head>") + 7);
  const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)].map(([, key, value]) => [key.toLowerCase(), decode(value)]));
  const metas = [...head.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attrs(tag));
  const links = [...head.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attrs(tag));
  const titles = [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)].map(([, title]) => decode(title));
  const meta = (key, value) => metas.filter((m) => m[key] === value).map((m) => m.content);
  return {
    titles,
    description: meta("name", "description"),
    ogDescription: meta("property", "og:description"),
    twitterDescription: meta("name", "twitter:description"),
    ogTitle: meta("property", "og:title"),
    twitterTitle: meta("name", "twitter:title"),
    ogUrl: meta("property", "og:url"),
    ogImage: meta("property", "og:image"),
    ogImageAlt: meta("property", "og:image:alt"),
    twitterImage: meta("name", "twitter:image"),
    robots: meta("name", "robots"),
    canonical: links.filter((l) => l.rel === "canonical").map((l) => l.href),
  };
}
function pngSize(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "PNG signature");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

await check(`server answers at ${base}`, async () => {
  const response = await get("/robots.txt");
  assert.equal(response.status, 200);
});

async function expectRedirects(paths, target) {
  const wrong = [];
  for (const route of paths) {
    const response = await get(route);
    await response.arrayBuffer();
    if (response.status !== 301 || response.headers.get("location") !== target) wrong.push(`${route}: ${describe(response)}`);
  }
  assert(wrong.length === 0, `not a 301 to "${target}":\n${wrong.join("\n")}`);
}
await check(`${kitAliases.length} case variants and aliases of ${kitPath} answer 301 with Location "${kitPath}"`, () => expectRedirects(kitAliases, kitPath));
await check(`${kitPath} itself answers 200, never a redirect to itself`, async () => {
  const response = await get(kitPath);
  await response.arrayBuffer();
  assert.equal(response.status, 200, describe(response));
  assert.equal(response.headers.get("location"), null);
});
await check("a kit alias keeps the query string (Instagram tracking parameters)", async () => {
  const response = await get("/tools/Musekit?utm_source=instagram&utm_medium=bio");
  await response.arrayBuffer();
  assert.equal(response.status, 301, describe(response));
  assert.equal(response.headers.get("location"), `${kitPath}?utm_source=instagram&utm_medium=bio`);
});
await check(`${shopPaths.length} old shop paths answer 301 with Location "/tools"`, () => expectRedirects(shopPaths, "/tools"));
await check(`${retiredPaths.length} retired page and download paths answer 301 with Location "/"`, () => expectRedirects(retiredPaths, "/"));

for (const route of htmlPages) {
  await check(`${route} answers 200 HTML`, async () => {
    const response = await get(route);
    const body = await response.text();
    assert.equal(response.status, 200, `${route}: ${describe(response)}`);
    assert.match(response.headers.get("content-type") || "", /^text\/html/);
    assert(body.includes('<div id="root"></div>'), `${route}: app shell missing`);
  });
}

await check(`${spaPages.join(", ")} answer 200 HTML (overlays and unknown paths fall through to the app)`, async () => {
  const wrong = [];
  for (const route of spaPages) {
    const response = await get(route);
    const body = await response.text();
    if (response.status !== 200 || !/^text\/html/.test(response.headers.get("content-type") || "") || !body.includes('<div id="root"></div>')) wrong.push(`${route}: ${describe(response)}`);
  }
  assert(wrong.length === 0, wrong.join("\n"));
});

await check("TikTok verification files under /60/, /terms/ and /privacy/ answer 200 text", async () => {
  let count = 0;
  for (const dir of ["60", "terms", "privacy"]) {
    const files = (await fs.readdir(new URL(`${dir}/`, publicDir))).filter((file) => !file.startsWith("."));
    assert(files.length > 0, `public/${dir} has no verification files`);
    for (const file of files) {
      const expected = await fs.readFile(new URL(`${dir}/${file}`, publicDir), "utf8");
      const response = await get(`/${dir}/${file}`);
      const body = await response.text();
      assert.equal(response.status, 200, `/${dir}/${file}: ${describe(response)}`);
      assert.match(response.headers.get("content-type") || "", /^text\/plain/, `/${dir}/${file}: content type`);
      assert.equal(body, expected, `/${dir}/${file}: body differs from public/${dir}/${file}`);
      count += 1;
    }
  }
  assert(count >= 3);
});

await check("/sitemap.xml lists exactly /, /tools, /tools/musekit, /about, /terms and /privacy", async () => {
  const response = await get("/sitemap.xml");
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /xml/);
  const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc]) => loc.trim());
  assert.deepEqual(locs.sort(), ["/", "/about", "/privacy", "/terms", "/tools", "/tools/musekit"].map((route) => `${canonicalOrigin}${route}`));
  assert.deepEqual(Object.keys(publicPageMetadata).map((route) => `${canonicalOrigin}${route}`).sort(), locs, "sitemap matches siteMetadata.js");
  for (const tool of tools) assert(locs.includes(`${canonicalOrigin}${tool.href}`), `sitemap lists ${tool.href} (tools.js)`);
});

await check("/robots.txt references the sitemap", async () => {
  const response = await get("/robots.txt");
  const body = await response.text();
  assert.equal(response.status, 200);
  assert(body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
  assert(!/^Disallow:\s*\/\s*$/m.test(body), "robots must not block the whole site");
});

await check('/site.webmanifest has short_name "AIWM" and a site-level description', async () => {
  const response = await get("/site.webmanifest");
  assert.equal(response.status, 200);
  const manifest = JSON.parse(await response.text());
  assert.equal(manifest.short_name, "AIWM");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.description, publicPageMetadata["/"].description, "manifest description is the home page description");
});

for (const [route, size] of [["/og-card.png", { width: 1200, height: 630 }], ["/og-muse-kit-free.png", { width: 1200, height: 630 }], ["/images/muse-control-kit.png", null]]) {
  await check(`${route} is a 200 PNG image${size ? ` (${size.width}x${size.height})` : " (16:9)"}`, async () => {
    const response = await get(route);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(response.status, 200, `${route}: ${describe(response)}`);
    assert.match(response.headers.get("content-type") || "", /^image\/png/);
    const actual = pngSize(bytes);
    if (size) assert.deepEqual(actual, size, `${route} size`);
    else assert(Math.abs(actual.width / actual.height / (16 / 9) - 1) <= 0.01, `${route} is ${actual.width}x${actual.height}, not 16:9`);
  });
}

for (const [route, metaPath] of [["/", "/"], ["/tools", "/tools"], [kitPath, kitPath], ["/about", "/about"], ["/terms/", "/terms"], ["/privacy/", "/privacy"], ["/admin/", "/admin"]]) {
  await check(`prerendered head of ${route}: title, description, canonical, og:url, og:image${metaPath === "/admin" ? ", noindex" : ""}`, async () => {
    const response = await get(route);
    const html = await response.text();
    assert.equal(response.status, 200, `${route}: ${describe(response)}`);
    const head = parseHead(html);
    const meta = metadataForPath(metaPath);
    const canonical = `${canonicalOrigin}${meta.path}`;
    assert.deepEqual(head.titles, [meta.title], "title");
    assert.deepEqual(head.ogTitle, [meta.title], "og:title");
    assert.deepEqual(head.twitterTitle, [meta.title], "twitter:title");
    assert.deepEqual(head.description, [meta.description], "description");
    assert.deepEqual(head.ogDescription, [meta.description], "og:description");
    assert.deepEqual(head.twitterDescription, [meta.description], "twitter:description");
    assert.deepEqual(head.canonical, [canonical], "canonical");
    assert.deepEqual(head.ogUrl, [canonical], "og:url");
    assert.deepEqual(head.ogImage, [`${canonicalOrigin}${meta.image}`], "og:image");
    assert.deepEqual(head.twitterImage, [`${canonicalOrigin}${meta.image}`], "twitter:image");
    assert.deepEqual(head.ogImageAlt, [meta.imageAlt], "og:image:alt");
    assert.equal(meta.image, metaPath === kitPath ? "/og-muse-kit-free.png" : "/og-card.png", "the kit page shares the kit card, every other page the site card");
    assert(!/[—–]/.test(head.titles[0] + head.description[0] + head.ogImageAlt[0]), "no em or en dash in the head copy");
    if (metaPath === kitPath) {
      // The kit is free (Murad via Noor, Nov 24): the description ends "Free, through Whop." and has no "$27, one time".
      for (const value of [...head.description, ...head.ogDescription, ...head.twitterDescription]) {
        assert(value.startsWith(`${kitHeadline} `), `the kit description starts with the headline: "${value}"`);
        assert(value.endsWith(` ${kitDescriptionEnd}`), `"${kitDescriptionEnd}" missing or mangled at the end of "${value}"`);
        assert(!paidKitCopy.test(value), `the free kit's description still says "$27" or "one time": "${value}"`);
      }
      assert.equal(head.titles[0], `${museKit.name} | AI with Murda`, "kit page title names the kit");
    }
    if (meta.noindex) assert.deepEqual(head.robots, ["noindex, nofollow"], "admin is noindex");
    else assert(!head.robots.some((value) => /noindex/i.test(value)), `${route} must be indexable`);
  });
}

// Go-live (Murad via Noor, Nov 15): every buy button goes to this one Whop checkout and no page is a placeholder.
const whopCheckoutUrl = "https://whop.com/checkout/plan_u1TnTYybKdPk7/";
await check(`production build: the kit page's app bundle carries the Whop checkout ${whopCheckoutUrl} and no placeholder checkout link or placeholder label`, async () => {
  assert.equal(museKit.checkoutUrl, whopCheckoutUrl, "museKit.checkoutUrl is the go-live Whop checkout");
  const html = await (await get(kitPath)).text();
  const entry = html.match(/<script\b[^>]*type="module"[^>]*src="(\/assets\/[^"]+\.js)"/)?.[1];
  assert(entry, "kit page has a module entry script");
  const response = await get(entry);
  const bundle = await response.text();
  assert.equal(response.status, 200, `${entry}: ${describe(response)}`);
  assert(bundle.includes(JSON.stringify(whopCheckoutUrl)), `${entry} does not carry the Whop checkout URL`);
  const leftovers = ["#placeholder-checkout-link", "Placeholder:", "sp-placeholder", "sp-video--placeholder"].filter((text) => bundle.includes(text));
  assert.deepEqual(leftovers, [], `${entry} still carries placeholder code`);
});
await check("prerendered HTML of every public page has no placeholder text", async () => {
  const hits = [];
  for (const route of Object.keys(publicPageMetadata)) {
    const html = await (await get(route)).text();
    for (const match of html.matchAll(/.{0,40}placeholder.{0,40}/gi)) hits.push(`${route}: ${match[0]}`);
  }
  assert.deepEqual(hits, []);
});
await check(`the kit is free: museKit.price "Free", no billing; no prerendered public page or the web manifest says "$27" or "one time"`, async () => {
  assert.equal(museKit.price, "Free");
  assert.equal(museKit.priceCents, 0);
  assert.equal(museKit.billing, null);
  const hits = [];
  for (const route of [...Object.keys(publicPageMetadata), "/site.webmanifest"]) {
    const response = await get(route);
    const body = decode(await response.text());
    assert.equal(response.status, 200, `${route}: ${describe(response)}`);
    for (const match of body.matchAll(new RegExp(`.{0,40}(?:${paidKitCopy.source}).{0,40}`, "gi"))) hits.push(`${route}: ${match[0]}`);
  }
  assert.deepEqual(hits, []);
});

await check("dist/downloads is not deployed; every public page has a prerendered dist/<route>/index.html", async () => {
  const dist = new URL("../dist/", import.meta.url);
  await assert.rejects(fs.stat(new URL("downloads", dist)), "dist/downloads must not exist");
  for (const route of Object.keys(publicPageMetadata).filter((key) => key !== "/")) {
    const stat = await fs.stat(new URL(`${route.slice(1)}/index.html`, dist));
    assert(stat.isFile(), `dist${route}/index.html`);
  }
});

const failed = results.filter((result) => result.result === "FAIL");
if (failed.length) {
  console.log(`FAIL: ${failed.length} of ${results.length} retired-route checks failed against ${base}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: Retired routes, public pages, files and prerendered metadata (${results.length} checks) against ${base}`);
}
