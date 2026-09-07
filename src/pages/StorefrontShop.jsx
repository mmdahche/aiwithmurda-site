import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Download, FileText, Search, X } from "lucide-react";
import { storeProducts } from "../data/storeCatalog.js";
import { getStorefrontOffer, storefrontOffers } from "../data/storefront.js";
import { OfferCard, SamplerBand, StoreFaq } from "../components/storefront/StorefrontParts.jsx";
import { PurchaseAction } from "../components/storefront/PurchaseAction.jsx";

const shelfCopy = {
  "council-decision-engine": ["The Council", "Build and verify", "Compare a decision from several AI perspectives, then review the tradeoffs yourself."],
  "skill-authoring-kit": ["Skill Authoring Kit", "Get set up", "Turn a repeated task into a reusable AI skill, with templates and worked examples."],
  "safe-autonomy-guardrails": ["Safe-Autonomy Guardrails", "Build and verify", "Add checks for sensitive data, risky commands, and unsupported completion claims."],
  "verification-qa-pack": ["Verification & QA Pack", "Build and verify", "Use structured checks for interfaces, test gaps, and the work an agent says is finished."],
  "three-tier-llm-router": ["Three-Tier LLM Router", "Organize your projects", "Route work between model tiers and keep a record of dispatch decisions and costs."],
  "memory-os": ["Memory OS", "Organize your projects", "Keep project instructions, decisions, and handoffs organized between AI sessions."],
  "autonomous-operator-kit": ["Autonomous Operator Kit", "Organize your projects", "Structure longer agent work into bounded cycles with review and stop conditions."],
  "zero-dollar-research-engine": ["Research Engine", "Build and verify", "Gather and structure results from supported open-web sources without a paid search API."],
  "mcp-builder-pack": ["MCP Builder Pack", "Build and verify", "Create tools for an AI agent with server patterns and a TypeScript worked example."],
  "claude-setup-audit-suite": ["Claude Setup Audit Suite", "Get set up", "Inspect a Claude setup's files, context budget, hooks, and installed skills."],
  "retail-ops-ai-pack": ["Retail Ops AI Pack", "Business and content", "Work through demand planning and returns with structured retail playbooks."],
  "swarm-intake-protocol": ["Swarm Intake Protocol", "Organize your projects", "Check a project's context and readiness before assigning work to multiple agents."],
  "founder-finance-pack": ["Founder Finance Pack", "Business and content", "Organize business assumptions, financial models, and reporting with reusable templates."],
  "proof-engine-kit": ["Proof Engine Kit", "Business and content", "Templates for a public build log, daily receipts, and stream overlays. Optional for creators."],
  "browser-automation-studio": ["Browser Automation Studio", "Build and verify", "Plan browser tasks, choose a supported tool, and record checks and blockers."],
  "design-studio-pack": ["Design Studio Pack", "Business and content", "Set a visual direction and review interfaces for clarity, motion, and usability."],
  "content-engine-pack": ["Content Engine Pack", "Business and content", "Shape content ideas, video hooks, and drafts with reusable creative workflows."],
};
const categories = ["All files", "Get set up", "Build and verify", "Organize your projects", "Business and content"];
export const storefrontShelf = storeProducts.map((product) => {
  const [name, category, description] = shelfCopy[product.key];
  const offer = product.includedIn?.href === "/kit" ? storefrontOffers[0] : product.includedIn?.href === "/live-builds" ? storefrontOffers[1] : product.includedIn ? storefrontOffers[2] : null;
  return { ...product, name, category, description, offer };
});

export function StorefrontShop() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All files");
  const matches = storefrontShelf.filter((item) => (category === "All files" || item.category === category) && `${item.name} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <main className="sf-page" id="main-content">
    <header className="sf-container sf-page-heading"><h1>Tools for your<br />next real build.</h1><p>Reusable skills, scripts, and project folders. Choose a package, or explore the individual files inside.</p></header>
    <section className="sf-container sf-shop-offers" aria-label="Available packages"><div className="sf-offer-grid">{storefrontOffers.map((offer) => <OfferCard key={offer.slug} offer={offer} />)}</div></section>
    <section className="sf-catalog-section" id="files"><div className="sf-container"><div className="sf-section-heading"><div><h2>Explore the files inside.</h2><p>These folders are sold in packages for now. Each one shows where it's included.</p></div><label className="sf-search"><Search size={18} /><input type="search" aria-label="Search tools" placeholder="Find a tool..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear search" title="Clear search" onClick={() => setQuery("")}><X size={17} /></button>}</label></div><div className="sf-filters" role="group" aria-label="Filter tools">{categories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><p className="sf-result-count" role="status">{matches.length} {matches.length === 1 ? "tool" : "tools"}</p><div className="sf-catalog">{matches.map((item) => <a key={item.key} className="sf-catalog-row" href={`/store/${item.key}`}><FileText size={23} /><div><h3>{item.name}</h3><p>{item.description}</p></div><span>{item.offer ? `In the ${item.offer.price} package` : "In Operator Arsenal"}<ArrowRight size={18} /></span></a>)}</div>{!matches.length && <div className="sf-empty"><h3>No matching tools.</h3><p>Try a different name or reset your filters.</p><button className="sf-button sf-button-dark" onClick={() => { setQuery(""); setCategory("All files"); }}>Reset filters</button></div>}</div></section><SamplerBand />
  </main>;
}

export function StorefrontProduct({ slug, authSession, authReady }) {
  const offer = getStorefrontOffer(slug);
  const file = storefrontShelf.find((item) => item.key === slug);
  if (!offer && !file) return <main className="sf-page" id="main-content"><div className="sf-container sf-page-heading"><h1>That tool isn't on the shelf.</h1><a className="sf-button" href="/store">Browse the shop <ArrowRight size={18} /></a></div></main>;
  if (!offer) return <main className="sf-page" id="main-content"><section className="sf-container sf-product-layout"><div><a className="sf-text-link" href="/store#files"><ArrowLeft size={17} /> All tools</a><p className="sf-product-category">{file.category}</p><h1>{file.name}</h1><p className="sf-lead">{file.description}</p><div className="sf-file-facts"><span><FileText size={20} /> {file.kind}</span><span>{file.license} license</span></div><h2>What's in a product folder?</h2><ul className="sf-check-list">{["Start Here instructions and requirements", "The product files and installation layout", "Worked examples or usage guidance", "A file index, version notes, and verification steps"].map((text) => <li key={text}><Check size={18} />{text}</li>)}</ul><p>Review the included license before reusing or redistributing files. Provider accounts and any paid API usage are separate.</p></div><aside className="sf-buy-panel"><FileText size={32} /><h2>Included in {file.offer?.name || "Operator Arsenal"}</h2><p>This folder is not sold individually yet. Get it with the package below.</p><strong>{file.offer?.dueToday ? `$${file.offer.dueToday} today` : file.offer?.price || "$497 today"}</strong><p>{file.offer ? file.offer.billing : "Then $30/month for updates until canceled. Includes the full Toolkit and every shelf folder."}</p><a className="sf-button" href={file.offer ? `/store/${file.offer.slug}` : "/operator-arsenal"}>Review the package <ArrowRight size={18} /></a><a className="sf-text-link" href="/start">Try the free sampler first</a></aside></section><SamplerBand /></main>;
  const canceled = new URLSearchParams(window.location.search).get("checkout") === "cancel";
  return <main className="sf-page" id="main-content"><section className="sf-container sf-product-layout"><div><a className="sf-text-link" href="/store"><ArrowLeft size={17} /> All packages</a><p className="sf-product-category">{offer.category}</p><h1>{offer.name}</h1><p className="sf-lead">{offer.description}</p><p>{offer.audience}</p><ul className="sf-check-list">{offer.includes.map((item) => <li key={item}><Check size={18} />{item}</li>)}</ul></div><aside className={`sf-buy-panel sf-${offer.color}`}><span>Digital download + member access</span><strong>{offer.price}</strong><p>{offer.billing}</p>{offer.dueToday ? <p className="sf-billing-note"><b>${offer.dueToday} due today.</b> Includes the $297 setup and first $30 update month. Then $30/month until canceled. Keep your purchased edition when updates end.</p> : <p className="sf-billing-note">Pay once. Access your purchased files in My Downloads. No monthly enrollment.</p>}<PurchaseAction offer={offer} authSession={authSession} authReady={authReady} /><p className="sf-fine-print">Secure checkout through Backbone Solutions on Stripe. <a href="/terms">Purchase terms</a></p>{canceled && <p role="status">Checkout was canceled. You can try again when you're ready.</p>}<a className="sf-text-link" href="/members">Already purchased? My Downloads <ArrowRight size={16} /></a></aside></section>
    <section className="sf-container sf-product-details"><div><h2>Your first useful step.</h2><p>{offer.firstAction}</p><h2>Before you buy.</h2><ul>{offer.requirements.map((item) => <li key={item}>{item}</li>)}</ul><p>AI subscriptions and usage fees are not included. You stay responsible for reviewing commands, protecting credentials, and checking results.</p></div><div><h2>Inside your download library.</h2>{offer.slug !== "future-proof-method" && <p>Plus the files from the lower package{offer.slug === "operator-toolkit" ? "s" : ""}.</p>}<ul className="sf-contents-list">{offer.assets.map((asset) => <li key={asset.key}><FileText size={17} /><span>{asset.title}</span><small>{asset.mimeType === "application/zip" ? "ZIP" : "Guide"}</small></li>)}</ul></div></section><SamplerBand /><StoreFaq /></main>;
}
