import React from "react";
import { SamplerBand } from "../components/storefront/StorefrontParts.jsx";
import { StoreCatalog } from "../components/storefront/StoreCatalog.jsx";

export function StorefrontShop() {
  return <main className="sf-page" id="main-content">
    <header className="sf-container sf-page-heading sf-shop-heading"><span className="sf-product-brand">The AI with Murda shop</span><h1>Useful files.<br />A clearer way to build.</h1><p>Start free. Find a tool for a real task. Get the package when you need more.</p></header>
    <StoreCatalog /><SamplerBand />
  </main>;
}
