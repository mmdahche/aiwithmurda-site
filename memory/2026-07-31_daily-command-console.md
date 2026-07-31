---
name: AI with Murda daily command console
description: Persistent same-day work queue, protected automated metrics, and the public Day work board.
type: architecture
source: rubyx
date_added: 2026-07-31
project: aiwithmurda
status: production
---

# Daily Command Console

## Product Decision

- The admin Daily Log is an operating console, not a second analytics database.
- Murad controls the main goal, task queue, task outcomes, pipeline, outreach, calls, builds, and lessons.
- Connected systems control followers, collected revenue, products sold, email subscribers, streamed hours, and clip totals.
- Automation-owned metrics are read-only in the admin UI and protected from normal full-log syncs on the server.

## Same-Day Work Model

- Each daily log stores a `work_items` JSON array.
- A work item has a stable ID, title, status, optional outcome, and created/started/completed timestamps.
- Status is one of `queued`, `active`, or `done`.
- Only one task is active at a time; starting another active task returns the previous one to the queue.
- Task actions persist immediately through the authenticated partial-update endpoint.
- Main goal and manual operating numbers are saved with the day plan.

## Public Experience

- `/day/:day` has a live work board showing current focus, queued work, completed work, and completion outcomes.
- Public campaign pages poll for fresh ledger data every 10 seconds.
- The public board falls back to the day's main goal when no specific task is active.

## Security Boundary

- `PATCH /api/admin/daily-logs/:day` requires the Supabase admin session.
- The partial endpoint accepts an explicit allowlist of manually owned fields.
- Normal non-replacement `PUT /api/admin/daily-logs` syncs preserve server-owned metrics and work items.
- Intentional campaign resets may still use the existing replacement path.

## Production State

- Release commit: `dfde1cd`.
- Supabase migration `010_daily_work_items.sql` is applied in production.
- Render service `aiwithmurda-web` is live on `dfde1cd`.
- Production admin and `/day/1` were inspected through the authenticated in-app browser.
- Production counts observed during verification: 135 TikTok, 91 Instagram, 226 combined.
- `npm run build`, `npm run smoke:tracker`, and `npm run smoke:launch` passed.
- Desktop and mobile Playwright screenshots were reviewed without overlap or layout failures.

## Operational Use

1. Set the day's main goal.
2. Add a topic or task and start it.
3. Finish it with an outcome or proof note.
4. Start the next task without creating another daily record.
5. Use the closeout only when the workday is ending.

