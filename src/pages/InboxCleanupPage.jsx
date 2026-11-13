import React, { useState } from "react";
import { Archive, ArrowLeft, ArrowRight, Check, Copy, CornerDownRight, Download, FileCode2, FolderOpen, Inbox, Info, ListChecks, MailMinus, MessageSquare, Plus, Terminal, Trash2, TriangleAlert, UserCheck } from "lucide-react";
import { CheckItFirstNotice, FreePanel, FreePanelHead, useLandOnHash } from "./CheckItFirstPage.jsx";
import quickstart from "../../products/email-cleanup-kit/QUICKSTART.txt?raw";
import aiPrompt from "../../products/email-cleanup-kit/ai/STARTER-PROMPT.txt?raw";

/*
  /free/inbox-cleanup: the Inbox Cleanup Kit.

  Hooks the Playwright suites pin, keep them as written: the single heading
  "Inbox Cleanup Kit", the buttons "Without AI" / "With AI", the route
  headings, "Copy the AI starter prompt" / "Prompt copied", the
  "Clipboard unavailable" status, the two disclosures and their `pre`
  (`.sf-inbox-prompt`, `.sf-inbox-guide`), the five choice buttons (the first
  is named "Delete Default") and the link "Download the free inbox kit".
  Every limit and disclaimer is published copy: keep it word for word.
*/

const choices = [
  { key: "delete", label: "Delete", Icon: Trash2, result: "Move the reviewed messages to Trash. This is the default, not a permanent-delete command." },
  { key: "keep", label: "Keep", Icon: Inbox, result: "Leave this sender's messages in your inbox." },
  { key: "archive", label: "Archive", Icon: Archive, result: "Move messages out of your inbox into Archive or Gmail's All Mail." },
  { key: "folder", label: "Folder", Icon: FolderOpen, result: "Move messages to a folder you choose, such as Receipts." },
  { key: "unsub", label: "Unsubscribe + Trash", Icon: MailMinus, result: "Move messages to Trash and add the sender to a checklist. Complete the unsubscribe yourself in your mail app." },
];

// What the ZIP holds, with file names from the archive itself.
const kitParts = [
  { Icon: Terminal, title: "Launchers + guided menu", text: "Start, scan and review without remembering individual commands.", files: ["Start on Mac.command", "Start on Windows.cmd"] },
  { Icon: Inbox, title: "A practice inbox", text: "Try the real review and preview flow against a simulated mailbox.", files: ["payload/practice.py"] },
  { Icon: MessageSquare, title: "The AI-assisted guide", text: "A starter prompt, limited reports and checked suggestion files.", files: ["ai/START-WITH-AI.md", "ai/STARTER-PROMPT.txt"] },
  { Icon: FileCode2, title: "The engine, guides + offline tests", text: "Source code, setup instructions, advanced commands and an MIT license.", files: ["payload/email_cleanup.py", "install/SETUP.md", "tests/"] },
];

// The three stops of each route, drawn above its steps.
const routeFlow = {
  manual: [{ label: "Launcher", Icon: Terminal }, { label: "Practice inbox", Icon: Inbox }, { label: "You confirm", Icon: UserCheck }],
  ai: [{ label: "Sender report", Icon: ListChecks }, { label: "Your assistant", Icon: MessageSquare }, { label: "You confirm", Icon: UserCheck }],
};

export function InboxCleanupPage() {
  const [choice, setChoice] = useState("delete");
  const [mode, setMode] = useState("manual");
  const [copyState, setCopyState] = useState("idle");
  useLandOnHash();
  const selected = choices.find((item) => item.key === choice);
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return <main className="mx mx-page mx-fr mx-fr--inbox" id="main-content">
    <section className="mx-fr-top" aria-labelledby="inbox-title">
      <div className="mx-container mx-panel">
        <FreePanelHead index={1} total={5} pre="Free download" label="Version 1.2.0" />
        <div className="mx-fr-hero">
          <div className="mx-fr-intro">
            <a className="mx-link mx-fr-back" href="/store?view=free"><ArrowLeft className="mx-i" aria-hidden="true" /> All free tools</a>
            <div className="mx-fr-label">
              <p className="mx-ticker"><span className="mx-ticker-tag">Free</span><span className="mx-ticker-bar">Download</span></p>
              <p className="mx-fr-zero">$0. No account or email needed to download.</p>
            </div>
            <h1 className="mx-display mx-fr-h1" id="inbox-title">Inbox Cleanup Kit</h1>
            <p className="mx-fr-sub">Less inbox clutter.<br />With AI, or without it.</p>
            <p className="mx-lede">Review your email one sender at a time. Choose for yourself or ask your AI for suggestions. Both routes use the same local tool, with a preview before any move.</p>
            <div className="mx-actions mx-fr-actions">
              <a className="mx-btn mx-btn--lg sf-button" href="/downloads/email-cleanup-kit.zip" download><Download className="mx-i" aria-hidden="true" /> Download the free inbox kit</a>
              <span className="mx-fr-version">Both routes included / $0 / Version 1.2.0</span>
            </div>
            <p className="mx-fr-fine">Mac or Windows. Gmail or iCloud. Python 3.9+ and an app password required. No sign-up.</p>
            <CheckItFirstNotice />
          </div>

          <aside className="mx-card mx-card--free mx-fr-box" aria-labelledby="inbox-kit-title">
            <p className="mx-mock-head"><span>email-cleanup-kit.zip</span><span>In the download</span></p>
            <h2 className="mx-title mx-fr-box-title" id="inbox-kit-title">One download. Both routes.</h2>
            <ul className="mx-fr-kit">{kitParts.map(({ Icon, title, text, files }) => <li key={title}>
              <span className="mx-tile mx-tile--sm" aria-hidden="true"><Icon className="mx-i" /></span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
                <p className="mx-fr-kit-files">{files.map((file) => <code key={file}>{file}</code>)}</p>
              </div>
            </li>)}</ul>
          </aside>
        </div>
      </div>
    </section>

    <FreePanel index={2} total={5} pre="Two routes" label="Same local tool" labelledBy="inbox-routes-title">
      <div className="mx-section-head mx-fr-routes-head">
        <h2 className="mx-display mx-display--lg" id="inbox-routes-title">Pick the way you want to work.</h2>
        <div className="mx-section-side">
          <div className="mx-fr-seg" role="group" aria-label="Choose your setup route">
            <button type="button" aria-pressed={mode === "manual"} aria-controls="inbox-route-content" onClick={() => setMode("manual")}><Terminal className="mx-i" aria-hidden="true" /> Without AI</button>
            <button type="button" aria-pressed={mode === "ai"} aria-controls="inbox-route-content" onClick={() => setMode("ai")}><MessageSquare className="mx-i" aria-hidden="true" /> With AI</button>
          </div>
        </div>
      </div>
      <div className="mx-card mx-fr-route" id="inbox-route-content">
        <div className="mx-fr-route-about">
          <div className="mx-preview mx-fr-route-art" aria-hidden="true">
            <div className="mx-flow mx-flow--sm">{routeFlow[mode].map(({ label, Icon }, index) => <React.Fragment key={label}>
              {index > 0 && <span className="mx-join mx-join--arrow"><ArrowRight className="mx-i" /></span>}
              <div className="mx-node"><span className={`mx-tile mx-tile--sm${index === 2 ? " mx-tile--blue" : index === 0 ? " mx-tile--white" : ""}`}><Icon className="mx-i" /></span><span className="mx-tile-label">{label}</span></div>
            </React.Fragment>)}</div>
          </div>
          <h3 className="mx-title">{mode === "manual" ? "Your choices. A guided menu." : "Your assistant suggests. You decide."}</h3>
          <p className="mx-text">{mode === "manual" ? "No AI account needed. A numbered menu walks you through a small scan, sender choices and the final preview." : "Use the included guide with Claude Code, Codex or a compatible assistant. It helps you review a limited sender report, not your passwords or whole mailbox."}</p>
          <p className="mx-fr-cost">{mode === "manual" ? "Free kit. No AI subscription or credits required." : "Free kit. Your AI access and any usage charges are separate."}</p>
          {mode === "ai" && <div className="mx-fr-prompt-control">
            <button type="button" className="mx-btn mx-btn--ghost" onClick={copyPrompt}>{copyState === "copied" ? <Check className="mx-i" aria-hidden="true" /> : <Copy className="mx-i" aria-hidden="true" />}{copyState === "copied" ? "Prompt copied" : "Copy the AI starter prompt"}</button>
            <span className="mx-fr-status" role="status">{copyState === "copied" ? "Give your assistant the included guide and only the report you choose to share." : copyState === "failed" ? "Clipboard unavailable. Open the AI starter prompt below to select the text." : ""}</span>
          </div>}
        </div>
        <ol className="mx-fr-steps">
          {mode === "manual" ? <>
            <li><span className="mx-count" aria-hidden="true">01</span><div><strong>Open the launcher.</strong><p>Extract the download and open the Mac or Windows launcher. It opens a text menu, not a phone app.</p></div></li>
            <li><span className="mx-count" aria-hidden="true">02</span><div><strong>Try the practice inbox.</strong><p>Eight made-up messages. No account, password or internet needed.</p></div></li>
            <li><span className="mx-count" aria-hidden="true">03</span><div><strong>Connect, review, then confirm.</strong><p>Choose the without-AI route, start with 100 messages, and check the plan before approving it.</p></div></li>
          </> : <>
            <li><span className="mx-count" aria-hidden="true">01</span><div><strong>Make a small sender report.</strong><p>The local menu connects your account and scans up to 100 messages. Enter your app password locally, never in AI chat.</p></div></li>
            <li><span className="mx-count" aria-hidden="true">02</span><div><strong>Share only what you inspect.</strong><p>The AI report includes sender addresses and counts, not subjects or passwords. It is private data, not anonymous.</p></div></li>
            <li><span className="mx-count" aria-hidden="true">03</span><div><strong>Review the suggestions locally.</strong><p>Your assistant returns a suggestions file. The menu shows it beside each sender; you choose the action and confirm the separate preview.</p></div></li>
          </>}
        </ol>
      </div>
      <p className="mx-fr-callout mx-fr-setup"><TriangleAlert className="mx-i" aria-hidden="true" /><span><strong>Some setup is still required.</strong> Python and an email app password are needed for both routes. The included guide covers them; the launcher does not install anything automatically.</span></p>
      {mode === "ai" && <details className="mx-fr-well mx-fr-fold sf-inbox-prompt">
        <summary><span>Read the AI starter prompt</span><code>ai/STARTER-PROMPT.txt</code><Plus className="mx-i" aria-hidden="true" /></summary>
        <pre className="mx-fr-pre">{aiPrompt}</pre>
      </details>}
    </FreePanel>

    <FreePanel index={3} total={5} pre="Your choices" label="Delete is the default" labelledBy="inbox-options-title">
      <div className="mx-fr-split">
        <div className="mx-fr-side">
          <h2 className="mx-display mx-fr-h" id="inbox-options-title">You choose what happens.</h2>
          <p className="mx-text">Delete is the default for every sender, including personal mail. Pressing Enter selects Delete, even when AI suggests Keep. All other choices remain available.</p>
        </div>
        <figure className="mx-mock mx-fr-choice">
          <figcaption className="mx-mock-head"><span>Choice preview</span><span>No inbox connected</span></figcaption>
          <p className="mx-fr-sender"><span className="mx-eyebrow">Practice sender</span><code>offers@shop.example</code><small>3 made-up messages</small></p>
          <div className="mx-fr-choices" role="group" aria-label="Preview cleanup choices">{choices.map(({ key, label, Icon }) => <button type="button" key={key} aria-pressed={choice === key} onClick={() => setChoice(key)}>
            <Icon className="mx-i" aria-hidden="true" />{label}{key === "delete" && <>{" "}<small>Default</small></>}
          </button>)}</div>
          <p className="mx-fr-result" role="status"><CornerDownRight className="mx-i" aria-hidden="true" /><span>{selected.result}</span></p>
          <small className="mx-fr-choice-note">Nothing moves during review. Execution requires a saved preview and a typed confirmation.</small>
        </figure>
      </div>
    </FreePanel>

    <FreePanel index={4} total={5} pre="Limits" label="Read before you connect" labelledBy="inbox-limits-title">
      <div className="mx-fr-split">
        <div className="mx-fr-side mx-fr-side--pin">
          <h2 className="mx-display mx-fr-h" id="inbox-limits-title">Before you connect.</h2>
          <div className="mx-mock mx-fr-side-art mx-fr-reads" aria-hidden="true">
            <p className="mx-mock-head"><span>What the kit reads</span><span>Headers only</span></p>
            <dl>
              <div><dt>From</dt><dd><code>offers@shop.example</code></dd><dd className="mx-fr-reads-flag">Read</dd></div>
              <div><dt>Subject</dt><dd><code>Weekend deals</code></dd><dd className="mx-fr-reads-flag">Read</dd></div>
              <div className="mx-fr-reads-off"><dt>Body</dt><dd><i /><i /><i /></dd><dd className="mx-fr-reads-flag">Not read</dd></div>
            </dl>
            <p className="mx-preview-cap">A made-up message from the practice inbox.</p>
          </div>
        </div>
        <div className="mx-fr-body">
          <div className="mx-fr-read mx-fr-limits">
            <p>Gmail and iCloud INBOX only. The kit reads headers, not email bodies. One sender may mix promotions with receipts; choose Keep when a single action is too broad.</p>
            <p><strong>Unsubscribe is guided, not automatic.</strong> Finish the sender checklist in your mail app. The kit never follows email links or sends unsubscribe requests.</p>
            <p><strong>Back up important mail first.</strong> Trash may empty automatically. There is no built-in backup or automatic undo.</p>
            <p>Passwords and full header scans stay locally, unencrypted. Keep the folder private and outside cloud sync. Sharing a report with an AI assistant sends its contents to that provider; never share your password or the whole data folder.</p>
          </div>
          <p className="mx-note mx-fr-note"><Info className="mx-i" aria-hidden="true" /><span>Offline tests cover both routes. Live Gmail/iCloud acceptance and native Windows testing are still outstanding. Start small and inspect the results.</span></p>
        </div>
      </div>
    </FreePanel>

    <FreePanel index={5} total={5} pre="In the download" label="QUICKSTART.txt" labelledBy="inbox-guide-title" className="sf-inbox-guide mx-fr-last">
      <div className="mx-fr-split">
        <div className="mx-fr-side mx-fr-side--pin">
          <h2 className="mx-display mx-fr-h" id="inbox-guide-title">Read the quickstart first.</h2>
        </div>
        <div className="mx-fr-body">
          <details className="mx-fr-well mx-fr-fold">
            <summary><span>Read the included quickstart</span><code>QUICKSTART.txt</code><Plus className="mx-i" aria-hidden="true" /></summary>
            <pre className="mx-fr-pre">{quickstart}</pre>
          </details>
          <div className="mx-fr-read">
            <p>Account requirements: <a href="https://support.google.com/accounts/answer/185833">Google app passwords</a> and <a href="https://support.apple.com/102654">Apple app-specific passwords</a>. If your account does not offer them, do not weaken its security to use this kit.</p>
          </div>
          <a className="mx-link" href="/start">Also free: the AI Starter Pack <ArrowRight className="mx-i" aria-hidden="true" /></a>
        </div>
      </div>
    </FreePanel>
  </main>;
}
