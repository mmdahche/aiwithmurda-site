import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productModules, productName } from "../src/data/product.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const assetDir = path.join(rootDir, "server", "member-assets");

const fieldGuideExtras = {
  "command-setup": {
    operatingQuestion:
      "If I had to start live tomorrow with no warmup, where would every file, number, prompt, and proof receipt go?",
    worksheet: [
      "- Project name:",
      "- Main public goal:",
      "- Primary offer to prove:",
      "- Daily tracker location:",
      "- Prompt folder:",
      "- Proof folder:",
      "- Content folder:",
      "- Offer folder:",
    ],
    receipts: [
      "Screenshot of the command folder.",
      "Screenshot of the daily tracker baseline.",
      "One sentence naming the first offer path.",
    ],
  },
  "problem-to-proof": {
    operatingQuestion:
      "What painful workflow can I improve in a way a viewer or buyer can understand in 30 seconds?",
    worksheet: [
      "List 10 candidate workflows:",
      "",
      "1.",
      "2.",
      "3.",
      "4.",
      "5.",
      "6.",
      "7.",
      "8.",
      "9.",
      "10.",
      "",
      "Score your top three from 1 to 5:",
      "",
      "| Workflow | Proof speed | Buyer pain | Viewer clarity | Money path |",
      "| --- | ---: | ---: | ---: | ---: |",
      "|  |  |  |  |  |",
      "|  |  |  |  |  |",
      "|  |  |  |  |  |",
      "",
      "Chosen workflow:",
      "",
      "Before state in one sentence:",
      "",
      "Proof metric:",
      "",
      "Buyer who feels this:",
    ],
    receipts: [
      "Before screenshot, recording, or written workflow.",
      "Pain statement.",
      "Proof metric you will judge after the build.",
    ],
  },
  "ai-build-loop": {
    operatingQuestion:
      "What is the smallest visible improvement I can ship today without pretending the entire system is finished?",
    worksheet: [
      "- Project inspected:",
      "- Files or screens involved:",
      "- Smallest useful slice:",
      "- Test path:",
      "- AI partner used:",
      "- First prompt:",
      "- Main failure:",
      "- Fix that worked:",
      "- Commit, saved version, or handoff link:",
    ],
    receipts: [
      "Before state.",
      "Working state.",
      "Test or browser proof.",
      "One explanation of what changed.",
    ],
  },
  "proof-and-content": {
    operatingQuestion:
      "How do I turn today's build into a receipt that makes the work obvious to someone who missed the stream?",
    worksheet: [
      "- Before:",
      "- After:",
      "- What shipped:",
      "- Biggest failure:",
      "- Lesson learned:",
      "- Best moment:",
      "- Clip hook:",
      "- Screenshot or proof link:",
      "- Tomorrow's promise:",
    ],
    receipts: [
      "One public post or scheduled asset.",
      "One internal proof note.",
      "One tomorrow promise.",
    ],
  },
  "offer-follow-up": {
    operatingQuestion: "What does this proof make easier to sell, and who should hear about it today?",
    worksheet: [
      "- Strongest proof:",
      "- Buyer:",
      "- Promise:",
      "- Objection:",
      "- CTA:",
      "- Page or checkout changed:",
      "- Warm lead to contact:",
      "- Follow-up sent:",
      "- Result logged:",
    ],
    receipts: [
      "Offer page or checkout screenshot.",
      "Follow-up message.",
      "Logged reply, purchase, pipeline, booked call, or no-response lesson.",
    ],
  },
};

for (const module of productModules) {
  if (!fieldGuideExtras[module.key]) {
    throw new Error(`Missing field guide extras for module: ${module.key}`);
  }
}

function moduleName(title) {
  return title.replace(":", " -");
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function checkboxList(items) {
  return items.map((item) => `- [ ] ${item.label}`).join("\n");
}

function renderRoadmap() {
  const modules = productModules
    .map(
      (module) => `## ${moduleName(module.title)}

Objective: ${module.body}

Focus: ${module.lesson.focus}

Proof output: ${module.lesson.output}

To-do:
${checkboxList(module.todos)}

Deliverables:
${bulletList(module.lesson.deliverables)}

Proof questions:
${bulletList(module.lesson.proofQuestions)}

Traps to avoid:
${bulletList(module.lesson.failureTraps)}

Done criteria:
- ${module.done}
`,
    )
    .join("\n");

  return `# ${productName} - Module Roadmap

Use this as the paid kit path. Do not binge it. Complete one module, create proof, then move to the next module.

${modules}
## Weekly Review

Run this every 7 days during the sprint.

- [ ] Which module created the strongest proof this week?
- [ ] Which day created the biggest audience, email, revenue, or pipeline jump?
- [ ] Which repeated mistake slowed the build down?
- [ ] Which asset should become part of the paid kit?
- [ ] What is the next offer improvement?
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

> ${extra.operatingQuestion}

Worksheet:

${extra.worksheet.join("\n")}

Module deliverables:
${bulletList(module.lesson.deliverables)}

Proof questions:
${bulletList(module.lesson.proofQuestions)}

Traps to avoid:
${bulletList(module.lesson.failureTraps)}

Setup checklist:
${checkboxList(module.todos)}

Starter prompt:

> ${module.lesson.starterPrompt}

Receipt to capture:
${bulletList(extra.receipts)}

Exit criteria:

${module.done}
`;
    })
    .join("\n");

  return `# ${productName} - Module Field Guide

Use this when you are inside a module and need the actual work surface. The roadmap tells you the path. This field guide tells you what to write, capture, and ship before you mark a module done.

Rule: do not complete a module because you understand it. Complete it because the output exists.

${modules}
## End-Of-Week Review

Run this every 7 days.

- Which module created the strongest proof?
- Which task got skipped too often?
- Which AI prompt should become part of the kit?
- Which content asset created the clearest response?
- Which offer promise needs to get sharper?
- What gets removed from next week?
- What gets doubled down?
`;
}

await fs.mkdir(assetDir, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(assetDir, "module-roadmap.md"), renderRoadmap(), "utf8"),
  fs.writeFile(path.join(assetDir, "module-field-guide.md"), renderFieldGuide(), "utf8"),
]);

console.log("Built member assets: module-roadmap.md, module-field-guide.md");
