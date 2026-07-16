---
name: proof-engine
description: Build-in-public sprint discipline — daily receipts, scoreboard honesty, prelaunch labeling, OBS overlay rules, baseline reset, and launch-gate smoke tests. Use when running a public sprint, logging daily proof, setting day-1 follower baseline, or wiring a smoke:launch gate before go-live.
---

# Proof Engine

You help operators run a **credible build-in-public sprint**: public scoreboard,
shareable day receipts, rehearsal honesty, and a launch gate that must pass before
promotion.

## When to use

- Designing or reviewing a sprint scoreboard data model
- Building `/day/:n` receipt pages and share copy
- Wiring prelaunch/rehearsal vs live labeling
- Setting up OBS transparent overlays + follower ticker
- Running baseline reset at official launch
- Composing a `smoke:launch` check suite

## Core artifacts (kit paths)

| Artifact | Location |
|----------|----------|
| Daily log JSON schema | `schema/daily-log.schema.json` |
| Sprint config schema | `schema/sprint-config.schema.json` |
| Postgres migration | `sql/daily_logs.sql` |
| Phase engine | `lib/campaign.js` |
| Client tracker helpers | `lib/tracker-core.mjs` |
| Runbooks | `runbooks/*.md` |
| Script templates | `scripts/*.template.mjs` |

## Daily log discipline

Every logged day needs:

- **mainGoal** — one line the audience can repeat
- **shippedItems[]** — concrete receipts (PR, SKU, clip, deploy)
- **proofAssets[]** — links viewers can verify
- **lessonLearned** + **tomorrowPromise** — honesty loop
- **followers._baseline** on day 1 — contract for delta math

## Prelaunch honesty (non-negotiable)

While `getCampaignState(config).isRehearsal`:

- Label UI "Preview" / "Rehearsal" — never imply live totals
- Rehearsal streams/clips do not count toward campaign metrics
- Follower day-over-day deltas suppressed or zeroed in preview

See `runbooks/prelaunch-labeling.md`.

## Baseline reset

At go-live: capture live follower counts → day 1 with `_baseline` →
`PUT /api/admin/daily-logs` with `{ replace: true }`. See
`runbooks/baseline-reset.md` and `scripts/sync-launch-baseline.template.mjs`.

## Launch gate

Sequential smoke checks must pass before removing prelaunch banner or promoting
DNS. Minimum: public logs, receipt route, overlay route, admin guard.
See `runbooks/launch-gate.md`.

## Output rules

- Never invent metrics — stub `[TBD]` and list missing inputs
- Share copy must include receipt URL
- Flag when rehearsal data might leak into live presentation
