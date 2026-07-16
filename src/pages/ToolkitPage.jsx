import React from "react";
import { operatorBundleProduct } from "../data/operatorBundle.js";
import {
  operatorToolkitCollections,
  operatorToolkitFaq,
  operatorToolkitPath,
  operatorToolkitProduct,
  operatorToolkitReleases,
} from "../data/operatorToolkit.js";
import { productName } from "../data/product.js";
import { OperatorToolkitCheckoutButton } from "../components/checkout/OperatorToolkitCheckoutButton.jsx";

// T.I.M.E.R. sales page for the $297 + $30/mo tier. Functional contract preserved
// exactly from the previous page: mixed checkout, auth redirect to
// /members?next=operator-toolkit, checkout cancel query param. Copy contract:
// operator prescription, honest arithmetic, real receipts only, no income promises.

const includedTools = [
  {
    name: "The Three-Tier LLM Router",
    standalone: "Sold separately at $79 — included in full",
    body:
      "Running code, not a prompt doc: classify-and-dispatch with hard-floor protection, fail-closed egress scrubbing, and a JSONL cost ledger — 71 shipped tests you can run offline.",
  },
  {
    name: "Memory OS",
    standalone: "Sold separately at $99 — included in full",
    body:
      "Your AI stops forgetting: identity that survives sessions, a slim-index memory architecture, the boot ritual, and handoff / resume / dispatch commands that compound across weeks.",
  },
  {
    name: "The Operator Cycle — Autonomous Operator Kit",
    standalone: "Sold separately at $129 — included in full",
    body:
      "One verified ship per cycle, unattended: depth ladder, anti-decay rotation, honest nulls, autostop — with an auditable log and commit-trailer contract.",
  },
  {
    name: "Everything below, included in full",
    standalone: "The $47 + $97 tiers — included in full",
    body:
      "The Future Proof Method, the New Wave Operator Bundle, Guardrails, the QA Pack, the advanced vault, and the 24-skill launch edition with command center, dual-agent protocol, and recovery system.",
  },
];

const mechanismSteps = [
  { step: "01", title: "Audit the environment", body: "Verify both agents, Git, project boundaries, and existing instructions before installing anything." },
  { step: "02", title: "Generate the command center", body: "Create shared project guidance, protected paths, commands, proof rules, and the first handoff." },
  { step: "03", title: "Install the right collections", body: "Choose skills by repeated work instead of dumping the entire library into every project." },
  { step: "04", title: "Run the dual-agent loop", body: "Use one agent to implement and the second to review scope, regressions, security, and proof." },
  { step: "05", title: "Verify and version the system", body: "Complete the setup receipt, save the baseline, and apply future updates through the release log." },
];

const realReceipts = [
  {
    title: "The router ships its own proof",
    body: "71 tests, runnable offline from the download. The VERIFY checklist in every product folder is the same one we ran before shipping — re-run it and check our work.",
  },
  {
    title: "Built in public, on the record",
    body: "The whole system runs live at aiwithmurda.com — scoreboard, daily receipts, and the 60-day sprint starting July 28. Watch the method operate before you buy it.",
    href: "/60",
    label: "See the scoreboard",
  },
  {
    title: "Prelaunch honesty",
    body: "No student counts, no revenue screenshots, no invented testimonials. Buyer results appear as they actually happen — receipts first.",
  },
];

export function ToolkitPage({ authSession, authReady }) {
  const checkoutCanceled = new URLSearchParams(window.location.search).get("checkout") === "cancel";

  return (
    <main className="public-page operator-toolkit-page">
      {/* T — Transformation */}
      <section className="public-section product-hero">
        <div>
          <span className="public-label">The full system · $297 permanent + $30/mo updates</span>
          <h1>{operatorToolkitProduct.name}</h1>
          <p>
            From shipping weekly with a trusted agent to running a complete dual-agent operating system —
            permanently yours. Three flagship engines ride inside ($307 of standalone shelf value), plus
            both lower tiers, 24 customer-safe skills, and a verified command center that keeps improving
            through a versioned update channel.
          </p>
          <div className="live-builds-positioning">
            <strong>{operatorToolkitProduct.subtitle}</strong>
            <span>
              The Three-Tier LLM Router ($79), Memory OS ($99), and The Operator Cycle ($129) — complete
              products with manifests, licenses, and verification checklists — on top of everything in the
              $47 and $97 tiers. $307 of flagship shelf value inside a $297 permanent purchase.
            </span>
          </div>
          <div className="hero-actions">
            <a className="primary-link" href="#toolkit-checkout">
              {operatorToolkitProduct.primaryCta}
            </a>
            <a className="secondary-link" href="#compare-tiers">
              {operatorToolkitProduct.secondaryCta}
            </a>
          </div>
        </div>
        {/* I — Investment */}
        <aside id="toolkit-checkout" className="live-builds-ticket">
          <span>Complete setup</span>
          <strong>$297</strong>
          <p>{operatorToolkitProduct.priceLabel}</p>
          <p>{operatorToolkitProduct.checkoutLabel}</p>
          <ul className="toolkit-pricing-list">
            <li>Permanent 24-skill launch edition</li>
            <li>Both lower tiers included</li>
            <li>First month of system updates included</li>
            <li>Cancel future updates without losing the toolkit</li>
          </ul>
          <OperatorToolkitCheckoutButton authSession={authSession} authReady={authReady} />
          {checkoutCanceled && (
            <em>Checkout was canceled. Nothing was charged.</em>
          )}
        </aside>
      </section>

      {/* The over-delivery stack */}
      <section className="public-section kit-assets-section">
        <div>
          <span className="public-label">Inside the toolkit</span>
          <h2>Three flagship systems ride inside a $297 tier.</h2>
          <p>
            Same deal as the floor and the bundle: complete products with their own manifests, licenses,
            changelogs, and re-runnable verification checklists — included in full, not excerpted.
          </p>
        </div>
        <div className="kit-asset-list">
          {includedTools.map((tool) => (
            <article key={tool.name}>
              <strong>{tool.name}</strong>
              <p>{tool.body}</p>
              <em className="module-done">{tool.standalone}</em>
            </article>
          ))}
        </div>
      </section>

      {/* M — Mechanism */}
      <section className="public-section two-col kit-proof-section">
        <div>
          <span className="public-label">How it works</span>
          <h2>From clean environment to verified operating system.</h2>
          <p>
            The toolkit has an install order. You don't dump 24 skills into a project you can't verify —
            each phase earns the next.
          </p>
        </div>
        <div className="kit-module-list">
          {mechanismSteps.map((item) => (
            <article key={item.step}>
              <strong>{item.step} — {item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Install path detail */}
      <section className="public-section kit-onboarding-section operator-toolkit-path">
        <div>
          <span className="public-label">Installation path</span>
          <h2>Five phases, with timeboxes.</h2>
        </div>
        <div className="kit-onboarding-list">
          {operatorToolkitPath.map((phase) => (
            <article key={phase.phase}>
              <span>{phase.phase} · {phase.time}</span>
              <strong>{phase.title}</strong>
              <p>{phase.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 24 skills */}
      <section id="toolkit-collections" className="public-section kit-assets-section">
        <div>
          <span className="public-label">24 original skills</span>
          <h2>Four collections. Installed by actual need.</h2>
          <p>
            Matching project layouts for Claude Code and Codex. Every skill has an explicit workflow,
            output contract, and safety guardrails.
          </p>
        </div>
        <div className="kit-asset-list">
          {operatorToolkitCollections.map((collection) => (
            <article key={collection.key}>
              <strong>{collection.label} — {collection.title} ({collection.status})</strong>
              <p>{collection.outcome}</p>
            </article>
          ))}
        </div>
      </section>

      {/* E — Evidence */}
      <section className="public-section kit-onboarding-section">
        <div>
          <span className="public-label">Receipts, not promises</span>
          <h2>Check our work before you buy it.</h2>
        </div>
        <div className="kit-onboarding-list">
          {realReceipts.map((receipt) => (
            <article key={receipt.title}>
              <strong>{receipt.title}</strong>
              <p>{receipt.body}</p>
              {receipt.href && (
                <a className="text-link" href={receipt.href}>{receipt.label}</a>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Ownership + releases */}
      <section className="public-section two-col kit-proof-section">
        <div>
          <span className="public-label">Permanent ownership</span>
          <h2>The launch edition remains yours.</h2>
          <p>
            The $297 purchase permanently unlocks the setup, 24-skill ZIP, command center, templates,
            playbooks, and recovery system — even if you cancel the update channel.
          </p>
        </div>
        <div className="kit-module-list">
          <article>
            <strong>Recurring continuity</strong>
            <p>
              The $30/month keeps the system current: new and revised skills, compatibility reviews,
              release notes, migrations, verification receipts, and rollback instructions.
            </p>
          </article>
          {operatorToolkitReleases.map((release) => (
            <article key={release.version}>
              <strong>v{release.version} — {release.title}</strong>
              <p>{release.summary}</p>
              <em className="module-done">{release.access} · {release.date}</em>
            </article>
          ))}
        </div>
      </section>

      {/* R — Risk reversal */}
      <section className="public-section two-col kit-proof-section">
        <div>
          <span className="public-label">The deal, plainly</span>
          <h2>No hidden ownership rules.</h2>
        </div>
        <div className="kit-module-list">
          <article>
            <strong>Refunds</strong>
            <p>
              Digital product with instant access. If the toolkit doesn't run on your machine and the
              troubleshooting guide plus email support can't fix it, write murad@aiwithmurda.com within
              14 days for a refund. A broken quick-start is our defect; "I didn't do the work" isn't.
            </p>
          </article>
          <article>
            <strong>What canceling updates means</strong>
            <p>
              You keep permanent access to the launch-edition Operator Toolkit purchased for $297. The update
              feed, future releases, and update-only downloads pause at the end of the paid billing period.
            </p>
          </article>
          <article>
            <strong>What this will not do</strong>
            <p>
              It will not make you money by itself, and nobody here will pretend otherwise. It installs a
              complete customer-safe operating system — not a copy of Murad's private computer. The results
              depend on what you build.
            </p>
          </article>
        </div>
      </section>

      {/* Upgrade ladder */}
      <section id="compare-tiers" className="public-cards">
        <article className="tool-card">
          <span>The floor</span>
          <h2>{productName}</h2>
          <p>Both builders set up, the operator loop, your first verified build — plus The Council and the Authoring Kit.</p>
          <strong className="card-price">$47</strong>
          <a className="text-link" href="/kit">See the starter system</a>
        </article>
        <article className="tool-card">
          <span>The operator tier</span>
          <h2>{operatorBundleProduct.name}</h2>
          <p>Everything in the floor plus Guardrails, the QA Pack, and the advanced operator vault.</p>
          <strong className="card-price">$97</strong>
          <a className="text-link" href="/live-builds">Preview the bundle</a>
        </article>
        <article className="tool-card">
          <span>You are here</span>
          <h2>{operatorToolkitProduct.name}</h2>
          <p>Everything below plus the three flagships — Router, Memory OS, and The Operator Cycle — permanently yours, updates optional.</p>
          <strong className="card-price">$297 + $30/mo</strong>
        </article>
      </section>

      {/* FAQ */}
      <section className="public-section kit-faq-section">
        <div>
          <span className="public-label">Billing and access</span>
          <h2>Straight answers.</h2>
        </div>
        <div className="kit-faq-list">
          {operatorToolkitFaq.map((item) => (
            <article key={item.question}>
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
        <div className="kit-final-cta operator-toolkit-final-cta">
          <div>
            <span>Initial payment</span>
            <strong>$327 today</strong>
            <small>$30/month thereafter</small>
          </div>
          <OperatorToolkitCheckoutButton authSession={authSession} authReady={authReady} compact />
        </div>
      </section>
    </main>
  );
}
