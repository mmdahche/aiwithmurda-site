# START HERE — Proof Engine Kit

You bought the **build-in-public operating template** — the data model, honesty
rules, and launch gate behind a live sprint scoreboard.

## First win in 4 steps (~45 minutes)

1. **Read** `payload/runbooks/prelaunch-labeling.md` — understand rehearsal vs live
2. **Copy** `payload/schema/` + `payload/sql/daily_logs.sql` into your stack
3. **Configure** from `payload/templates/sprint-config.example.json`
4. **Sketch** `/day/:day` using `payload/templates/day-receipt-page.pattern.md`

Install the agent skill: `bash install/setup.sh`

## Where everything is

- `payload/lib/campaign.js` — phase math (rehearsal / live / complete)
- `payload/lib/tracker-core.mjs` — gains, formatting, share copy
- `payload/scripts/` — copy `.template.mjs` files into your `scripts/` folder
- `payload/runbooks/baseline-reset.md` — day-1 follower contract
- `payload/runbooks/launch-gate.md` — smoke:launch pattern
- `examples/day-1-launch-walkthrough.md` — rehearsal → baseline → live
- `VERIFY.md` — checklist we ran before shipping

## The one rule

**Rehearsal never counts as live.** If preview data appears in public totals, the
sprint loses credibility — fix labeling before fixing features.
