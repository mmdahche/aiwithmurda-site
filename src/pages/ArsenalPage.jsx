import React from "react";
import { ArrowRight, Info, Plus } from "lucide-react";
import { operatorToolkitProduct } from "../data/operatorToolkit.js";
import { productName } from "../data/product.js";
import { storeProducts } from "../data/storeCatalog.js";
import { storefrontOffers } from "../data/storefront.js";
import {
  operatorArsenalAccessPlan,
  operatorArsenalFaq,
  operatorArsenalProduct,
} from "../data/operatorArsenal.js";
import { OperatorArsenalCheckoutButton } from "../components/checkout/OperatorArsenalCheckoutButton.jsx";

const shelfValue = storeProducts.reduce((sum, product) => {
  const match = product.price.match(/\$(\d+)/);
  return sum + (match ? Number(match[1]) : 0);
}, 0);

const mechanismSteps = [
  { step: "01", title: "Activate once", body: "One checkout grants toolkit hub access, the course, vault assets, and all shelf zips." },
  { step: "02", title: "Download the shelf", body: "Every standalone product folder ships as a verified zip from the member hub." },
  { step: "03", title: "Install the toolkit", body: "Run the same setup path as $297 buyers — command center, 24 skills, dual-agent protocol." },
  { step: "04", title: "Stay current", body: "The update channel delivers revised skills and compatibility notes while active." },
];

const pad = (value) => String(value).padStart(2, "0");
const tierLabels = ["Starter", "Bundle", "Toolkit"];

function PanelHead({ index, pre, label }) {
  return <div className="mx-panel-head"><span className="mx-count">{pad(index)} / 05</span><span className="mx-desc">{pre && <span className="mx-desc-pre">{pre} / </span>}{label}</span></div>;
}

function ArsenalPrice() {
  return (
    <p className="mx-buybox-price">
      <span className="mx-ticker mx-ticker--price"><span className="mx-ticker-tag">Today</span> <span className="mx-ticker-bar">$497</span></span>
      {" "}<span className="mx-cadence">Then $30/month</span>
    </p>
  );
}

export function ArsenalPage({ authSession, authReady }) {
  const checkoutCanceled = new URLSearchParams(window.location.search).get("checkout") === "cancel";

  return (
    <main className="mx mx-page mx-pd mx-arsenal" id="main-content">
      <section className="mx-hero mx-pd-top" aria-labelledby="arsenal-title">
        <div className="mx-container mx-panel">
          <PanelHead index={1} pre="Paid package" label={operatorArsenalProduct.status} />
          <div className="mx-pd-grid">
            <header className="mx-pd-intro">
              <p className="mx-eyebrow">Complete library · $497 + $30/mo updates</p>
              <h1 className="mx-display mx-display--lg" id="arsenal-title">{operatorArsenalProduct.name}</h1>
              <p className="mx-lede">
                Every tool on the shelf — {storeProducts.length} standalone products (${shelfValue}+ value) — plus the full{" "}
                {operatorToolkitProduct.name}, {productName}, and the Operator Bundle vault. One honest checkout, no
                à-la-carte assembly.
              </p>
            </header>

            <div className="mx-pd-side">
              <aside className="mx-buybox mx-cream" aria-label="Buy Operator Arsenal">
                <div className="mx-buybox-head">
                  <div className="mx-ticker-box"><p className="mx-ticker"><span className="mx-ticker-tag">Paid package</span> <span className="mx-ticker-bar">Today + monthly</span></p></div>
                </div>
                <div className="mx-buybox-cost">
                  <ArsenalPrice />
                </div>
                <div className="mx-buybox-act">
                  {checkoutCanceled && (
                    <p className="mx-buybox-status" role="status"><Info className="mx-i" aria-hidden="true" /><span>Checkout canceled — your card was not charged.</span></p>
                  )}
                  <OperatorArsenalCheckoutButton authSession={authSession} authReady={authReady} />
                </div>
                <dl className="mx-arsenal-sum">
                  <div><dt>Sum of shelf parts</dt><dd>${shelfValue}+</dd></div>
                  <div><dt>Arsenal today:</dt><dd>$497</dd></div>
                </dl>
              </aside>
            </div>

            <div className="mx-pd-body mx-arsenal-ladder">
              <nav className="mx-tiers mx-tiers--four" aria-label="The paid packages">
                <div className="mx-mock-head"><span>{operatorArsenalProduct.status}</span><span>4 / 4</span></div>
                <ol className="mx-path-row">
                  {storefrontOffers.map((offer, index) => (
                    <li key={offer.slug}>
                      <a className="mx-path-item" href={`/store/${offer.slug}`}>
                        <span className="mx-tile mx-tile--price mx-tile--on">{offer.dueToday ? `$${offer.dueToday}` : offer.price}</span>
                        <span className="mx-shelf-name">{tierLabels[index]}</span>
                        <span className="mx-shelf-meta">{offer.dueToday ? "Today, then $30/month" : "One time"}</span>
                      </a>
                    </li>
                  ))}
                  <li>
                    <span className="mx-path-item" aria-current="true">
                      <span className="mx-tile mx-tile--price mx-tile--blue">$497</span>
                      <span className="mx-shelf-name">Arsenal</span>
                      <span className="mx-shelf-meta">Today, then $30/month</span>
                    </span>
                  </li>
                </ol>
                <p className="mx-preview-cap">Each tier includes the one before it.</p>
              </nav>
              <a className="mx-link" href="/operator-toolkit">Compare the $297 tier <ArrowRight className="mx-i" aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-section" aria-labelledby="arsenal-included">
        <div className="mx-container mx-panel">
          <PanelHead index={2} label="What's included" />
          <div className="mx-section-head">
            <h2 className="mx-display mx-display--md" id="arsenal-included">The whole shelf, plus the full system.</h2>
          </div>
          <ol className="mx-arsenal-shelf">
            {storeProducts.map((product, index) => (
              <li className="mx-card" key={product.key}>
                <p className="mx-arsenal-shelf-top"><span className="mx-count">{pad(index + 1)} / {pad(storeProducts.length)}</span><span className="mx-arsenal-tag">{product.price}</span></p>
                <h3><a href={`/store/${product.key}`}>{product.name}</a></h3>
                <p>{product.promise}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-section" aria-labelledby="arsenal-moves">
        <div className="mx-container mx-panel">
          <PanelHead index={3} label="Mechanism" />
          <div className="mx-section-head">
            <h2 className="mx-display mx-display--md" id="arsenal-moves">Four moves after checkout.</h2>
          </div>
          <ol className="mx-arsenal-steps">
            {mechanismSteps.map((step) => (
              <li key={step.step}>
                <strong className="mx-count">{step.step}</strong>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-section" aria-labelledby="arsenal-access">
        <div className="mx-container mx-panel">
          <PanelHead index={4} label="Access plan" />
          <div className="mx-section-head mx-arsenal-plan-head">
            <h2 className="mx-display mx-display--md" id="arsenal-access">{operatorArsenalAccessPlan.label}</h2>
            <div className="mx-section-side mx-arsenal-plan">
              <p className="mx-lede">{operatorArsenalAccessPlan.accessNote}</p>
              <p className="mx-text">{operatorArsenalAccessPlan.activationPromise}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-section" aria-labelledby="arsenal-faq">
        <div className="mx-container mx-panel">
          <PanelHead index={5} label="FAQ" />
          <div className="mx-faq">
            <div className="mx-faq-side">
              <h2 className="mx-display mx-display--md" id="arsenal-faq">Before you buy.</h2>
            </div>
            <div className="mx-faq-list">
              {operatorArsenalFaq.map((item, index) => (
                <details className="mx-faq-item" key={item.question}>
                  <summary><span className="mx-faq-n">{pad(index + 1)}</span><span className="mx-faq-q">{item.question}</span><Plus className="mx-i mx-faq-ic" aria-hidden="true" /></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-section mx-arsenal-cta" aria-labelledby="arsenal-unlock">
        <div className="mx-container">
          <div className="mx-cream mx-arsenal-final">
            <div className="mx-arsenal-final-copy">
              <div className="mx-ticker-box"><p className="mx-ticker"><span className="mx-ticker-tag">Paid package</span> <span className="mx-ticker-bar">Today + monthly</span></p></div>
              <h2 className="mx-display mx-display--md" id="arsenal-unlock">Unlock the complete library.</h2>
            </div>
            <div className="mx-arsenal-final-act">
              <ArsenalPrice />
              <OperatorArsenalCheckoutButton authSession={authSession} authReady={authReady} compact />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
