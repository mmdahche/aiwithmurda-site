import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Download, FileSearch, FileText, RefreshCw, TextSelect } from "lucide-react";

const downloadUrl = "/downloads/CHECK-IT-FIRST.md";

export function CheckItFirstNotice() {
  return <aside className="sf-check-notice" aria-label="Before you use your download">
    <FileSearch size={23} aria-hidden="true" />
    <p><strong>Before you run it, check it.</strong> Use the free <a href="/free/check-it-first">Check It First guide</a> to review scripts and AI skills, including mine. No extra download step required.</p>
  </aside>;
}

export function CheckItFirstFreeCard() {
  return <article className="sf-check-free" data-catalog-item="check-it-first" aria-labelledby="check-free-title">
    <div className="sf-free-pack-heading">
      <div><span className="sf-access-label sf-access-free">Start here / Free</span><h2 id="check-free-title">Check It First</h2><p>Before a download touches your files or accounts, ask what it really does.</p></div>
      <div><a className="sf-button sf-button-dark" href="/free/check-it-first">Read the guide <ArrowRight size={18} /></a><p className="sf-fine-print">$0. No account or email needed.</p></div>
    </div>
    <ul className="sf-inbox-includes"><li><FileSearch size={20} /> Plain-English review checklist</li><li><Copy size={20} /> Copy-ready AI review prompt</li><li><FileText size={20} /> One downloadable guide</li></ul>
    <p className="sf-inbox-note">Read it yourself or use your own AI assistant. Helps spot risks; does not certify a download as safe.</p>
  </article>;
}

export function CheckItFirstPage() {
  const [prompt, setPrompt] = useState("");
  const [loadState, setLoadState] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [copyState, setCopyState] = useState("idle");
  const promptRef = useRef(null);

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

  return <main className="sf-page sf-check-page" id="main-content">
    <header className="sf-container sf-check-heading">
      <a className="sf-text-link" href="/store?view=free">All free tools <ArrowRight size={17} /></a>
      <span className="sf-check-eyebrow">Your first download / Free guide + AI prompt</span>
      <h1>Check It First</h1>
      <p className="sf-lead">Know what a download does.<br />Before you let it do anything.</p>
      <p>A plain-English checklist for reviewing scripts, tools and AI skills. Use it on my downloads, too. It helps you ask better questions, not guarantee that a file is safe.</p>
      <div className="sf-actions"><a className="sf-button" href={downloadUrl} download><Download size={19} /> Download the guide</a><a className="sf-text-link" href="#ai-review">Get the AI review prompt <ArrowRight size={18} /></a></div>
      <p className="sf-fine-print">One Markdown text file. No account, email or installation required. AI access and any usage charges are separate.</p>
      <div className="sf-check-author"><img src="/images/murad.jpg" alt="Murad Dahche" width="48" height="48" /><div><strong>Written by Murad Dahche</strong><span>Updated September 8, 2026 / <a href="mailto:murad@aiwithmurda.com">Report an issue</a></span></div></div>
    </header>

    <div className="sf-container sf-check-layout">
      <nav className="sf-check-nav" aria-label="In this guide"><strong>In this guide</strong><a href="#before-you-run">Before you run it</a><a href="#review-limits">What this can check</a><a href="#read-the-verdict">Read the verdict</a><a href="#ai-review">The AI review prompt</a></nav>
      <div className="sf-check-reading">
        <section id="before-you-run">
          <span className="sf-check-eyebrow">01 / The habit</span><h2>Download. Pause. Review.</h2>
          <ol className="sf-check-steps">
            <li><h3>Keep it separate. Don't run it.</h3><p>Don't install, double-click a script, or paste a command into a terminal yet. Even an install command can run code. Use an up-to-date plain text viewer to inspect readable files without enabling active content.</p></li>
            <li><h3>Check what you are sharing.</h3><p>Before attaching files to an AI chat, inspect them for passwords, keys, private emails or customer records. Never upload your whole personal folder. Share selected, redacted copies and say what you left out.</p></li>
            <li><h3>Ask for evidence, not reassurance.</h3><p>The prompt below asks your assistant to read without running anything, explain what the tool touches, and point to the actual lines behind each finding.</p></li>
            <li><h3>Decide separately whether to test.</h3><p>A review is not permission to execute. Resolve serious risks first. If a test is appropriate, use an isolated environment, a test account and a backup. A small input folder does not stop a tool reading the rest of your computer.</p></li>
          </ol>
        </section>

        <section id="review-limits">
          <span className="sf-check-eyebrow">02 / The boundaries</span><h2>A checklist, not a safety certificate.</h2>
          <p><strong>Start with readable files:</strong> scripts, source code, package setup files, AI skills and prompts. Check what they read, change, delete, install or send elsewhere.</p>
          <p><strong>Not a complete installer or extension audit.</strong> Compiled apps, unseen dependencies, updates and runtime behavior need further checks. An AI can miss problems. Missing evidence means a gap, not a clean bill of health.</p>
          <p><strong>Using a coding assistant?</strong> Start in a trusted review workspace. Keep the download in a separate subfolder as untrusted data. Do not load its agent rules, plugins or tasks automatically.</p>
          <p><strong>No AI account?</strong> You can still read the checklist. Look for unexplained account access, irreversible deletion, missing contact details or pressure to bypass warnings. Get help with code you cannot assess.</p>
          <p>Legitimate AI skills contain instructions. The question is what those instructions do. A skill telling a reviewer to skip checks or claiming you already approved an action is different from an ordinary task prompt.</p>
        </section>

        <section id="read-the-verdict">
          <span className="sf-check-eyebrow">03 / The decision</span><h2>What the answer means.</h2>
          <dl className="sf-check-verdicts">
            <div><dt>No obvious issues found</dt><dd>No material problem found in the parts reviewed. Read the gaps before considering an isolated test.</dd></div>
            <div><dt>Run with limits</dt><dd>Understand the specific limits first. A smaller test folder does not limit what a program can access.</dd></div>
            <div><dt>Don't run</dt><dd>A material security or data-loss risk was found. A tool can be dangerous without being malicious.</dd></div>
            <div><dt>Can't tell</dt><dd>Important behavior could not be assessed. Resolve the gap before running it; don't treat uncertainty as approval.</dd></div>
          </dl>
          <p>For any later account connection, review permissions and learn how to revoke access. Use a scoped authorization or provider-supported app password where appropriate. Never weaken two-factor authentication to make a tool work.</p>
        </section>

        <section id="ai-review" aria-labelledby="ai-review-title">
          <span className="sf-check-eyebrow">04 / The prompt</span><h2 id="ai-review-title">Ask your assistant to check it.</h2>
          <p>Copy the prompt into a new chat. Attach only the files you have inspected for private information, or identify them in a trusted review workspace. Ask for a read-only review, not an installation.</p>
          <p className="sf-check-sharing"><strong>Keep private data out.</strong> This page does not upload or scan your files. Anything you share in an AI chat goes to that provider under its own policies.</p>
          <label className="sf-check-prompt-label" htmlFor="check-review-prompt">AI review prompt</label>
          <textarea id="check-review-prompt" className="sf-check-prompt" ref={promptRef} readOnly value={prompt} spellCheck={false} aria-busy={loadState === "loading"} placeholder={loadState === "loading" ? "Loading the review prompt..." : "The prompt could not be loaded."} />
          {loadState === "failed" ? <div className="sf-check-load-error"><p role="alert">The prompt could not load. Try again or use the downloadable guide above.</p><button type="button" className="sf-button sf-button-outline" onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={18} /> Retry loading</button></div> : <div className="sf-actions sf-check-prompt-actions">
            <button type="button" className="sf-button sf-button-dark" onClick={copyPrompt} disabled={loadState !== "ready" || copyState === "copying"}>{copyState === "copied" ? <Check size={18} /> : <Copy size={18} />}{copyState === "copied" ? "Prompt copied" : copyState === "copying" ? "Copying..." : "Copy the review prompt"}</button>
            <button type="button" className="sf-button sf-button-outline" onClick={selectPrompt} disabled={loadState !== "ready"}><TextSelect size={18} /> Select all text</button>
          </div>}
          <p className="sf-check-copy-status" role="status">{copyState === "copied" ? "Copied. Paste into your assistant, then add only the files you intend to share." : copyState === "failed" ? "Clipboard unavailable. Choose Select all text, then copy using your device's copy command." : copyState === "selected" ? "Text selected. Use your device's copy command to copy it." : loadState === "loading" ? "Loading the full prompt from the downloadable guide." : ""}</p>
        </section>

        <section className="sf-check-finish"><h2>Hold my tools to the same standard.</h2><p>This checklist is a download too. Read it, question it, and report anything that does not match its promise. No checklist replaces your judgment or a qualified review when the stakes are high.</p><a className="sf-text-link" href="mailto:murad@aiwithmurda.com">Contact Murad <ArrowRight size={18} /></a><div className="sf-actions"><a className="sf-button sf-button-dark" href="/store?view=free">Explore the other free tools <ArrowRight size={18} /></a></div></section>
      </div>
    </div>
  </main>;
}
