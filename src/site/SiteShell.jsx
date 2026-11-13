import React, { useEffect, useRef, useState } from "react";
import { FolderDown, Menu, X } from "lucide-react";

/*
  Shared header and footer for every public route.

  Names that tests and assistive tech rely on, keep them as written:
  the "Open navigation" / "Close navigation" toggle label, the
  "Public navigation" landmark with id "public-navigation-links", and the
  "Tools" and "About Murad" links inside it.
*/

const navLinks = [
  { href: "/store", label: "Tools" },
  { href: "/about", label: "About Murad" },
  { href: "/start", label: "Free Starter Pack" },
];

function isActive(link, activeRoute) {
  return activeRoute === link.href || (link.href === "/store" && activeRoute === "/store/product");
}

export function Brand() {
  return (
    <a className="mx-brand" href="/" aria-label="AI with Murda, home">
      <span>AI with</span>
      <span className="mx-hl">Murda</span>
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg className="mx-i" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="mx-i" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="m10 9 5 3-5 3z" />
    </svg>
  );
}

export function SiteHeader({ activeRoute }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <a className="mx-skip" href="#main-content">Skip to content</a>
      <header className="mx mx-header">
        <div className="mx-container mx-header-in">
          <Brand />
          <nav
            id="public-navigation-links"
            className={`mx-nav${menuOpen ? " is-open" : ""}`}
            aria-label="Public navigation"
          >
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} aria-current={isActive(link, activeRoute) ? "page" : undefined}>
                {link.label}
              </a>
            ))}
          </nav>
          <a className="mx-btn mx-btn--ghost mx-btn--sm mx-account" href="/members">
            <FolderDown className="mx-i" aria-hidden="true" />
            <span>My Downloads</span>
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="mx-nav-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="public-navigation-links"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <Menu className="mx-i mx-i--open" aria-hidden="true" />
            <X className="mx-i mx-i--close" aria-hidden="true" />
          </button>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx mx-footer">
      <div className="mx-container">
        <div className="mx-footer-in">
          <div className="mx-footer-brand">
            <Brand />
            <p>Practical downloads for building with Claude Code and Codex. Download it. Make it yours.</p>
            <a className="mx-built" href="https://backbonesolutions.ai">Built by the founder of Backbone Solutions</a>
          </div>
          <nav className="mx-footer-cols" aria-label="Footer">
            <div>
              <h2 className="mx-foot-h">Shop</h2>
              <ul>
                <li><a href="/store">All tools</a></li>
                <li><a href="/start">Starter pack</a></li>
                <li><a href="/members">Your downloads</a></li>
              </ul>
            </div>
            <div>
              <h2 className="mx-foot-h">Murad</h2>
              <ul>
                <li><a href="/about">Meet Murad</a></li>
                <li><a href="/60">Build log archive</a></li>
                <li><a href="mailto:murad@aiwithmurda.com">Contact</a></li>
              </ul>
            </div>
            <div>
              <h2 className="mx-foot-h">Follow</h2>
              <ul>
                <li><a href="https://www.instagram.com/aiwithmurda/"><InstagramIcon />@aiwithmurda</a></li>
                <li><a href="https://www.youtube.com/channel/UC9iGjtlA3R4vopdNLTGbnuw"><YouTubeIcon />YouTube</a></li>
              </ul>
            </div>
            <div>
              <h2 className="mx-foot-h">Fine print</h2>
              <ul>
                <li><a href="/terms">Terms</a></li>
                <li><a href="/privacy">Privacy</a></li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="mx-footer-base">
          <span>&copy; 2026 AI with Murda</span>
          <span>Downloads and written guides, not a hosted AI service.</span>
        </div>
      </div>
    </footer>
  );
}
