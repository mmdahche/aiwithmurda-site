import React from "react";
import {
  buyerOnboardingEmails,
  productAssetHighlights,
  productFaqItems,
  productModules,
  productName,
  productSubtitle,
} from "../data/product.js";
import { CheckoutButton } from "../components/checkout/CheckoutButton.jsx";

// T.I.M.E.R. sales page: Transformation → Investment → Mechanism → Evidence →
// Risk reversal. Voice contract: operator prescription, entertainment-first
// brand, no classroom framing, no income promises, real receipts only.

const includedTools = [
  {
    name: "The Council — 5-Advisor Decision Engine",
    standalone: "Sold separately at $29 — included in full",
    body:
      "Five different AI models argue your decision from five opposing lenses. Five anonymized reviewers grade the arguments. Your own AI session rules as Chairman. ~5 seconds per run, $0 on a free Groq key. This is the exact engine Murad fires before spending his own money — the sanitized run in the download shows it talking him OUT of a purchase.",
  },
  {
    name: "Skill Authoring Kit",
    standalone: "Sold separately at $19 — included in full",
    body:
      "Stop collecting other people's skills; mint your own. The authoring discipline behind Murad's 270+ skill working library: the one field the skill picker actually reads, anti-triggers, placement, a pre-ship secret scan, and two installable worked examples.",
  },
  {
    name: "Daily Operator Checklist",
    standalone: "Kit exclusive",
    body:
      "The one-page rhythm that makes sessions compound instead of evaporate: 15/30/60-minute tracks, verification gates, the bad-output protocol, and a 10-minute weekly review.",
  },
];

const mechanismSteps = [
  { step: "01", title: "Both builders working", body: "Claude Code and Codex installed, authenticated, and reading the same practice project — without a secret ever touching a chat window." },
  { step: "02", title: "A project that briefs its own AI", body: "Brief, agent instructions, verified commands, and safety boundaries travel WITH the project, so you stop re-explaining it every session." },
  { step: "03", title: "The operator loop", body: "Inspect → plan → build one slice → verify the real path → checkpoint. The loop that turns AI speed into shipped, provable work." },
  { step: "04", title: "Skills that compound", body: "Three starter skills installed and tested, then the Authoring Kit teaches you to mint your own — the point where the setup starts paying rent." },
  { step: "05", title: "One useful build, verified", body: "Pick one of three beginner-safe tracks and ship a result you can reproduce from a clean start and hand to anyone." },
];

const realReceipts = [
  {
    title: "Built in public, on the record",
    body: "The whole system runs live at aiwithmurda.com — scoreboard, daily receipts, and the 60-day sprint starting July 28. Watch the method operate before you buy it.",
    href: "/60",
    label: "See the scoreboard",
  },
  {
    title: "The tools are the author's own machinery",
    body: "The Council ships with a real, sanitized run from Murad's decision archive. The authoring discipline comes from a 270+ skill library he actually operates. Nothing in the kit was invented for the sales page.",
  },
  {
    title: "Prelaunch honesty",
    body: "This is a prelaunch product. No student counts, no screenshot income claims, no invented testimonials — buyer results will appear here as they actually happen, receipts first.",
  },
];

export function KitPage({ authSession, authReady }) {
  const checkoutState = new URLSearchParams(window.location.search).get("checkout");

  return (
    <main className="public-page">
      {/* T — Transformation */}
      <section className="public-section product-hero">
        <div>
          <span className="public-label">The starter system · $47</span>
          <h1>{productName}</h1>
          <p>
            From scattered AI user to organized AI operator: {productSubtitle.toLowerCase()} that ends with both
            builders set up, a project that briefs its own AI, a repeatable build loop, your first three skills —
            and one useful build you can verify, reproduce, and continue.
          </p>
          {checkoutState === "cancel" && (
            <p className="form-message">
              Checkout was canceled. Your profile is still safe; you can restart whenever you are ready.
            </p>
          )}
          <div className="hero-actions">
            <a className="primary-link" href="/members">Preview member area</a>
            <a className="secondary-link" href="/start">Join the free build log</a>
          </div>
        </div>
        {/* I — Investment */}
        <aside className="price-card">
          <span>One-time. Lifetime updates.</span>
          <strong>$47</strong>
          <p>
            Five implementation modules, 15 gated downloads, progress tracking — including two tools sold
            separately for $48 combined. Updates land in each product's changelog; your downloads refresh, verifiably.
          </p>
          <CheckoutButton authSession={authSession} authReady={authReady} />
        </aside>
      </section>

      {/* The over-delivery stack */}
      <section className="public-section kit-assets-section">
        <div>
          <span className="public-label">Inside the kit</span>
          <h2>Two standalone products ride inside a $47 system.</h2>
          <p>
            The Council ($29 alone) and the Skill Authoring Kit ($19 alone) are complete products with their own
            manifests, licenses, and changelogs — included here in full. The math is deliberate: the floor
            over-delivers so you can judge the rest of the ladder by it.
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
          <h2>A five-move operating system, not a video pile.</h2>
          <p>
            Every module is implementation: a timebox, a next move, a copy-ready script, a verification checkpoint,
            and a stop rule. You finish with receipts, not watch history.
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

      {/* Module detail (mechanism, verifiable) */}
      <section className="public-section kit-assets-section">
        <div>
          <span className="public-label">The five modules</span>
          <h2>Each one ends with something you can show.</h2>
        </div>
        <div className="kit-asset-list">
          {productModules.map((module) => (
            <article key={module.key}>
              <strong>{module.title}</strong>
              <p>{module.body}</p>
              <em className="module-done">Done means: {module.done}</em>
            </article>
          ))}
        </div>
      </section>

      {/* E — Evidence */}
      <section className="public-section kit-onboarding-section">
        <div>
          <span className="public-label">Receipts, not promises</span>
          <h2>Judge the operator, not the ad.</h2>
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

      {/* Full library */}
      <section className="public-section kit-assets-section">
        <div>
          <span className="public-label">Every download</span>
          <h2>The full member library at this tier.</h2>
          <p>
            The member hub reveals the exact download tied to your current module, so the library never competes
            with the next action. All of it is yours from minute one.
          </p>
        </div>
        <div className="kit-asset-list">
          {productAssetHighlights.map((asset) => (
            <article key={asset.title}>
              <strong>{asset.title}</strong>
              <p>{asset.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* After you buy */}
      <section className="public-section kit-onboarding-section">
        <div>
          <span className="public-label">After you buy</span>
          <h2>Instant access, then rails for the first week.</h2>
          <p>
            Checkout unlocks the member hub immediately. The onboarding emails walk the same path the modules do —
            setup, project context, the loop, skills, first ship.
          </p>
        </div>
        <div className="kit-onboarding-list">
          {buyerOnboardingEmails.map((email) => (
            <article key={email.key}>
              <span>{email.day}</span>
              <strong>{email.subject}</strong>
              <p>{email.goal}</p>
            </article>
          ))}
        </div>
      </section>

      {/* R — Risk reversal */}
      <section className="public-section two-col kit-proof-section">
        <div>
          <span className="public-label">The deal, plainly</span>
          <h2>Know exactly what you're buying.</h2>
        </div>
        <div className="kit-module-list">
          <article>
            <strong>Refunds</strong>
            <p>
              Digital product with instant access. If the kit doesn't run on your machine and the troubleshooting
              guide plus email support can't fix it, write murad@aiwithmurda.com within 14 days for a refund.
              "I didn't do the work" isn't a defect; "your quick-start is broken" is — and that one's on us.
            </p>
          </article>
          <article>
            <strong>Support boundary</strong>
            <p>
              Setup questions answered by email. No custom implementation, no done-for-you builds at this tier —
              that's what the higher rungs of the ladder are for.
            </p>
          </article>
          <article>
            <strong>What this will not do</strong>
            <p>
              It will not make you money by itself and nobody here will pretend otherwise. It gives you a dependable
              way to start and finish useful AI-assisted builds. The results depend on the problems you pick and
              whether you verify and ship.
            </p>
          </article>
        </div>
      </section>

      {/* Upgrade path — funnel logic */}
      <section className="public-cards">
        <article className="tool-card">
          <span>You are here</span>
          <h2>{productName}</h2>
          <p>The starter system: both builders, the loop, three skills, first verified build — plus The Council and the Authoring Kit.</p>
          <strong className="card-price">$47</strong>
        </article>
        <article className="tool-card">
          <span>When you're shipping weekly</span>
          <h2>New Wave Operator Bundle</h2>
          <p>Everything in the starter system plus the advanced vault: eight more skills, advanced scripts, dual-agent review, debugging, deployment, blueprints.</p>
          <strong className="card-price">$97</strong>
          <a className="text-link" href="/live-builds">Preview the bundle</a>
        </article>
        <article className="tool-card">
          <span>The full system</span>
          <h2>The Operator Toolkit</h2>
          <p>The complete customer-safe operating system — 24 skills, command center, dual-agent protocol — permanently yours, with an optional update channel.</p>
          <strong className="card-price">$297 + $30/mo</strong>
          <a className="text-link" href="/operator-toolkit">Compare all three tiers</a>
        </article>
      </section>

      {/* FAQ */}
      <section className="public-section kit-faq-section">
        <div>
          <span className="public-label">Before you buy</span>
          <h2>Straight answers.</h2>
          <p>
            The public 60-day challenge is Murad's show — the proof engine, not the assignment. The kit teaches you
            to run the same machinery on your own builds.
          </p>
        </div>
        <div className="kit-faq-list">
          {productFaqItems.map((item) => (
            <article key={item.question}>
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
        <div className="kit-final-cta">
          <strong>Ready to run the first verified build?</strong>
          <CheckoutButton authSession={authSession} authReady={authReady} />
        </div>
      </section>
    </main>
  );
}
