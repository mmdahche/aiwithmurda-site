// Route and metadata contract for the production Express server (server/index.mjs serving dist/).
// The site sells one product now: retired page paths and the retired free downloads answer 301 -> "/",
// the sales page, Terms, Privacy and the admin answer 200, and the prerendered heads carry the right metadata.
// Read-only GET requests; safe against a local server or the live site.
//
//   ./node_modules/.bin/vite build && node scripts/postbuild.mjs
//   PORT=18791 HOST=127.0.0.1 SITE_URL=http://127.0.0.1:18791 node server/index.mjs
//   SITE_URL_TEST=http://127.0.0.1:18791 node scripts/smoke-retired-routes.mjs
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { museKit } from "../src/data/museKit.js";
import { metadataForPath, publicPageMetadata } from "../src/data/siteMetadata.js";

const base = (process.env.SITE_URL_TEST || "http://127.0.0.1:18791").replace(/\/+$/, "");
const canonicalOrigin = "https://aiwithmurda.com";
const publicDir = new URL("../public/", import.meta.url);

const retiredPaths = [
  "/about", "/store", "/store/", "/store/memory-os", "/store?view=free", "/kit", "/live-builds", "/operator-toolkit", "/operator-arsenal",
  "/start", "/free/check-it-first", "/free/inbox-cleanup", "/members", "/members/module/setup-both-builders",
  "/60", "/60/", "/live", "/tools", "/day/1",
  "/downloads/operator-sampler.zip", "/downloads/CHECK-IT-FIRST.md", "/downloads/email-cleanup-kit.zip",
];
const htmlPages = ["/", "/terms", "/terms/", "/privacy", "/privacy/", "/admin", "/admin/"];
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

await check(`${retiredPaths.length} retired page and download paths answer 301 with Location "/"`, async () => {
  const wrong = [];
  for (const route of retiredPaths) {
    const response = await get(route);
    await response.arrayBuffer();
    if (response.status !== 301 || response.headers.get("location") !== "/") wrong.push(`${route}: ${describe(response)}`);
  }
  assert(wrong.length === 0, `not a 301 to "/":\n${wrong.join("\n")}`);
});

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

await check("/sitemap.xml lists exactly /, /terms and /privacy", async () => {
  const response = await get("/sitemap.xml");
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /xml/);
  const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc]) => loc.trim());
  assert.deepEqual(locs.sort(), [`${canonicalOrigin}/`, `${canonicalOrigin}/privacy`, `${canonicalOrigin}/terms`]);
  assert.deepEqual(Object.keys(publicPageMetadata).map((route) => `${canonicalOrigin}${route}`).sort(), locs, "sitemap matches siteMetadata.js");
});

await check("/robots.txt references the sitemap", async () => {
  const response = await get("/robots.txt");
  const body = await response.text();
  assert.equal(response.status, 200);
  assert(body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
  assert(!/^Disallow:\s*\/\s*$/m.test(body), "robots must not block the whole site");
});

await check('/site.webmanifest has short_name "AIWM" and describes the kit', async () => {
  const response = await get("/site.webmanifest");
  assert.equal(response.status, 200);
  const manifest = JSON.parse(await response.text());
  assert.equal(manifest.short_name, "AIWM");
  assert.equal(manifest.start_url, "/");
  assert(String(manifest.description).includes(museKit.name), "manifest description names the kit");
});

for (const [route, size] of [["/og-card.png", { width: 1200, height: 630 }], ["/images/muse-control-kit.png", null]]) {
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

for (const [route, metaPath] of [["/", "/"], ["/terms/", "/terms"], ["/privacy/", "/privacy"], ["/admin/", "/admin"]]) {
  await check(`prerendered head of ${route}: title, description, canonical, og:url${metaPath === "/admin" ? ", noindex" : ""}`, async () => {
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
    if (metaPath === "/") {
      for (const value of [...head.description, ...head.ogDescription, ...head.twitterDescription]) {
        assert(value.includes(`${museKit.price}, one time`), `"${museKit.price}, one time" mangled in "${value}"`);
      }
      assert(!/[—–]/.test(head.titles[0] + head.description[0]), "no em or en dash in the head copy");
    }
    if (meta.noindex) assert.deepEqual(head.robots, ["noindex, nofollow"], "admin is noindex");
    else assert(!head.robots.some((value) => /noindex/i.test(value)), `${route} must be indexable`);
  });
}

const failed = results.filter((result) => result.result === "FAIL");
if (failed.length) {
  console.log(`FAIL: ${failed.length} of ${results.length} retired-route checks failed against ${base}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: Retired routes, public pages, files and prerendered metadata (${results.length} checks) against ${base}`);
}
