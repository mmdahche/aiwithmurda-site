import React, { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, Download, FileText, Folder, ChevronRight } from "lucide-react";
import inspectText from "../../../products/operator-sampler/payload/inspect-before-edit.md?raw";
import checklistText from "../../../products/operator-sampler/payload/daily-operator-checklist.md?raw";
import verifyText from "../../../products/operator-sampler/payload/verify-before-claiming.md?raw";
import { storefrontFaq } from "../../data/storefront.js";

const samples = [
  { name: "inspect-before-edit.md", label: "Plan a change", text: inspectText },
  { name: "verify-before-claiming.md", label: "Check the work", text: verifyText },
  { name: "daily-operator-checklist.md", label: "Keep your place", text: checklistText },
];

export function OfferCard({ offer }) {
  return <article className={`sf-offer sf-${offer.color}`}>
    <a className="sf-offer-cover" href={`/store/${offer.slug}`} tabIndex={-1} aria-hidden="true">
      <span className="sf-file-label"><Folder size={18} /> AI with Murda / {offer.category}</span>
      <strong>{offer.shortName}</strong>
      <div className="sf-cover-files"><span><FileText size={17} /> Start here</span><span><Folder size={17} /> Skills & scripts</span><span><Check size={17} /> Examples & checks</span></div>
    </a>
    <div className="sf-offer-info">
      <h3><a href={`/store/${offer.slug}`}>{offer.name}</a></h3>
      <p>{offer.description}</p>
      <div className="sf-offer-bottom"><div><strong>{offer.price}</strong><small>{offer.billing}</small>{offer.dueToday && <small>${offer.dueToday} due today</small>}</div><a className="sf-icon-link" href={`/store/${offer.slug}`} aria-label={`Explore ${offer.name}`} title={`Explore ${offer.name}`}><ArrowUpRight /></a></div>
    </div>
  </article>;
}

export function FolderPreview() {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState("");
  const sample = samples[selected];
  async function copy() {
    try { await navigator.clipboard.writeText(sample.text); setCopied("Copied to clipboard."); }
    catch { setCopied("Copy is unavailable here. Download the sampler to open the file."); }
  }
  return <div className="sf-explorer">
    <div className="sf-explorer-bar"><span><Folder size={17} /> operator-sampler / payload</span><span>Free edition</span></div>
    <div className="sf-explorer-body">
      <div className="sf-file-list" role="group" aria-label="Sampler files">
        {samples.map((file, i) => <button type="button" key={file.name} aria-pressed={selected === i} onClick={() => { setSelected(i); setCopied(""); }}><FileText size={18} /><span>{file.label}<small>{file.name}</small></span><ChevronRight size={15} /></button>)}
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
