import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { metadataForPath, publicPageMetadata } from "../src/data/siteMetadata.js";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const origin = "https://aiwithmurda.com";
// The retired free downloads stay in public/downloads (repo history) but are not deployed.
await rm(join(dist, "downloads"), { recursive: true, force: true });
// Prerendered head metadata for every public page (nested ones too, such as tools/musekit) and the
// private admin page. "/" is dist/index.html itself.
const routes = new Set([
  ...Object.keys(publicPageMetadata).filter((route) => route !== "/").map((route) => route.slice(1)),
  "admin",
]);
const indexHtml = await readFile(join(dist, "index.html"), "utf8");
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function pageHtml(route) {
  const meta = metadataForPath(`/${route}`);
  const canonical = `${origin}${meta.path}`;
  const image = `${origin}${meta.image}`;
  // Function replacers: a value such as "$27" must be inserted literally, not read as a "$2" group reference.
  return indexHtml
    .replace(/<title>.*?<\/title>/, () => `<title>${escape(meta.title)}</title>`)
    .replace(/(<meta\s+(?:name="description"|property="og:description"|name="twitter:description")\s+content=")[^"]*(")/g, (_, open, close) => `${open}${escape(meta.description)}${close}`)
    .replace(/(<meta\s+(?:property="og:title"|name="twitter:title")\s+content=")[^"]*(")/g, (_, open, close) => `${open}${escape(meta.title)}${close}`)
    .replace(/(<meta\s+(?:property="og:image"|name="twitter:image")\s+content=")[^"]*(")/g, (_, open, close) => `${open}${escape(image)}${close}`)
    .replace(/(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/, (_, open, close) => `${open}${escape(meta.imageAlt)}${close}`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, open, close) => `${open}${canonical}${close}`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, (_, open, close) => `${open}${canonical}${close}`)
    .replace("</head>", () => `${meta.noindex ? '<meta name="robots" content="noindex, nofollow" />' : ""}</head>`);
}

for (const route of routes) {
  await mkdir(join(dist, route), { recursive: true });
  await writeFile(join(dist, route, "index.html"), pageHtml(route));
}

const sitemapRoutes = Object.keys(publicPageMetadata);
await writeFile(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => `  <url><loc>${origin}${route}</loc></url>`).join("\n")}\n</urlset>\n`);
