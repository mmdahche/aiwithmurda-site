import { storeProducts } from "./storeCatalog.js";
import { storefrontOffers } from "./storefront.js";

// Public descriptions and limited previews only. Never import paid payloads here.
const descriptions = {
  "council-decision-engine": {
    name: "Compare an important decision", brand: "The Council", category: "Build and verify", format: "Runnable tool",
    description: "Ask several AI advisers the same question, then weigh their different answers.",
    includes: ["Decision-framing template", "Five adviser perspectives", "Peer-review workflow"],
    files: ["payload/framing-template.md", "payload/council/runner.py", "examples/example-run.md"],
    firstAction: "Write one decision with your options and constraints. Follow Start Here to configure the tool, then review its answers yourself.",
    requirement: "Python, a terminal, and your own Groq API key. AI usage is separate.",
  },
  "skill-authoring-kit": {
    name: "Make your own reusable AI skill", brand: "Skill Authoring Kit", category: "Get set up", format: "Templates + AI instructions",
    description: "Turn a task you repeat into instructions your AI can use again.",
    includes: ["Skill-writing template", "Release-notes example", "CSV-checking example"],
    files: ["payload/skill-template.md", "examples/example-1-release-notes/SKILL.md", "examples/example-2-csv-import-check/SKILL.md"],
    firstAction: "Read the release-notes example, then use the skill template to describe one task you repeat. Test it on a small project.",
    requirement: "Claude Code or Codex and a project to practice on. No hosted app included.",
    preview: {
      title: "A skill that drafts release notes", label: "Excerpt from the included skill", source: "examples/example-1-release-notes/SKILL.md",
      excerpt: "The draft changelog block plus the one-line coverage report. Nothing is written to CHANGELOG.md until the user approves",
      explanation: "It drafts a summary of your changes for review. It does not publish a release for you.",
    },
  },
  "safe-autonomy-guardrails": {
    name: "Add safety checks to AI work", brand: "Safe-Autonomy Guardrails", category: "Build and verify", format: "Scripts + AI instructions",
    description: "Add checks around sensitive data and commands before giving an agent more freedom.",
    includes: ["Sensitive-data filtering", "Protected-path checks", "Risky-command checks"],
    files: ["payload/redaction-firewall/firewall.py", "install/hooks/freeze-path-guard.sh", "install/hooks/destructive-command-guard.sh"],
    firstAction: "Back up a test project. Read the installation guide and try one guard before adding it to your everyday setup.",
    requirement: "Python and shell tools; enforcement differs by agent. Not a security guarantee.",
  },
  "verification-qa-pack": {
    name: "Check the work before you ship", brand: "Verification & QA Pack", category: "Build and verify", format: "Reusable AI instructions",
    description: "Give your AI a structured way to inspect bugs, missing tests, and unfinished work.",
    includes: ["Interface-checking workflows", "Test-gap review", "Broken-button walkthrough"],
    files: ["payload/qa.md", "payload/test-gap-detector.md", "examples/dead-button-walkthrough.md"],
    firstAction: "Read the Save Draft walkthrough. Choose one feature in your app and trace what happens before, during, and after a click.",
    requirement: "Your own project and AI account; browser-based checks need browser tools.",
    preview: {
      title: "Why a Save Draft button fails", label: "Excerpt from a fictional worked example", source: "examples/dead-button-walkthrough.md",
      excerpt: "Expected: draft persists and appears in the list\n  Actual:   list renders during the null window; save write lands unseen",
      explanation: "The walkthrough traces the order of actions, then adds a regression test. This is a teaching example, not a customer result.",
    },
  },
  "three-tier-llm-router": {
    name: "Choose a model for each task", brand: "Three-Tier LLM Router", category: "Organize your projects", format: "Runnable tool",
    description: "Route supported tasks between model tiers and keep a record of usage.",
    includes: ["Model-role configuration", "Task-dispatch command", "Usage reporting"],
    files: ["payload/model-roles.json", "payload/bin/ask.sh", "payload/scripts/tier-usage-report.cjs"],
    firstAction: "Read the dispatch walkthrough, configure the providers you use, and run a small non-sensitive task.",
    requirement: "Node.js, a terminal, and your own provider keys. Model usage costs are separate.",
  },
  "memory-os": {
    name: "Keep project memory and handoffs", brand: "Memory OS", category: "Organize your projects", format: "Template folder + AI instructions",
    description: "Save decisions and next steps in project files so the next AI session can pick them up.",
    includes: ["Project-memory templates", "Handoff and resume instructions", "First-week setup guide"],
    files: ["payload/templates/MEMORY.md", "payload/commands/handoff.md", "examples/first-week.md"],
    firstAction: "Create the memory and handoff folders in a test project. End one session with a handoff, then ask a new session to read it.",
    requirement: "Claude Code or Codex with file access. You maintain the notes; this is not unlimited AI memory.",
    preview: {
      title: "End today with a useful handoff", label: "Excerpt from the included first-week guide", source: "examples/first-week.md",
      excerpt: "Work a normal session. At the end: `/handoff`. Read the file it wrote",
      explanation: "Review the saved note before you finish. The next session reads those files to recover context; it does not remember automatically.",
    },
  },
  "autonomous-operator-kit": {
    name: "Give longer AI tasks a plan", brand: "Autonomous Operator Kit", category: "Organize your projects", format: "Template folder + AI instructions",
    description: "Break longer work into bounded cycles with a goal, a log, and reasons to stop.",
    includes: ["Goal and work-log templates", "Cycle instructions", "Review and stop rules"],
    files: ["payload/templates/GOAL.md", "payload/templates/inner-log.md", "payload/CYCLE-CONTRACT.md"],
    firstAction: "Define a small goal, allowed changes, and stop conditions in a test project. Review the first cycle before extending it.",
    requirement: "An agent with file and terminal access. Scheduling depends on your own setup.",
  },
  "zero-dollar-research-engine": {
    name: "Gather research from the web", brand: "Research Engine", category: "Build and verify", format: "Runnable tools",
    description: "Collect supported public-web sources and turn results into readable notes.",
    includes: ["Multi-source research tool", "Web-page fetcher", "Markdown conversion"],
    files: ["payload/research/research.py", "payload/web-fetch/web_fetch.py", "payload/to-markdown/tomarkdown.py"],
    firstAction: "Install the documented dependencies, then try one focused question. Open the cited pages and check the claims.",
    requirement: "Python, network access, and dependencies. Source availability and limits can change.",
  },
  "mcp-builder-pack": {
    name: "Build a tool your AI can call", brand: "MCP Builder Pack", category: "Build and verify", format: "Guides + worked example",
    description: "Learn how to connect an AI agent to a tool through an MCP server.",
    includes: ["Server-building instructions", "Tool-design patterns", "Changelog-server walkthrough"],
    files: ["payload/mcp-server-build.md", "payload/mcp-server-patterns.md", "examples/changelog-mcp-walkthrough.md"],
    firstAction: "Follow the changelog-server walkthrough locally, then adapt one tool to a narrow task of your own.",
    requirement: "Node.js, TypeScript, a terminal, and an MCP-compatible AI client.",
  },
  "claude-setup-audit-suite": {
    name: "Inspect your Claude setup", brand: "Claude Setup Audit Suite", category: "Get set up", format: "Scripts + AI instructions",
    description: "Review your installed skills, project context, and setup before adding more.",
    includes: ["Setup inventory script", "Context-budget guide", "Skill-security review"],
    files: ["payload/audit-collect.py", "payload/context-budget.md", "payload/scripts/skill_security_auditor.py"],
    firstAction: "Run the documented read-only inventory, then review the findings before changing your configuration.",
    requirement: "Claude Code, Python, and a terminal. Reports still need your review.",
  },
  "retail-ops-ai-pack": {
    name: "Plan stock and handle returns", brand: "Retail Ops AI Pack", category: "Business and content", format: "Reusable AI instructions",
    description: "Work through inventory demand and returns using structured retail questions.",
    includes: ["Demand-planning workflow", "Returns workflow", "Holiday reorder example"],
    files: ["payload/inventory-demand-planning.md", "payload/returns-reverse-logistics.md", "examples/holiday-reorder-walkthrough.md"],
    firstAction: "Use sample data with the holiday reorder example before applying the workflow to your own stock decisions.",
    requirement: "Your own AI account and accurate retail data. Not inventory or POS software.",
  },
  "swarm-intake-protocol": {
    name: "Prepare a project for several agents", brand: "Swarm Intake Protocol", category: "Organize your projects", format: "Templates + checking script",
    description: "Write down project boundaries and check readiness before multiple agents start work.",
    includes: ["Project-state template", "Task template", "Readiness checker"],
    files: ["payload/templates/PROJECT_STATE.tmpl.md", "payload/templates/task.tmpl.yaml", "payload/lib/readiness_check.py"],
    firstAction: "Follow the intake example for one repository. Fill in owners and tasks, then inspect the readiness report.",
    requirement: "Python, Git, and a multi-agent workflow you manage. No hosted agents included.",
  },
  "founder-finance-pack": {
    name: "Organize your business numbers", brand: "Founder Finance Pack", category: "Business and content", format: "Reusable AI instructions",
    description: "Structure your assumptions, financial questions, and reporting drafts.",
    includes: ["Financial-analysis workflow", "Business-metrics review", "Board-deck outline workflow"],
    files: ["payload/financial-analyst.md", "payload/saas-metrics-coach.md", "payload/board-deck-builder.md"],
    firstAction: "List your assumptions and use the included example with sample numbers. Reconcile every calculation with your own records.",
    requirement: "Your own AI account and reliable data. Not accounting software or professional financial advice.",
  },
  "proof-engine-kit": {
    name: "Track a build-in-public project", brand: "Proof Engine Kit", category: "Business and content", format: "Templates + setup guides",
    description: "Create a structure for a build log, daily updates, and optional stream overlays.",
    includes: ["Daily-log data format", "Receipt-page pattern", "OBS overlay setup guide"],
    files: ["payload/schema/daily-log.schema.json", "payload/templates/day-receipt-page.pattern.md", "payload/runbooks/obs-overlay-setup.md"],
    firstAction: "Create one honest daily log with sample data before connecting it to a public page or overlay.",
    requirement: "Technical setup required for your own site; OBS is optional. Not a hosted dashboard.",
  },
  "browser-automation-studio": {
    name: "Plan and check browser tasks", brand: "Browser Automation Studio", category: "Build and verify", format: "Reusable AI instructions",
    description: "Give browser work a clear plan, verification steps, and a way to report blockers.",
    includes: ["Browser-task workflow", "Form-automation walkthrough", "Claude and Codex install layouts"],
    files: ["payload/browser-automation.md", "examples/form-automation-walkthrough.md", "install/codex/browser-automation/SKILL.md"],
    firstAction: "Read the form walkthrough and test on a site you own, without submitting real customer data.",
    requirement: "An AI agent with a compatible browser tool. The browser service is not included.",
  },
  "design-studio-pack": {
    name: "Give your website a design review", brand: "Design Studio Pack", category: "Business and content", format: "Reusable AI instructions",
    description: "Define a visual direction, then review a page for clarity and usability.",
    includes: ["Design-direction template", "Interface-critique workflow", "Landing-page review example"],
    files: ["payload/design-contract.md", "payload/ui-critique.md", "examples/landing-page-audit-walkthrough.md"],
    firstAction: "Read the landing-page walkthrough, then review one page with your audience and main action in mind.",
    requirement: "Your own AI account and a page or screenshots to review. Not a finished website theme.",
  },
  "content-engine-pack": {
    name: "Turn an idea into a content draft", brand: "Content Engine Pack", category: "Business and content", format: "Reusable AI instructions",
    description: "Develop hooks and scripts, then edit the draft into your own voice.",
    includes: ["Hooks and angles workflow", "Video-script workflow", "Draft-editing workflow"],
    files: ["payload/hooks-angles.md", "payload/ugc-scriptwriter.md", "payload/content-humanizer.md"],
    firstAction: "Bring one real idea to the included reel walkthrough. Check facts and rewrite the result in your own voice.",
    requirement: "Your own AI account. This pack does not record, edit, or post a video for you.",
  },
};

export const storefrontShelf = storeProducts.map((product) => {
  const offer = product.includedIn?.href === "/kit" ? storefrontOffers[0]
    : product.includedIn?.href === "/live-builds" ? storefrontOffers[1]
    : product.includedIn ? storefrontOffers[2] : null;
  return { key: product.key, license: product.license, ...descriptions[product.key], offer };
});

export const featuredToolKeys = ["skill-authoring-kit", "verification-qa-pack", "memory-os"];
export const toolCategories = ["All tasks", "Get set up", "Build and verify", "Organize your projects", "Business and content"];
export const catalogViews = [{ key: "all", label: "All Tools" }, { key: "free", label: "Free Tools" }, { key: "paid", label: "Paid Packages" }];

export function getCatalogView(search) {
  const value = new URLSearchParams(search).get("view");
  return catalogViews.some((view) => view.key === value) ? value : "all";
}

export function packagePrice(offer) {
  return offer?.dueToday ? `$${offer.dueToday} today, then $30/month` : offer ? `${offer.price} one time` : "$497 today, then $30/month";
}
