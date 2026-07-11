// Product-folder verification pass (PRODUCT-LINE-SPEC.md §3).
// Every store product folder must pass this before it ships in any zip.
//
// Usage:
//   node scripts/verify-product-folder.mjs products/<slug> [...more]
//   node scripts/verify-product-folder.mjs --write-index products/<slug>
//
// Checks: required skeleton files, INDEX.md matches disk exactly (names +
// count), CHANGELOG has a dated semver entry, no secret-shaped strings, no
// absolute user paths, no reference-source strings, .env.example files are
// placeholder-only, .sh files are executable.

import fs from "node:fs/promises";
import path from "node:path";

const REQUIRED_FILES = ["00-START-HERE.md", "README.md", "INDEX.md", "LICENSE", "CHANGELOG.md", "VERIFY.md"];
const REQUIRED_DIRS = ["install", "payload"];

// Secret shapes + machine paths. Real key prefixes only — placeholders like
// "insert-your-groq-key-here" must pass.
const FORBIDDEN_CONTENT = [
  { pattern: /sk_(?:live|test)_[A-Za-z0-9]{8,}/, label: "Stripe secret key" },
  { pattern: /gsk_[A-Za-z0-9]{16,}/, label: "Groq API key" },
  { pattern: /ghp_[A-Za-z0-9]{16,}/, label: "GitHub token" },
  { pattern: /xox[abp]-[A-Za-z0-9-]{8,}/, label: "Slack token" },
  { pattern: /AKIA[0-9A-Z]{16}/, label: "AWS access key" },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: "private key block" },
  { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[A-Za-z0-9]/, label: "service-role assignment" },
  { pattern: /\/Users\/[a-z0-9_-]+\//i, label: "absolute macOS user path" },
  { pattern: /\\Users\\[a-z0-9_-]+\\/i, label: "absolute Windows user path" },
  { pattern: /\[\[?Your Business\]?\]/i, label: "placeholder branding" },
];

// Reference sources whose text must never appear in a shipped product
// (PRODUCT-LINE-SPEC.md §13 anti-copy protocol).
const FORBIDDEN_SOURCES = [
  { pattern: /wassim/i, label: "reference bundle (wassim)" },
  { pattern: /aiforsavages|viralbible|attentionagent/i, label: "reference course (sina)" },
  { pattern: /\bgsd-[a-z]/, label: "GSD package reference" },
  { pattern: /uncaged-operator/i, label: "reference course folder" },
];

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".sh", ".py", ".mjs", ".js", ".cjs", ".json", ".yaml", ".yml", ".example", ".env"]);

async function walk(dir, base = dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".DS_Store") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full));
  }
  return out;
}

function isTextFile(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || path.basename(relPath) === "LICENSE";
}

export function renderIndex(slug, files) {
  const listed = files.filter((f) => f !== "INDEX.md");
  return [
    `# INDEX — ${slug}`,
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)} · Files: ${listed.length} (excluding this manifest)`,
    "",
    "Every file in this product, verified against disk by `verify-product-folder.mjs`",
    "at build time. If your download doesn't match this list exactly, something is",
    "wrong — email murad@aiwithmurda.com.",
    "",
    ...listed.map((f) => `- \`${f}\``),
    "",
  ].join("\n");
}

export async function verifyProductFolder(folder) {
  const slug = path.basename(folder);
  const errors = [];
  const files = await walk(folder);

  for (const required of REQUIRED_FILES) {
    if (!files.includes(required)) errors.push(`missing required file: ${required}`);
  }
  for (const dir of REQUIRED_DIRS) {
    if (!files.some((f) => f.startsWith(`${dir}${path.sep}`))) errors.push(`missing required directory: ${dir}/`);
  }

  // INDEX.md must match disk exactly.
  if (files.includes("INDEX.md")) {
    const indexText = await fs.readFile(path.join(folder, "INDEX.md"), "utf8");
    const listed = [...indexText.matchAll(/^- `([^`]+)`$/gm)].map((m) => m[1]);
    const onDisk = files.filter((f) => f !== "INDEX.md");
    const listedSet = new Set(listed);
    const diskSet = new Set(onDisk);
    for (const f of onDisk) if (!listedSet.has(f)) errors.push(`INDEX.md missing file present on disk: ${f}`);
    for (const f of listed) if (!diskSet.has(f)) errors.push(`INDEX.md lists file not on disk: ${f}`);
    const countMatch = indexText.match(/Files: (\d+)/);
    if (countMatch && Number(countMatch[1]) !== onDisk.length) {
      errors.push(`INDEX.md count ${countMatch[1]} != ${onDisk.length} files on disk`);
    }
  }

  // CHANGELOG must open with a dated semver release heading.
  if (files.includes("CHANGELOG.md")) {
    const changelog = await fs.readFile(path.join(folder, "CHANGELOG.md"), "utf8");
    if (!/^## \d+\.\d+\.\d+ — \d{4}-\d{2}-\d{2}/m.test(changelog)) {
      errors.push("CHANGELOG.md has no `## x.y.z — YYYY-MM-DD` release heading");
    }
  }

  for (const rel of files) {
    if (!isTextFile(rel)) continue;
    const text = await fs.readFile(path.join(folder, rel), "utf8");
    for (const { pattern, label } of FORBIDDEN_CONTENT) {
      if (pattern.test(text)) errors.push(`${rel}: forbidden content (${label})`);
    }
    for (const { pattern, label } of FORBIDDEN_SOURCES) {
      if (pattern.test(text)) errors.push(`${rel}: forbidden source string (${label})`);
    }
    if (rel.endsWith(".env.example")) {
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const value = trimmed.split("=").slice(1).join("=").trim();
        if (value && !/insert|replace|your-|xxx|<[^>]+>|example/i.test(value)) {
          errors.push(`${rel}: .env.example line is not a placeholder: ${trimmed.split("=")[0]}=…`);
        }
      }
    }
    if (rel.endsWith(".sh")) {
      const stat = await fs.stat(path.join(folder, rel));
      if (!(stat.mode & 0o111)) errors.push(`${rel}: shell script is not executable (chmod +x)`);
    }
  }

  return { slug, files, errors };
}

const isEntryModule = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;

if (isEntryModule) {
  const args = process.argv.slice(2);
  const writeIndex = args.includes("--write-index");
  const folders = args.filter((a) => a !== "--write-index");

  if (folders.length === 0) {
    console.error("usage: node scripts/verify-product-folder.mjs [--write-index] products/<slug> [...more]");
    process.exit(2);
  }

  let failed = false;
  for (const folder of folders) {
    const resolved = path.resolve(folder);
    if (writeIndex) {
      const files = await walk(resolved);
      await fs.writeFile(path.join(resolved, "INDEX.md"), renderIndex(path.basename(resolved), files));
      console.log(`wrote INDEX.md for ${path.basename(resolved)} (${files.filter((f) => f !== "INDEX.md").length} files)`);
    }
    const { slug, files, errors } = await verifyProductFolder(resolved);
    if (errors.length) {
      failed = true;
      console.error(`FAIL ${slug} (${errors.length} problems):`);
      for (const error of errors) console.error(`  - ${error}`);
    } else {
      console.log(`PASS ${slug}: ${files.length - 1} files + INDEX.md, manifest matches disk, no forbidden content`);
    }
  }
  process.exit(failed ? 1 : 0);
}
