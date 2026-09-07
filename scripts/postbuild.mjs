import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { productModules } from "../src/data/product.js";
import { metadataForPath, publicPageMetadata } from "../src/data/siteMetadata.js";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const routes = new Set([
  ...Object.keys(publicPageMetadata).filter((route) => route !== "/").map((route) => route.slice(1)),
  "60",
  "live",
  "tools",
  "start",
  "kit",
  "store",
  "live-builds",
  "members",
  "admin",
  ...productModules.map((module) => `members/module/${module.key}`),
]);
const indexHtml = await readFile(join(dist, "index.html"), "utf8");
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function pageHtml(route) {
  const meta = metadataForPath(`/${route}`);
  const canonical = `https://aiwithmurda.com${meta.path}`;
  return indexHtml
    .replace(/<title>.*?<\/title>/, `<title>${escape(meta.title)}</title>`)
    .replace(/(<meta\s+(?:name="description"|property="og:description"|name="twitter:description")\s+content=")[^"]*(")/g, `$1${escape(meta.description)}$2`)
    .replace(/(<meta\s+(?:property="og:title"|name="twitter:title")\s+content=")[^"]*(")/g, `$1${escape(meta.title)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace("</head>", `${meta.noindex ? '<meta name="robots" content="noindex, nofollow" />' : ""}</head>`);
}

for (const route of routes) {
  await mkdir(join(dist, route), { recursive: true });
  await writeFile(join(dist, route, "index.html"), pageHtml(route));
}

const sitemapRoutes = [...Object.keys(publicPageMetadata), "/day/1", "/day/2"];
await writeFile(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => `  <url><loc>https://aiwithmurda.com${route}</loc></url>`).join("\n")}\n</urlset>\n`);
