import React, { useEffect, useState } from "react";
import { ArrowRight, Check, FileText, Search, X } from "lucide-react";
import { storefrontOffers } from "../../data/storefront.js";
import { catalogViews, featuredToolKeys, getCatalogView, packagePrice, storefrontShelf, toolCategories } from "../../data/storefrontCatalog.js";
import { FreePack, OfferCard } from "./StorefrontParts.jsx";
import { InboxCleanupFreeCard } from "../../pages/InboxCleanupPage.jsx";

export function ProductPreview({ file, compact = false }) {
  const preview = file.preview;
  return <figure className={`sf-tool-preview ${compact ? "sf-tool-preview-compact" : ""}`}>
    <figcaption><FileText size={16} />{preview ? preview.label : "Files included in the download"}</figcaption>
    {preview ? <><strong>{preview.title}</strong><blockquote>{preview.excerpt}</blockquote>{!compact && <><p>{preview.explanation}</p><small>From {preview.source}</small></>}</> : <ul>{file.files.map((path) => <li key={path}><FileText size={15} /><span>{path.split("/").pop()}</span></li>)}</ul>}
  </figure>;
}

export function ToolCard({ file }) {
  return <article className={`sf-tool-card sf-${file.offer?.color || "neutral"}`} data-catalog-item={file.key}>
    <ProductPreview file={file} compact />
    <div className="sf-tool-card-body"><span className="sf-access-label">Included in a paid package</span><span className="sf-product-brand">{file.brand}</span><h3><a href={`/store/${file.key}`}>{file.name}</a></h3><p>{file.description}</p>
      <ul className="sf-card-includes">{file.includes.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
      <span className="sf-format">{file.format}</span><p className="sf-tool-requirement">{file.requirement}</p>
      <div className="sf-tool-package"><span>{file.offer?.name || "Operator Arsenal"}</span><strong>{packagePrice(file.offer)}</strong><small>Not sold separately</small></div>
      <a className="sf-text-link" href={`/store/${file.key}`}>View details <ArrowRight size={18} /></a>
    </div>
  </article>;
}

export function PackageCollection() {
  return <section className="sf-packages" aria-label="Available packages"><div className="sf-section-heading"><div><h2>Choose how much setup you need.</h2><p>The bundle includes the starter. The Toolkit includes both. You do not need to buy each tier separately.</p></div></div><div className="sf-offer-grid">{storefrontOffers.map((offer) => <OfferCard key={offer.slug} offer={offer} />)}</div><p className="sf-package-footnote">Downloads and written guides, not a hosted AI service. Bring your own AI accounts; subscriptions and usage are separate. <a href="/store?view=all#files">Browse all included tools</a>.</p></section>;
}

export function StoreCatalog({ featured = false }) {
  const [view, setView] = useState(() => getCatalogView(window.location.search));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All tasks");
  useEffect(() => {
    const restore = () => { setView(getCatalogView(window.location.search)); setQuery(""); setCategory("All tasks"); };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  function changeView(next) {
    setView(next); setQuery(""); setCategory("All tasks");
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
  const search = query.trim().toLowerCase();
  const items = featured ? featuredToolKeys.map((key) => storefrontShelf.find((file) => file.key === key)) : storefrontShelf;
  const matches = items.filter((file) => (category === "All tasks" || file.category === category) && `${file.name} ${file.brand} ${file.description} ${file.includes.join(" ")}`.toLowerCase().includes(search));
  const showFree = view === "free" || (view === "all" && category === "All tasks" && !search);
  const showFiles = view === "all";
  return <section className="sf-browse sf-container" id="browse" aria-label="Browse tools and packages">
    {featured && <div className="sf-section-heading"><div><h2>What would help your next project?</h2><p>Start with a free habit, or explore a tool for a job you repeat.</p></div></div>}
    <div className="sf-browse-tabs" role="group" aria-label="Browse by access">{catalogViews.map((item) => <button type="button" key={item.key} aria-pressed={view === item.key} onClick={() => changeView(item.key)}>{item.label}</button>)}</div>
    {view === "free" && <p className="sf-result-count" role="status">2 free downloads. Choose the one you need.</p>}
    {view === "paid" && <><p className="sf-result-count" role="status">3 featured packages</p><PackageCollection /></>}
    {showFree && <><FreePack /><InboxCleanupFreeCard /></>}
    {showFiles && <section className="sf-tools-shelf" id="files" aria-labelledby="tools-title">
      <div className="sf-section-heading"><div><h2 id="tools-title">{featured ? "A few tools from the paid packages." : "Tools inside the paid packages."}</h2><p>Each tool comes with the package shown. These are not separate purchases.</p></div>{!featured && <label className="sf-search"><Search size={18} /><input type="search" aria-label="Search tools" placeholder="Search tools or tasks..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear search" title="Clear search" onClick={() => setQuery("")}><X size={17} /></button>}</label>}</div>
      {!featured && <div className="sf-filters" role="group" aria-label="Filter tools">{toolCategories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>}
      <p className="sf-result-count" role="status">{featured ? `${matches.length} examples from ${storefrontShelf.length} paid tools` : `${matches.length} paid ${matches.length === 1 ? "tool" : "tools"}${showFree ? " + 2 free downloads above" : ""}`}</p>
      <div className="sf-tool-grid">{matches.map((file) => <ToolCard key={file.key} file={file} />)}</div>
      {!matches.length && <div className="sf-empty"><h3>No matching tools.</h3><p>Try a different name or reset your filters.</p><button type="button" className="sf-button sf-button-dark" onClick={() => { setQuery(""); setCategory("All tasks"); }}>Reset filters</button></div>}
      {featured && <a className="sf-button sf-all-tools" href="/store#files">Browse all {storefrontShelf.length} paid tools <ArrowRight size={18} /></a>}
    </section>}
    {view === "all" && !query && category === "All tasks" && <PackageCollection />}
  </section>;
}
