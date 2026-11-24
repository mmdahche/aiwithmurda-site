import React from "react";
import { ArrowRight } from "lucide-react";
import { PanelHead } from "../components/site/Panel.jsx";
import { tools } from "../data/tools.js";

/*
  /tools: every tool on the site, from src/data/tools.js. Each card is one link to the tool's own page.
  One tool today: home.css lays a lone card out wide, so it reads as a feature, not an empty grid.
*/
export function ToolsPage() {
  return <main className="mx mx-page mx-toolspage" id="main-content">
    <section className="mx-hero" aria-labelledby="tools-title">
      <div className="mx-container mx-panel">
        <PanelHead n={1} total={1}><span className="mx-desc-pre">Tools / </span>All tools</PanelHead>
        <div className="mx-toolspage-head">
          <h1 className="mx-display mx-display--lg" id="tools-title">Tools</h1>
          <p className="mx-lede">Digital tools and setup kits. Each one has its own page with what's inside, the price and the questions.</p>
        </div>
        <ul className="mx-toolgrid">{tools.map((tool) => <li key={tool.slug}>
          <a className="mx-toolcard" href={tool.href} aria-labelledby={`tool-${tool.slug}-name tool-${tool.slug}-price tool-${tool.slug}-go`} aria-describedby={`tool-${tool.slug}-summary`}>
            <span className="mx-toolcard-media"><img src={tool.image} alt="" width="1600" height="900" /></span>
            <div className="mx-toolcard-body">
              <span className="mx-toolcard-meta">{tool.audience}</span>
              <h2 className="mx-toolcard-name" id={`tool-${tool.slug}-name`}>{tool.name}</h2>
              <span className="mx-toolcard-summary" id={`tool-${tool.slug}-summary`}>{tool.summary}</span>
              <span className="mx-price-row">
                <span className="mx-ticker mx-ticker--price mx-ticker--price-sm" id={`tool-${tool.slug}-price`}><span className="mx-ticker-tag">{tool.billing || tool.price}</span><span className="mx-ticker-bar">{tool.billing ? tool.price : tool.priceDetail}</span></span>
              </span>
              <span className="mx-link mx-toolcard-go" id={`tool-${tool.slug}-go`}>{tool.cta} <ArrowRight className="mx-i" aria-hidden="true" /></span>
            </div>
          </a>
        </li>)}</ul>
      </div>
    </section>
  </main>;
}
