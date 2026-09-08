import React, { useState } from "react";
import { ArrowRight, Check, Copy, Download, FileText, Folder, ChevronRight } from "lucide-react";
import inspectText from "../../../products/operator-sampler/payload/inspect-before-edit.md?raw";
import checklistText from "../../../products/operator-sampler/payload/daily-operator-checklist.md?raw";
import verifyText from "../../../products/operator-sampler/payload/verify-before-claiming.md?raw";
import { storefrontFaq } from "../../data/storefront.js";

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

export function OfferCard({ offer }) {
  return <article className={`sf-offer sf-${offer.color}`}>
    <div className="sf-package-top"><span className="sf-access-label">Paid package</span><span>{offer.category}</span></div>
    <div className="sf-offer-info">
      <span className="sf-product-brand">{offer.name}</span>
      <h3><a href={`/store/${offer.slug}`}>{offer.shortName}</a></h3>
      <p>{offer.description}</p>
      <ul className="sf-card-includes">{offer.cardIncludes.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
      <div className="sf-offer-bottom"><div><strong>{offer.dueToday ? `$${offer.dueToday} today` : offer.price}</strong><small>{offer.dueToday ? "Then $30/month until canceled" : offer.billing}</small>{offer.dueToday && <small>$297 setup + first $30 update month</small>}</div></div>
      <a className="sf-button sf-button-dark" href={`/store/${offer.slug}`}>View package <ArrowRight size={18} /></a>
    </div>
  </article>;
}

export function FreePack() {
  return <section className="sf-free-pack" aria-labelledby="free-pack-title" data-catalog-item="free-pack">
    <div className="sf-free-pack-heading"><div><span className="sf-access-label sf-access-free">Free download</span><h2 id="free-pack-title">Free Starter Pack</h2><p>Three simple habits for your next AI task. One download.</p></div><div><a className="sf-button sf-button-dark" href="/downloads/operator-sampler.zip" download><Download size={18} /> Download free pack</a><p className="sf-fine-print">$0. No account or email needed.</p></div></div>
    <div className="sf-sample-grid">{samplerParts.map((sample, index) => <article key={sample.name}>
      <span className="sf-format">0{index + 1} / {sample.format}</span><h3>{sample.label}</h3><p>{sample.description}</p>
      <blockquote>{sample.excerpt}</blockquote><a className="sf-text-link" href={`/start?file=${index}#preview`}>Read the sample <ArrowRight size={17} /></a>
    </article>)}</div>
    <p className="sf-free-pack-note">For your own AI account. The prompt can be pasted into chat; the skill includes Claude Code and Codex install layouts.</p>
  </section>;
}

export function FolderPreview({ initialSelected = 0 }) {
  const [selected, setSelected] = useState(() => samplerParts[initialSelected] ? initialSelected : 0);
  const [copied, setCopied] = useState("");
  const sample = samplerParts[selected];
  async function copy() {
    try { await navigator.clipboard.writeText(sample.text); setCopied("Copied to clipboard."); }
    catch { setCopied("Copy is unavailable here. Download the sampler to open the file."); }
  }
  return <div className="sf-explorer">
    <div className="sf-explorer-bar"><span><Folder size={17} /> operator-sampler / payload</span><span>Free edition</span></div>
    <div className="sf-explorer-body">
      <div className="sf-file-list" role="group" aria-label="Sampler files">
        {samplerParts.map((file, i) => <button type="button" key={file.name} aria-pressed={selected === i} onClick={() => { setSelected(i); setCopied(""); }}><FileText size={18} /><span>{file.label}<small>{file.name}</small></span><ChevronRight size={15} /></button>)}
      </div>
      <div className="sf-file-preview"><div className="sf-file-heading"><span>{sample.name}</span><button type="button" title="Copy this file" aria-label="Copy this file" onClick={copy}><Copy size={17} /></button></div><pre tabIndex={0} aria-label={`Contents of ${sample.name}`}>{sample.text}</pre><p role="status" className="sf-copy-status">{copied || "Actual file from the free sampler."}</p></div>
    </div>
  </div>;
}

export function SamplerBand() {
  return <section className="sf-sampler-band"><div className="sf-container sf-sampler-inner"><div><h2>Start with something free.</h2><p>A prompt script, a verification skill, and a daily checklist.<br />Try the way I work before you buy.</p></div><a className="sf-button sf-button-dark" href="/start">Get the starter pack <Download size={18} /></a></div></section>;
}

export function StoreFaq() {
  return <section className="sf-container sf-faq"><h2>A few things worth knowing.</h2><div>{storefrontFaq.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}<a className="sf-text-link" href="/terms">Read the purchase terms <ArrowRight size={17} /></a></div></section>;
}
