import React from "react";
import { ArrowLeft, ArrowRight, Check, FileText } from "lucide-react";
import { getStorefrontOffer } from "../data/storefront.js";
import { packagePrice, storefrontShelf } from "../data/storefrontCatalog.js";
import { SamplerBand, StoreFaq } from "../components/storefront/StorefrontParts.jsx";
import { ProductPreview, StoreCatalog } from "../components/storefront/StoreCatalog.jsx";
import { PurchaseAction } from "../components/storefront/PurchaseAction.jsx";

export function StorefrontShop() {
  return <main className="sf-page" id="main-content">
    <header className="sf-container sf-page-heading sf-shop-heading"><span className="sf-product-brand">The AI with Murda shop</span><h1>Useful files.<br />A clearer way to build.</h1><p>Start free. Find a tool for a real task. Get the package when you need more.</p></header>
    <StoreCatalog /><SamplerBand />
  </main>;
}

export function StorefrontProduct({ slug, authSession, authReady }) {
  const offer = getStorefrontOffer(slug);
  const file = storefrontShelf.find((item) => item.key === slug);
  if (!offer && !file) return <main className="sf-page" id="main-content"><div className="sf-container sf-page-heading"><h1>That tool isn't on the shelf.</h1><a className="sf-button" href="/store">Browse the shop <ArrowRight size={18} /></a></div></main>;
  if (!offer) return <main className="sf-page" id="main-content">
    <section className="sf-container sf-product-layout">
      <div><a className="sf-text-link" href="/store#files"><ArrowLeft size={17} /> All tools</a><p className="sf-product-category">{file.brand} / {file.category}</p><h1>{file.name}</h1><p className="sf-lead">{file.description}</p>
        <div className="sf-file-facts"><span><FileText size={20} /> {file.format}</span><span>{file.license} license</span></div>
        <ProductPreview file={file} />
        <h2>What you receive.</h2><ul className="sf-check-list">{file.includes.map((text) => <li key={text}><Check size={18} />{text}</li>)}</ul><p className="sf-fine-print">Delivered in a ZIP with Start Here, installation guidance, a file index, license, and verification steps.</p>
        <h2>Your first useful step.</h2><p>{file.firstAction}</p><h2>Before you buy.</h2><p>{file.requirement}</p><p>Review the included license before reusing or redistributing files. Provider accounts and any paid API usage are separate.</p>
      </div>
      <aside className="sf-buy-panel"><span className="sf-access-label">Included in a paid package</span><h2>{file.offer?.name || "Operator Arsenal"}</h2><p>This folder is not sold individually. Get it with the package below.</p><strong>{file.offer?.dueToday ? `$${file.offer.dueToday} today` : file.offer?.price || "$497 today"}</strong><p>{packagePrice(file.offer)}</p>{file.offer?.dueToday && <p>$297 setup + first $30 update month. Updates renew until canceled.</p>}{!file.offer && <p>Includes the full Toolkit and all 17 paid tools. $467 setup + first $30 update month; renews until canceled.</p>}<a className="sf-button" href={file.offer ? `/store/${file.offer.slug}` : "/operator-arsenal"}>Review the package <ArrowRight size={18} /></a><a className="sf-text-link" href="/start">Try the free sampler first</a><p className="sf-fine-print"><a href="mailto:murad@aiwithmurda.com">Ask about compatibility</a> before buying. <a href="/terms">Purchase terms</a>.</p></aside>
    </section><SamplerBand />
  </main>;
  const canceled = new URLSearchParams(window.location.search).get("checkout") === "cancel";
  const example = storefrontShelf.find((item) => item.key === offer.previewKey);
  return <main className="sf-page" id="main-content">
    <section className="sf-container sf-product-layout">
      <div><a className="sf-text-link" href="/store?view=paid"><ArrowLeft size={17} /> All packages</a><p className="sf-product-category">{offer.name} / Paid package</p><h1>{offer.shortName}</h1><p className="sf-lead">{offer.description}</p><p>{offer.audience}</p><ul className="sf-check-list">{offer.includes.map((item) => <li key={item}><Check size={18} />{item}</li>)}</ul><h2>A look inside: {example.brand}.</h2><ProductPreview file={example} /><a className="sf-text-link" href={`/store/${example.key}`}>Explore this included tool <ArrowRight size={18} /></a></div>
      <aside className={`sf-buy-panel sf-${offer.color}`}><span>Digital download + member access</span><strong>{offer.dueToday ? `$${offer.dueToday} today` : offer.price}</strong><p>{offer.billing}</p>{offer.dueToday ? <p className="sf-billing-note"><b>${offer.dueToday} due today.</b> Includes the $297 setup and first $30 update month. Then $30/month until canceled. Keep your purchased edition when updates end.</p> : <p className="sf-billing-note">Pay once. Access your purchased files in My Downloads. No monthly enrollment.</p>}<PurchaseAction offer={offer} authSession={authSession} authReady={authReady} /><p className="sf-fine-print">Secure checkout through Backbone Solutions on Stripe. <a href="/terms">Purchase terms</a></p>{canceled && <p role="status">Checkout was canceled. You can try again when you're ready.</p>}<a className="sf-text-link" href="/members">Already purchased? My Downloads <ArrowRight size={16} /></a></aside>
    </section>
    <section className="sf-container sf-product-details"><div><h2>Your first useful step.</h2><p>{offer.firstAction}</p><h2>Before you buy.</h2><ul>{offer.requirements.map((item) => <li key={item}>{item}</li>)}</ul><p>AI subscriptions and usage fees are not included. You stay responsible for reviewing commands, protecting credentials, and checking results.</p></div><div><h2>Inside your download library.</h2>{offer.slug !== "future-proof-method" && <p>Plus the files from the lower package{offer.slug === "operator-toolkit" ? "s" : ""}.</p>}<ul className="sf-contents-list">{offer.assets.map((asset) => <li key={asset.key}><FileText size={17} /><span>{asset.title}</span><small>{asset.mimeType === "application/zip" ? "ZIP" : "Guide"}</small></li>)}</ul></div></section><SamplerBand /><StoreFaq />
  </main>;
}
