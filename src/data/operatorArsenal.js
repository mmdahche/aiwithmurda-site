import { storeProducts } from "./storeCatalog.js";

export const operatorArsenalProduct = {
  key: "sku_arsenal",
  name: "Operator Arsenal",
  subtitle: "Every shelf tool plus the full Operator Toolkit — one checkout.",
  priceCents: 46700,
  monthlyPriceCents: 3000,
  initialTotalCents: 49700,
  priceLabel: "$497 setup + $30/month updates",
  checkoutLabel: "$497 due today, then $30/month",
  status: "Complete library",
  promise:
    "All standalone shelf products as permanent downloads, plus the complete Operator Toolkit, course, vault, and the first month of system updates.",
  positioning:
    "The ceiling tier for operators who want every tool on the shelf without assembling the ladder one SKU at a time.",
  primaryCta: "Unlock the complete library",
  secondaryCta: "Compare tiers",
};

/** Shelf zips granted to sku_arsenal buyers (1:1 with storeProducts + verify pipeline). */
export const operatorArsenalShelfAssets = storeProducts.map((product) => ({
  key: product.key,
  title: product.name,
  body: product.promise,
  fileName: `${product.key}.zip`,
  downloadName: `${product.key}.zip`,
  mimeType: "application/zip",
}));

export const operatorArsenalAccessPlan = {
  label: "Operator Arsenal active",
  tier: "Complete library",
  status: "Permanent shelf + toolkit",
  accessNote:
    "Your launch-edition toolkit and every shelf zip remain yours. Updates pause if the monthly membership ends — the downloads you received do not.",
  activationPromise:
    "Leave checkout with toolkit hub access, all shelf zips, and the update channel through the first paid month.",
};

export const operatorArsenalFaq = [
  {
    question: "What is charged today?",
    answer:
      "$497 is due at checkout: $467 for the permanent Arsenal (all shelf zips + full toolkit) plus the first $30 month of Operator System Updates. Renewals are $30/month until canceled.",
  },
  {
    question: "How is this different from the $297 Operator Toolkit?",
    answer:
      "The Toolkit includes the course, vault, and three flagship systems inside the tier. Arsenal adds every standalone shelf SKU as direct zip downloads — Research Engine, MCP Builder, Audit Suite, Proof Engine, and the rest — on top of the full toolkit.",
  },
  {
    question: "Do I still need the lower tiers?",
    answer: "No. Arsenal includes everything the $47, $97, and $297 tiers deliver, plus all shelf-only products.",
  },
  {
    question: "Can I buy individual shelf items instead?",
    answer:
      "Standalone Payment Links for individual shelf SKUs are coming. Until then, shelf products ship inside the tiers shown on each card, or all at once through Arsenal.",
  },
];
