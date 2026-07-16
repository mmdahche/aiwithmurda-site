<!--
  templates/memory.seed.md -> .swarm/memory.md  (4-layer context LAYER 4, initial).
  Seeded at intake; thereafter the Swarm appends verifier lessons (metadata-only
  summaries) via PR (§4 step 9). Readiness check C9 requires this file present +
  non-empty. METADATA ONLY -- never paste code/diffs/secrets here.
-->
# .swarm/memory.md — {{PROJECT_NAME}} rolling memory

Seeded {{DATE}} by /swarm-intake. Append-only via PR; metadata-only summaries.

## Conventions banked at intake
- Module boundaries: see root `CLAUDE.md` project map. No cross-module imports.
- Acceptance criteria are the source of truth (`docs/PROJECT_STATE.md` §3).
- Branch naming `{dev}/{module}-{feature}`; never push `main`.

## Decisions
- {{DATE}}: project scoped into modules {{MODULE_LIST}}; pilot task = {{PILOT_TASK}}.

## Lessons (appended by the verifier after merges)
<!-- e.g. "2026-07-01 (auth-login): peer review caught missing CSRF token check." -->
