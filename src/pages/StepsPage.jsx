import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Copy } from "lucide-react";
import { PanelHead, pad2 } from "../components/site/Panel.jsx";
import { stepsPage, stepsSections } from "../data/steps.js";
import { copyPlainText } from "../lib/copyPlainText.js";

// /steps: the free setups behind the how-to reels (the STEPS keyword in ManyChat links here).
// A jump list on top, then one panel per video: steps, prompts with a copy button, links, and the catch.

const COPIED_MS = 1800;
const COPY_HINT = "Press and hold the text, then tap Copy.";

// The blanks a visitor fills in ("[item]") are drawn as small mono chips. Rendering only:
// the Copy button always copies the raw string from steps.js.
const BLANK = /(\[[^\]\n]*\])/g;
// A short chip is glued to the one punctuation mark after it, so "." or "," never starts a line on its own.
// The text is only regrouped: the rendered characters stay exactly the same.
const TRAIL = /^[.,;:!?)]/;
const withBlanks = (text) => {
  const parts = text.split(BLANK);
  return parts.map((part, i) => {
    if (i % 2 === 0) return i > 0 && parts[i - 1].length <= 22 && TRAIL.test(part) ? part.slice(1) : part;
    const short = part.length <= 22;
    const chip = <span key={i} className={short ? "mx-steps-blank mx-steps-blank--short" : "mx-steps-blank"}>{part}</span>;
    const next = parts[i + 1] || "";
    return short && TRAIL.test(next) ? <span key={i} className="mx-steps-keep">{chip}{next[0]}</span> : chip;
  });
};

// After the browser's own jump to a #fragment, move keyboard focus there too (Safari and Firefox leave it behind).
const focusAfterJump = (targetId) => () => {
  window.requestAnimationFrame(() => document.getElementById(targetId)?.focus({ preventScroll: true }));
};

function CopyBox({ label, text, sectionTitle, primary }) {
  const [status, setStatus] = useState("idle"); // idle | copied | failed
  const timer = useRef(null);
  const textRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    let ok = false;
    try {
      ok = await copyPlainText(text);
    } catch {
      ok = false;
    }
    // The fallback copy path focuses a hidden field and removes it: give focus back to the button.
    if (document.activeElement === document.body) buttonRef.current?.focus({ preventScroll: true });
    if (ok) {
      setStatus("copied");
      window.clearTimeout(timer.current); // a double tap resolves twice: drop the first timer
      timer.current = window.setTimeout(() => setStatus("idle"), COPIED_MS);
      return;
    }
    // Copy was blocked (common inside in-app browsers): select the prompt so one more step copies it.
    const selection = window.getSelection?.();
    if (selection && textRef.current) selection.selectAllChildren(textRef.current);
    setStatus("failed");
  };

  const copied = status === "copied";
  return <figure className="mx-steps-prompt">
    <figcaption className="mx-steps-prompt-head">
      <span className="mx-steps-prompt-label">{label}</span>
      <button type="button" ref={buttonRef} className={`mx-btn mx-btn--sm mx-steps-copy${primary ? "" : " mx-btn--ghost"}`} onClick={copy}>
        {copied ? <Check className="mx-i" aria-hidden="true" /> : <Copy className="mx-i" aria-hidden="true" />}
        <span>{copied ? "Copied" : "Copy"}</span>
        <span className="mx-sr">, {label}, {sectionTitle}</span>
      </button>
      {status === "failed" ? <span className="mx-steps-copy-hint" aria-hidden="true">{COPY_HINT}</span> : null}
    </figcaption>
    <pre className="mx-steps-prompt-text" ref={textRef}>{withBlanks(text)}</pre>
    <span role="status" className="mx-sr">{copied ? "Copied" : status === "failed" ? COPY_HINT : ""}</span>
  </figure>;
}

export function StepsPage() {
  // A link or reload with #section: the browser looks for the section before React draws it, so jump
  // after mount, and once more when the fonts arrive (they shift the page by a few lines).
  useEffect(() => {
    let id = "";
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return undefined;
    }
    if (!id) return undefined;
    let alive = true;
    const go = () => document.getElementById(id)?.scrollIntoView();
    go();
    // Keyboard focus follows the jump, like the jump and back links (only when the section has a title).
    document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
    const landedAt = window.scrollY;
    // Skip the second jump if the visitor has already scrolled away.
    document.fonts?.ready.then(() => { if (alive && Math.abs(window.scrollY - landedAt) < 2) go(); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return <main className="mx mx-page mx-stepspage" id="main-content">
    <section className="mx-hero" aria-labelledby="steps-title">
      <div className="mx-container mx-panel">
        <PanelHead label="STEPS"><span className="mx-desc-pre">Free / </span>From the how-to videos</PanelHead>
        <div className="mx-steps-intro">
          <p className="mx-chip"><span className="mx-chip-dot" aria-hidden="true" /><span>{withBlanks("Free. Copy, paste, change the [brackets].")}</span></p>
          <h1 className="mx-display mx-display--lg" id="steps-title">{stepsPage.title}</h1>
          <p className="mx-lede">{withBlanks(stepsPage.lede)}</p>
        </div>
        <nav className="mx-steps-jump" id="steps-list" tabIndex={-1} aria-label="Pick your video">
          <ol role="list">{stepsSections.map((s, i) => <li key={s.id}>
            <a href={`#${s.id}`} onClick={focusAfterJump(`${s.id}-title`)}>
              <span className="mx-count">{pad2(i + 1)}</span>
              <span className="mx-steps-jump-name">{s.title}</span>
              <span className="mx-steps-jump-video">{s.video}</span>
              <ArrowDown className="mx-i mx-steps-jump-go" aria-hidden="true" />
            </a>
          </li>)}</ol>
        </nav>
        <p className="mx-text mx-steps-note">{stepsPage.note}</p>
      </div>
    </section>

    {stepsSections.map((s, i) => <section className="mx-steps-section" id={s.id} key={s.id} aria-labelledby={`${s.id}-title`}>
      <div className="mx-container mx-panel">
        <PanelHead n={i + 1} total={stepsSections.length}><span className="mx-desc-pre">Video / </span>{s.video}</PanelHead>
        <h2 className="mx-display mx-steps-title" id={`${s.id}-title`} tabIndex={-1}>{s.title}</h2>
        <div className={s.prompts.length ? "mx-steps-body" : "mx-steps-body mx-steps-body--solo"}>
          <ol className="mx-steps-list" role="list">{s.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          {s.prompts.length ? <div className="mx-steps-prompts">
            {s.prompts.map((p, n) => <CopyBox key={p.label} label={p.label} text={p.text} sectionTitle={s.title} primary={n === 0} />)}
          </div> : null}
          {s.links?.length ? <ul className="mx-steps-links" role="list">{s.links.map((l) => {
            // a short last word and the arrow stay together, so the arrow never wraps onto a line of its own;
            // a long last word (a web address) is left free to wrap so it cannot run past the edge
            const last = l.label.slice(l.label.lastIndexOf(" ") + 1);
            const cut = last.length <= 20 ? l.label.length - last.length : l.label.length;
            return <li key={l.href}>
              <a className="mx-link" href={l.href} target="_blank" rel="noopener noreferrer">{l.label.slice(0, cut)}<span className="mx-steps-link-tail">{l.label.slice(cut)}<ArrowUpRight className="mx-i" aria-hidden="true" /></span><span className="mx-sr"> (opens in a new tab)</span></a>
            </li>;
          })}</ul> : null}
          {s.catches?.length ? <div className="mx-steps-catch">
            <p className="mx-eyebrow mx-steps-catch-head">The catch</p>
            <ul role="list">{s.catches.map((c) => <li key={c}>{c}</li>)}</ul>
          </div> : null}
          <p className="mx-steps-back"><a className="mx-link" href="#steps-list" aria-describedby={`${s.id}-title`} onClick={focusAfterJump("steps-list")}><ArrowUp className="mx-i" aria-hidden="true" /><span>Back to the list</span></a></p>
        </div>
      </div>
    </section>)}
  </main>;
}
