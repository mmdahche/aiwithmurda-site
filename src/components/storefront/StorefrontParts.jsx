import React from "react";
import { ArrowRight, Check, Download, FileText, Info, Layers2, Layers3, ListChecks, Mail, Plus, ShieldCheck } from "lucide-react";
import inspectText from "../../../products/operator-sampler/payload/inspect-before-edit.md?raw";
import checklistText from "../../../products/operator-sampler/payload/daily-operator-checklist.md?raw";
import verifyText from "../../../products/operator-sampler/payload/verify-before-claiming.md?raw";
import { storefrontFaq, storefrontOffers } from "../../data/storefront.js";

export const samplerParts = [
  { name: "inspect-before-edit.md", label: "Plan an AI change", format: "Copy-and-paste prompt", text: inspectText,
    description: "Ask the AI to read your project and propose a small plan before it changes files.",
    excerpt: 'Do not edit any file until I say "go".' },
  { name: "verify-before-claiming.md", label: "Make AI check its work", format: "Reusable AI instructions", text: verifyText,
    description: "Ask for fresh tests and evidence before the AI says a job is done. You still review the result.",
    excerpt: "Evidence before claims, always." },
  { name: "daily-operator-checklist.md", label: "Pick up where you left off", format: "Daily checklist", text: checklistText,
    description: "Follow a 15-, 30-, or 60-minute routine and leave a clear next step for tomorrow.",
    excerpt: "Write tomorrow's first move in one sentence. Close the session." },
];

/* Small shared pieces of the site system ---------------------------------- */

export const pad2 = (value) => String(value).padStart(2, "0");

// Numbered panel header: light-blue mono counter on the left, mono descriptor on the right.
export function PanelHead({ n, total, label, children }) {
  return <div className="mx-panel-head"><span className="mx-count">{label || `${pad2(n)} / ${pad2(total)}`}</span><span className="mx-desc">{children}</span></div>;
}

// One layer, two layers, three layers: the starter, the bundle, the Toolkit.
function LayerOne(props) {
  return <svg viewBox="0 0 24 24" {...props}><path d="M12.83 7.18a2 2 0 0 0-1.66 0L2.6 11.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /></svg>;
}
export const packageTiers = [
  { short: "Starter", Icon: LayerOne, note: "The starter." },
  { short: "Bundle", Icon: Layers2, note: "Includes the starter." },
  { short: "Toolkit", Icon: Layers3, note: "Includes both lower tiers." },
];

// The amount and its cadence, for the price ticker. `offer` is null for tools that only ship in Operator Arsenal.
export function priceParts(offer) {
  if (offer?.dueToday) return { tag: "Today", amount: `$${offer.dueToday}`, cadence: "Then $30/month" };
  if (offer) return { tag: "One time", amount: offer.price, cadence: "No monthly charge" };
  return { tag: "Today", amount: "$497", cadence: "Then $30/month" };
}

export function PriceTicker({ offer, small = false }) {
  const price = priceParts(offer);
  return <p className="mx-price-row">
    <span className={`mx-ticker mx-ticker--price${small ? " mx-ticker--price-sm" : ""}`}><span className="mx-ticker-tag">{price.tag}</span><span className="mx-ticker-bar">{price.amount}</span></span>
    <span className="mx-cadence">{price.cadence}</span>
  </p>;
}

/* Paid package card (cream) ------------------------------------------------ */

export function OfferCard({ offer }) {
  const index = storefrontOffers.findIndex((item) => item.slug === offer.slug);
  const titleId = `pkg-${offer.slug}-title`;
  return <article className={`mx-cream mx-pkg sf-offer sf-${offer.color}`} id={`pkg-${offer.slug}`} aria-labelledby={titleId}>
    <div className="mx-pkg-top mx-ticker-box"><p className="mx-ticker"><span className="mx-ticker-tag">Paid package</span><span className="mx-ticker-bar">{offer.dueToday ? "Today + monthly" : "One-time"}</span></p></div>
    <div className="mx-pkg-name">
      <p className="mx-eyebrow">{offer.name}</p>
      <h3 id={titleId}><a href={`/store/${offer.slug}`}>{offer.shortName}</a></h3>
    </div>
    <p className="mx-text">{offer.description}</p>
    <div className="mx-stack">
      <div className="mx-mock-head"><span>{offer.category}</span><span>{pad2(index + 1)} / {pad2(storefrontOffers.length)}</span></div>
      <div className="mx-flow mx-flow--sm" aria-hidden="true">
        {packageTiers.map((tier, position) => <React.Fragment key={tier.short}>
          {position > 0 && <span className="mx-join"><Plus className="mx-i" /></span>}
          <div className="mx-node"><span className={`mx-tile mx-tile--sm ${position === index ? "mx-tile--blue" : position < index ? "mx-tile--on" : "mx-tile--ghost"}`}><tier.Icon className="mx-i" /></span><span className="mx-tile-label">{tier.short}</span></div>
        </React.Fragment>)}
      </div>
      <p className="mx-preview-cap">{packageTiers[index]?.note}</p>
    </div>
    <ul className="mx-includes">{offer.cardIncludes.map((item) => {
      const inherited = /^Everything in /.test(item);
      const Icon = inherited ? Plus : Check;
      return <li key={item} className={inherited ? "mx-includes-plus" : undefined}><Icon className="mx-i" aria-hidden="true" />{item}</li>;
    })}</ul>
    <div className="mx-price"><PriceTicker offer={offer} /></div>
    <a className="mx-btn mx-btn--block" href={`/store/${offer.slug}`}>View package <ArrowRight className="mx-i" aria-hidden="true" /></a>
    <div className="mx-price-terms">
      {offer.dueToday
        ? <><p className="mx-price-note"><b>${offer.dueToday} today.</b> Then $30/month until canceled.</p><p className="mx-meta">$297 setup + first $30 update month</p></>
        : <p className="mx-price-note">{offer.billing}</p>}
    </div>
  </article>;
}

/* Free Starter Pack card (dashed navy) ------------------------------------- */

export function FreePack() {
  return <article className="mx-card mx-card--free mx-freecard mx-freecard--pack sf-free-pack" id="starter-pack" aria-labelledby="free-pack-title" data-catalog-item="free-pack">
    <div className="mx-free-top"><p className="mx-ticker"><span className="mx-ticker-tag">Free</span><span className="mx-ticker-bar">Download</span></p><span className="mx-count">02 / 03</span></div>
    <div className="mx-free-intro">
      <h3 className="mx-title" id="free-pack-title">Free Starter Pack</h3>
      <p className="mx-text">Three simple habits for your next AI task. One download.</p>
    </div>
    <div className="mx-preview mx-freecard-view">
      <p className="mx-mock-head"><span>operator-sampler / payload</span><span>Free edition</span></p>
      <div className="mx-samples sf-sample-grid">{samplerParts.map((sample, index) => <article key={sample.name}>
        <p className="mx-eyebrow">{pad2(index + 1)} / {sample.format}</p>
        <h4>{sample.label}</h4>
        <p>{sample.description}</p>
        <blockquote className="mx-sample-line"><cite>{sample.name}</cite><span>{sample.excerpt}</span></blockquote>
        <a className="mx-link" href={`/start?file=${index}#preview`}>Read the sample <ArrowRight className="mx-i" aria-hidden="true" /></a>
      </article>)}</div>
      <p className="mx-preview-cap">Actual lines from the three files.</p>
    </div>
    <div className="mx-buy"><a className="mx-btn mx-btn--block" href="/downloads/operator-sampler.zip" download><Download className="mx-i" aria-hidden="true" />Download free pack</a></div>
    <p className="mx-zero"><b>$0</b><span>No account or email needed.</span></p>
    <p className="mx-note"><Info className="mx-i" aria-hidden="true" /><span>For your own AI account. The prompt can be pasted into chat; the skill includes Claude Code and Codex install layouts.</span></p>
  </article>;
}

/* "Start with something free." band ---------------------------------------- */

const bandTiles = [
  { label: "Prompt script", Icon: FileText, tone: "mx-tile--white" },
  { label: "Verification skill", Icon: ShieldCheck, tone: "mx-tile--blue" },
  { label: "Daily checklist", Icon: ListChecks, tone: "" },
];

export function SamplerBand() {
  return <section className="mx-cta" aria-labelledby="sampler-band-title">
    <div className="mx-cta-floor" aria-hidden="true" />
    <div className="mx-container mx-cta-in">
      <div className="mx-cta-copy">
        <p className="mx-chip"><span className="mx-chip-dot" aria-hidden="true" />Free Starter Pack</p>
        <h2 className="mx-display mx-display--lg" id="sampler-band-title">Start with <br />something <span className="mx-hl">free.</span></h2>
        <p className="mx-lede">A prompt script, a verification skill, and a daily checklist. Try the way I work before you buy.</p>
        <div className="mx-actions">
          <a className="mx-btn mx-btn--lg" href="/start">Get the starter pack <Download className="mx-i" aria-hidden="true" /></a>
          <p className="mx-meta">$0. No account or email needed.</p>
        </div>
      </div>
      <ul className="mx-cta-tiles" aria-hidden="true">{bandTiles.map((tile) => <li key={tile.label}>
        <span className={`mx-tile ${tile.tone}`}><tile.Icon className="mx-i" /></span><span className="mx-tile-label">{tile.label}</span>
      </li>)}</ul>
    </div>
  </section>;
}

/* FAQ ---------------------------------------------------------------------- */

// The data keeps answers as plain text; the contact address and the Terms become links here.
function linkAnswer(answer) {
  return answer.split(/(murad@aiwithmurda\.com|\bTerms\b)/).map((part, index) => part === "murad@aiwithmurda.com"
    ? <a key={index} href="mailto:murad@aiwithmurda.com">{part}</a>
    : part === "Terms" ? <a key={index} href="/terms">{part}</a> : part);
}

// `count` is the panel counter ("06 / 06") when the page numbers its panels; standing alone it reads "FAQ".
export function StoreFaq({ count }) {
  return <section className="mx-section" id="faq" aria-labelledby="faq-title">
    <div className="mx-container mx-panel">
      <PanelHead label={count || "FAQ"}>Plain answers</PanelHead>
      <div className="mx-faq">
        <div className="mx-faq-side">
          <h2 className="mx-display mx-display--md" id="faq-title">A few things <br />worth knowing.</h2>
          <a className="mx-link" href="/terms">Read the purchase terms <ArrowRight className="mx-i" aria-hidden="true" /></a>
        </div>
        <div className="mx-faq-list">{storefrontFaq.map(([question, answer], index) => <details className="mx-faq-item" key={question}>
          <summary><span className="mx-faq-n">{pad2(index + 1)}</span><span className="mx-faq-q">{question}</span><Plus className="mx-i mx-faq-ic" aria-hidden="true" /></summary>
          <p>{linkAnswer(answer)}</p>
        </details>)}</div>
        <div className="mx-ask">
          <span className="mx-tile mx-tile--sm" aria-hidden="true"><Mail className="mx-i" /></span>
          <p><strong>Not sure it fits your setup?</strong>Email <a href="mailto:murad@aiwithmurda.com">murad@aiwithmurda.com</a> about contents, compatibility, or access.</p>
        </div>
      </div>
    </div>
  </section>;
}
