import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { ZipArchive } from "archiver";
import { operatorSkills, operatorUpdateSkills } from "../src/data/operatorSkills.js";

const rootDir = path.resolve(import.meta.dirname, "..");
const assetDir = path.join(rootDir, "server", "member-assets");
const forbiddenBuyerContent = [
  /\/Users\//i,
  /\\Users\\/i,
  /sk_(?:live|test)_/i,
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /STRIPE_SECRET_KEY/i,
  /\.secrets\//i,
];

function validateSkills(skills, { expectedCount, label }) {
  if (skills.length !== expectedCount) {
    throw new Error(`${label} must contain exactly ${expectedCount} skills; found ${skills.length}`);
  }

  const slugs = new Set();
  for (const skill of skills) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.slug || "")) {
      throw new Error(`${label} has an invalid skill slug: ${skill.slug || "missing"}`);
    }
    if (slugs.has(skill.slug)) throw new Error(`${label} has a duplicate skill slug: ${skill.slug}`);
    slugs.add(skill.slug);

    if (
      !skill.name ||
      !skill.description ||
      !skill.category ||
      !Array.isArray(skill.steps) ||
      skill.steps.length < 4 ||
      !Array.isArray(skill.returns) ||
      skill.returns.length < 2 ||
      !Array.isArray(skill.guardrails) ||
      skill.guardrails.length < 2
    ) {
      throw new Error(`${label} skill is incomplete: ${skill.slug}`);
    }

    const buyerText = JSON.stringify(skill);
    const forbiddenPattern = forbiddenBuyerContent.find((pattern) => pattern.test(buyerText));
    if (forbiddenPattern) throw new Error(`${label} skill contains forbidden buyer content: ${skill.slug}`);
  }
}

function renderSkill(skill) {
  return [
    "---",
    `name: ${skill.slug}`,
    `description: ${skill.description}`,
    "---",
    "",
    `# ${skill.name}`,
    "",
    `Category: ${skill.category}`,
    "",
    "## Workflow",
    "",
    ...skill.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Return",
    "",
    ...skill.returns.map((item) => `- ${item}`),
    "",
    "## Guardrails",
    "",
    ...skill.guardrails.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function renderReadme({ title, skills, version, update = false }) {
  return [
    `# ${title}`,
    "",
    `Version: ${version}`,
    "",
    update
      ? "This is an update pack. Read RELEASE.md, compare installed files, and create a restore point before replacing anything."
      : "This pack contains the same customer-safe skills in Claude Code and Codex project-folder layouts.",
    "",
    "## Install deliberately",
    "",
    "- Claude Code project skills: copy selected folders from `claude/.claude/skills/` into your project's `.claude/skills/` directory.",
    "- Codex project skills: copy selected folders from `codex/.agents/skills/` into your project's `.agents/skills/` directory.",
    "- Read every SKILL.md before installation.",
    "- Install only the collections tied to repeated work.",
    "- Back up customized skills before an update.",
    "- Never copy secret files, credentials, or machine-specific paths into a skill.",
    "",
    "## Included skills",
    "",
    ...skills.map((skill) => `- ${skill.name} (${skill.slug}) - ${skill.category}`),
    "",
  ].join("\n");
}

async function createZip({ fileName, title, skills, version, update = false, extras = [] }) {
  const outputPath = path.join(assetDir, fileName);
  await new Promise((resolve, reject) => {
    const output = fsSync.createWriteStream(outputPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", (error) => (error.code === "ENOENT" ? undefined : reject(error)));
    archive.on("error", reject);
    archive.pipe(output);

    archive.append(renderReadme({ title, skills, version, update }), { name: "README.md" });
    for (const skill of skills) {
      const content = renderSkill(skill);
      archive.append(content, { name: `claude/.claude/skills/${skill.slug}/SKILL.md` });
      archive.append(content, { name: `codex/.agents/skills/${skill.slug}/SKILL.md` });
    }
    for (const extra of extras) {
      archive.file(path.join(assetDir, extra.source), { name: extra.name });
    }
    archive.finalize();
  });
  return outputPath;
}

validateSkills(operatorSkills, { expectedCount: 24, label: "Operator Toolkit" });
validateSkills(operatorUpdateSkills, { expectedCount: 4, label: "Operator update" });
await fs.mkdir(assetDir, { recursive: true });
const fullPack = await createZip({
  fileName: "operator-toolkit-skill-pack.zip",
  title: "The Operator Toolkit - 24-Skill Installation Pack",
  skills: operatorSkills,
  version: "1.0.0",
});
const updatePack = await createZip({
  fileName: "operator-update-001.zip",
  title: "Operator System Founding Update 001",
  skills: operatorUpdateSkills,
  version: "1.1.0",
  update: true,
  extras: [
    { source: "operator-compatibility-matrix.md", name: "COMPATIBILITY.md" },
    { source: "operator-system-changelog.md", name: "RELEASE.md" },
  ],
});

console.log(
  `Built Operator Toolkit assets: ${path.basename(fullPack)} (${operatorSkills.length} skills), ${path.basename(updatePack)} (${operatorUpdateSkills.length} update skills)`,
);
