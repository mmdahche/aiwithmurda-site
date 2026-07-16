import React from "react";
import { operatorToolkitProduct } from "../data/operatorToolkit.js";
import { productName } from "../data/product.js";
import { storeProducts } from "../data/storeCatalog.js";
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

export function ArsenalPage({ authSession, authReady }) {
  const checkoutCanceled = new URLSearchParams(window.location.search).get("checkout") === "cancel";

  return (
    <main className="public-page operator-arsenal-page">
      <section className="public-section product-hero">
        <div>
          <span className="public-label">Complete library · $497 + $30/mo updates</span>
          <h1>{operatorArsenalProduct.name}</h1>
          <p>
            Every tool on the shelf — {storeProducts.length} standalone products (${shelfValue}+ value) — plus the full{" "}
            {operatorToolkitProduct.name}, {productName}, and the Operator Bundle vault. One honest checkout, no
            à-la-carte assembly.
          </p>
          <div className="hero-actions">
            <OperatorArsenalCheckoutButton authSession={authSession} authReady={authReady} />
            <a className="secondary-link" href="/operator-toolkit">
              Compare the $297 tier
            </a>
          </div>
          {checkoutCanceled && (
            <p className="form-message">Checkout canceled — your card was not charged.</p>
          )}
        </div>
        <aside className="product-hero-aside">
          <span>Sum of shelf parts</span>
          <strong>${shelfValue}+</strong>
          <em>Arsenal today: $497</em>
        </aside>
      </section>

      <section className="public-section">
        <span className="public-label">What's included</span>
        <h2>The whole shelf, plus the full system.</h2>
        <div className="product-grid">
          {storeProducts.map((product) => (
            <article key={product.key}>
              <span>{product.price}</span>
              <h3>{product.name}</h3>
              <p>{product.promise}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section">
        <span className="public-label">Mechanism</span>
        <h2>Four moves after checkout.</h2>
        <ol className="mechanism-list">
          {mechanismSteps.map((step) => (
            <li key={step.step}>
              <strong>{step.step}</strong>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="public-section product-access-plan">
        <span className="public-label">Access plan</span>
        <h2>{operatorArsenalAccessPlan.label}</h2>
        <p>{operatorArsenalAccessPlan.accessNote}</p>
        <p>{operatorArsenalAccessPlan.activationPromise}</p>
      </section>

      <section className="public-section product-faq">
        <span className="public-label">FAQ</span>
        <h2>Before you buy.</h2>
        {operatorArsenalFaq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>

      <section className="public-section product-cta">
        <h2>Unlock the complete library.</h2>
        <OperatorArsenalCheckoutButton authSession={authSession} authReady={authReady} compact />
      </section>
    </main>
  );
}
