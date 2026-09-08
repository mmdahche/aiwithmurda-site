import React, { useState } from "react";
import { Archive, ArrowRight, Check, Copy, Download, FileCode2, FolderOpen, Inbox, ListChecks, MailMinus, MessageSquare, Terminal, Trash2 } from "lucide-react";
import quickstart from "../../products/email-cleanup-kit/QUICKSTART.txt?raw";
import aiPrompt from "../../products/email-cleanup-kit/ai/STARTER-PROMPT.txt?raw";

const choices = [
  { key: "delete", label: "Delete", Icon: Trash2, result: "Move the reviewed messages to Trash. This is the default, not a permanent-delete command." },
  { key: "keep", label: "Keep", Icon: Inbox, result: "Leave this sender's messages in your inbox." },
  { key: "archive", label: "Archive", Icon: Archive, result: "Move messages out of your inbox into Archive or Gmail's All Mail." },
  { key: "folder", label: "Folder", Icon: FolderOpen, result: "Move messages to a folder you choose, such as Receipts." },
  { key: "unsub", label: "Unsubscribe + Trash", Icon: MailMinus, result: "Move messages to Trash and add the sender to a checklist. Complete the unsubscribe yourself in your mail app." },
];

export function InboxCleanupFreeCard() {
  return <article className="sf-inbox-free" data-catalog-item="email-cleanup-kit" aria-labelledby="inbox-free-title">
    <div className="sf-free-pack-heading">
      <div><span className="sf-access-label sf-access-free">Free download</span><h2 id="inbox-free-title">Inbox Cleanup Kit</h2><p>Clear old email by sender. Keep the important mail. Review every move.</p></div>
      <div><a className="sf-button sf-button-dark" href="/free/inbox-cleanup">See the kit <ArrowRight size={18} /></a><p className="sf-fine-print">$0. No account or email needed.</p></div>
    </div>
    <ul className="sf-inbox-includes"><li><Terminal size={20} /> Guided menu + practice inbox</li><li><MessageSquare size={20} /> Optional AI-assisted review</li><li><ListChecks size={20} /> Preview before any move</li></ul>
    <p className="sf-inbox-note">Use with or without AI. Gmail or iCloud, Python and an app password required. Unsubscribing is manual.</p>
  </article>;
}

export function InboxCleanupPage() {
  const [choice, setChoice] = useState("delete");
  const [mode, setMode] = useState("manual");
  const [copyState, setCopyState] = useState("idle");
  const selected = choices.find((item) => item.key === choice);
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }
  return <main className="sf-page sf-inbox-page" id="main-content">
    <section className="sf-container sf-inbox-heading">
      <a className="sf-text-link" href="/store?view=free">All free tools <ArrowRight size={17} /></a>
      <h1>Inbox Cleanup Kit</h1>
      <p className="sf-lead">Less inbox clutter.<br />With AI, or without it.</p>
      <p>Review your email one sender at a time. Choose for yourself or ask your AI for suggestions. Both routes use the same local tool, with a preview before any move.</p>
      <div className="sf-actions"><a className="sf-button" href="/downloads/email-cleanup-kit.zip" download><Download size={19} /> Download the free inbox kit</a><span className="sf-inbox-version">Both routes included / $0 / Version 1.2.0</span></div>
      <p className="sf-fine-print">Mac or Windows. Gmail or iCloud. Python 3.9+ and an app password required. No sign-up.</p>
    </section>
    <section className="sf-container sf-inbox-routes" aria-labelledby="inbox-routes-title">
      <h2 id="inbox-routes-title">Pick the way you want to work.</h2>
      <div className="sf-inbox-mode" role="group" aria-label="Choose your setup route">
        <button type="button" aria-pressed={mode === "manual"} aria-controls="inbox-route-content" onClick={() => setMode("manual")}><Terminal size={19} /> Without AI</button>
        <button type="button" aria-pressed={mode === "ai"} aria-controls="inbox-route-content" onClick={() => setMode("ai")}><MessageSquare size={19} /> With AI</button>
      </div>
      <div className="sf-inbox-route-content" id="inbox-route-content">
        <div>
          <h3>{mode === "manual" ? "Your choices. A guided menu." : "Your assistant suggests. You decide."}</h3>
          <p>{mode === "manual" ? "No AI account needed. A numbered menu walks you through a small scan, sender choices and the final preview." : "Use the included guide with Claude Code, Codex or a compatible assistant. It helps you review a limited sender report, not your passwords or whole mailbox."}</p>
          <p className="sf-inbox-route-cost">{mode === "manual" ? "Free kit. No AI subscription or credits required." : "Free kit. Your AI access and any usage charges are separate."}</p>
          {mode === "ai" && <div className="sf-inbox-prompt-control"><button type="button" className="sf-button sf-button-outline" onClick={copyPrompt}>{copyState === "copied" ? <Check size={18} /> : <Copy size={18} />}{copyState === "copied" ? "Prompt copied" : "Copy the AI starter prompt"}</button><span role="status">{copyState === "copied" ? "Give your assistant the included guide and only the report you choose to share." : copyState === "failed" ? "Clipboard unavailable. Open the AI starter prompt below to select the text." : ""}</span></div>}
        </div>
        <ol className="sf-inbox-route-steps">
          {mode === "manual" ? <>
            <li><strong>Open the launcher.</strong><p>Extract the download and open the Mac or Windows launcher. It opens a text menu, not a phone app.</p></li>
            <li><strong>Try the practice inbox.</strong><p>Eight made-up messages. No account, password or internet needed.</p></li>
            <li><strong>Connect, review, then confirm.</strong><p>Choose the without-AI route, start with 100 messages, and check the plan before approving it.</p></li>
          </> : <>
            <li><strong>Make a small sender report.</strong><p>The local menu connects your account and scans up to 100 messages. Enter your app password locally, never in AI chat.</p></li>
            <li><strong>Share only what you inspect.</strong><p>The AI report includes sender addresses and counts, not subjects or passwords. It is private data, not anonymous.</p></li>
            <li><strong>Review the suggestions locally.</strong><p>Your assistant returns a suggestions file. The menu shows it beside each sender; you choose the action and confirm the separate preview.</p></li>
          </>}
        </ol>
      </div>
      <p className="sf-inbox-setup-note"><strong>Some setup is still required.</strong> Python and an email app password are needed for both routes. The included guide covers them; the launcher does not install anything automatically.</p>
      {mode === "ai" && <details className="sf-inbox-prompt"><summary>Read the AI starter prompt</summary><pre>{aiPrompt}</pre></details>}
    </section>
    <section className="sf-container sf-inbox-options" aria-labelledby="inbox-options-title">
      <div><h2 id="inbox-options-title">You choose what happens.</h2><p>Delete is the default for every sender, including personal mail. Pressing Enter selects Delete, even when AI suggests Keep. All other choices remain available.</p></div>
      <figure className="sf-inbox-choice-preview">
        <figcaption>Choice preview / No inbox connected</figcaption>
        <div className="sf-inbox-choice-buttons" role="group" aria-label="Preview cleanup choices">{choices.map(({ key, label, Icon }) => <button type="button" key={key} aria-pressed={choice === key} onClick={() => setChoice(key)}><Icon size={18} />{label}{key === "delete" && <small>Default</small>}</button>)}</div>
        <p role="status">{selected.result}</p>
        <small>Nothing moves during review. Execution requires a saved preview and a typed confirmation.</small>
      </figure>
    </section>
    <section className="sf-container sf-inbox-details">
      <div><h2>One download. Both routes.</h2><ul className="sf-inbox-file-list"><li><Terminal size={22} /><div><strong>Launchers + guided menu</strong><p>Start, scan and review without remembering individual commands.</p></div></li><li><Inbox size={22} /><div><strong>A practice inbox</strong><p>Try the real review and preview flow against a simulated mailbox.</p></div></li><li><MessageSquare size={22} /><div><strong>The AI-assisted guide</strong><p>A starter prompt, limited reports and checked suggestion files.</p></div></li><li><FileCode2 size={22} /><div><strong>The engine, guides + offline tests</strong><p>Source code, setup instructions, advanced commands and an MIT license.</p></div></li></ul></div>
      <div><h2>Before you connect.</h2><p>Gmail and iCloud INBOX only. The kit reads headers, not email bodies. One sender may mix promotions with receipts; choose Keep when a single action is too broad.</p><p><strong>Unsubscribe is guided, not automatic.</strong> Finish the sender checklist in your mail app. The kit never follows email links or sends unsubscribe requests.</p><p><strong>Back up important mail first.</strong> Trash may empty automatically. There is no built-in backup or automatic undo.</p><p>Passwords and full header scans stay locally, unencrypted. Keep the folder private and outside cloud sync. Sharing a report with an AI assistant sends its contents to that provider; never share your password or the whole data folder.</p><p className="sf-fine-print">Offline tests cover both routes. Live Gmail/iCloud acceptance and native Windows testing are still outstanding. Start small and inspect the results.</p></div>
    </section>
    <section className="sf-container sf-inbox-guide">
      <details><summary>Read the included quickstart</summary><pre>{quickstart}</pre></details>
      <p>Account requirements: <a href="https://support.google.com/accounts/answer/185833">Google app passwords</a> and <a href="https://support.apple.com/102654">Apple app-specific passwords</a>. If your account does not offer them, do not weaken its security to use this kit.</p>
      <a className="sf-text-link" href="/start">Also free: the AI Starter Pack <ArrowRight size={18} /></a>
    </section>
  </main>;
}
