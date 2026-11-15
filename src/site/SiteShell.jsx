import React from "react";
import { footerNotes } from "../data/museKit.js";
import { BuyButton } from "../pages/SalesPage.jsx";

/*
  Header and footer for the public site (the sales page, Terms and Privacy).
  One product, one decision: the header holds the logo and the buy button only, no menu.
*/

export function Brand() {
  return (
    <a className="mx-brand" href="/" aria-label="AI with Murda, home">
      <span>AI with</span>
      <span className="mx-hl">Murda</span>
    </a>
  );
}

export function SiteHeader() {
  return (
    <>
      <a className="mx-skip" href="#main-content">Skip to content</a>
      <header className="mx mx-header sp-header">
        <div className="mx-container mx-header-in">
          <Brand />
          <BuyButton size="sm" label="Get the kit" />
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx sp-footer">
      <div className="mx-container sp-footer-in">
        <ul className="sp-footer-notes">
          {footerNotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
        <div className="sp-footer-base">
          <span>&copy; 2026 AI with Murda</span>
          <nav aria-label="Legal">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="mailto:murad@aiwithmurda.com">Contact</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
