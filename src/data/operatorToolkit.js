import { operatorToolkitAssets, operatorUpdateAssets } from "./memberAssets.js";

export const operatorToolkitProduct = {
  key: "operator_toolkit",
  name: "The Operator Toolkit",
  subtitle: "Murad's customer-safe Claude Code + Codex operating system.",
  priceCents: 29700,
  monthlyPriceCents: 3000,
  initialTotalCents: 32700,
  priceLabel: "$297 setup + $30/month",
  checkoutLabel: "$327 due today, then $30/month",
  status: "Full system",
  promise:
    "Install a complete dual-agent operating system with 24 customer-safe skills, reusable project rules, setup guidance, automation recipes, quality controls, and a verified command center.",
  positioning:
    "The lower tiers teach the method and provide focused tools. The Operator Toolkit installs the complete customer-safe system and keeps its update channel active.",
  primaryCta: "Install the full system",
  secondaryCta: "Compare all three tiers",
};

export const operatorUpdatesProduct = {
  key: "operator_updates",
  name: "Operator System Updates",
  subtitle: "New skills, revised workflows, compatibility fixes, and monthly system releases.",
  priceCents: 3000,
  priceLabel: "$30/month",
  status: "Recurring updates",
};

export const operatorToolkitOutcomes = [
  {
    title: "A working dual-agent command center",
    body: "Claude Code and Codex receive the same project facts, safety boundaries, verified commands, and handoff standard.",
  },
  {
    title: "24 customer-safe skills",
    body: "Install only the workflows tied to building, reviewing, designing, automating, launching, and delivering real work.",
  },
  {
    title: "Your launch edition stays yours",
    body: "The complete setup purchased for $297 remains available even if the monthly update membership ends.",
  },
  {
    title: "The system keeps improving",
    body: "Active update members receive versioned skill additions, revised scripts, compatibility notes, and release receipts.",
  },
];

export const operatorToolkitPath = [
  {
    phase: "01",
    title: "Audit the environment",
    time: "20-30 min",
    body: "Verify both agents, Git, project boundaries, and existing instructions before installing anything.",
  },
  {
    phase: "02",
    title: "Generate the command center",
    time: "30-45 min",
    body: "Create shared project guidance, protected paths, commands, proof rules, and the first handoff.",
  },
  {
    phase: "03",
    title: "Install the right collections",
    time: "30-60 min",
    body: "Choose skills by repeated work instead of dumping the entire library into every project.",
  },
  {
    phase: "04",
    title: "Run the dual-agent loop",
    time: "One real build",
    body: "Use one agent to implement and the second to review scope, regressions, security, and proof.",
  },
  {
    phase: "05",
    title: "Verify and version the system",
    time: "15-25 min",
    body: "Complete the setup receipt, save the baseline, and apply future updates through the release log.",
  },
];

export const operatorToolkitCollections = [
  {
    key: "foundation",
    label: "Collection 01",
    title: "Foundation + Scope",
    status: "6 skills",
    outcome: "Map the project, define the requirement, protect boundaries, and reduce broad ideas to one verifiable slice.",
  },
  {
    key: "build-quality",
    label: "Collection 02",
    title: "Build + Quality",
    status: "7 skills",
    outcome: "Debug, review, test real user paths, guard migrations, inspect dependencies, and ship safely.",
  },
  {
    key: "design-product",
    label: "Collection 03",
    title: "Design + Product",
    status: "5 skills",
    outcome: "Clarify information architecture, critique interfaces, verify responsiveness, and run accessibility checks.",
  },
  {
    key: "operations-growth",
    label: "Collection 04",
    title: "Operations + Growth",
    status: "6 skills",
    outcome: "Map automations, write SOPs, research decisions, sharpen offers, launch assets, and review weekly progress.",
  },
];

export const operatorToolkitAccessPlan = {
  label: "Operator Toolkit active",
  tier: "Full Operator System",
  status: "Launch edition owned",
  accessNote:
    "Your launch-edition toolkit is permanent. The update channel is a separate recurring entitlement so canceling updates never removes the system you purchased.",
  activationPromise:
    "Leave setup with a verified command center, a deliberate set of installed skills, a working dual-agent review loop, and a versioned baseline you can restore.",
  setupChecklist: [
    "Complete the environment audit before installing a skill.",
    "Generate project rules from verified commands, never placeholders.",
    "Install collections by use case and inspect every included file.",
    "Run one real build through implementation, review, verification, and handoff.",
    "Save the setup receipt before applying monthly updates.",
  ],
};

export const operatorToolkitReleases = [
  {
    version: "1.0.0",
    date: "2026-07-10",
    title: "Launch Edition",
    access: "Permanent",
    summary: "The complete 24-skill system, command-center setup, dual-agent protocol, and verification baseline.",
  },
  {
    version: "1.1.0",
    date: "2026-07-10",
    title: "Founding Update 001",
    access: "Active update membership",
    summary: "Four update-channel skills plus the compatibility matrix and release application workflow.",
  },
];

export { operatorToolkitAssets, operatorUpdateAssets };

export const operatorToolkitFaq = [
  {
    question: "What is charged today?",
    answer:
      "$327 is due at checkout: the one-time $297 toolkit setup plus the first $30 month of Operator System Updates. Future renewals are $30 per month until canceled.",
  },
  {
    question: "What happens if I cancel the monthly updates?",
    answer:
      "You keep permanent access to the launch-edition Operator Toolkit purchased for $297. The update feed, future releases, and update-only downloads pause at the end of the paid billing period.",
  },
  {
    question: "Does this include the lower tiers?",
    answer:
      "Yes. The Operator Toolkit includes The Future Proof Method, the New Wave Operator Bundle, and the full-system setup library.",
  },
  {
    question: "Is this a copy of Murad's private computer?",
    answer:
      "No. It is the complete customer-safe operating system: original workflows, templates, skills, and setup patterns without credentials, private company infrastructure, licensed third-party skills, customer data, or machine-specific secrets.",
  },
];
