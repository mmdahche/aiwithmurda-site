import { operatorBundleAssets } from "./memberAssets.js";

// The entitlement key remains unchanged so existing purchases and webhook history keep working.
export const operatorBundleProduct = {
  key: "new_wave_live_builds",
  name: "New Wave Operator Bundle",
  subtitle: "More skills. More scripts. More ways to ship.",
  priceCents: 9700,
  priceLabel: "$97",
  status: "Operator tier",
  promise:
    "The complete Future Proof Method plus an expanded vault of reusable skills, advanced scripts, dual-agent review workflows, debugging systems, deployment checks, and project blueprints.",
  positioning:
    "The $47 course gets you through a verified first build. The Operator Bundle gives you the reusable systems to repeat that result across more projects and client work.",
  primaryCta: "Unlock the Operator Bundle",
  secondaryCta: "Compare the $47 starter course",
};

export const operatorBundleOutcomes = [
  { title: "The starter course is included", body: "Bundle access also unlocks all five beginner modules and core downloads." },
  { title: "Eight more skills", body: "Install focused workflows for planning, debugging, review, UI polish, deployment, and handoffs." },
  { title: "Advanced script library", body: "Use tested prompt structures for larger changes without giving the agent vague control." },
  { title: "Reusable build blueprints", body: "Start common small products and business workflows from bounded briefs instead of blank pages." },
];

export const operatorBundlePath = [
  { phase: "01", title: "Finish the foundation", time: "Core course", body: "Verify both agents, prepare the project, and prove the operator loop." },
  { phase: "02", title: "Install only what you need", time: "Skill vault", body: "Choose skills by repeated workflow, inspect them, then test them in a practice project." },
  { phase: "03", title: "Add the review agent", time: "Quality loop", body: "Use one agent to build and the other to challenge scope, risk, and verification." },
  { phase: "04", title: "Repeat with a blueprint", time: "Next build", body: "Use a reusable brief to ship a second result without restarting from zero." },
];

export const operatorBundleDeliverables = [
  "Everything in The Future Proof Method starter course.",
  "Eight-skill Operator Vault with installation and safety notes.",
  "Advanced prompt scripts for audits, refactors, migrations, and recovery.",
  "Dual-agent builder and reviewer workflow.",
  "Debug Rescue System with evidence and stop conditions.",
  "Deployment and smoke-test runbook.",
  "Seven reusable project blueprints.",
  "Client discovery, scope, approval, QA, and handoff scripts.",
];

export const operatorBundleAccessPlan = {
  label: "Operator Bundle active",
  tier: "New Wave Operator",
  status: "Vault unlocked",
  accessNote:
    "Your bundle includes the complete starter course and the advanced vault. Start with the core path if you have not shipped the first build yet; install advanced skills only when a repeated need appears.",
  activationPromise:
    "You should leave the bundle with a clean dual-agent workflow, a small set of trusted skills, and a blueprint for the next real build.",
  setupChecklist: [
    "Complete Modules 1-3 of the starter course before adding advanced automation.",
    "Inspect every skill and script before installing or running it.",
    "Choose one repeated workflow to improve first.",
    "Use the second agent as a reviewer, not as another source of uncontrolled scope.",
  ],
  buyerPath: [
    "Core course included.",
    "Operator vault unlocked.",
    "Choose one skill collection.",
    "Run one dual-agent review loop.",
    "Ship the next blueprint with verification.",
  ],
};

export const operatorBundleCollections = [
  {
    key: "planning-review",
    label: "Collection 01",
    title: "Plan + Review",
    status: "3 skills",
    estimatedTime: "30-60 min setup",
    outcome: "Create better briefs, map unfamiliar projects, and review changes before they become expensive.",
    proofTarget: "A build brief and reviewer report both cite the real project and user path.",
    reuseMove: "Use this collection before every medium or high-risk feature.",
  },
  {
    key: "debug-quality",
    label: "Collection 02",
    title: "Debug + Quality",
    status: "3 skills",
    estimatedTime: "Use on demand",
    outcome: "Turn errors and visual problems into bounded evidence, fixes, and regression checks.",
    proofTarget: "The root cause, reproduction, fix, and verification are captured in one receipt.",
    reuseMove: "Use this collection when two attempts fail or the user path regresses.",
  },
  {
    key: "ship-handoff",
    label: "Collection 03",
    title: "Ship + Handoff",
    status: "2 skills + runbooks",
    estimatedTime: "45-90 min setup",
    outcome: "Deploy, smoke test, document, and hand off a working build without losing the operational details.",
    proofTarget: "The live or local release has a reproducible check, rollback note, and next action.",
    reuseMove: "Apply the same release discipline to internal tools, client work, and paid products.",
  },
];

export { operatorBundleAssets };

export const operatorBundleFaq = [
  {
    question: "Does the bundle include the $47 course?",
    answer: "Yes. An active Operator Bundle entitlement unlocks the complete starter course and its downloads.",
  },
  {
    question: "Is this still a live-stream ticket?",
    answer:
      "No. The existing entitlement has been upgraded into a reusable operator bundle. Murad may add live implementation sessions later, but the current value is delivered immediately through the course and vault.",
  },
  {
    question: "Should a beginner buy the bundle first?",
    answer:
      "Only if you want the full library from day one. The portal still directs you through the beginner foundation before the advanced skills so the larger vault does not become clutter.",
  },
  {
    question: "Are these Murad's private company scripts?",
    answer:
      "They are customer-safe versions of the workflows and quality controls Murad uses daily. Secrets, company infrastructure, private paths, and sensitive automation are not included.",
  },
];
