import React, { useState } from "react";
import { Archive, ArrowRight, Download, FileCode2, FolderOpen, Inbox, ListChecks, MailMinus, Trash2 } from "lucide-react";
import quickstart from "../../products/email-cleanup-kit/QUICKSTART.txt?raw";

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
    <ul className="sf-inbox-includes"><li><FileCode2 size={20} /> Inbox cleanup script</li><li><FolderOpen size={20} /> Mac + Windows setup guide</li><li><ListChecks size={20} /> Reviewed plans + unsubscribe checklist</li></ul>
    <p className="sf-inbox-note">Gmail or iCloud. Requires Python and an app password. Delete means move to Trash; unsubscribing is manual.</p>
  </article>;
}

export function InboxCleanupPage() {
  const [choice, setChoice] = useState("delete");
  const selected = choices.find((item) => item.key === choice);
  return <main className="sf-page sf-inbox-page" id="main-content">
    <section className="sf-container sf-inbox-heading">
      <a className="sf-text-link" href="/store?view=free">All free tools <ArrowRight size={17} /></a>
      <h1>Inbox Cleanup Kit</h1>
      <p className="sf-lead">Years of inbox clutter.<br />One sender at a time.</p>
      <p>A local script that groups your email by sender, saves your choices, and previews exactly what will move. Free to download. No AI subscription required.</p>
      <div className="sf-actions"><a className="sf-button" href="/downloads/email-cleanup-kit.zip" download><Download size={19} /> Download the free inbox kit</a><span className="sf-inbox-version">$0 / Version 1.1.0 / MIT licensed</span></div>
      <p className="sf-fine-print">Desktop download for Gmail and iCloud. Python 3.9+ and an app password required. No sign-up.</p>
    </section>
    <section className="sf-container sf-inbox-options" aria-labelledby="inbox-options-title">
      <div><h2 id="inbox-options-title">You choose what happens.</h2><p>Delete is the default review choice. Keep, Archive, Folder, and Unsubscribe + Trash are always available. You can also skip a sender or stop.</p></div>
      <figure className="sf-inbox-choice-preview">
        <figcaption>Choice preview / No inbox connected</figcaption>
        <div className="sf-inbox-choice-buttons" role="group" aria-label="Preview cleanup choices">{choices.map(({ key, label, Icon }) => <button type="button" key={key} aria-pressed={choice === key} onClick={() => setChoice(key)}><Icon size={18} />{label}{key === "delete" && <small>Default</small>}</button>)}</div>
        <p role="status">{selected.result}</p>
        <small>Nothing moves during review. Execution requires a saved preview and a typed confirmation.</small>
      </figure>
    </section>
    <section className="sf-container sf-inbox-details">
      <div><h2>What you get.</h2><ul className="sf-inbox-file-list"><li><FileCode2 size={22} /><div><strong>The cleanup script</strong><p>Read-only sender scans, saved choices, and an exact plan before a move.</p></div></li><li><FolderOpen size={22} /><div><strong>Setup + quickstart guides</strong><p>Python, app passwords, a small first run, and changing your choices.</p></div></li><li><ListChecks size={22} /><div><strong>Checks you can run</strong><p>Offline tests with fake mailboxes. No account or password needed to run them.</p></div></li></ul></div>
      <div><h2>Before you download.</h2><p>This is a command-line tool for your computer, not a phone app or hosted cleanup service. It cleans INBOX only.</p><p><strong>Unsubscribe is guided, not automatic.</strong> The kit makes a sender checklist. Finish those unsubscribes in your mail app; it never follows email links or sends unsubscribe requests for you.</p><p><strong>Back up important mail first.</strong> Delete moves to Trash, which your provider may empty automatically. There is no built-in backup or automatic undo.</p><p>App passwords and mail-header reports are stored locally and unencrypted. Keep the folder private and outside cloud-sync services. Never send us your email password.</p><p className="sf-fine-print">Offline tests cover the cleanup logic. This release has not been acceptance-tested on live Gmail/iCloud accounts or Windows. Start with a small group and inspect the results before doing more.</p></div>
    </section>
    <section className="sf-container sf-inbox-guide">
      <details><summary>Read the included quickstart</summary><pre>{quickstart}</pre></details>
      <p>Account requirements: <a href="https://support.google.com/accounts/answer/185833">Google app passwords</a> and <a href="https://support.apple.com/102654">Apple app-specific passwords</a>. If your account does not offer them, do not weaken its security to use this kit.</p>
      <a className="sf-text-link" href="/start">Also free: the AI Starter Pack <ArrowRight size={18} /></a>
    </section>
  </main>;
}
