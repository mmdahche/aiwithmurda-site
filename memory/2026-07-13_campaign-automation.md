---
name: AI with Murda rehearsal-safe campaign automation
description: Locked July 28 campaign clock, automated daily ledger, rehearsal isolation, telemetry, exports, and production reset state.
type: architecture
source: rubyx
date_added: 2026-07-13
project: aiwithmurda
status: production
---

# Rehearsal-Safe Campaign Automation

## Campaign Clock

- Official start: `2026-07-28T00:00:00-05:00` in `America/Chicago`.
- Day 1 is July 28, Day 60 is September 25, and the campaign becomes complete at midnight on September 26.
- Before the official start, every stream, purchase, signup, clip event, and follower refresh is rehearsal-only.
- The shared campaign clock lives in `src/lib/campaign.js`; frontend and server code must use it instead of deriving dates independently.

## Automatic Ledger

- The server campaign worker runs every 30 seconds.
- It creates or rolls over the current official daily log and reconciles campaign-bounded Stripe revenue, orders, members, email subscribers, social counts, clip events, and Twitch stream time.
- On the first official live tick, rehearsal fields are scrubbed, later rehearsal rows are deleted, and the current verified social counts become the follower baseline.
- Twitch is the sole stream-time authority so one multistream session is counted once rather than once per destination.
- Clip intake uses stable event IDs and a transactional ledger so retries cannot double count.

## Admin and Public Contracts

- Public clock: `GET /api/campaign/status`.
- Admin automation status: `GET /api/admin/campaign/automation`.
- Manual recovery tick: `POST /api/admin/campaign/tick`.
- Admin campaign exports are available as JSON, CSV, and HTML.
- Manual Daily Snapshot controls are audit and repair tools, not the primary data-entry workflow.

## Production State

- Automation release: `08ec81e`.
- Router build fix: `99b0be4`.
- Stale-source disclosure fix: `5e755be`.
- Supabase migration `009_campaign_automation.sql` is applied through migration 009.
- Production was reset to one planned Day 1 row dated July 28 with zero campaign revenue, email, hours, clips, products, and builds.
- Follower baseline and current counts were reset to the verified prelaunch total: TikTok 133, Instagram 79, Twitch 0, YouTube 0, X 0; combined 212 with zero campaign gain.
- TikTok, Twitch, and YouTube currently refresh successfully. Instagram remains connected and contributes its last verified count, but Meta currently returns `API access blocked`; public UI identifies this as last-verified data instead of live data.
- Campaign, tracker, deck, stream, subscribe, funnel, and complete launch smoke suites passed against production after the reset.

## Boundaries

- Do not change the July 28 clock without an explicit Murad decision.
- Do not let rehearsals increment official 60-day totals.
- Do not combine YouTube and Twitch durations for the same multistream session.
- Do not replace official social metrics with demo or seed values.
- Do not modify or publish Cursor's course and toolkit outputs until the requested content audit is complete.
