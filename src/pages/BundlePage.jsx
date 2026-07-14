import React, { useEffect, useState } from "react";
import {
  operatorBundleCollections,
  operatorBundleFaq,
  operatorBundlePath,
  operatorBundleProduct,
} from "../data/operatorBundle.js";
import { subscribeBuildLog, verifyCheckoutSession } from "../lib/api.js";
import { OperatorBundleCheckoutButton } from "../components/checkout/OperatorBundleCheckoutButton.jsx";

// T.I.M.E.R. sales page for the $97 tier. Functional contract preserved
// exactly from the previous page: checkout success/cancel verification via
// session_id, the operator-bundle waitlist capture, and the existing
// entitlement key + endpoint. Copy contract: operator prescription, real
// receipts only, no income promises.

const includedTools = [
  {
    name: "Safe-Autonomy Guardrails",
    standalone: "Sold separately at $49 — included in full",
    body:
      "The fail-closed safety layer for unattended agents: egress redaction firewall, six local-agent guards (irreversible-action locks, token hygiene, untrusted-input validation), a doc-vault index that can't lie fresh, clipboard-only secret injection, and two Claude Code enforcement hooks — with 118 shipped tests you can run yourself.",
  },
  {
    name: "Verification & QA Pack",
    standalone: "Sold separately at $29 — included in full",
    body:
      "Six disciplines that make 'done' provable: the no-claims-without-evidence gate, state-sequence audits for dead buttons, AI blind-spot testing, browser QA with a health-scored fix loop, report-only QA, and ranked test-gap detection.",
  },
  {
    name: "The complete Future Proof Method",
    standalone: "The $47 tier — included in full",
    body:
      "All five implementation modules, the 15-download starter library, The Council decision engine, the Skill Authoring Kit, progress tracking, and the completion kit. Bundle buyers start with the whole floor.",
  },
];

const mechanismSteps = [
  { step: "01", title: "Finish the foundation", body: "Verify both agents, prepare the project, prove the operator loop — the starter course is included, so the base is never assumed." },
  { step: "02", title: "Make the agent safe to trust", body: "Install the Guardrails: the firewall, the action locks, and the enforcement hooks that let you stop babysitting every command." },
  { step: "03", title: "Make 'done' mean done", body: "Install the QA disciplines: claim gating, dead-button audits, and browser QA with evidence-required reporting." },
  { step: "04", title: "Repeat with the vault", body: "Eight advanced skills, high-context scripts, the dual-agent review loop, the Debug Rescue System, deployment runbooks, and seven reusable project blueprints." },
];

const realReceipts = [
  {
    title: "The guardrails ship their own proof",
    body: "118 tests, runnable offline from the download in one command. The VERIFY checklist in every folder is the same one we ran before shipping — re-run it and check our work.",
  },
  {
    title: "This is the author's own machinery",
    body: "The firewall and guards are what runs behind Murad's own overnight agent sessions, sanitized for customer use. The build is public: watch it operate at the scoreboard.",
    href: "/60",
    label: "See the scoreboard",
  },
  {
    title: "Prelaunch honesty",
    body: "No student counts, no revenue screenshots, no invented testimonials. Buyer results appear as they actually happen — receipts first.",
  },
];

export function BundlePage({ authSession, authReady }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [accessCheck, setAccessCheck] = useState({ status: "idle" });
  const checkoutCanceled = new URLSearchParams(window.location.search).get("checkout") === "cancel";

  useEffect(() => {
    if (!authSession?.access_token) return undefined;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const checkoutState = params.get("checkout");
    if (!sessionId || checkoutState !== "success") return undefined;

    let cancelled = false;
    setAccessCheck({
      status: "checking",
      title: "Checking your Operator Bundle",
      body: "Confirming Stripe payment and attaching the advanced vault to your profile.",
    });

    verifyCheckoutSession(sessionId, authSession.access_token)
      .then((result) => {
        if (cancelled) return;
        window.history.replaceState({}, "", "/live-builds?checkout=success");
        setAccessCheck({
          status: "success",
          title: "Bundle confirmed",
          body:
            result.entitlement?.product_key === operatorBundleProduct.key
              ? "Your New Wave Operator Bundle is attached to this profile."
              : "Stripe confirmed the payment and your profile was updated.",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const pending = error.data?.error === "checkout_not_paid";
        setAccessCheck({
          status: pending ? "pending" : "error",
          title: pending ? "Payment is not marked paid yet" : "Bundle check needs attention",
          body: pending
            ? "Stripe has the session, but it is not marked paid yet. Refresh in a moment if you completed payment."
            : error.message || "Could not verify the Operator Bundle yet.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authSession?.access_token]);

  async function handleSubscribe(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      await subscribeBuildLog({ email, name, source: "operator-bundle" });
      setStatus("success");
      setMessage("You are on the Operator Bundle update list.");
      setEmail("");
      setName("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not join the update list yet.");
    }
  }

  return (
    <main className="public-page">
      {/* T — Transformation */}
      <section className="public-section live-builds-hero">
        <div>
          <span className="public-label">The operator tier · $97</span>
          <h1>{operatorBundleProduct.name}</h1>
          <p>
            From one verified build to shipping weekly with an agent you can trust unattended. The starter
            system gets you through the first result; this tier adds the safety layer, the verification
            discipline, and the advanced vault that make the second, fifth, and twentieth builds routine.
          </p>
          <div className="live-builds-positioning">
            <strong>{operatorBundleProduct.subtitle}</strong>
            <span>
              Two standalone products ride inside — Safe-Autonomy Guardrails ($49) and the Verification &
              QA Pack ($29) — on top of everything in the $47 tier. $78 of shelf value above the floor, for
              a $50 step.
            </span>
          </div>
          <div className="hero-actions">
            <a className="primary-link" href="#operator-bundle-details">
              {operatorBundleProduct.primaryCta}
            </a>
            <a className="secondary-link" href="/kit">
              {operatorBundleProduct.secondaryCta}
            </a>
          </div>
        </div>
        {/* I — Investment */}
        <aside className="live-builds-ticket">
          <span>One-time. Lifetime updates.</span>
          <strong>{operatorBundleProduct.priceLabel}</strong>
          <p>
            The complete starter course, both bundled safety/QA products, and the seven-asset advanced
            vault. Updates land in each product's changelog; your downloads refresh, verifiably.
          </p>
          <OperatorBundleCheckoutButton authSession={authSession} authReady={authReady} />
          {checkoutCanceled && accessCheck.status === "idle" && (
            <em>Checkout was canceled. Nothing was charged.</em>
          )}
          {accessCheck.status !== "idle" && (
            <div className={`live-builds-access ${accessCheck.status}`}>
              <strong>{accessCheck.title}</strong>
              <p>{accessCheck.body}</p>
            </div>
          )}
          <form id="operator-bundle-list" className="start-form" onSubmit={handleSubscribe}>
            <input
              type="text"
              placeholder="First name"
              aria-label="First name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              type="email"
              placeholder="you@example.com"
              aria-label="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Joining..." : "Get bundle update alerts"}
            </button>
            {message && <p className={`form-message ${status}`}>{message}</p>}
          </form>
        </aside>
      </section>

      {/* The over-delivery stack */}
      <section id="operator-bundle-details" className="public-section kit-assets-section">
        <div>
          <span className="public-label">Inside the bundle</span>
          <h2>Two standalone products ride inside a $97 tier.</h2>
          <p>
            Same deal as the floor: complete products with their own manifests, licenses, changelogs, and
            re-runnable verification checklists — included in full, not excerpted.
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
          <h2>Foundation, then safety, then proof, then repetition.</h2>
          <p>
            The bundle has an order. You don't install 15 advanced skills into a project you can't verify —
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

      {/* Vault collections */}
      <section className="public-section kit-assets-section">
        <div>
          <span className="public-label">The advanced vault</span>
          <h2>Operator collections, installed by need.</h2>
          <p>
            The portal directs beginners through the foundation first, so the larger vault never becomes
            clutter. Install collections when the repeated need appears.
          </p>
        </div>
        <div className="kit-asset-list">
          {operatorBundleCollections.map((collection) => (
            <article key={collection.key}>
              <strong>{collection.label} — {collection.title} ({collection.status})</strong>
              <p>{collection.outcome}</p>
              <em className="module-done">{collection.reuseMove}</em>
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

      {/* The path */}
      <section className="public-section kit-onboarding-section">
        <div>
          <span className="public-label">After you buy</span>
          <h2>The four-phase path, with rails.</h2>
        </div>
        <div className="kit-onboarding-list">
          {operatorBundlePath.map((phase) => (
            <article key={phase.phase}>
              <span>{phase.phase} · {phase.time}</span>
              <strong>{phase.title}</strong>
              <p>{phase.body}</p>
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
              Digital product with instant access. If it doesn't run on your machine and the troubleshooting
              guide plus email support can't fix it, write murad@aiwithmurda.com within 14 days for a refund.
              A broken quick-start is our defect; "I didn't do the work" isn't.
            </p>
          </article>
          <article>
            <strong>Support boundary</strong>
            <p>
              Setup questions answered by email. No custom implementation and no done-for-you builds at this
              tier — the full-system tier exists for people who want the complete install.
            </p>
          </article>
          <article>
            <strong>What this will not do</strong>
            <p>
              It will not make you money by itself, and nobody here will pretend otherwise. It makes your
              agent safer to trust and your "done" provable. The results depend on what you build.
            </p>
          </article>
        </div>
      </section>

      {/* Upgrade ladder */}
      <section className="public-cards">
        <article className="tool-card">
          <span>The floor</span>
          <h2>The Future Proof Method</h2>
          <p>Both builders set up, the operator loop, your first verified build — plus The Council and the Skill Authoring Kit.</p>
          <strong className="card-price">$47</strong>
          <a className="text-link" href="/kit">See the starter system</a>
        </article>
        <article className="tool-card">
          <span>You are here</span>
          <h2>{operatorBundleProduct.name}</h2>
          <p>Everything in the floor plus Guardrails, the QA Pack, and the advanced operator vault.</p>
          <strong className="card-price">$97</strong>
        </article>
        <article className="tool-card">
          <span>The full system</span>
          <h2>The Operator Toolkit</h2>
          <p>Everything below plus the three flagships — the LLM Router, Memory OS, and The Operator Cycle — permanently yours, updates optional.</p>
          <strong className="card-price">$297 + $30/mo</strong>
          <a className="text-link" href="/operator-toolkit">Compare all three tiers</a>
        </article>
      </section>

      {/* FAQ */}
      <section className="public-section kit-faq-section">
        <div>
          <span className="public-label">Before you buy</span>
          <h2>Straight answers.</h2>
        </div>
        <div className="kit-faq-list">
          {operatorBundleFaq.map((item) => (
            <article key={item.question}>
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
        <div className="kit-final-cta">
          <strong>Ready to trust your agent with real work?</strong>
          <OperatorBundleCheckoutButton authSession={authSession} authReady={authReady} compact />
        </div>
      </section>
    </main>
  );
}
