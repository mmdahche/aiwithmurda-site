# Campaign Automation Runbook

## Official Window

- Rehearsal mode: before July 28, 2026 at 12:00 AM Central
- Day 1: July 28, 2026
- Day 60: September 25, 2026
- Complete: September 26, 2026 at 12:00 AM Central

The shared campaign clock in `src/lib/campaign.js` is authoritative for the browser, API, daily-log worker, stream telemetry, and clip intake.

## What Runs Automatically

Every 30 seconds the Render server:

1. Confirms the correct daily log exists.
2. Opens a new day after midnight Central.
3. Carries cumulative totals into the new day.
4. Checks Twitch for an active stream session.
5. Reconciles campaign Stripe revenue and paid orders.
6. Reconciles campaign email subscribers.
7. Reconciles counted stream hours and accepted clip events.

At the first official tick, the worker deletes leftover rehearsal days, resets Day 1 operational totals, and captures the latest connected social counts as the follower-growth baseline.

## Rehearsal Isolation

- Test purchases still unlock the purchased member access, but purchases before launch do not count as campaign revenue.
- Test signups remain lifetime contacts, but subscribers captured before launch do not count as campaign growth.
- Twitch sessions before launch are saved as rehearsal sessions with zero counted seconds.
- Clip webhook calls before launch are saved as rehearsal events and never increment the public scoreboard.
- Manual Day 1 rehearsal edits are scrubbed by the one-time official launch reset.

## Stream Hours

Twitch is the stream-hour authority. This prevents one simultaneous YouTube and Twitch broadcast from being counted as two hours.

- Live Twitch session: `/helix/streams` is checked by the worker.
- Offline transition: the open session closes at its last verified live timestamp.
- Deploy or restart: the durable `stream_sessions` ledger resumes without losing prior elapsed time.
- Session crossing midnight: cumulative hours continue and the next day inherits the total.

## Clip Intake

Endpoint:

```text
POST /api/admin/clips/intake
Authorization: Bearer <ADMIN_API_TOKEN>
```

Send a stable external `eventId`. Replaying the same event returns `duplicate: true` and does not count twice. The official campaign day is derived from `postedAt`; a supplied `day` is only a validation check.

## Status And Recovery

- Public clock: `GET /api/campaign/status`
- Admin automation: `GET /api/admin/campaign/automation`
- Manual idempotent tick: `POST /api/admin/campaign/tick`
- Recovery snapshot: Admin Settings, **Daily Snapshot Recovery**

The recovery snapshot is an audit tool. Normal operation does not depend on clicking Apply.

## Exports

Admin-authenticated exports:

- `GET /api/admin/campaign/export/json`
- `GET /api/admin/campaign/export/csv`
- `GET /api/admin/campaign/export/html`

The existing Deck view remains the visual export surface.

## Rehearsal Acceptance Test

1. Start a short Twitch test stream.
2. Confirm admin automation reports `rehearsal-live` and official stream hours remain zero.
3. Send one clip event twice with the same `eventId`.
4. Confirm the first response is rehearsal-only and the second is duplicate.
5. Run a Stripe test checkout and one email signup.
6. Confirm member access works while campaign revenue and subscribers remain zero.
7. Open `/60`, `/obs`, and `/obs/followers` in OBS browser sources.
8. Export JSON, CSV, and HTML and confirm every export starts on July 28.

