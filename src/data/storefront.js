import { coreMemberAssets, operatorBundleAssets, operatorToolkitAssets } from "./memberAssets.js";
import { operatorToolkitProduct } from "./operatorToolkit.js";

export const storefrontOffers = [
  {
    slug: "future-proof-method", key: "future_proof_method", name: "The Future Proof Method",
    shortName: "Learn to build with Claude Code and Codex", category: "Get set up", price: "$47", billing: "One-time purchase",
    cardIncludes: ["Five written setup and build modules", "Prompt scripts and starter skills", "Council tool + Skill Authoring Kit"],
    previewKey: "skill-authoring-kit",
    description: "Get Claude Code and Codex working on your own project, with guided setup, reusable prompts, and your first small build.",
    audience: "You want a clear starting point, not another folder of prompts you never open.",
    color: "green", memberProduct: "future-method", legacyHref: "/kit",
    includes: ["Five written, step-by-step modules", "Core prompt scripts and starter skills", "The Council decision tool", "Skill Authoring Kit", "Setup, troubleshooting, and first-build guides"],
    assets: coreMemberAssets,
    firstAction: "Open the 60-Minute Quickstart. Choose a project, check your tools, and run a read-only inspection before changing anything.",
    requirements: ["A computer and access to Claude Code or Codex; the full path covers both.", "An editor and a terminal. Setup guidance is included; commands differ by operating system.", "The Council needs a Groq API key. Provider availability, usage limits, and fees can change."],
  },
  {
    slug: "operator-bundle", key: "new_wave_live_builds", name: "New Wave Operator Bundle",
    shortName: "Build, debug, and check your work", category: "Build and verify", price: "$97", billing: "One-time purchase",
    cardIncludes: ["Everything in the $47 starter", "Guardrails + Verification & QA Pack", "Eight workflows, scripts, and blueprints"],
    previewKey: "verification-qa-pack",
    description: "Add a repeatable way to plan, debug, review, and deliver work. Includes the entire Future Proof Method.",
    audience: "You already build with AI and want better checks, clearer handoffs, and reusable project starting points.",
    color: "blue", memberProduct: "operator-bundle", legacyHref: "/live-builds",
    includes: ["Everything in the $47 starter", "Safe-Autonomy Guardrails", "Verification & QA Pack", "Eight additional skill workflows", "Advanced scripts, project blueprints, and delivery checklists"],
    assets: operatorBundleAssets,
    firstAction: "Open the Operator Skill Vault and choose one workflow for a real project. Review its instructions before installing or running it.",
    requirements: ["An existing project and basic familiarity with Claude Code or Codex.", "Some included tools need Node.js, Python, or a shell. Check the individual folder's requirements.", "Guardrails reduce particular risks; they do not replace backups, permissions, or your review."],
  },
  {
    slug: "operator-toolkit", key: "operator_toolkit", name: "The Operator Toolkit",
    shortName: "Organize your full AI setup", category: "Organize your projects", price: "$297", billing: "$297 setup + $30/month updates",
    cardIncludes: ["Everything in the $97 bundle", "24-skill pack + Memory OS", "Model router and collaboration guides"],
    previewKey: "memory-os",
    dueToday: operatorToolkitProduct.initialTotalCents / 100,
    description: "Bring project instructions, memory, skills, and two-agent collaboration into a setup you can adapt. Includes both lower tiers.",
    audience: "You work across projects and want a structured setup you can adapt to the way you build.",
    color: "yellow", memberProduct: "operator-toolkit", legacyHref: "/operator-toolkit",
    includes: ["Everything in the $47 and $97 packages", "24-Skill Installation Pack", "Memory OS and the Three-Tier LLM Router", "Autonomous Operator Kit", "Project instructions, collaboration rules, and system guides"],
    assets: operatorToolkitAssets,
    firstAction: "Open the System Installation Guide. Audit your current setup, make a backup, and install one skill in a test project first.",
    requirements: ["Comfort using project folders, Git, and a terminal. This is a self-guided setup, not installation done for you.", "Claude Code and Codex access. Some tools require your own provider API keys and runtime dependencies.", "The current checkout includes monthly updates. Cancel future renewals from your member account; keep the purchased edition."],
  },
];

export function getStorefrontOffer(slug) {
  return storefrontOffers.find((offer) => offer.slug === slug);
}

export function getStorefrontReturnPath(search) {
  const next = new URLSearchParams(search).get("next");
  const offer = storefrontOffers.find((item) => `store-${item.slug}` === next);
  return offer ? `/store/${offer.slug}` : null;
}

export const storefrontFaq = [
  ["What am I actually buying?", "Downloadable instruction files, prompt scripts, templates, skills, and selected runnable tools. The starter also includes written lessons. These are not a hosted AI subscription or a done-for-you service."],
  ["Do I have to stream or make content?", "No. Use the files privately, on your own projects, at your own pace. The streaming challenge is part of Murad's story, not a course requirement."],
  ["Are Claude Code and Codex included?", "No. You bring your own accounts, computer, and any required API keys. Tool subscriptions and provider usage are separate from these downloads. Check each product's requirements before buying."],
  ["How do I get my files?", "Sign in or create an account, complete checkout, then open My Downloads using that same email. Your purchased files and setup guides are kept together there."],
  ["Is there a monthly charge?", "The $47 starter and $97 bundle are one-time purchases. The current Toolkit offer charges $327 today, including the $297 setup and first $30 update month, then $30/month until canceled. Canceling updates does not remove your purchased edition."],
  ["Can I ask a question before buying?", "Yes. Email murad@aiwithmurda.com about contents, compatibility, or access. Read the Terms for purchase and refund conditions; no income or business result is guaranteed."],
];
