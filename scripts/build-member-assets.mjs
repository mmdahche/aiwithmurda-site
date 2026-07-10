import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { courseCompletion, productModules, productName, productSubtitle } from "../src/data/product.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const assetDir = path.join(rootDir, "server", "member-assets");

const fieldGuideExtras = {
  "setup-both-builders": {
    question: "Can I open one safe project in both agents and understand what each tool is asking permission to do?",
    worksheet: [
      "- Operating system:",
      "- Claude Code surface:",
      "- Codex surface:",
      "- Git version:",
      "- Claude Code version or access receipt:",
      "- Codex version or access receipt:",
      "- Practice project path:",
      "- First read-only prompt result:",
      "- Setup issue solved:",
    ],
    receipts: ["Version or access checks.", "Practice project README.", "Read-only explanation from each agent."],
  },
  "ai-ready-project": {
    question: "What context should the project carry so I never need to re-explain the same facts to an agent?",
    worksheet: [
      "- Primary user:",
      "- Pain or workflow:",
      "- First useful outcome:",
      "- Success state:",
      "- Non-goals:",
      "- Important paths:",
      "- Build command:",
      "- Test command:",
      "- Protected files and actions:",
      "- Definition of done:",
    ],
    receipts: ["Project brief.", "AGENTS.md and CLAUDE.md.", ".gitignore check.", "Baseline checkpoint."],
  },
  "operator-loop": {
    question: "What is the smallest user-visible change I can inspect, build, verify, and checkpoint today?",
    worksheet: [
      "- User path:",
      "- Current behavior:",
      "- Requested outcome:",
      "- Non-goals:",
      "- Relevant files found during inspection:",
      "- Main risk:",
      "- Verification path:",
      "- Stop condition:",
      "- Checkpoint or handoff:",
    ],
    receipts: ["Before state.", "Grounded plan.", "Working result.", "Verification output.", "Checkpoint."],
  },
  "starter-skills": {
    question: "Which instructions do I repeat often enough to become an on-demand skill?",
    worksheet: [
      "- Skill location for Claude Code:",
      "- Skill location for Codex:",
      "- Project Map test result:",
      "- Build One Slice test result:",
      "- Verify Before Done test result:",
      "- Skill selected for customization:",
      "- Project command added:",
      "- Quality bar added:",
      "- Unexpected behavior found:",
    ],
    receipts: ["Installed SKILL.md files.", "Invocation outputs.", "Customized skill diff."],
  },
  "first-useful-build": {
    question: "What one user action can I ship and reproduce without turning the exercise into a full application?",
    worksheet: [
      "- Selected build track:",
      "- User:",
      "- Primary action:",
      "- Visible success state:",
      "- Failure or empty state:",
      "- Non-goals:",
      "- Clean-start commands:",
      "- Verification evidence:",
      "- Known limits:",
      "- Next smallest build:",
    ],
    receipts: ["Working user path.", "Clean-start verification.", "README update.", "Next-build handoff."],
  },
};

for (const module of productModules) {
  if (!fieldGuideExtras[module.key]) throw new Error(`Missing field guide extras for module: ${module.key}`);
}

function moduleName(title) {
  return title.replace(":", " -");
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function numberedList(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function checkboxList(items) {
  return items.map((item) => `- [ ] ${item.label}${item.proof ? `\n  - Evidence: ${item.proof}` : ""}`).join("\n");
}

function renderPremiumBlock(module) {
  const premium = module.premium;
  if (!premium) return "";

  return `## Deep lesson

### ${premium.headline}

Promise: ${premium.promise}

Estimated time: ${premium.estimatedTime}

Framework:
${premium.framework.map((item) => `- ${item.name}: ${item.body}`).join("\n")}

Teaching notes:
${premium.lessonBlocks
  .map((block) => `### ${block.title}\n\n${block.body}\n\n${bulletList(block.bullets)}`)
  .join("\n\n")}

Workshop:
${premium.workshop.map((workshop) => `### ${workshop.title}\n\n${numberedList(workshop.steps)}`).join("\n\n")}

Example:
- Before: ${premium.example.before}
- After: ${premium.example.after}
- Why it works:
${premium.example.breakdown.map((item) => `  - ${item}`).join("\n")}

Copy-ready script:
${premium.swipe.lines.map((line) => `> ${line}`).join("\n\n")}

Quality bar:
${bulletList(premium.qualityBar)}
`;
}

function renderModuleSummary(module) {
  return `## ${moduleName(module.title)}

Objective: ${module.body}

Focus: ${module.lesson.focus}

Output: ${module.lesson.output}

Lesson map:
- Window: ${module.operatorBrief.window}
- Mode: ${module.operatorBrief.mode}
- Evidence: ${module.operatorBrief.proof}
- Why it matters: ${module.operatorBrief.why}

Run kit:
- Timebox: ${module.actionKit.timebox}
- Next move: ${module.actionKit.todayMove}
- Verification checkpoint: ${module.actionKit.proofCheckpoint}
- Stop rule: ${module.actionKit.stopRule}

Commands or script:

\`\`\`text
${module.actionKit.runCommand}
\`\`\`

Tasks:
${checkboxList(module.todos)}

Deliverables:
${bulletList(module.lesson.deliverables)}

Questions before completion:
${bulletList(module.lesson.proofQuestions)}

Traps to avoid:
${bulletList(module.lesson.failureTraps)}

Done when:
- ${module.done}
`;
}

function renderRoadmap() {
  return `# ${productName} - Module Roadmap

${productSubtitle}

This is an implementation path, not a playlist. Complete one output, save the evidence, and then move forward.

${productModules.map(renderModuleSummary).join("\n")}
## End-of-course check

- [ ] Both agents can open and explain the same project.
- [ ] Project guidance contains verified commands and safety boundaries.
- [ ] One inspect-plan-build-verify-checkpoint loop is complete.
- [ ] Three starter skills are installed and tested.
- [ ] One useful build works from a clean start.
`;
}

function renderFieldGuide() {
  const modules = productModules
    .map((module) => {
      const extra = fieldGuideExtras[module.key];
      return `## ${moduleName(module.title)}

Focus: ${module.lesson.focus}

Output: ${module.lesson.output}

Operating question:

> ${extra.question}

Worksheet:

${extra.worksheet.join("\n")}

Starter prompt:

> ${module.lesson.starterPrompt}

Task checklist:
${checkboxList(module.todos)}

Evidence to capture:
${bulletList(extra.receipts)}

Questions before completion:
${bulletList(module.lesson.proofQuestions)}

Traps to avoid:
${bulletList(module.lesson.failureTraps)}

Stop rule:

${module.actionKit.stopRule}

Exit criteria:

${module.done}
`;
    })
    .join("\n");

  return `# ${productName} - Module Field Guide

Use this file as the work surface. Understanding a lesson does not complete it; the output and evidence must exist.

${modules}`;
}

function renderCourseWorkbook() {
  const modules = productModules
    .map(
      (module) => `# ${moduleName(module.title)}

${module.body}

${renderPremiumBlock(module)}

## Implementation assignment

${checkboxList(module.todos)}

## Exit receipt

- Output: ${module.lesson.output}
- Verification: ${module.actionKit.proofCheckpoint}
- Done: ${module.done}
`,
    )
    .join("\n---\n\n");

  return `# ${productName} - Course Workbook

This workbook contains the deeper teaching behind the five-module path. Use the member portal for the next task and progress tracking; open this file when you need the framework, workshop, example, or quality bar.

${modules}`;
}

function renderCompletionKit() {
  const criteria = courseCompletion.criteria
    .map((item) => `- [ ] ${item.title}\n  - Evidence: ${item.proof}`)
    .join("\n");
  const receipt = courseCompletion.finalReceiptSections
    .map((section) => `## ${section.title}\n\nPrompt: ${section.prompt}\n\nAnswer:\n`)
    .join("\n");

  return `# ${productName} - Completion Kit

${courseCompletion.subtitle}

${courseCompletion.promise}

## Capstone - ${courseCompletion.capstone.title}

${courseCompletion.capstone.body}

Output: ${courseCompletion.capstone.output}

Capstone prompt:

> ${courseCompletion.capstone.prompt}

## Completion criteria

${criteria}

## Certificate copy

${courseCompletion.certificateCopy.map((line) => `- ${line}`).join("\n")}

## First-build handoff

${receipt}`;
}

await fs.mkdir(assetDir, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(assetDir, "module-roadmap.md"), renderRoadmap(), "utf8"),
  fs.writeFile(path.join(assetDir, "module-field-guide.md"), renderFieldGuide(), "utf8"),
  fs.writeFile(path.join(assetDir, "premium-course-workbook.md"), renderCourseWorkbook(), "utf8"),
  fs.writeFile(path.join(assetDir, "course-completion-kit.md"), renderCompletionKit(), "utf8"),
]);

console.log("Built member assets: module-roadmap.md, module-field-guide.md, premium-course-workbook.md, course-completion-kit.md");
