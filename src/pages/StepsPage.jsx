import React, { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { stepsPage, stepsSections } from "../data/steps.js";

// /steps: the free setups behind the how-to reels (the STEPS keyword in ManyChat links here).
// A jump list on top, then one panel per video: steps, prompts with a copy button, links, and the catch.

function CopyBox({ label, text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return <figure className="mx-steps-prompt">
    <figcaption className="mx-steps-prompt-head">
      <span className="mx-steps-prompt-label">{label}</span>
      <button type="button" className="mx-btn mx-btn--sm mx-steps-copy" onClick={copy} aria-label={`Copy: ${label}`}>
        {copied ? <Check className="mx-i" aria-hidden="true" /> : <Copy className="mx-i" aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </figcaption>
    <pre className="mx-steps-prompt-text">{text}</pre>
  </figure>;
}

export function StepsPage() {
  return <main className="mx mx-page mx-stepspage" id="main-content">
    <section className="mx-steps-top" aria-labelledby="steps-title">
      <div className="mx-container mx-panel">
        <div className="mx-panel-head"><span className="mx-count">STEPS</span><span className="mx-desc"><span className="mx-desc-pre">Free / </span>From the how-to videos</span></div>
        <div className="mx-steps-intro">
          <p className="mx-chip"><span className="mx-chip-dot" aria-hidden="true" />Free. Copy, paste, change the [brackets].</p>
          <h1 className="mx-display mx-display--lg" id="steps-title">{stepsPage.title}</h1>
          <p className="mx-lede">{stepsPage.lede}</p>
          <p className="mx-text">{stepsPage.note}</p>
        </div>
        <nav className="mx-steps-jump" aria-label="Pick your video">
          <ol>{stepsSections.map((s, i) => <li key={s.id}><a href={`#${s.id}`}><span className="mx-count">{String(i + 1).padStart(2, "0")}</span>{s.title}</a></li>)}</ol>
        </nav>
      </div>
    </section>

    {stepsSections.map((s, i) => <section className="mx-steps-section" id={s.id} key={s.id} aria-labelledby={`${s.id}-title`}>
      <div className="mx-container mx-panel">
        <div className="mx-panel-head"><span className="mx-count">{String(i + 1).padStart(2, "0")} / {String(stepsSections.length).padStart(2, "0")}</span><span className="mx-desc"><span className="mx-desc-pre">Video / </span>{s.video}</span></div>
        <h2 className="mx-steps-title" id={`${s.id}-title`}>{s.title}</h2>
        <ol className="mx-steps-list">{s.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        {s.prompts.map((p) => <CopyBox key={p.label} label={p.label} text={p.text} />)}
        {s.links?.length ? <ul className="mx-steps-links">{s.links.map((l) => <li key={l.href}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.label} <ArrowUpRight className="mx-i" aria-hidden="true" /></a></li>)}</ul> : null}
        {s.catches?.length ? <div className="mx-steps-catch"><p className="mx-steps-catch-head">The catch</p><ul>{s.catches.map((c) => <li key={c}>{c}</li>)}</ul></div> : null}
        <p className="mx-steps-top-link"><a href="#steps-title">Back to the list</a></p>
      </div>
    </section>)}
  </main>;
}
