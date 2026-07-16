// Builds store product folders (products/<slug>/) into deliverable zips in
// server/member-assets/. Runs the verification pass first — a folder that
// fails verification never becomes a customer download.

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { ZipArchive } from "archiver";
import { verifyProductFolder } from "./verify-product-folder.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const assetDir = path.join(rootDir, "server", "member-assets");
const archiveEntryDate = new Date("2026-01-01T00:00:00.000Z");

const STORE_PRODUCTS = [
  { slug: "council-decision-engine", zip: "council-decision-engine.zip" },
  { slug: "skill-authoring-kit", zip: "skill-authoring-kit.zip" },
  { slug: "safe-autonomy-guardrails", zip: "safe-autonomy-guardrails.zip" },
  { slug: "verification-qa-pack", zip: "verification-qa-pack.zip" },
  { slug: "three-tier-llm-router", zip: "three-tier-llm-router.zip" },
  { slug: "memory-os", zip: "memory-os.zip" },
  { slug: "autonomous-operator-kit", zip: "autonomous-operator-kit.zip" },
  { slug: "zero-dollar-research-engine", zip: "zero-dollar-research-engine.zip" },
  { slug: "mcp-builder-pack", zip: "mcp-builder-pack.zip" },
  { slug: "claude-setup-audit-suite", zip: "claude-setup-audit-suite.zip" },
  { slug: "retail-ops-ai-pack", zip: "retail-ops-ai-pack.zip" },
  { slug: "swarm-intake-protocol", zip: "swarm-intake-protocol.zip" },
  { slug: "founder-finance-pack", zip: "founder-finance-pack.zip" },
];

// Free products ship as PUBLIC static downloads (no entitlement gate).
const PUBLIC_PRODUCTS = [{ slug: "operator-sampler", zip: "operator-sampler.zip" }];
const publicDownloadDir = path.join(rootDir, "public", "downloads");

const IGNORED_NAMES = new Set([".DS_Store", "__pycache__", ".pytest_cache"]);

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORED_NAMES.has(entry.name) || entry.name.endsWith(".pyc")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full));
  }
  return out;
}

async function zipFolder(folder, outputPath, slug) {
  const files = await walk(folder);
  await new Promise((resolve, reject) => {
    const output = fsSync.createWriteStream(outputPath);
    const archive = new ZipArchive({ zlib: { level: 9 }, forceLocalTime: false });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", (error) => (error.code === "ENOENT" ? undefined : reject(error)));
    archive.on("error", reject);
    archive.pipe(output);
    for (const rel of files) {
      const stat = fsSync.statSync(path.join(folder, rel));
      archive.file(path.join(folder, rel), {
        name: `${slug}/${rel.split(path.sep).join("/")}`,
        date: archiveEntryDate,
        mode: stat.mode & 0o111 ? 0o755 : 0o644,
      });
    }
    archive.finalize();
  });
  return files.length;
}

await fs.mkdir(assetDir, { recursive: true });
await fs.mkdir(publicDownloadDir, { recursive: true });
const built = [];
for (const { slug, zip, dir } of [
  ...STORE_PRODUCTS.map((p) => ({ ...p, dir: assetDir })),
  ...PUBLIC_PRODUCTS.map((p) => ({ ...p, dir: publicDownloadDir })),
]) {
  const folder = path.join(rootDir, "products", slug);
  const { errors } = await verifyProductFolder(folder);
  if (errors.length) {
    console.error(`REFUSING to build ${slug} — verification failed:`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const count = await zipFolder(folder, path.join(dir, zip), slug);
  built.push(`${zip} (${count} files)`);
}
console.log(`Built store product assets: ${built.join(", ")}`);
