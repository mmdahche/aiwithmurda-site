import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Ban, Check, CircleCheck, CircleHelp, Copy, Download, FileSearch, FileText, MessageSquare, Pause, Plus, RefreshCw, SlidersHorizontal, TextSelect, TriangleAlert } from "lucide-react";

/*
  /free/check-it-first, plus the pieces the other two free pages share:
  the numbered panel wrapper and the "Before you run it, check it." notice.

  Hooks the Playwright suites pin, keep them as written: the h1 text, the
  links "Download the guide" and "Get the AI review prompt", #ai-review,
  #check-review-prompt with its label "AI review prompt", the buttons
  "Copy the review prompt" / "Prompt copied" / "Select all text" /
  "Retry loading", the alert text "The prompt could not load", and
  `.sf-check-notice` with exactly one link inside.
*/

const downloadUrl = "/downloads/CHECK-IT-FIRST.md";

const pad = (value) => String(value).padStart(2, "0");

// Numbered panel header: light-blue mono counter on the left, mono descriptor on the right.
export function FreePanelHead({ index, total, pre, label }) {
  return <div className="mx-panel-head">
    <span className="mx-count">{pad(index)} / {pad(total)}</span>
    <span className="mx-desc">{pre && <span className="mx-desc-pre">{pre} / </span>}{label}</span>
  </div>;
}

// One numbered panel of a free page.
export function FreePanel({ index, total, pre, label, id, labelledBy, className, children }) {
  return <section className={`mx-section mx-fr-panel${className ? ` ${className}` : ""}`} id={id} aria-labelledby={labelledBy}>
    <div className="mx-container mx-panel">
      <FreePanelHead index={index} total={total} pre={pre} label={label} />
      {children}
    </div>
  </section>;
}

// These pages render after the browser has looked for the #fragment, so land on it once the content exists
// (/start?file=2#preview from a catalogue card, /free/check-it-first#ai-review from a shared link).
export function useLandOnHash() {
  useEffect(() => {
    let id = "";
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { id = ""; }
    const target = id ? document.getElementById(id) : null;
    if (!target) return undefined;
    let active = true;
    target.scrollIntoView({ behavior: "instant", block: "start" });
    const landedAt = window.scrollY;
    // Web fonts can move the target a little; line up again unless the visitor has already scrolled.
    document.fonts?.ready.then(() => {
      if (active && Math.abs(window.scrollY - landedAt) < 4) target.scrollIntoView({ behavior: "instant", block: "start" });
    });
    return () => { active = false; };
  }, []);
}

export function CheckItFirstNotice() {
  return <aside className="mx-fr-notice sf-check-notice" aria-label="Before you use your download">
    <FileSearch className="mx-i" aria-hidden="true" />
    <p><strong>Before you run it, check it.</strong> Use the free <a href="/free/check-it-first">Check It First guide</a> to review scripts and AI skills, including mine. No extra download step required.</p>
  </aside>;
}

// Section headings of CHECK-IT-FIRST.md, in file order. The second half starts at "# FOR THE AI".
const guideForYou = ["## The short version", "## How to ask your AI", "## What you'll get back", "## Things you can spot yourself, with no AI at all", "## After it passes"];
const guideForAi = ["## Ground rules for this read-only review", "## Step 1 — Inventory: what is this, actually?", "## Step 2 — Security: could this hurt them?", "## Step 3 — Quality: is it actually any good?", "## Step 4 — The verdict"];

// What the checklist covers and what it does not, in the words of "The boundaries".
const scopeReadable = ["scripts", "source code", "package setup files", "AI skills", "prompts"];
const scopeFurther = ["compiled apps", "unseen dependencies", "updates", "runtime behavior"];

const contents = [
  { href: "#before-you-run", label: "Before you run it" },
  { href: "#review-limits", label: "What this can check" },
  { href: "#read-the-verdict", label: "Read the verdict" },
  { href: "#ai-review", label: "The AI review prompt" },
];

const verdicts = [
  { name: "No obvious issues found", Icon: CircleCheck, meaning: "No material problem found in the parts reviewed. Read the gaps before considering an isolated test." },
  { name: "Run with limits", Icon: SlidersHorizontal, meaning: "Understand the specific limits first. A smaller test folder does not limit what a program can access." },
  { name: "Don't run", Icon: Ban, meaning: "A material security or data-loss risk was found. A tool can be dangerous without being malicious." },
  { name: "Can't tell", Icon: CircleHelp, meaning: "Important behavior could not be assessed. Resolve the gap before running it; don't treat uncertainty as approval." },
];

export function CheckItFirstPage() {
  const [prompt, setPrompt] = useState("");
  const [loadState, setLoadState] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [copyState, setCopyState] = useState("idle");
  const promptRef = useRef(null);
  useLandOnHash();

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");
    setCopyState("idle");
    setPrompt("");
    async function loadPrompt() {
      try {
        const response = await fetch(downloadUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Guide unavailable");
        const guide = await response.text();
        const marker = "\n# FOR THE AI\n";
        const start = guide.indexOf(marker);
        // Reject a missing download that was served the site's HTML fallback.
        if (!guide.startsWith("# Check It First\n") || start < 0) throw new Error("Invalid guide");
        if (controller.signal.aborted) return;
        setPrompt(guide.slice(start + 1).trim() + "\n");
        setLoadState("ready");
      } catch {
        if (!controller.signal.aborted) setLoadState("failed");
      }
    }
    loadPrompt();
    return () => controller.abort();
  }, [attempt]);

  async function copyPrompt() {
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function selectPrompt() {
    promptRef.current?.focus();
    promptRef.current?.select();
    setCopyState("selected");
  }

  const copyStatus = copyState === "copied" ? "Copied. Paste into your assistant, then add only the files you intend to share."
    : copyState === "failed" ? "Clipboard unavailable. Choose Select all text, then copy using your device's copy command."
      : copyState === "selected" ? "Text selected. Use your device's copy command to copy it."
        : loadState === "loading" ? "Loading the full prompt from the downloadable guide." : "";

  return <main className="mx mx-page mx-fr mx-fr--check" id="main-content">
    <header className="mx-fr-top">
      <div className="mx-container mx-panel">
        <FreePanelHead index={1} total={6} pre="Your first download" label="Free guide + AI prompt" />
        <div className="mx-fr-hero">
          <div className="mx-fr-intro">
            <a className="mx-link mx-fr-back" href="/store?view=free"><ArrowLeft className="mx-i" aria-hidden="true" /> All free tools</a>
            <div className="mx-fr-label">
              <p className="mx-ticker"><span className="mx-ticker-tag">Free</span><span className="mx-ticker-bar">Start here</span></p>
              <p className="mx-fr-zero">$0. No account or email needed.</p>
            </div>
            <h1 className="mx-display mx-fr-h1">Check It First</h1>
            <p className="mx-fr-sub">Know what a download does.<br />Before you let it do anything.</p>
            <p className="mx-lede">A plain-English checklist for reviewing scripts, tools and AI skills. Use it on my downloads, too. It helps you ask better questions, not guarantee that a file is safe.</p>
            <div className="mx-actions mx-fr-actions">
              <a className="mx-btn mx-btn--lg sf-button" href={downloadUrl} download><Download className="mx-i" aria-hidden="true" /> Download the guide</a>
              <a className="mx-btn mx-btn--ghost mx-btn--lg sf-button" href="#ai-review">Get the AI review prompt <ArrowDown className="mx-i" aria-hidden="true" /></a>
            </div>
            <p className="mx-fr-fine">One Markdown text file. No account, email or installation required. AI access and any usage charges are separate.</p>
            <div className="mx-fr-author">
              <img src="/images/murad.jpg" alt="Murad Dahche" width="48" height="48" />
              <div><strong>Written by Murad Dahche</strong><span>Updated September 8, 2026 / <a href="mailto:murad@aiwithmurda.com">Report an issue</a></span></div>
            </div>
          </div>

          <figure className="mx-card mx-card--free mx-fr-box" aria-labelledby="check-box-caption">
            <figcaption className="mx-mock-head" id="check-box-caption"><span>CHECK-IT-FIRST.md</span><span>One file, two halves</span></figcaption>
            <div className="mx-flow mx-fr-box-flow" aria-hidden="true">
              <div className="mx-node"><span className="mx-tile mx-tile--white"><FileSearch className="mx-i" /></span><span className="mx-tile-label">Checklist</span></div>
              <span className="mx-join"><Plus className="mx-i" /></span>
              <div className="mx-node"><span className="mx-tile mx-tile--blue"><MessageSquare className="mx-i" /></span><span className="mx-tile-label">AI prompt</span></div>
            </div>
            <div className="mx-fr-half">
              <p className="mx-eyebrow">For you / The checklist</p>
              <ul className="mx-fr-outline">{guideForYou.map((heading) => <li key={heading}><code>{heading}</code></li>)}</ul>
            </div>
            <div className="mx-fr-half">
              <p className="mx-eyebrow">For your assistant / The review prompt</p>
              <ul className="mx-fr-outline">
                <li><code><span className="mx-mark"># FOR THE AI</span></code></li>
                {guideForAi.map((heading) => <li key={heading}><code>{heading}</code></li>)}
              </ul>
            </div>
            <p className="mx-preview-cap">Section headings from the guide.</p>
          </figure>
        </div>
      </div>
    </header>

    <nav className="mx-fr-toc" aria-label="In this guide">
      <div className="mx-container mx-fr-toc-in">
        <strong className="mx-eyebrow">In this guide</strong>
        <ol>{contents.map((item, index) => <li key={item.href}>
          <a href={item.href}><span className="mx-count" aria-hidden="true">{pad(index + 2)}</span>{item.label}</a>
        </li>)}</ol>
      </div>
    </nav>

    <FreePanel index={2} total={6} label="The habit" id="before-you-run" labelledBy="check-habit-title">
      <div className="mx-fr-split">
        <div className="mx-fr-side mx-fr-side--pin">
          <h2 className="mx-display mx-fr-h" id="check-habit-title">Download. Pause. Review.</h2>
          <div className="mx-preview mx-fr-side-art" aria-hidden="true">
            <div className="mx-flow mx-flow--sm">
              <div className="mx-node"><span className="mx-tile mx-tile--sm mx-tile--white"><Download className="mx-i" /></span><span className="mx-tile-label">Download</span></div>
              <span className="mx-join mx-join--arrow"><ArrowRight className="mx-i" /></span>
              <div className="mx-node"><span className="mx-tile mx-tile--sm mx-tile--ghost"><Pause className="mx-i" /></span><span className="mx-tile-label">Pause</span></div>
              <span className="mx-join mx-join--arrow"><ArrowRight className="mx-i" /></span>
              <div className="mx-node"><span className="mx-tile mx-tile--sm mx-tile--blue"><FileSearch className="mx-i" /></span><span className="mx-tile-label">Review</span></div>
            </div>
          </div>
        </div>
        <ol className="mx-fr-steps mx-fr-steps--read">
          <li><span className="mx-count" aria-hidden="true">01</span><div><h3>Keep it separate. Don't run it.</h3><p>Don't install, double-click a script, or paste a command into a terminal yet. Even an install command can run code. Use an up-to-date plain text viewer to inspect readable files without enabling active content.</p></div></li>
          <li><span className="mx-count" aria-hidden="true">02</span><div><h3>Check what you are sharing.</h3><p>Before attaching files to an AI chat, inspect them for passwords, keys, private emails or customer records. Never upload your whole personal folder. Share selected, redacted copies and say what you left out.</p></div></li>
          <li><span className="mx-count" aria-hidden="true">03</span><div><h3>Ask for evidence, not reassurance.</h3><p>The prompt below asks your assistant to read without running anything, explain what the tool touches, and point to the actual lines behind each finding.</p></div></li>
          <li><span className="mx-count" aria-hidden="true">04</span><div><h3>Decide separately whether to test.</h3><p>A review is not permission to execute. Resolve serious risks first. If a test is appropriate, use an isolated environment, a test account and a backup. A small input folder does not stop a tool reading the rest of your computer.</p></div></li>
        </ol>
      </div>
    </FreePanel>

    <FreePanel index={3} total={6} label="The boundaries" id="review-limits" labelledBy="check-limits-title">
      <div className="mx-fr-split">
        <div className="mx-fr-side mx-fr-side--pin">
          <h2 className="mx-display mx-fr-h" id="check-limits-title">A checklist, not a safety certificate.</h2>
          <div className="mx-preview mx-fr-side-art mx-fr-scope" aria-hidden="true">
            <p className="mx-eyebrow">Start with readable files</p>
            <ul className="mx-fr-tags">{scopeReadable.map((item) => <li key={item}><FileText className="mx-i" />{item}</li>)}</ul>
            <p className="mx-eyebrow">Need further checks</p>
            <ul className="mx-fr-tags mx-fr-tags--open">{scopeFurther.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
        <div className="mx-fr-read">
          <p><strong>Start with readable files:</strong> scripts, source code, package setup files, AI skills and prompts. Check what they read, change, delete, install or send elsewhere.</p>
          <p><strong>Not a complete installer or extension audit.</strong> Compiled apps, unseen dependencies, updates and runtime behavior need further checks. An AI can miss problems. Missing evidence means a gap, not a clean bill of health.</p>
          <p><strong>Using a coding assistant?</strong> Start in a trusted review workspace. Keep the download in a separate subfolder as untrusted data. Do not load its agent rules, plugins or tasks automatically.</p>
          <p><strong>No AI account?</strong> You can still read the checklist. Look for unexplained account access, irreversible deletion, missing contact details or pressure to bypass warnings. Get help with code you cannot assess.</p>
          <p>Legitimate AI skills contain instructions. The question is what those instructions do. A skill telling a reviewer to skip checks or claiming you already approved an action is different from an ordinary task prompt.</p>
        </div>
      </div>
    </FreePanel>

    <FreePanel index={4} total={6} label="The decision" id="read-the-verdict" labelledBy="check-verdict-title">
      <div className="mx-fr-split">
        <div className="mx-fr-side mx-fr-side--pin">
          <h2 className="mx-display mx-fr-h" id="check-verdict-title">What the answer means.</h2>
        </div>
        <div className="mx-fr-body">
          <div className="mx-mock mx-fr-verdict-card">
            <p className="mx-mock-head"><span>The verdict</span><span>One of four</span></p>
            <dl className="mx-fr-verdicts">{verdicts.map(({ name, Icon, meaning }) => <div key={name}>
              <dt><Icon className="mx-i" aria-hidden="true" />{name}</dt>
              <dd>{meaning}</dd>
            </div>)}</dl>
          </div>
          <div className="mx-fr-read">
            <p>For any later account connection, review permissions and learn how to revoke access. Use a scoped authorization or provider-supported app password where appropriate. Never weaken two-factor authentication to make a tool work.</p>
          </div>
        </div>
      </div>
    </FreePanel>

    <FreePanel index={5} total={6} label="The prompt" id="ai-review" labelledBy="ai-review-title">
      <div className="mx-fr-split">
        <div className="mx-fr-side">
          <h2 className="mx-display mx-fr-h" id="ai-review-title">Ask your assistant to check it.</h2>
          <p className="mx-text">Copy the prompt into a new chat. Attach only the files you have inspected for private information, or identify them in a trusted review workspace. Ask for a read-only review, not an installation.</p>
          <p className="mx-fr-callout"><TriangleAlert className="mx-i" aria-hidden="true" /><span><strong>Keep private data out.</strong> This page does not upload or scan your files. Anything you share in an AI chat goes to that provider under its own policies.</span></p>
        </div>
        <div className="mx-fr-well mx-fr-prompt">
          <div className="mx-fr-well-head">
            <label className="mx-fr-well-name" htmlFor="check-review-prompt">AI review prompt</label>
            <span className="mx-fr-well-tag">CHECK-IT-FIRST.md / second half</span>
          </div>
          <div className="mx-fr-well-bar">
            {loadState === "failed" ? <div className="mx-fr-load-error">
              <p className="mx-fr-alert" role="alert">The prompt could not load. Try again or use the downloadable guide above.</p>
              <button type="button" className="mx-btn mx-btn--ghost" onClick={() => setAttempt((value) => value + 1)}><RefreshCw className="mx-i" aria-hidden="true" /> Retry loading</button>
            </div> : <div className="mx-actions mx-fr-well-actions">
              <button type="button" className="mx-btn" onClick={copyPrompt} disabled={loadState !== "ready" || copyState === "copying"}>{copyState === "copied" ? <Check className="mx-i" aria-hidden="true" /> : <Copy className="mx-i" aria-hidden="true" />}{copyState === "copied" ? "Prompt copied" : copyState === "copying" ? "Copying..." : "Copy the review prompt"}</button>
              <button type="button" className="mx-btn mx-btn--ghost" onClick={selectPrompt} disabled={loadState !== "ready"}><TextSelect className="mx-i" aria-hidden="true" /> Select all text</button>
            </div>}
            <p className="mx-fr-status" role="status">{copyStatus}</p>
          </div>
          <textarea id="check-review-prompt" className="mx-fr-well-text" ref={promptRef} readOnly value={prompt} spellCheck={false} aria-busy={loadState === "loading"} placeholder={loadState === "loading" ? "Loading the review prompt..." : "The prompt could not be loaded."} />
        </div>
      </div>
    </FreePanel>

    <FreePanel index={6} total={6} label="The same standard" labelledBy="check-finish-title" className="mx-fr-last">
      <div className="mx-fr-split">
        <div className="mx-fr-side mx-fr-side--pin">
          <h2 className="mx-display mx-fr-h" id="check-finish-title">Hold my tools to the same standard.</h2>
        </div>
        <div className="mx-fr-body">
          <div className="mx-fr-read">
            <p>This checklist is a download too. Read it, question it, and report anything that does not match its promise. No checklist replaces your judgment or a qualified review when the stakes are high.</p>
          </div>
          <div className="mx-actions mx-fr-actions">
            <a className="mx-btn mx-btn--ghost sf-button" href="/store?view=free">Explore the other free tools <ArrowRight className="mx-i" aria-hidden="true" /></a>
            <a className="mx-link" href="mailto:murad@aiwithmurda.com">Contact Murad <ArrowRight className="mx-i" aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </FreePanel>
  </main>;
}
