import React from "react";
import { ArrowRight, ArrowUpRight, Boxes, CreditCard, FolderDown, History, Store } from "lucide-react";
import { SamplerBand } from "../components/storefront/StorefrontParts.jsx";

// How the files came to exist: the four stops of the story, drawn as tiles.
const route = [
  { label: "A store", Icon: Store, tone: "" },
  { label: "Inventory", Icon: Boxes, tone: "" },
  { label: "Point of sale", Icon: CreditCard, tone: "" },
  { label: "These files", Icon: FolderDown, tone: "mx-tile--blue" },
];

function YouTubeIcon() {
  return <svg className="mx-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4" /><path d="m10 9 5 3-5 3z" /></svg>;
}

function InstagramIcon() {
  return <svg className="mx-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>;
}

const elsewhere = [
  { name: "The original build log", meta: "Build log archive", href: "/60", Icon: History, Go: ArrowRight },
  { name: "YouTube", meta: "Channel", href: "https://www.youtube.com/channel/UC9iGjtlA3R4vopdNLTGbnuw", Icon: YouTubeIcon, Go: ArrowUpRight },
  { name: "Instagram", meta: "@aiwithmurda", href: "https://www.instagram.com/aiwithmurda/", Icon: InstagramIcon, Go: ArrowUpRight },
];

export function AboutMurad() {
  return <main className="mx mx-page mx-about" id="main-content">
    <section className="mx-about-top" aria-labelledby="about-title">
      <div className="mx-container mx-panel">
        <div className="mx-panel-head"><span className="mx-count">01 / 02</span><span className="mx-desc"><span className="mx-desc-pre">About / </span>The person behind the files</span></div>

        <div className="mx-about-grid">
          <div className="mx-about-head">
            <p className="mx-chip"><span className="mx-chip-dot" aria-hidden="true" />Retail. Inventory. Point of sale.</p>
            <h1 className="mx-display mx-display--lg" id="about-title">I'm Murad.<br />I build around<br />real problems.</h1>
          </div>

          <figure className="mx-about-photo">
            <img src="/images/murad.jpg" alt="Murad Dahche" width="1080" height="1080" fetchPriority="high" />
            <figcaption className="mx-ticker mx-ticker--lg mx-ticker--tilt"><span className="mx-ticker-tag">Murad Dahche</span><span className="mx-ticker-bar">@aiwithmurda</span></figcaption>
          </figure>

          <div className="mx-about-copy">
            <p className="mx-lede">I run a retail business. My interest in AI started with something practical: making inventory easier to manage.</p>
            <p className="mx-text">The deeper I got into inventory software, the clearer it became that point of sale needed to be part of the picture. That's the kind of work I use Claude Code and Codex for: breaking down a business problem, building a small piece, and checking it.</p>
            <p className="mx-text">The downloads here package those working habits into instructions, scripts, and project setups you can adapt. They're tools to help you do the work, not a promise that AI will run a business for you.</p>
            <div className="mx-actions">
              <a className="mx-btn mx-btn--lg" href="/store">See what I've packaged <ArrowRight className="mx-i" aria-hidden="true" /></a>
            </div>
          </div>
        </div>

        <figure className="mx-about-route">
          <ol className="mx-about-stops">{route.map((stop, index) => <li key={stop.label}>
            <span className={`mx-tile ${stop.tone}`} aria-hidden="true"><stop.Icon className="mx-i" /></span>
            <span className="mx-about-stop"><span className="mx-count">{String(index + 1).padStart(2, "0")}</span><span className="mx-about-stop-name">{stop.label}</span></span>
          </li>)}</ol>
          <figcaption className="mx-preview-cap">I started with a store. Then I started building.</figcaption>
        </figure>
      </div>
    </section>

    <section className="mx-section" aria-labelledby="about-pace-title">
      <div className="mx-container mx-panel">
        <div className="mx-panel-head"><span className="mx-count">02 / 02</span><span className="mx-desc">Self-paced. Your own projects.</span></div>

        <div className="mx-about-pace">
          <div className="mx-about-pace-copy">
            <h2 className="mx-display mx-display--md" id="about-pace-title">Build at your <br />own pace.</h2>
            <p className="mx-text">I started sharing my work through a 60-day streaming challenge. Life didn't follow the schedule. The work, and the useful things that came out of it, still matter.</p>
            <p className="mx-text">This site is the home for those tools. You don't need to stream, build in public, or follow my schedule to use them.</p>
          </div>

          <ul className="mx-about-links">{elsewhere.map(({ name, meta, href, Icon, Go }) => <li key={href}>
            <a href={href}>
              <span className="mx-tile mx-tile--sm" aria-hidden="true"><Icon className="mx-i" aria-hidden="true" /></span>
              <span className="mx-about-link-name">{name}</span>
              <span className="mx-about-link-meta">{meta}</span>
              <Go className="mx-i mx-about-link-go" aria-hidden="true" />
            </a>
          </li>)}</ul>
        </div>
      </div>
    </section>

    <SamplerBand />
  </main>;
}
