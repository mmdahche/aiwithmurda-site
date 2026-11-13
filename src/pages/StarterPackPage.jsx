import React, { useState } from "react";
import { ArrowDown, ArrowRight, Check, Download, FileText, Folder, FolderOpen, ListChecks, Plus, ScrollText, ShieldCheck } from "lucide-react";
import { subscribeBuildLog } from "../lib/api.js";
import { CheckItFirstNotice, FreePanel, FreePanelHead, useLandOnHash } from "./CheckItFirstPage.jsx";
import { FolderPreview } from "../components/storefront/FolderPreview.jsx";
import { samplerParts } from "../components/storefront/StorefrontParts.jsx";

/*
  /start: the Free Starter Pack.

  Hooks the Playwright suites pin, keep them as written: the link
  "Download the free starter pack" (the only link on the page whose name
  starts "Download the free"), the field "Email address", the button
  "Subscribe to updates", the heading "You're on the list.", a single
  role="alert" after a failed signup, and #preview for /start?file=N#preview.
*/

// Icons for the prompt script, the verification skill and the daily checklist, in samplerParts order.
const partIcons = [FileText, ShieldCheck, ListChecks];
const partTiles = ["Prompt", "Skill", "Checklist"];

export function StarterPackPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  useLandOnHash();
  async function subscribe(event) {
    event.preventDefault(); setStatus("loading"); setMessage("");
    try { await subscribeBuildLog({ email, name, source: "storefront_starter_pack" }); setStatus("success"); setMessage("You're subscribed. Check your inbox for the welcome email."); }
    catch { setStatus("error"); setMessage("We couldn't subscribe you just now. Try again; your free download is still available above."); }
  }

  return <main className="mx mx-page mx-fr mx-fr--start" id="main-content">
    <section className="mx-fr-top" aria-labelledby="start-title">
      <div className="mx-container mx-panel">
        <FreePanelHead index={1} total={4} pre="The Operator Sampler" label="Free" />
        <div className="mx-fr-hero">
          <div className="mx-fr-intro">
            <div className="mx-fr-label">
              <p className="mx-ticker"><span className="mx-ticker-tag">Free</span><span className="mx-ticker-bar">Download</span></p>
              <p className="mx-fr-zero">$0. No account or email needed.</p>
            </div>
            <h1 className="mx-display mx-fr-h1" id="start-title">Try my workflow.<br />On your next task.</h1>
            <p className="mx-lede">One prompt script. One verification skill. One daily checklist. Read the files below, or download the whole folder.</p>
            <div className="mx-actions mx-fr-actions">
              <a className="mx-btn mx-btn--lg sf-button" href="/downloads/operator-sampler.zip" download><Download className="mx-i" aria-hidden="true" /> Download the free starter pack</a>
              <a className="mx-link" href="#preview">Read the files first <ArrowDown className="mx-i" aria-hidden="true" /></a>
            </div>
            <p className="mx-fr-fine">No account or email required. ZIP download. MIT licensed.</p>
            <CheckItFirstNotice />
          </div>

          <figure className="mx-card mx-card--free mx-fr-box" aria-labelledby="start-box-caption">
            <figcaption className="mx-mock-head" id="start-box-caption"><span>operator-sampler.zip</span><span>In the download</span></figcaption>
            <div className="mx-flow mx-fr-box-flow" aria-hidden="true">
              {partTiles.map((label, index) => {
                const Icon = partIcons[index];
                return <React.Fragment key={label}>
                  {index > 0 && <span className="mx-join"><Plus className="mx-i" /></span>}
                  <div className="mx-node"><span className={`mx-tile ${index === 0 ? "mx-tile--white" : index === 1 ? "mx-tile--blue" : ""}`}><Icon className="mx-i" /></span><span className="mx-tile-label">{label}</span></div>
                </React.Fragment>;
              })}
            </div>
            <ul className="mx-fr-tree">
              <li><FolderOpen className="mx-i" aria-hidden="true" /><code>00-START-HERE.md</code><span>Open this first.</span></li>
              {samplerParts.map((part, index) => {
                const Icon = partIcons[index];
                return <li key={part.name}><Icon className="mx-i" aria-hidden="true" /><code>payload/{part.name}</code><span>{part.label}. {part.format}.</span></li>;
              })}
              <li><Folder className="mx-i" aria-hidden="true" /><code>install/</code><span>The skill in Claude Code and Codex layouts.</span></li>
              <li><ScrollText className="mx-i" aria-hidden="true" /><code>LICENSE</code><span>MIT.</span></li>
            </ul>
            <p className="mx-preview-cap">File names from the download.</p>
          </figure>
        </div>
      </div>
    </section>

    <FreePanel index={2} total={4} label="First three steps" labelledBy="start-steps-title">
      <h2 className="mx-display mx-display--lg mx-fr-wide-h" id="start-steps-title">Open it. Try it. <br className="mx-fr-br" />Check it.</h2>
      <ol className="mx-fr-trio">
        <li>
          <div className="mx-fr-trio-top"><span className="mx-tile mx-tile--white" aria-hidden="true"><FolderOpen className="mx-i" /></span><span className="mx-count" aria-hidden="true">01 / 03</span></div>
          <h3>Open the folder</h3>
          <p>Unzip the download and open <code>00-START-HERE.md</code>.</p>
        </li>
        <li>
          <div className="mx-fr-trio-top"><span className="mx-tile" aria-hidden="true"><FileText className="mx-i" /></span><span className="mx-count" aria-hidden="true">02 / 03</span></div>
          <h3>Try the prompt</h3>
          <p>Open <code>inspect-before-edit.md</code>. Fill in the placeholders for a small task in your project.</p>
        </li>
        <li>
          <div className="mx-fr-trio-top"><span className="mx-tile mx-tile--blue" aria-hidden="true"><ShieldCheck className="mx-i" /></span><span className="mx-count" aria-hidden="true">03 / 03</span></div>
          <h3>Check what changed</h3>
          <p>Use the verification skill and checklist to review the result before calling it done.</p>
        </li>
      </ol>
    </FreePanel>

    <FreePanel index={3} total={4} pre="Actual files" label="operator-sampler / payload" labelledBy="start-files-title">
      <div className="mx-section-head">
        <h2 className="mx-display mx-display--lg" id="start-files-title">Read the files. <br />Then download.</h2>
        <div className="mx-section-side"><p className="mx-lede">The three working files, shown in full. Pick one and read it here.</p></div>
      </div>
      <div className="mx-fr-anchor" id="preview">
        <FolderPreview initialSelected={Number(new URLSearchParams(window.location.search).get("file"))} />
      </div>
    </FreePanel>

    <FreePanel index={4} total={4} pre="Product updates" label="Optional" labelledBy="start-updates-title" className="mx-fr-last">
      <div className="mx-fr-split">
        <div className="mx-fr-side">
          <h2 className="mx-display mx-fr-h" id="start-updates-title">Keep in touch.</h2>
          <p className="mx-text">Get product news and notes from what I'm building. Optional, and you can unsubscribe.</p>
          <a className="mx-link" href="/store">Browse the paid tools <ArrowRight className="mx-i" aria-hidden="true" /></a>
        </div>
        {status === "success" ? <div className="mx-card mx-fr-done" role="status">
          <span className="mx-tile mx-tile--sm mx-tile--blue" aria-hidden="true"><Check className="mx-i" /></span>
          <div><h3>You're on the list.</h3><p>{message}</p></div>
        </div> : <form className="mx-card mx-fr-form" onSubmit={subscribe} aria-label="Product updates signup">
          <label className="mx-fr-field">First name<input autoComplete="given-name" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="mx-fr-field">Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <button className="mx-btn mx-btn--ghost mx-btn--block" disabled={status === "loading"}>{status === "loading" ? "Subscribing..." : "Subscribe to updates"}<ArrowRight className="mx-i" aria-hidden="true" /></button>
          <p className="mx-fr-fine">By subscribing, you agree to receive emails from AI with Murda. <a href="/privacy">Privacy policy</a>.</p>
          {message && <p className="mx-fr-alert" role="alert">{message}</p>}
        </form>}
      </div>
    </FreePanel>
  </main>;
}
