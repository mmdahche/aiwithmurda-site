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
    kind: "Kit · 14 files",
    promise: "Stop collecting other people's skills — mint your own. The authoring discipline behind a 270+ skill working library, with two installable worked examples.",
    includedIn: { label: "Ships inside The Future Proof Method today", href: "/kit", tier: "$47" },
    license: "MIT",
  },
  {
    key: "safe-autonomy-guardrails",
    name: "Safe-Autonomy Guardrails",
    price: "$49",
    kind: "Tool · 35 files · 118 shipped tests",
    promise: "Run AI agents overnight without leaking a secret, deleting prod, or being lied to about the work: fail-closed firewall, six guards, enforcement hooks.",
    includedIn: { label: "Ships inside the Operator Bundle today", href: "/live-builds", tier: "$97" },
    license: "Commercial",
  },
  {
    key: "verification-qa-pack",
    name: "Verification & QA Pack",
    price: "$29",
    kind: "Pack · 24 files",
    promise: "Make 'it works' mean something: claim gating, dead-button state audits, AI blind-spot testing, browser QA with a fix loop, ranked test-gap detection.",
    includedIn: { label: "Ships inside the Operator Bundle today", href: "/live-builds", tier: "$97" },
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
];

export const storeStandaloneNote =
  "Standalone checkout for shelf items opens at launch. Until then every shelf product is already deliverable today inside the tier shown on its card — and tiers always cost less than their parts.";
