import React, { useEffect, useSyncExternalStore } from "react";
import { ArrowRight, Check, File, FileArchive, FileText, List, MousePointerClick, Save, Search, Terminal, X } from "lucide-react";
import { storefrontOffers } from "../../data/storefront.js";
import { catalogViews, featuredToolKeys, getCatalogView, packagePrice, storefrontShelf, toolCategories } from "../../data/storefrontCatalog.js";
import { FreePack, OfferCard, PanelHead, PriceTicker, pad2, packageTiers } from "./StorefrontParts.jsx";
import { CheckItFirstFreeCard, InboxCleanupFreeCard } from "./FreeCards.jsx";

/* Catalogue state ------------------------------------------------------------
   One small store shared by the browse control, the catalogue panels and the
   pages that number their panels around them. The view lives in ?view= and in
   browser history, as before; search and category are in-memory only. */

const ALL_TASKS = toolCategories[0];
const listeners = new Set();
let catalog = { view: getCatalogView(window.location.search), query: "", category: ALL_TASKS };

function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function update(patch) { catalog = { ...catalog, ...patch }; listeners.forEach((listener) => listener()); }

export function useCatalog() { return useSyncExternalStore(subscribe, () => catalog); }

export function showCatalogView(next) {
  update({ view: next, query: "", category: ALL_TASKS });
  const url = new URL(window.location.href);
  if (next === "all") url.searchParams.delete("view");
  else url.searchParams.set("view", next);
  window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

// Which catalogue panels are on screen, and how the page's panels are numbered around them.
function layoutFor({ view, query, category }, featured) {
  const filtered = Boolean(query.trim()) || category !== ALL_TASKS;
  const panels = [];
  if (view === "free" || (view === "all" && !filtered)) panels.push("free");
  if (view === "all") panels.push("files");
  if (view === "paid" || (view === "all" && !filtered)) panels.push("packages");
  const before = 1; // the hero (home) or the page heading (shop)
  const after = featured ? 2 : 0; // the story and the FAQ follow on the home page
  const total = before + panels.length + after;
  const count = (key) => `${pad2(before + panels.indexOf(key) + 1)} / ${pad2(total)}`;
  return { panels, total, count, shows: (key) => panels.includes(key) };
}

// For the pages: the total number of numbered panels in the current view.
export function useCatalogPanelTotal(featured = false) {
  return layoutFor(useCatalog(), featured).total;
}

/* Previews -------------------------------------------------------------------
   Every preview shows what the data module holds: a real excerpt with its
   label and source file, or the three real file paths. The small flows are
   decoration around those words, never a replacement for them. */

const previewFlows = {
  "skill-authoring-kit": [{ label: "Draft", Icon: FileText, tone: "mx-tile--on" }, { label: "You approve", Icon: Check, tone: "mx-tile--blue" }, { label: "Changelog", Icon: File, tone: "mx-tile--ghost" }],
  "verification-qa-pack": [{ label: "Click", Icon: MousePointerClick, tone: "mx-tile--on" }, { label: "Save", Icon: Save, tone: "mx-tile--blue" }, { label: "List", Icon: List, tone: "mx-tile--ghost" }],
  "memory-os": [{ label: "Session", Icon: Terminal, tone: "" }, { label: "/handoff", Icon: FileText, tone: "mx-tile--blue" }, { label: "Next session", Icon: Terminal, tone: "mx-tile--on" }],
};

// The one phrase each excerpt may carry in the blue highlight box.
const previewMarks = {
  "skill-authoring-kit": "until the user approves",
  "verification-qa-pack": "save write lands unseen",
  "memory-os": "`/handoff`",
};

function withMark(text, phrase, key) {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (at < 0) return <span key={key}>{text}</span>;
  return <span key={key}>{text.slice(0, at)}<mark className="mx-mark">{phrase}</mark>{text.slice(at + phrase.length)}</span>;
}

// "Expected: ..." / "Actual: ..." lines become labelled rows; anything else stays one quoted line.
function Excerpt({ text, mark }) {
  return <blockquote className="mx-excerpt">{text.split("\n").map((line, index) => {
    const labelled = line.match(/^\s*([A-Z][a-z]+):\s+(.+)$/);
    return labelled ? <React.Fragment key={index}><b>{labelled[1]}</b>{withMark(labelled[2], mark, "text")}</React.Fragment> : withMark(line.trim(), mark, index);
  })}</blockquote>;
}

export function ProductPreview({ file, compact = false, flow = !compact }) {
  const preview = file.preview;
  const steps = flow ? previewFlows[file.key] : null;
  return <figure className={`mx-preview mx-preview--file${compact ? " mx-preview--compact" : ""}`}>
    <figcaption className="mx-preview-label"><FileText className="mx-i" aria-hidden="true" />{preview ? preview.label : "Files included in the download"}</figcaption>
    {preview ? <>
      <strong className="mx-preview-title">{preview.title}</strong>
      {steps && <div className="mx-flow mx-flow--sm" aria-hidden="true">{steps.map((step, index) => <React.Fragment key={step.label}>
        {index > 0 && <span className="mx-join mx-join--arrow"><ArrowRight className="mx-i" /></span>}
        <div className="mx-node"><span className={`mx-tile mx-tile--sm ${step.tone}`}><step.Icon className="mx-i" /></span><span className="mx-tile-label">{step.label}</span></div>
      </React.Fragment>)}</div>}
      <Excerpt text={preview.excerpt} mark={previewMarks[file.key]} />
      {!compact && <p className="mx-preview-text">{preview.explanation}</p>}
      <small className="mx-preview-source">From {preview.source}</small>
    </> : <ul className="mx-tree">
      <li className="mx-tree-root"><FileArchive className="mx-i" aria-hidden="true" /><span>{file.key}.zip</span></li>
      {file.files.map((path) => {
        const cut = path.lastIndexOf("/") + 1;
        return <li key={path}><FileText className="mx-i" aria-hidden="true" /><span><i>{path.slice(0, cut)}</i>{path.slice(cut)}</span></li>;
      })}
    </ul>}
    {!preview && compact && <p className="mx-preview-cap">Also in the ZIP: Start Here, install guide, file index, license and verification steps.</p>}
  </figure>;
}

/* Paid tool card: navy body for the excerpt, cream box for the package it comes with. */

export function ToolCard({ file, flow = false }) {
  const titleId = `tool-${file.key}`;
  const position = storefrontShelf.findIndex((item) => item.key === file.key) + 1;
  return <article className="mx-card mx-tool sf-tool-card" data-catalog-item={file.key} aria-labelledby={titleId}>
    <div className="mx-tool-top">
      <p className="mx-ticker mx-ticker--paid"><span className="mx-ticker-tag">Paid</span><span className="mx-ticker-bar">In a package</span></p>
      <span className="mx-count">{pad2(position)} / {pad2(storefrontShelf.length)}</span>
    </div>
    <div className="mx-tool-head">
      <p className="mx-eyebrow">{file.brand}</p>
      <h3 id={titleId}><a href={`/store/${file.key}`}>{file.name}</a></h3>
      <p className="mx-text">{file.description}</p>
    </div>
    <ProductPreview file={file} compact flow={flow} />
    <ul className="mx-includes">{file.includes.map((item) => <li key={item}><Check className="mx-i" aria-hidden="true" />{item}</li>)}</ul>
    <dl className="mx-specs">
      <div><dt>Format</dt><dd>{file.format}</dd></div>
      <div><dt>Needs</dt><dd>{file.requirement}</dd></div>
    </dl>
    <div className="mx-cream mx-comes">
      <p className="mx-eyebrow">Comes with</p>
      <strong>{file.offer?.name || "Operator Arsenal"}</strong>
      <PriceTicker offer={file.offer} small />
      <p className="mx-tool-terms">{packagePrice(file.offer)}. Not sold separately.</p>
      <a className="mx-link" href={`/store/${file.key}`}>View details <ArrowRight className="mx-i" aria-hidden="true" /></a>
    </div>
  </article>;
}

/* The three packages. `count` is the panel counter; `status` announces the paid view. */

export function PackageCollection({ count, status = false }) {
  return <section className="mx-section" id="packages" aria-label="Available packages">
    <div className="mx-container mx-panel">
      <PanelHead label={count || "Packages"}>Paid packages / {storefrontOffers.length} tiers</PanelHead>
      <div className="mx-section-head">
        <h2 className="mx-display mx-display--lg">Choose how much <br />setup you need.</h2>
        <div className="mx-section-side">
          <p className="mx-lede">The bundle includes the starter. The Toolkit includes both. You do not need to buy each tier separately.</p>
          {status && <p className="mx-meta" role="status">3 featured packages</p>}
        </div>
      </div>
      <nav className="mx-path" aria-label="Jump to a package">
        <ol className="mx-path-row">{storefrontOffers.map((offer, index) => <li key={offer.slug}>
          <a className="mx-path-item" href={`#pkg-${offer.slug}`}>
            <span className="mx-tile mx-tile--price">{offer.dueToday ? `$${offer.dueToday}` : offer.price}</span>
            <span className="mx-shelf-name">{packageTiers[index]?.short}</span>
            <span className="mx-shelf-meta">{offer.dueToday ? "Today, then $30/month" : "One time"}</span>
          </a>
        </li>)}</ol>
        <p className="mx-preview-cap">Each tier includes the one before it.</p>
      </nav>
      <div className="mx-pkgs sf-offer-grid">{storefrontOffers.map((offer) => <OfferCard key={offer.slug} offer={offer} />)}</div>
      <p className="mx-pkg-foot">Downloads and written guides, not a hosted AI service. Bring your own AI accounts; subscriptions and usage are separate. <a href="/store?view=all#files">Browse all included tools</a>.</p>
    </div>
  </section>;
}

/* The catalogue: browse control, free downloads, tool shelf, packages. */

export function StoreCatalog({ featured = false }) {
  const state = useCatalog();
  const { view, query, category } = state;
  const layout = layoutFor(state, featured);

  useEffect(() => {
    // Back and forward between views restore that view. In-page links (the skip link, #files, #pkg-...) fire
    // popstate too: the view in the URL is unchanged then, so an active search or category is left alone.
    const restore = () => {
      const next = getCatalogView(window.location.search);
      if (next !== catalog.view) update({ view: next, query: "", category: ALL_TASKS });
    };
    window.addEventListener("popstate", restore);
    // The page renders after the browser has looked for the anchor, so settle links such as /store#files here.
    // A fragment that is not valid percent-encoding (#100%) names no anchor: skip the scroll instead of throwing.
    let anchor = "";
    try { anchor = decodeURIComponent(window.location.hash.slice(1)); } catch { anchor = ""; }
    const target = anchor ? document.getElementById(anchor) : null;
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
    return () => window.removeEventListener("popstate", restore);
  }, []);

  const search = query.trim().toLowerCase();
  const items = featured ? featuredToolKeys.map((key) => storefrontShelf.find((file) => file.key === key)) : storefrontShelf;
  const matches = items.filter((file) => (category === ALL_TASKS || file.category === category) && `${file.name} ${file.brand} ${file.description} ${file.includes.join(" ")}`.toLowerCase().includes(search));
  const showFree = layout.shows("free");
  const reset = () => update({ query: "", category: ALL_TASKS });

  return <section className="mx-catalog" id="browse" aria-label="Browse tools and packages">
    <div className="mx-container mx-browse">
      <div className="mx-seg" role="group" aria-label="Browse by access">
        {catalogViews.map((item) => <button type="button" key={item.key} aria-pressed={view === item.key} onClick={() => showCatalogView(item.key)}>{item.label}</button>)}
      </div>
      <p className="mx-browse-note">Start with a free habit, or explore a tool for a job you repeat.</p>
    </div>

    {showFree && <section className="mx-section" id="free" aria-labelledby="free-title">
      <div className="mx-container mx-panel">
        <PanelHead label={layout.count("free")}>Free downloads / $0</PanelHead>
        <div className="mx-section-head">
          <h2 className="mx-display mx-display--lg" id="free-title">Try it free. <br />No sign-up.</h2>
          <div className="mx-section-side">
            <p className="mx-lede" role={view === "free" ? "status" : undefined}>3 free downloads. Start with Check It First, then choose a tool.</p>
            <p className="mx-meta">$0. No account or email needed.</p>
          </div>
        </div>
        <div className="mx-freecards"><CheckItFirstFreeCard /><FreePack /><InboxCleanupFreeCard /></div>
      </div>
    </section>}

    {layout.shows("files") && <section className="mx-section" id="files" aria-labelledby="tools-title">
      <div className="mx-container mx-panel">
        <PanelHead label={layout.count("files")}>Inside the paid packages</PanelHead>
        <div className="mx-section-head">
          <h2 className="mx-display mx-display--lg" id="tools-title">{featured ? <>Look inside <br />before you buy.</> : <>Tools inside <br className="mx-br-lg" />the <br className="mx-br-sm" />paid packages.</>}</h2>
          <div className="mx-section-side">
            <p className="mx-lede">{featured && "A few tools from the paid packages. "}Each tool comes with the package shown. These are not separate purchases.</p>
            {featured && <p className="mx-meta" role="status">{matches.length} examples from {storefrontShelf.length} paid tools</p>}
          </div>
        </div>
        {!featured && <div className="mx-toolbar">
          <label className="mx-search">
            <Search className="mx-i" aria-hidden="true" />
            <input type="search" aria-label="Search tools" placeholder="Search tools or tasks..." value={query} onChange={(event) => update({ query: event.target.value })} />
            {query && <button type="button" aria-label="Clear search" title="Clear search" onClick={() => update({ query: "" })}><X className="mx-i" aria-hidden="true" /></button>}
          </label>
          <div className="mx-filters" role="group" aria-label="Filter tools">
            {toolCategories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => update({ category: item })}>
              {item}<span className="mx-filter-n" aria-hidden="true">{pad2(item === ALL_TASKS ? storefrontShelf.length : storefrontShelf.filter((file) => file.category === item).length)}</span>
            </button>)}
          </div>
          <p className="mx-result" role="status">{`${matches.length} paid ${matches.length === 1 ? "tool" : "tools"}${showFree ? " + 3 free downloads above" : ""}`}</p>
        </div>}
        {matches.length > 0 && <div className={`mx-tools sf-tool-grid${featured ? "" : " mx-tools--shelf"}`}>{matches.map((file) => <ToolCard key={file.key} file={file} flow={featured} />)}</div>}
        {!matches.length && <div className="mx-empty">
          <h3>No matching tools.</h3>
          <p>Try a different name or reset your filters.</p>
          <button type="button" className="mx-btn mx-btn--ghost" onClick={reset}>Reset filters</button>
        </div>}
        {featured && <div className="mx-tools-more">
          <a className="mx-btn mx-btn--ghost" href="/store#files">Browse all {storefrontShelf.length} paid tools <ArrowRight className="mx-i" aria-hidden="true" /></a>
          <p className="mx-meta">Search by task, see the files, check what each one needs.</p>
        </div>}
      </div>
    </section>}

    {layout.shows("packages") && <PackageCollection count={layout.count("packages")} status={view === "paid"} />}
  </section>;
}
