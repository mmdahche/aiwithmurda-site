import React from "react";
import { ArrowRight, Copy, FileSearch, FileText, ListChecks, MessageSquare, Terminal } from "lucide-react";

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
