import React from "react";
import { ArrowLeft, ArrowRight, Check, Download, FileArchive, FileText, Folder, Info, Play, Plus, ScrollText, ShieldAlert, Wrench } from "lucide-react";
import { getStorefrontOffer, storefrontOffers } from "../data/storefront.js";
import { packagePrice, storefrontShelf } from "../data/storefrontCatalog.js";
import { SamplerBand, StoreFaq } from "../components/storefront/StorefrontParts.jsx";
import { ProductPreview } from "../components/storefront/StoreCatalog.jsx";
import { PurchaseAction } from "../components/storefront/PurchaseAction.jsx";

/*
  Product and package detail pages: /store/<slug>, /kit, /live-builds and
  /operator-toolkit.

  Hooks the Playwright suites pin, keep them as written: the h1 text (shelf
  name or the offer's short name), the "Review the package" link, the
  headings "Your first useful step." and "Before you buy.", the single
  `.sf-billing-note`, one element whose whole text is the offer's billing
  line, and one <li> per download inside `.sf-contents-list`.
*/

const tierLabels = { "future-proof-method": "Starter", "operator-bundle": "Bundle", "operator-toolkit": "Toolkit" };
const tierNotes = { "future-proof-method": "The starter.", "operator-bundle": "Includes the starter.", "operator-toolkit": "Includes both lower tiers." };

// Every tool ZIP is built from the same folder skeleton (scripts/verify-product-folder.mjs).
const zipRows = [
  { name: "00-START-HERE.md", label: "Start Here" },
  { name: "install/", label: "Installation guidance", folder: true },
  { name: "INDEX.md", label: "File index" },
  { name: "LICENSE", label: "License" },
  { name: "VERIFY.md", label: "Verification steps" },
  { name: "payload/", label: "The tool itself", folder: true },
];

const pad = (value) => String(value).padStart(2, "0");

function PanelHead({ index, total, pre, label }) {
  return <div className="mx-panel-head"><span className="mx-count">{pad(index)} / {pad(total)}</span><span className="mx-desc">{pre && <span className="mx-desc-pre">{pre} / </span>}{label}</span></div>;
}

function Block({ index, total, label, title, titleId, children }) {
  return <section className="mx-panel mx-pd-block" aria-labelledby={titleId}>
    <PanelHead index={index} total={total} label={label} />
    <h2 className="mx-display mx-pd-h" id={titleId}>{title}</h2>
    {children}
  </section>;
}

function PriceTicker({ offer }) {
  const today = offer ? offer.dueToday : 497;
  return <p className="mx-buybox-price">
    <span className="mx-ticker mx-ticker--price"><span className="mx-ticker-tag">{today ? "Today" : "One time"}</span> <span className="mx-ticker-bar">{today ? `$${today}` : offer.price}</span></span>
    {" "}<span className="mx-cadence">{today ? "Then $30/month" : "No monthly charge"}</span>
  </p>;
}

function TierPath({ offer }) {
  const position = storefrontOffers.findIndex((item) => item.slug === offer.slug);
  return <nav className="mx-tiers" aria-label="The three paid packages">
    <div className="mx-mock-head"><span>{offer.category}</span><span>{position + 1} / {storefrontOffers.length}</span></div>
    <ol className="mx-tiers-row">{storefrontOffers.map((item, index) => <li key={item.slug}>
      <a className="mx-tiers-item" href={`/store/${item.slug}`} aria-current={index === position ? "page" : undefined}>
        <span className={`mx-tile${index === position ? " mx-tile--blue" : index < position ? " mx-tile--on" : ""}`}>{item.dueToday ? `$${item.dueToday}` : item.price}</span>
        <span className="mx-tiers-name">{tierLabels[item.slug]}</span>
        <span className="mx-tiers-meta">{item.dueToday ? "Today, then $30/month" : "One time"}</span>
      </a>
    </li>)}</ol>
    <p className="mx-preview-cap">{tierNotes[offer.slug]} Each tier includes the one before it.</p>
  </nav>;
}

function NotOnShelf() {
  return <main className="mx mx-page mx-pd mx-pd--missing" id="main-content">
    <section className="mx-pd-top" aria-labelledby="pd-title">
      <div className="mx-container mx-panel">
        <PanelHead index={1} total={1} pre="Store" label="Not on the shelf" />
        <div className="mx-pd-missing">
          <div className="mx-pd-intro">
            <h1 className="mx-display mx-display--lg" id="pd-title">That tool isn't on the shelf.</h1>
            <p className="mx-lede">The shop lists every tool, package and free download that is available right now.</p>
            <a className="mx-btn mx-btn--lg sf-button" href="/store">Browse the shop <ArrowRight className="mx-i" aria-hidden="true" /></a>
          </div>
          <nav className="mx-card mx-pd-ways" aria-label="What is on the shelf">
            <div className="mx-mock-head"><span>On the shelf</span><span>Right now</span></div>
            <ul>
              <li><a href="/store?view=free"><span className="mx-tile mx-tile--sm mx-tile--white"><Download className="mx-i" aria-hidden="true" /></span><span className="mx-pd-way-name">Free downloads</span><span className="mx-pd-way-meta">3 downloads, $0</span><ArrowRight className="mx-i mx-pd-way-go" aria-hidden="true" /></a></li>
              <li><a href="/store#files"><span className="mx-tile mx-tile--sm"><FileText className="mx-i" aria-hidden="true" /></span><span className="mx-pd-way-name">Paid tools</span><span className="mx-pd-way-meta">{storefrontShelf.length} tools, inside the packages</span><ArrowRight className="mx-i mx-pd-way-go" aria-hidden="true" /></a></li>
              <li><a href="/store?view=paid"><span className="mx-tile mx-tile--sm"><FileArchive className="mx-i" aria-hidden="true" /></span><span className="mx-pd-way-name">Paid packages</span><span className="mx-pd-way-meta">{storefrontOffers.length} tiers, each includes the one before</span><ArrowRight className="mx-i mx-pd-way-go" aria-hidden="true" /></a></li>
            </ul>
          </nav>
        </div>
      </div>
    </section>
  </main>;
}

function ToolPage({ file }) {
  const offer = file.offer;
  const packageName = offer?.name || "Operator Arsenal";
  return <main className="mx mx-page mx-pd mx-pd--tool" id="main-content">
    <article className="mx-pd-top" aria-labelledby="pd-title">
      <div className="mx-container mx-panel">
        <PanelHead index={1} total={5} pre="Paid tool" label={file.category} />
        <div className="mx-pd-grid">
          <header className="mx-pd-intro">
            <a className="mx-link mx-pd-back" href="/store#files"><ArrowLeft className="mx-i" aria-hidden="true" /> All tools</a>
            <p className="mx-eyebrow">{file.brand}</p>
            <h1 className="mx-display mx-display--md" id="pd-title">{file.name}</h1>
            <p className="mx-lede">{file.description}</p>
            <ul className="mx-pd-facts">
              <li className="mx-chip"><FileText className="mx-i" aria-hidden="true" />{file.format}</li>
              <li className="mx-chip"><ScrollText className="mx-i" aria-hidden="true" />{file.license} license</li>
            </ul>
          </header>

          <div className="mx-pd-side">
            <aside className="mx-buybox mx-cream" aria-labelledby="buy-title">
              <div className="mx-buybox-head">
                <div className="mx-ticker-box"><p className="mx-ticker"><span className="mx-ticker-tag">Included in</span> <span className="mx-ticker-bar">a paid package</span></p></div>
                <h2 className="mx-buybox-name" id="buy-title">{packageName}</h2>
                <p className="mx-buybox-text">This folder is not sold individually. Get it with the package below.</p>
              </div>
              <div className="mx-buybox-cost">
                <PriceTicker offer={offer} />
                <p className="mx-buybox-billing">{packagePrice(offer)}</p>
                {offer?.dueToday && <p className="mx-buybox-text">$297 setup + first $30 update month. Updates renew until canceled.</p>}
                {!offer && <p className="mx-buybox-text">Includes the full Toolkit and all 17 paid tools. $467 setup + first $30 update month; renews until canceled.</p>}
              </div>
              <div className="mx-buybox-act">
                <a className="mx-btn mx-btn--lg mx-btn--block sf-button" href={offer ? `/store/${offer.slug}` : "/operator-arsenal"}>Review the package <ArrowRight className="mx-i" aria-hidden="true" /></a>
                <p className="mx-buybox-fine"><a href="mailto:murad@aiwithmurda.com">Ask about compatibility</a> before buying. <a href="/terms">Purchase terms</a>.</p>
              </div>
            </aside>
            <div className="mx-card mx-card--free mx-pd-free">
              <p className="mx-ticker"><span className="mx-ticker-tag">Free</span> <span className="mx-ticker-bar">Starter pack</span></p>
              <a className="mx-link" href="/start">Try the free sampler first <ArrowRight className="mx-i" aria-hidden="true" /></a>
            </div>
          </div>

          <div className="mx-pd-body">
            <Block index={2} total={5} label="In the ZIP" title="What you receive." titleId="pd-receive">
              <div className="mx-pd-split">
                <div className="mx-pd-receive">
                  <ul className="mx-includes mx-pd-includes">{file.includes.map((text) => <li key={text}><Check className="mx-i" aria-hidden="true" />{text}</li>)}</ul>
                  <p className="mx-pd-fine">Delivered in a ZIP with Start Here, installation guidance, a file index, license, and verification steps.</p>
                </div>
                <div className="mx-mock mx-zip">
                  <div className="mx-mock-head"><span>Delivered as</span><span>ZIP</span></div>
                  <ul>{zipRows.map((row) => <li key={row.name}>{row.folder ? <Folder className="mx-i" aria-hidden="true" /> : <FileText className="mx-i" aria-hidden="true" />}<span>{row.label}</span><code>{row.name}</code></li>)}</ul>
                </div>
              </div>
            </Block>

            <Block index={3} total={5} label={file.brand} title="A look inside." titleId="pd-inside">
              <div className="mx-pd-look"><ProductPreview file={file} /></div>
            </Block>

            <Block index={4} total={5} label="Start here" title="Your first useful step." titleId="pd-first">
              <div className="mx-card mx-pd-step">
                <span className="mx-tile mx-tile--blue" aria-hidden="true"><Play className="mx-i" /></span>
                <p>{file.firstAction}</p>
              </div>
            </Block>

            <Block index={5} total={5} label="Requirements" title="Before you buy." titleId="pd-before">
              <div className="mx-card mx-pd-step mx-pd-step--need">
                <span className="mx-tile" aria-hidden="true"><Wrench className="mx-i" /></span>
                <p>{file.requirement}</p>
              </div>
              <p className="mx-note mx-pd-note"><ShieldAlert className="mx-i" aria-hidden="true" /><span>Review the included license before reusing or redistributing files. Provider accounts and any paid API usage are separate.</span></p>
            </Block>
          </div>
        </div>
      </div>
    </article>
    <SamplerBand />
  </main>;
}

export function StorefrontProduct({ slug, authSession, authReady }) {
  const offer = getStorefrontOffer(slug);
  const file = storefrontShelf.find((item) => item.key === slug);
  if (!offer && !file) return <NotOnShelf />;
  if (!offer) return <ToolPage file={file} />;

  const canceled = new URLSearchParams(window.location.search).get("checkout") === "cancel";
  const example = storefrontShelf.find((item) => item.key === offer.previewKey);
  return <main className="mx mx-page mx-pd mx-pd--package" id="main-content">
    <article className="mx-pd-top" aria-labelledby="pd-title">
      <div className="mx-container mx-panel">
        <PanelHead index={1} total={7} pre="Paid package" label={offer.category} />
        <div className="mx-pd-grid">
          <header className="mx-pd-intro">
            <a className="mx-link mx-pd-back" href="/store?view=paid"><ArrowLeft className="mx-i" aria-hidden="true" /> All packages</a>
            <p className="mx-eyebrow">{offer.name}</p>
            <h1 className="mx-display mx-display--md" id="pd-title">{offer.shortName}</h1>
            <p className="mx-lede">{offer.description}</p>
            <p className="mx-text">{offer.audience}</p>
          </header>

          <div className="mx-pd-side">
            <aside className="mx-buybox mx-cream" aria-labelledby="buy-title">
              <div className="mx-buybox-head">
                <div className="mx-ticker-box"><p className="mx-ticker"><span className="mx-ticker-tag">Paid package</span> <span className="mx-ticker-bar">{offer.dueToday ? "Today + monthly" : "One-time"}</span></p></div>
                <h2 className="mx-buybox-name" id="buy-title">{offer.name}</h2>
                <p className="mx-meta">Digital download + member access</p>
              </div>
              <div className="mx-buybox-cost">
                <PriceTicker offer={offer} />
                <p className="mx-buybox-billing">{offer.billing}</p>
              </div>
              <div className="mx-buybox-act">
                {offer.dueToday
                  ? <p className="mx-buybox-note sf-billing-note"><b>${offer.dueToday} due today.</b> Includes the $297 setup and first $30 update month. Then $30/month until canceled. Keep your purchased edition when updates end.</p>
                  : <p className="mx-buybox-note sf-billing-note">Pay once. Access your purchased files in My Downloads. No monthly enrollment.</p>}
                {canceled && <p className="mx-buybox-status" role="status"><Info className="mx-i" aria-hidden="true" /><span>Checkout was canceled. You can try again when you're ready.</span></p>}
                <PurchaseAction offer={offer} authSession={authSession} authReady={authReady} />
                <p className="mx-buybox-fine">Secure checkout through Backbone Solutions on Stripe. <a href="/terms">Purchase terms</a></p>
              </div>
              <a className="mx-link mx-buybox-owned" href="/members">Already purchased? My Downloads <ArrowRight className="mx-i" aria-hidden="true" /></a>
            </aside>
          </div>

          <div className="mx-pd-body">
            <Block index={2} total={7} label="In the package" title="What you receive." titleId="pd-receive">
              <div className="mx-pd-split">
                <ul className="mx-includes mx-pd-includes">{offer.includes.map((item) => {
                  const inherited = item.startsWith("Everything in");
                  return <li key={item} className={inherited ? "mx-includes-plus" : undefined}>{inherited ? <Plus className="mx-i" aria-hidden="true" /> : <Check className="mx-i" aria-hidden="true" />}{item}</li>;
                })}</ul>
                <TierPath offer={offer} />
              </div>
            </Block>

            <Block index={3} total={7} label="Included tool" title={`A look inside: ${example.brand}.`} titleId="pd-inside">
              <div className="mx-pd-look">
                <ProductPreview file={example} />
                <a className="mx-link" href={`/store/${example.key}`}>Explore this included tool <ArrowRight className="mx-i" aria-hidden="true" /></a>
              </div>
            </Block>

            <Block index={4} total={7} label="Start here" title="Your first useful step." titleId="pd-first">
              <div className="mx-card mx-pd-step">
                <span className="mx-tile mx-tile--blue" aria-hidden="true"><Play className="mx-i" /></span>
                <p>{offer.firstAction}</p>
              </div>
            </Block>

            <Block index={5} total={7} label="Requirements" title="Before you buy." titleId="pd-before">
              <ul className="mx-card mx-pd-needs">{offer.requirements.map((item, index) => <li className="mx-pd-need" key={item}><span className="mx-count" aria-hidden="true">{pad(index + 1)}</span><span>{item}</span></li>)}</ul>
              <p className="mx-note mx-pd-note"><ShieldAlert className="mx-i" aria-hidden="true" /><span>AI subscriptions and usage fees are not included. You stay responsible for reviewing commands, protecting credentials, and checking results.</span></p>
            </Block>

            <Block index={6} total={7} label={`${offer.assets.length} downloads`} title="Inside your download library." titleId="pd-library">
              {offer.slug !== "future-proof-method" && <p className="mx-text mx-pd-plus">Plus the files from the lower package{offer.slug === "operator-toolkit" ? "s" : ""}.</p>}
              <div className="mx-mock mx-contents">
                <div className="mx-mock-head"><span>My Downloads<span className="mx-pd-wide"> / {offer.name}</span></span><span>{offer.assets.length} files</span></div>
                <ul className="sf-contents-list">{offer.assets.map((asset) => {
                  const zip = asset.mimeType === "application/zip";
                  return <li key={asset.key}>{zip ? <FileArchive className="mx-i" aria-hidden="true" /> : <FileText className="mx-i" aria-hidden="true" />}<span>{asset.title}</span><small>{zip ? "ZIP" : "Guide"}</small></li>;
                })}</ul>
              </div>
            </Block>
          </div>
        </div>
      </div>
    </article>
    <SamplerBand /><StoreFaq count="07 / 07" />
  </main>;
}
