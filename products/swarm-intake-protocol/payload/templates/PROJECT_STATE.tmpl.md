<!--
  templates/PROJECT_STATE.tmpl.md -- the locked-spec the Swarm itself uses.
  Generate the first draft with /bootstrap-state, then shape into this pattern.
  THE LOAD-BEARING LINK: acceptance criteria here are NOT prose -- each becomes a
  task's `until:` (the verifier's success criteria) AND a golden-scenario seed.
  One artifact, four consumers (PROJECT_STATE -> task.until -> verifier -> eval).
  Readiness check C7 enforces: acceptance-criteria + decisions + architecture
  sections present. Fill unknowns with /deep-research (metadata only).
-->
# PROJECT_STATE — {{PROJECT_NAME}}

**Last updated:** {{DATE}}
**Owner:** {{FOUNDER}} ({{FOUNDER_GH}})
**Stage:** {{STAGE}}

## 1. What we're building + why

{{WHAT_AND_WHY}}

## 2. Architecture (the contract)

{{ARCHITECTURE}}

- Modules and their boundaries (no module imports another directly; they talk
  through `shared/` contracts):
  - `{{MODULE_A}}` — {{MODULE_A_ROLE}}
  - `{{MODULE_B}}` — {{MODULE_B_ROLE}}
  - `shared` — language-neutral contracts (types / OpenAPI / JSON-schema / proto)
  - `integrations` — third-party adapters

## 3. Acceptance criteria (source of truth — TESTABLE)

> Each criterion is a *testable done-condition*. It becomes a task `until:` and a
> golden-scenario seed. Security-relevant criteria (auth / payments / file-upload
> / third-party) carry an explicit `@agent-security-auditor` acceptance line.

### {{MODULE_A}}
- [ ] AC-A1: {{TESTABLE_CRITERION}}  — verify: {{HOW_VERIFIED}}
- [ ] AC-A2: {{TESTABLE_CRITERION}}  — verify: {{HOW_VERIFIED}}

### {{MODULE_B}}
- [ ] AC-B1: {{TESTABLE_CRITERION}}  — verify: {{HOW_VERIFIED}}
- [ ] AC-B2 (security): {{AUTH_OR_PAYMENT_CRITERION}}  — verify: `@agent-security-auditor` pass + {{HOW_VERIFIED}}

## 4. Decisions + rationale (read before deviating)

| Decision | Why |
|---|---|
| {{DECISION}} | {{RATIONALE}} |

## 5. Risk register

| # | Risk | Mitigation |
|---|---|---|
| 1 | {{RISK}} | {{MITIGATION}} |

## 6. Decisions made during setup (Phase-0 picks)

1. Repo name: {{REPO_NAME}}
2. GitHub org: {{GH_ORG}}
3. Owner GitHub usernames: {{GH_USERNAMES}}
4. Pilot task: {{PILOT_TASK}}
5. Tailnet: {{TAILNET}}
6. R2 backup account: {{R2_ACCOUNT}}
