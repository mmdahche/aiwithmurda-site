import React from "react";
import { flushSync } from "react-dom";
import { ArrowDown, ArrowRight, ArrowUpRight, Boxes, CreditCard, Download, FileSearch, Folder, FolderDown, ListChecks, Mail, Store, Terminal } from "lucide-react";
import { storefrontOffers } from "../data/storefront.js";
import { packagePrice } from "../data/storefrontCatalog.js";
import { PanelHead, SamplerBand, StoreFaq, pad2, packageTiers } from "../components/storefront/StorefrontParts.jsx";
import { StoreCatalog, showCatalogView, useCatalog, useCatalogPanelTotal } from "../components/storefront/StoreCatalog.jsx";

// The three free downloads, in the order they appear in the catalogue.
const freeShelf = [
  { name: "Check It First", meta: "Guide + AI review prompt", href: "/free/check-it-first", Icon: FileSearch },
  { name: "Free Starter Pack", meta: "Three habits, one download", href: "/start", Icon: Download },
  { name: "Inbox Cleanup Kit", meta: "With AI, or without it", href: "/free/inbox-cleanup", Icon: Mail },
];

const storyRoute = [
  { label: "A store", Icon: Store, tone: "" },
  { label: "Inventory", Icon: Boxes, tone: "" },
  { label: "Point of sale", Icon: CreditCard, tone: "" },
  { label: "These files", Icon: FolderDown, tone: "mx-tile--blue" },
];

export function StorefrontHome() {
  const { view } = useCatalog();
  const total = useCatalogPanelTotal(true);
  // The hero buttons jump to a catalogue panel; make sure that panel is on screen first.
  const showEverything = () => { if (view !== "all") flushSync(() => showCatalogView("all")); };

  return <main className="mx mx-page mx-home" id="main-content">
    <section className="mx-hero" aria-labelledby="hero-title">
      <div className="mx-container mx-panel">
        <PanelHead n={1} total={total}><span className="mx-desc-pre">Storefront / </span>Claude Code + Codex</PanelHead>

        <div className="mx-hero-grid">
          <div className="mx-hero-copy">
            <p className="mx-chip"><span className="mx-chip-dot" aria-hidden="true" />Scripts. Skills. Project folders.</p>
            <h1 className="mx-display mx-display--xl" id="hero-title">Download it. <br />Make it yours.</h1>
            <p className="mx-lede">Practical downloads for building with Claude Code and Codex, from a business owner who uses them.</p>
            <div className="mx-actions">
              <a className="mx-btn mx-btn--lg" href="#free" onClick={showEverything}>Start with a free download <ArrowDown className="mx-i" aria-hidden="true" /></a>
              <a className="mx-btn mx-btn--lg mx-btn--ghost" href="#packages" onClick={showEverything}>See the paid packages</a>
            </div>
            <p className="mx-meta">$0 to start. No account or email needed.</p>
          </div>

          <figure className="mx-portrait">
            <div className="mx-portrait-frame">
              <img src="/images/murad.jpg" alt="Murad Dahche, the builder behind AI with Murda" width="1080" height="1080" fetchPriority="high" />
              <span className="mx-tile mx-tile--white mx-float mx-float--a" aria-hidden="true"><Terminal className="mx-i" /></span>
              <span className="mx-tile mx-float mx-float--b" aria-hidden="true"><Folder className="mx-i" /></span>
              <span className="mx-tile mx-tile--blue mx-tile--sm mx-float mx-float--c" aria-hidden="true"><ListChecks className="mx-i" /></span>
              <span className="mx-ticker mx-ticker--lg mx-ticker--tilt mx-portrait-strap" aria-hidden="true"><span className="mx-ticker-tag">Murad</span><span className="mx-ticker-bar">@aiwithmurda</span></span>
            </div>
            <figcaption>I'm Murad. I started with inventory software. Now I share the tools and habits behind the builds.</figcaption>
          </figure>
        </div>

        <nav className="mx-shelf" aria-label="Everything on the shelf">
          <div className="mx-shelf-groups">
            <div className="mx-card mx-card--free mx-shelf-group">
              <div className="mx-shelf-grouphead">
                <p className="mx-ticker"><span className="mx-ticker-tag">Free</span><span className="mx-ticker-bar">$0. No sign-up</span></p>
                <p className="mx-shelf-note"><span className="mx-count">{pad2(freeShelf.length)} downloads</span>Start with Check It First.</p>
              </div>
              <ul className="mx-shelf-items">{freeShelf.map(({ name, meta, href, Icon }) => <li key={href}>
                <a className="mx-shelf-item" href={href}>
                  <span className="mx-tile mx-tile--white"><Icon className="mx-i" aria-hidden="true" /></span>
                  <span className="mx-shelf-name">{name}</span>
                  <span className="mx-shelf-meta">{meta}</span>
                  <span className="mx-shelf-price">$0</span>
                  <ArrowRight className="mx-i mx-shelf-go" aria-hidden="true" />
                </a>
              </li>)}</ul>
            </div>
            <div className="mx-cream mx-shelf-group">
              <div className="mx-shelf-grouphead">
                <p className="mx-ticker"><span className="mx-ticker-tag">Paid package</span><span className="mx-ticker-bar">{storefrontOffers.length} tiers</span></p>
                <p className="mx-shelf-note">Each tier includes the one before it.</p>
              </div>
              <ul className="mx-shelf-items">{storefrontOffers.map((offer, index) => {
                const Tier = packageTiers[index].Icon;
                return <li key={offer.slug}>
                  <a className="mx-shelf-item mx-shelf-item--paid" href={`/store/${offer.slug}`}>
                    <span className="mx-tile"><Tier className="mx-i" aria-hidden="true" /></span>
                    <span className="mx-shelf-name">{offer.name}</span>
                    <span className="mx-shelf-meta">{offer.category}</span>
                    <span className="mx-shelf-price">{packagePrice(offer)}</span>
                    <ArrowRight className="mx-i mx-shelf-go" aria-hidden="true" />
                  </a>
                </li>;
              })}</ul>
            </div>
          </div>
          <p className="mx-preview-cap mx-shelf-cap">Self-paced. Your own projects. Downloads and written guides, not a hosted AI service.</p>
        </nav>
      </div>
    </section>

    <StoreCatalog featured />

    <section className="mx-section" id="murad" aria-labelledby="story-title">
      <div className="mx-container mx-panel">
        <PanelHead n={total - 1} total={total}>The person behind the files</PanelHead>
        <div className="mx-story">
          <figure className="mx-story-photo">
            <img src="/images/murad.jpg" alt="Murad Dahche" width="1080" height="1080" />
            <a className="mx-chip" href="https://www.instagram.com/aiwithmurda/"><span className="mx-chip-dot" aria-hidden="true" />@aiwithmurda on Instagram</a>
            <figcaption className="mx-ticker mx-ticker--lg mx-ticker--tilt"><span className="mx-ticker-tag">Murad Dahche</span><span className="mx-ticker-bar">AI with Murda</span></figcaption>
          </figure>
          <div className="mx-story-copy">
            <h2 className="mx-display mx-display--md" id="story-title">I started with a store. <br />Then I started building.</h2>
            <p>I wanted better ways to manage inventory. That led me into building business software with AI, and then into point of sale: the missing piece that connects the work.</p>
            <p>Along the way, I built up scripts, project folders, and repeatable workflows. This is where I share the useful parts, so you can put them to work on your own ideas.</p>
            <div className="mx-route" aria-hidden="true">
              <div className="mx-flow mx-flow--sm">{storyRoute.map((stop, index) => <React.Fragment key={stop.label}>
                {index > 0 && <span className="mx-join mx-join--arrow"><ArrowRight className="mx-i" /></span>}
                <div className="mx-node"><span className={`mx-tile mx-tile--sm ${stop.tone}`}><stop.Icon className="mx-i" /></span><span className="mx-tile-label">{stop.label}</span></div>
              </React.Fragment>)}</div>
            </div>
            <div className="mx-actions">
              <a className="mx-link" href="/about">More about Murad <ArrowRight className="mx-i" aria-hidden="true" /></a>
              <a className="mx-link" href="https://www.instagram.com/aiwithmurda/">Instagram <ArrowUpRight className="mx-i" aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <SamplerBand />
    <StoreFaq count={`${pad2(total)} / ${pad2(total)}`} />
  </main>;
}
