# Walkthrough — greenfield SaaS intake

Synthetic scenario: a solo builder wants two agents to work in parallel on a
small billing microservice without touching each other's files.

## S0 — Interview (decision-complete context)

**Idea:** "Stripe webhook handler + idempotent invoice sync for a B2B SaaS."

Agent gathers:

| Field | Answer |
|-------|--------|
| Modules | `webhooks`, `sync-worker`, `shared` (types + DB client) |
| Stack | TypeScript, pnpm monorepo |
| Owners | solo — all modules → same GitHub user |
| Pilot | `webhooks`: accept Stripe `invoice.paid`, persist event id |

## S1 — Repo swarm-readiness

Skill scaffolds from templates:

- Root `CLAUDE.md` with security boundary first
- `packages/webhooks/CLAUDE.md`, `packages/sync-worker/CLAUDE.md`, `packages/shared/CLAUDE.md`
- `.github/CODEOWNERS` — each package scoped
- `swarm.config.yml` with workspace modules listed
- CI matrix: lint + typecheck per package

## S2 — PROJECT_STATE

`docs/PROJECT_STATE.md` gets testable acceptance criteria, e.g.:

- AC-1: Webhook endpoint returns 200 within 500ms for valid Stripe signature
- AC-2: Duplicate event ids are ignored (idempotency key in DB)

## S3 — Task graph

`.swarm/intake/tasks.yaml` example:

```yaml
tasks:
  - id: webhooks-001
    goal: Stripe webhook endpoint with signature verification
    until: AC-1 passes in CI with fixture events
    without: No cross-package imports except shared types
    module: webhooks
    complexity: simple
    cross_module: false
    blockedBy: []
```

## Readiness gate

```bash
lib/readiness_check.sh ./billing-saas --format human
```

Expected: **READY** (all C1–C10 pass) before any parallel dispatch.

## S4–S5 (when you have a swarm)

Dispatch plan: `webhooks-001` first (pilot), then `sync-worker` tasks that
`blockedBy: [webhooks-001]`. Pilot clean → scale the graph in topological order.

Without a swarm daemon: hand each task YAML block to a separate agent session
with that module's `CLAUDE.md` loaded — the intake artifacts still prevent
scope collision.
