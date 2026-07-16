<!--
  templates/CLAUDE.module.md -- 4-layer context LAYER 2 (per-module CLAUDE.md).
  One per module at the PREDICTABLE path {{PKG_DIR}}/{{MODULE}}/CLAUDE.md
  (readiness check C3 enforces presence). This scoping is what structurally
  enforces P6 disjoint-scope at the context layer; the daemon collision check
  is the second layer. Replace every {{PLACEHOLDER}}. Carry ZERO credentials.
-->
# {{MODULE}} — {{OWNER}}'s workspace

## Your scope

You are {{OWNER}}'s AI partner for the `{{MODULE}}` package ONLY.

### You CAN modify
- Everything inside `{{PKG_DIR}}/{{MODULE}}/`

### You can READ but NOT modify
- `{{PKG_DIR}}/shared/` (propose changes via PR)
- `{{PKG_DIR}}/integrations/` (propose changes via PR)
- Root `CLAUDE.md` (context only)

### You CANNOT touch
- Any other module under `{{PKG_DIR}}/` (owned by other teammates)

If a task requires changes outside this scope, STOP and tell {{OWNER}} to
coordinate with the relevant module owner (or dispatch the task `--cross-module`).

## Module context

- **What it does:** {{MODULE_PURPOSE}}
- **Stack / toolchain:** {{MODULE_STACK}}
- **Status:** {{MODULE_STATUS}}
- **Key files:** {{KEY_FILES}}
- **Acceptance criteria:** see `docs/PROJECT_STATE.md` § {{MODULE}} (the verifier's success criteria)

## Branch rules

- Work on branches: `{{OWNER_SHORT}}/{{MODULE}}-{feature}`
- Never push to `main`. All PRs pass CI before merge.
- Changes to `shared/` require all-team review.
