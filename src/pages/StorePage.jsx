import React from "react";
import { storeFreeItem, storeProducts, storeStandaloneNote, storeTiers } from "../data/storeCatalog.js";

// The shelf: flat folder-per-product catalog. Prelaunch contract — no dead
// buy buttons: cards route to the tier that delivers each SKU today, and the
// standalone-checkout state is stated honestly.

export function StorePage() {
  return (
    <main className="public-page">
      <section className="public-section product-hero">
        <div>
          <span className="public-label">The shelf · folder-per-product</span>
          <h1>The Operator Store</h1>
          <p>
            Every product here is a self-contained folder pulled from machinery Murad actually runs — with a
            manifest that matches disk, a license, a changelog, and a verification checklist you can re-run.
            No prompt dumps, no locked previews, no invented testimonials.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href={storeFreeItem.downloadHref} download>
              Get the free sampler
            </a>
            <a className="secondary-link" href="/start">Join the build log</a>
          </div>
        </div>
        <aside className="price-card">
          <span>{storeFreeItem.kind}</span>
          <strong>{storeFreeItem.price}</strong>
          <p>{storeFreeItem.promise}</p>
          <div className="checkout-box">
            <a className="primary-link" href={storeFreeItem.downloadHref} download>
              Download the Operator Sampler
            </a>
          </div>
        </aside>
      </section>

      <section className="public-section kit-assets-section">
        <div>
          <span className="public-label">Inside the free sampler</span>
          <h2>The free tier works. That's the point.</h2>
          <p>
            Three working files from the paid line — install them in ten minutes and judge the whole shelf by
            how they behave. MIT licensed.
          </p>
        </div>
        <div className="kit-asset-list">
          {storeFreeItem.contents.map((item) => (
            <article key={item}>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section kit-assets-section">
        <div>
          <span className="public-label">The shelf</span>
          <h2>Folder-per-product. Counted, licensed, verified.</h2>
          <p>{storeStandaloneNote}</p>
        </div>
      </section>

      <section className="public-cards">
        {storeProducts.map((product) => (
          <article key={product.key} className="tool-card">
            <span>{product.kind}</span>
            <h2>{product.name}</h2>
            <p>{product.promise}</p>
            <strong className="card-price">{product.price}</strong>
            <em className="module-done">{product.license} license · standalone checkout at launch</em>
            {product.includedIn ? (
              <a className="text-link" href={product.includedIn.href}>
                {product.includedIn.label} ({product.includedIn.tier})
              </a>
            ) : (
              <a className="text-link" href="/start">
                Standalone-only drop — join the build log for the launch alert
              </a>
            )}
          </article>
        ))}
      </section>

      <section className="public-section kit-onboarding-section">
        <div>
          <span className="public-label">Or take a tier</span>
          <h2>Tiers stack the shelf — and always beat buying parts.</h2>
          <p>
            The ladder law here is simple: the more you pay, the more you get, and every tier includes
            everything below it. The floor over-delivers on purpose.
          </p>
        </div>
        <div className="kit-onboarding-list">
          {storeTiers.map((tier) => (
            <article key={tier.key}>
              <span>{tier.price}</span>
              <strong>{tier.name}</strong>
              <p>{tier.body}</p>
              <a className="text-link" href={tier.href}>See the tier</a>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section kit-faq-section">
        <div>
          <span className="public-label">The store's standard</span>
          <h2>What "verified" means on this shelf.</h2>
        </div>
        <div className="kit-faq-list">
          <article>
            <strong>The manifest matches disk.</strong>
            <p>
              Every folder ships an INDEX listing every file, checked mechanically at build time. If your
              download doesn't match its manifest, that's a defect — and defects are on us.
            </p>
          </article>
          <article>
            <strong>Real receipts only.</strong>
            <p>
              Products ship with sanitized artifacts from actual use — a real council run, real test suites
              (100 of them in the guardrails pack). Prelaunch means buyer proof accumulates in public, not
              that it gets invented.
            </p>
          </article>
          <article>
            <strong>No income promises.</strong>
            <p>
              Tools and discipline, priced like tools. What you build with them — and whether it makes money —
              stays yours.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
