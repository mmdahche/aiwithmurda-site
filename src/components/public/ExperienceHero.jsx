import React, { Suspense, lazy } from "react";
import { motion, useReducedMotion } from "motion/react";

const ProofRouteScene = lazy(() => import("./ProofRouteScene.jsx"));

export function BroadcastTicker({ items }) {
  const tickerItems = [...items, ...items];

  return (
    <div className="broadcast-ticker" aria-label={items.join(". ")}>
      <div className="broadcast-ticker-track" aria-hidden="true">
        {tickerItems.map((item, index) => (
          <span key={`${item}-${index}`}>
            {item}
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}

export function ExperienceHero({
  activeDay,
  totalDays,
  phaseLabel,
  dateLabel,
  goalLabel,
  followerLabel,
  revenueLabel,
  primaryAction,
  secondaryAction,
}) {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <section className="experience-hero">
      <div className="experience-scene" aria-hidden="true">
        <Suspense fallback={<div className="experience-scene-fallback" />}>
          <ProofRouteScene activeDay={activeDay} totalDays={totalDays} reduceMotion={reduceMotion} />
        </Suspense>
      </div>
      <div className="experience-hero-wash" aria-hidden="true" />

      <motion.div
        className="experience-hero-content"
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="broadcast-ident">
          <span className="broadcast-live-state">
            <i />
            {phaseLabel}
          </span>
          <span>Original build-in-public series</span>
          <span>{dateLabel}</span>
        </div>

        <div className="experience-title-lockup">
          <p>One operator. Every receipt. Nothing hidden.</p>
          <h1>AI WITH<br />MURDA</h1>
          <strong>60 days to turn AI into real online income.</strong>
        </div>

        <div className="experience-actions">
          <a className="experience-primary-action" href={primaryAction.href}>
            {primaryAction.label}
            <span aria-hidden="true">↗</span>
          </a>
          <a className="experience-secondary-action" href={secondaryAction.href}>
            {secondaryAction.label}
          </a>
        </div>
      </motion.div>

      <div className="broadcast-scorebug" aria-label="Current sprint score">
        <div>
          <span>Day</span>
          <strong>{String(activeDay).padStart(2, "0")}</strong>
          <em>/ {String(totalDays).padStart(2, "0")}</em>
        </div>
        <dl>
          <div>
            <dt>Public bet</dt>
            <dd>{goalLabel}</dd>
          </div>
          <div>
            <dt>Followers</dt>
            <dd>{followerLabel}</dd>
          </div>
          <div>
            <dt>Revenue</dt>
            <dd>{revenueLabel}</dd>
          </div>
        </dl>
      </div>

      <BroadcastTicker
        items={["BUILD LIVE", "REAL NUMBERS", "DAILY RECEIPTS", "AI OPERATOR SPRINT", goalLabel]}
      />
    </section>
  );
}
