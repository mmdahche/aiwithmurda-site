import React from "react";
import { storefrontOffers } from "../data/storefront.js";
import { storefrontShelf } from "../data/storefrontCatalog.js";
import { PanelHead, SamplerBand, pad2 } from "../components/storefront/StorefrontParts.jsx";
import { StoreCatalog, useCatalogPanelTotal } from "../components/storefront/StoreCatalog.jsx";

export function StorefrontShop() {
  const total = useCatalogPanelTotal(false);
  return <main className="mx mx-page mx-shop" id="main-content">
    <header className="mx-shop-head">
      <div className="mx-container mx-panel">
        <PanelHead n={1} total={total}>The AI with Murda shop</PanelHead>
        <div className="mx-section-head">
          <h1 className="mx-display mx-display--lg">Useful files. <br />A clearer way <br className="mx-br-sm" />to build.</h1>
          <div className="mx-section-side">
            <p className="mx-lede">Start free. Find a tool for a real task. Get the package when you need more.</p>
            <ul className="mx-tally" aria-label="On the shelf">
              <li><b>03</b><span>free downloads</span></li>
              <li><b>{pad2(storefrontShelf.length)}</b><span>paid tools</span></li>
              <li><b>{pad2(storefrontOffers.length)}</b><span>packages</span></li>
            </ul>
          </div>
        </div>
      </div>
    </header>
    <StoreCatalog />
    <SamplerBand />
  </main>;
}
