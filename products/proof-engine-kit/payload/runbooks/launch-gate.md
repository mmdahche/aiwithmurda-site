# Launch gate (smoke:launch pattern)

Ship only when a **sequential smoke suite** passes against production (or staging
with prod-parity env).

## Orchestrator

`payload/scripts/smoke-launch.template.mjs` spawns checks fail-fast:

| Order | Check | Validates |
|-------|-------|-----------|
| 1 | campaign | Phase dates, `/api/campaign/status`, exports |
| 2 | tracker | Public routes, overlays, receipts, admin guards |
| 3 | deck | Slide/deck generation from logs |
| 4 | stream | Command shelf, rehearsal runbook strings |
| 5 | subscribe | Email capture path |
| 6 | funnel | Checkout + entitlement downloads (if applicable) |

Customize the `checks[]` array for your stack — keep the **sequential fail-fast**
shape.

## npm wiring

```json
{
  "scripts": {
    "smoke:launch": "node scripts/smoke-launch.mjs",
    "smoke:tracker": "node scripts/smoke-tracker.mjs"
  }
}
```

Optional env file arg: `node scripts/smoke-launch.mjs .secrets/production.env`

## Env loader pattern

- `SITE_URL` or `SMOKE_SITE_URL` — target origin (https only in prod)
- `ADMIN_API_TOKEN` — for guarded admin API checks
- Never commit secrets; ship `.env.example` with placeholder keys

## Exit contract

- Each child exits 0 or orchestrator aborts
- Final stdout: `{ ok: true, checks: [{ name, durationSeconds }], completedAt }`
- Wire into CI or run manually before promoting DNS / removing prelaunch banner

## Minimum bar for proof-engine adopters

At least implement:

1. Public scoreboard + `/day/:n` receipt route smoke
2. Prelaunch phase smoke (rehearsal before start date)
3. Admin write blocked without token
4. One overlay route returns transparent shell

Add funnel/subscribe checks when money path exists.
