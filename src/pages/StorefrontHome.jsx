import React from "react";
import { ArrowRight, ArrowUpRight, Boxes, CreditCard, Folder, FolderDown, ListChecks, Store, Tag, Terminal, Wrench } from "lucide-react";
import { PanelHead, pad2 } from "../components/site/Panel.jsx";
import { featuredTool, tools } from "../data/tools.js";

/*
  Home page in the live look (the storefront of Nov 2026), with the old products taken off.
  Three panels: the hero with the shelf of tools, the featured tool, and the person behind the files.
  The tools come from src/data/tools.js; the first one is featured.
*/

// The shelf tile for each tool. A tool without its own icon gets the wrench.
export const toolIcons = { musekit: Tag };
export const ToolIcon = ({ slug, ...props }) => {
  const Icon = toolIcons[slug] || Wrench;
  return <Icon {...props} />;
};

const storyRoute = [
  { label: "A store", Icon: Store, tone: "" },
  { label: "Inventory", Icon: Boxes, tone: "" },
  { label: "Point of sale", Icon: CreditCard, tone: "" },
  { label: "These files", Icon: FolderDown, tone: "mx-tile--blue" },
];

const total = 3;

export function StorefrontHome() {
  return <main className="mx mx-page mx-home" id="main-content">
    <section className="mx-hero" aria-labelledby="hero-title">
      <div className="mx-container mx-panel">
        <PanelHead n={1} total={total}><span className="mx-desc-pre">Storefront / </span>Tools</PanelHead>

        <div className="mx-hero-grid">
          <div className="mx-hero-copy">
            <p className="mx-chip"><span className="mx-chip-dot" aria-hidden="true" />Practical AI tools</p>
            <h1 className="mx-display mx-display--xl" id="hero-title">Download it. <br />Make it yours.</h1>
            <p className="mx-lede">Practical AI tools and setup kits, from a business owner who builds with AI.</p>
            <div className="mx-actions">
              <a className="mx-btn mx-btn--lg" href={featuredTool.href}>See the {featuredTool.shortName} <ArrowRight className="mx-i" aria-hidden="true" /></a>
              <a className="mx-btn mx-btn--lg mx-btn--ghost" href="/tools">All tools</a>
            </div>
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
          <div className="mx-shelf-groups mx-shelf-groups--one">
            <div className="mx-cream mx-shelf-group">
              <div className="mx-shelf-grouphead">
                <p className="mx-ticker"><span className="mx-ticker-tag">Tools</span><span className="mx-ticker-bar">{pad2(tools.length)} {tools.length === 1 ? "tool" : "tools"}</span></p>
                <p className="mx-shelf-note">Start with the {featuredTool.shortName}.</p>
              </div>
              <ul className="mx-shelf-items">{tools.map((tool) => <li key={tool.slug}>
                <a className="mx-shelf-item" href={tool.href}>
                  <span className="mx-tile"><ToolIcon slug={tool.slug} className="mx-i" aria-hidden="true" /></span>
                  <span className="mx-shelf-name">{tool.name}</span>
                  <span className="mx-shelf-meta">{tool.audience}</span>
                  <span className="mx-shelf-price">{tool.billing ? `${tool.price} ${tool.billing.toLowerCase()}` : tool.price}</span>
                  <ArrowRight className="mx-i mx-shelf-go" aria-hidden="true" />
                </a>
              </li>)}</ul>
            </div>
          </div>
          <p className="mx-preview-cap mx-shelf-cap">Digital downloads you set up yourself. Not a hosted AI service.</p>
        </nav>
      </div>
    </section>

    <section className="mx-section" id="featured" aria-labelledby="featured-title">
      <div className="mx-container mx-panel">
        <PanelHead n={2} total={total}>Featured tool</PanelHead>
        <div className="mx-feature">
          <figure className="mx-feature-media">
            <img src={featuredTool.image} alt={featuredTool.imageAlt} width="1600" height="900" loading="lazy" />
          </figure>
          <div className="mx-feature-copy">
            <p className="mx-chip"><span className="mx-chip-dot" aria-hidden="true" />{featuredTool.audience}</p>
            <h2 className="mx-display mx-display--md" id="featured-title">{featuredTool.name}</h2>
            <p className="mx-text">{featuredTool.summary}</p>
            <p className="mx-price-row">
              <span className={`mx-ticker mx-ticker--price${featuredTool.billing ? "" : " mx-ticker--price-sm"}`}><span className="mx-ticker-tag">{featuredTool.billing || featuredTool.price}</span><span className="mx-ticker-bar">{featuredTool.billing ? featuredTool.price : featuredTool.priceDetail}</span></span>
            </p>
            <div className="mx-actions">
              <a className="mx-btn mx-btn--lg" href={featuredTool.href}>{featuredTool.cta} <ArrowRight className="mx-i" aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-section" id="murad" aria-labelledby="story-title">
      <div className="mx-container mx-panel">
        <PanelHead n={3} total={total}>The person behind the files</PanelHead>
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
  </main>;
}
