import React from "react";
import { ArrowRight, Ban, CircleCheck, CircleHelp, Copy, FileSearch, FileText, Info, ListChecks, MessageSquare, SlidersHorizontal, Terminal } from "lucide-react";

/*
  The two free cards that are not the Starter Pack. Both previews quote the
  product itself: the four steps and four verdicts of the Check It First guide,
  and the kit's own practice inbox with its sender choices.
*/

// Step headings as published on /free/check-it-first.
const checkSteps = ["Keep it separate. Don't run it.", "Check what you are sharing.", "Ask for evidence, not reassurance.", "Decide separately whether to test."];

// Verdicts and their meaning, from the table in CHECK-IT-FIRST.md.
const checkVerdicts = [
  { name: "No obvious issues found", meaning: "No material issue found in the parts reviewed; unreviewed behavior may still be risky", Icon: CircleCheck },
  { name: "Run with limits", meaning: "Fine, but it wants more access than it needs, or does something you should know about", Icon: SlidersHorizontal },
  { name: "Don't run", meaning: "A material security or data-loss risk, even if the author meant well", Icon: Ban },
  { name: "Can't tell", meaning: "Important parts could not be assessed", Icon: CircleHelp },
];

// Senders in the kit's practice inbox (payload/practice.py: eight made-up messages) with the choices the menu offers.
const practiceSenders = [
  { sender: "offers@shop.example", count: "3 messages", choice: "Delete", isDefault: true },
  { sender: "notes@learning.example", count: "2 messages", choice: "Archive" },
  { sender: "alex@friends.example", count: "1 message", choice: "Keep" },
  { sender: "receipts@store.example", count: "2 messages", choice: "Folder" },
];

// The five choices and what each one does, as published on /free/inbox-cleanup.
const inboxChoices = [
  { label: "Delete", note: "Default", result: "Move the reviewed messages to Trash. This is the default, not a permanent-delete command." },
  { label: "Keep", result: "Leave this sender's messages in your inbox." },
  { label: "Archive", result: "Move messages out of your inbox into Archive or Gmail's All Mail." },
  { label: "Folder", result: "Move messages to a folder you choose, such as Receipts." },
  { label: "Unsubscribe + Trash", result: "Move messages to Trash and add the sender to a checklist. Complete the unsubscribe yourself in your mail app." },
];

export function CheckItFirstFreeCard() {
  return <article className="mx-card mx-card--free mx-freecard sf-check-free" id="check-it-first" data-catalog-item="check-it-first" aria-labelledby="check-free-title">
    <div className="mx-free-top"><p className="mx-ticker"><span className="mx-ticker-tag">Free</span><span className="mx-ticker-bar">Start here</span></p><span className="mx-count">01 / 03</span></div>
    <div className="mx-free-intro">
      <h3 className="mx-title" id="check-free-title">Check It First</h3>
      <p className="mx-text">Before a download touches your files or accounts, ask what it really does.</p>
    </div>
    <figure className="mx-preview mx-freecard-view">
        <figcaption className="mx-mock-head"><span>CHECK-IT-FIRST.md</span><span>The guide</span></figcaption>
        <div className="mx-preview-block">
          <p className="mx-eyebrow">Before you run it</p>
          <ol className="mx-steps">{checkSteps.map((step, index) => <li key={step}><span className="mx-count">0{index + 1}</span>{step}</li>)}</ol>
        </div>
        <div className="mx-preview-block mx-preview-block--wide">
          <p className="mx-eyebrow">What it can check</p>
          <p className="mx-preview-text">Start with readable files: scripts, source code, package setup files, AI skills and prompts. Check what they read, change, delete, install or send elsewhere.</p>
        </div>
        <div className="mx-preview-block">
          <p className="mx-eyebrow">The verdict, in plain English</p>
          <ul className="mx-verdict-list">{checkVerdicts.map(({ name, meaning, Icon }) => <li key={name}><Icon className="mx-i" aria-hidden="true" /><span><b>{name}</b><span>{meaning}</span></span></li>)}</ul>
        </div>
        <p className="mx-preview-cap">A checklist, not a safety certificate.</p>
      </figure>
      <ul className="mx-includes">
        <li><FileSearch className="mx-i" aria-hidden="true" />Plain-English review checklist</li>
        <li><Copy className="mx-i" aria-hidden="true" />Copy-ready AI review prompt</li>
        <li><FileText className="mx-i" aria-hidden="true" />One downloadable guide</li>
      </ul>
    <div className="mx-buy"><a className="mx-btn mx-btn--block" href="/free/check-it-first">Read the guide <ArrowRight className="mx-i" aria-hidden="true" /></a></div>
    <p className="mx-zero"><b>$0</b><span>No account or email needed.</span></p>
    <p className="mx-note"><Info className="mx-i" aria-hidden="true" /><span>Read it yourself or use your own AI assistant. Helps spot risks; does not certify a download as safe.</span></p>
  </article>;
}

export function InboxCleanupFreeCard() {
  return <article className="mx-card mx-card--free mx-freecard sf-inbox-free" id="inbox-cleanup" data-catalog-item="email-cleanup-kit" aria-labelledby="inbox-free-title">
    <div className="mx-free-top"><p className="mx-ticker"><span className="mx-ticker-tag">Free</span><span className="mx-ticker-bar">Download</span></p><span className="mx-count">03 / 03</span></div>
    <div className="mx-free-intro">
      <h3 className="mx-title" id="inbox-free-title">Inbox Cleanup Kit</h3>
      <p className="mx-text">Clear old email by sender. Keep the important mail. Review every move.</p>
    </div>
    <figure className="mx-preview mx-freecard-view">
        <figcaption className="mx-mock-head"><span>Practice inbox</span><span>8 made-up messages</span></figcaption>
        <div className="mx-preview-block">
          <p className="mx-eyebrow">One sender at a time</p>
          <ul className="mx-senders">{practiceSenders.map((row) => <li key={row.sender}>
            <span className="mx-senders-from"><code>{row.sender}</code><small>{row.count}</small></span>
            <span className={`mx-pill${row.isDefault ? " mx-pill--on" : ""}`}>{row.choice}{row.isDefault && <small>Default</small>}</span>
          </li>)}</ul>
        </div>
        <div className="mx-preview-block">
          <p className="mx-eyebrow">You choose what happens</p>
          <dl className="mx-choices">{inboxChoices.map((item) => <div key={item.label}>
            <dt>{item.label}{item.note && <small>{item.note}</small>}</dt>
            <dd>{item.result}</dd>
          </div>)}</dl>
        </div>
        <p className="mx-preview-cap">Nothing moves during review.</p>
      </figure>
      <ul className="mx-includes">
        <li><Terminal className="mx-i" aria-hidden="true" />Guided menu + practice inbox</li>
        <li><MessageSquare className="mx-i" aria-hidden="true" />Optional AI-assisted review</li>
        <li><ListChecks className="mx-i" aria-hidden="true" />Preview before any move</li>
      </ul>
    <div className="mx-buy"><a className="mx-btn mx-btn--block" href="/free/inbox-cleanup">See the kit <ArrowRight className="mx-i" aria-hidden="true" /></a></div>
    <p className="mx-zero"><b>$0</b><span>No account or email needed.</span></p>
    <p className="mx-note"><Info className="mx-i" aria-hidden="true" /><span>Use with or without AI. Gmail or iCloud, Python and an app password required. Unsubscribing is manual.</span></p>
  </article>;
}
