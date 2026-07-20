// The store shelf: folder-per-product SKUs. Every entry maps 1:1 to a
// verified folder under products/ — the catalog never lists anything that
// doesn't exist on disk (see scripts/verify-product-folder.mjs).
//
// Standalone Payment Links don't exist yet (prelaunch); each card routes to
// the tier that includes the SKU today. When a standalone link goes live,
// add `buyHref` to the entry and the card switches to direct checkout.

export const storeFreeItem = {
  key: "operator-sampler",
  name: "The Operator Sampler",
  price: "Free",
  kind: "Free download · ZIP",
  promise: "The free tier that actually works: one real skill, one real script, one real daily rhythm from the paid line.",
  contents: [
    "verify-before-claiming — the no-claims-without-evidence skill, both agent layouts",
    "The inspect-before-edit prompt script, with the reasoning per line",
    "The Daily Operator Checklist (15/30/60-minute session tracks)",
  ],
  downloadHref: "/downloads/operator-sampler.zip",
  license: "MIT",
};

export const storeProducts = [
  {
    key: "council-decision-engine",
    name: "The Council — 5-Advisor Decision Engine",
    price: "$29",
    kind: "Tool · 21 files",
    promise: "Never make a big call solo again. Five models argue your decision from five opposing lenses; anonymized peer review grades them; your session rules as Chairman. ~5 seconds, $0 per run.",
    includedIn: { label: "Ships inside The Future Proof Method today", href: "/kit", tier: "$47" },
    license: "Commercial",
  },
  {
    key: "skill-authoring-kit",
    name: "Skill Authoring Kit",
    price: "$19",
    kind: "Kit · 15 files",
    promise: "Stop collecting other people's skills — mint your own. The authoring discipline behind a 270+ skill working library, with two installable worked examples.",
    includedIn: { label: "Ships inside The Future Proof Method today", href: "/kit", tier: "$47" },
    license: "MIT",
  },
  {
    key: "safe-autonomy-guardrails",
    name: "Safe-Autonomy Guardrails",
    price: "$49",
    kind: "Tool · 35 files · 100 shipped tests",
    promise: "Run AI agents overnight without leaking a secret, deleting prod, or being lied to about the work: fail-closed firewall, six guards, enforcement hooks.",
    includedIn: { label: "Ships inside the Operator Bundle today", href: "/live-builds", tier: "$97" },
    license: "Commercial",
  },
  {
    key: "verification-qa-pack",
    name: "Verification & QA Pack",
    price: "$29",
    kind: "Pack · 25 files",
    promise: "Make 'it works' mean something: claim gating, dead-button state audits, AI blind-spot testing, browser QA with a fix loop, ranked test-gap detection.",
    includedIn: { label: "Ships inside the Operator Bundle today", href: "/live-builds", tier: "$97" },
    license: "MIT",
  },
  {
    key: "three-tier-llm-router",
    name: "The Three-Tier LLM Router",
    price: "$79",
    kind: "Engine · 28 files · 71 shipped tests",
    promise: "Stop burning precision-tier tokens on cheap-tier work: classify-and-dispatch running code with hard-floor protection, fail-closed egress scrubbing, and a JSONL cost ledger.",
    includedIn: { label: "Ships inside the Operator Toolkit today", href: "/operator-toolkit", tier: "$297" },
    license: "Commercial",
  },
  {
    key: "memory-os",
    name: "Memory OS — Give Your Claude a Soul",
    price: "$99",
    kind: "System · 24 files",
    promise: "Your AI stops forgetting: identity that survives sessions, a slim-index memory architecture, the boot ritual, and handoff / resume / dispatch.",
    includedIn: { label: "Ships inside the Operator Toolkit today", href: "/operator-toolkit", tier: "$297" },
    license: "Commercial",
  },
  {
    key: "autonomous-operator-kit",
    name: "The Operator Cycle — Autonomous Operator Kit",
    price: "$129",
    kind: "System · 32 files",
    promise: "One verified ship per cycle, unattended: depth ladder, anti-decay rotation, honest nulls, autostop — with an auditable log and commit-trailer contract.",
    includedIn: { label: "Ships inside the Operator Toolkit today", href: "/operator-toolkit", tier: "$297" },
    license: "Commercial",
  },
  {
    key: "zero-dollar-research-engine",
    name: "$0 Research Engine",
    price: "$29",
    kind: "Engine · 38 files · 119 shipped tests",
    promise: "Ask the open web one question, get structured results from many free sources, convert anything to clean markdown — SSRF-guarded, fail-closed, zero paid APIs.",
    license: "MIT",
  },
  {
    key: "mcp-builder-pack",
    name: "MCP Builder Pack",
    price: "$39",
    kind: "Pack · 4 skills + TypeScript worked example (copy-build-run)",
    promise: "Build the tools your agent is missing: MCP servers with the official SDK, tool-design patterns, action-space discipline, and the regex-vs-LLM parsing framework.",
    license: "MIT",
  },
  {
    key: "claude-setup-audit-suite",
    name: "Claude Setup Audit Suite",
    price: "$39",
    kind: "Pack · 26 files · 2 runnable scripts",
    promise: "Find out what your Claude setup actually costs you — deterministic inventory, context budget, hook regression eval, and pre-install skill security scanning.",
    license: "MIT",
  },
  {
    key: "retail-ops-ai-pack",
    name: "Retail Ops AI Pack",
    price: "$59",
    kind: "Pack · 2 clean-room skills",
    promise: "Demand planning and reverse logistics playbooks — forecast selection, safety stock, promo lift, RMA grading, disposition routing, and fraud scoring with numbers attached.",
    license: "MIT",
  },
  {
    key: "swarm-intake-protocol",
    name: "Swarm Intake Protocol",
    price: "$49",
    kind: "Kit · skill + 16 tests + readiness gate",
    promise: "Make any project swarm-ready before the first dispatch — 5-stage intake pipeline, layered context, task graph, and a deterministic READY gate with ten checks.",
    license: "MIT",
  },
  {
    key: "founder-finance-pack",
    name: "Founder Finance Pack",
    price: "$49",
    kind: "Pack · 6 clean-room skills",
    promise: "CFO-grade analysis without the CFO — burn and runway, SaaS metrics, financial models, investor materials, outreach, and board decks with one source of truth for your numbers.",
    license: "MIT",
  },
  {
    key: "proof-engine-kit",
    name: "Proof Engine Kit",
    price: "$99",
    kind: "System · schemas + runbooks + skill",
    promise: "The build-in-public command center pattern — scoreboard data model, daily receipts, OBS overlay discipline, prelaunch honesty, baseline reset, and smoke:launch gate templates.",
    license: "MIT",
  },
  {
    key: "browser-automation-studio",
    name: "Browser Automation Studio",
    price: "$39",
    kind: "Studio · conductor skill",
    promise: "Point your agent at any site — scrape, test, and drive flows with backend routing, scraper robots, anti-rabbit-hole rules, and blocker reporting.",
    license: "MIT",
  },
  {
    key: "design-studio-pack",
    name: "Design Studio Pack",
    price: "$49",
    kind: "Pack · 4 clean-room skills",
    promise: "Ship interfaces that don't look like AI slop — DESIGN.md brand contracts, a 28-rule anti-slop audit, motion framework, and structured UI critique.",
    license: "MIT",
  },
  {
    key: "content-engine-pack",
    name: "Content Engine Pack",
    price: "$39",
    kind: "Pack · 5 clean-room skills",
    promise: "Hooks, UGC scripts, humanized copy, trending angles with citations, and audio overviews — ethics baked in, no fake-guru defaults.",
    license: "MIT",
  },
];

export const storeTiers = [
  {
    key: "future-proof-method",
    name: "The Future Proof Method",
    price: "$47",
    href: "/kit",
    body: "The starter system — five implementation modules plus The Council and the Skill Authoring Kit included in full. $48 of shelf value inside a $47 tier.",
  },
  {
    key: "operator-bundle",
    name: "New Wave Operator Bundle",
    price: "$97",
    href: "/live-builds",
    body: "Everything in the starter system plus Safe-Autonomy Guardrails, the Verification & QA Pack, and the advanced operator vault.",
  },
  {
    key: "operator-toolkit",
    name: "The Operator Toolkit",
    price: "$297 + $30/mo",
    href: "/operator-toolkit",
    body: "The complete customer-safe operating system — 24 skills, command center, dual-agent protocol — permanently yours, updates optional.",
  },
  {
    key: "operator-arsenal",
    name: "Operator Arsenal",
    price: "$497 + $30/mo",
    href: "/operator-arsenal",
    body: "Every standalone shelf product as permanent zip downloads, plus the full Operator Toolkit — the complete library in one checkout.",
  },
];

export const storeStandaloneNote =
  "Standalone checkout for shelf items opens at launch. Until then every shelf product is already deliverable today inside the tier shown on its card — and tiers always cost less than their parts.";
