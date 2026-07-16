<!--
  templates/CLAUDE.root.md -- 4-layer context LAYER 1 (root CLAUDE.md).
  Generate the first draft with /bootstrap-state, then HARDEN into this shape.
  SECTION ORDER IS LOAD-BEARING: the security-boundary section MUST be first
  (readiness check C2 enforces it; per 05 pitfall "security-boundary written
  first; date your facts"). Server-assembled as a single system prompt -- keep
  paths predictable so the bridge can assemble all 4 layers (Risk #12).
  Replace every {{PLACEHOLDER}}. Carry ZERO credentials.
-->
# {{PROJECT_NAME}} — Root context (founder brain)

> Last updated: {{DATE}} · Owner: {{FOUNDER}} ({{FOUNDER_GH}})

## Security boundary

- **$0 marginal cost.** No paid Claude API key. All heavy work runs on a human's
  Max plan via `claude -p`. Server-side metabrain uses FREE LLM APIs only.
- **No code content ever leaves to a free API.** Only metadata (task intent, file
  paths, repo/module names, summaries). Enforced by schema + lint + outbound
  scanner (defense in depth). Never place `code`/`diff`/`file_content` in a directive.
- **Human merge gate is the last word.** Verifier auto-loop is allowed; auto-merge
  is not. No one pushes to `main` directly.
- **Secrets** live in `.env` (gitignored) or the server secret manager — never in
  the repo, never in logs, never in a CLAUDE.md. `~/.claude` is never written by a swarm task.
- **Sensitive paths** ({{SENSITIVE_PATHS}}) run in the Docker sandbox (see `swarm.config.yml`).

## Project map

{{ONE_PARAGRAPH_WHAT_AND_WHY}}

| Module | Path | Owner | Reviewer(s) |
|---|---|---|---|
| {{MODULE_A}} | `{{PKG_DIR}}/{{MODULE_A}}/` | {{OWNER_A}} | {{OWNER_A}} |
| {{MODULE_B}} | `{{PKG_DIR}}/{{MODULE_B}}/` | {{OWNER_B}} | {{OWNER_B}} |
| shared | `{{PKG_DIR}}/shared/` | ALL team | ALL team (PR) |
| integrations | `{{PKG_DIR}}/integrations/` | ALL team | ALL team (PR) |

The single source of truth for acceptance criteria is `docs/PROJECT_STATE.md`.
The task graph is `.swarm/intake/tasks.yaml`. Read both before deviating.

## Branch rules

- Branch naming: `{dev}/{module}-{feature}` (e.g. `mason/auth-login`).
- Never push to `main`. PRs require CI green + CODEOWNERS review before merge.
- Changes to `shared/` or `integrations/` require ALL-TEAM review.
- No module imports another module directly — communicate through `shared/` contracts.

## Hard rules (distilled from docs/inherited-pitfalls.md)

- Commit-sha ordering: placeholder log → state update → commit → sha patch via
  plain substitution → never `--amend` after the log write (pitfall #21).
- Portable shell idioms only (BSD/GNU sed differ across Mac/Linux) (pitfall #22).
- UI changes are browser-verified or explicitly logged "not browser-verified" (#23).
- Task scope is bound at spawn; mid-task scope drift is denied (#24).
- Every input validated at every trust boundary. Parameterized queries only.

## Commit trailer schema

Every checkpoint commit carries:

```
Task: {{task-id}}
Iteration: {{n}}
Depth: {{L1..L6}}
Module: {{module}}
Duration: {{minutes}}m
Evidence: {{what proves it works}}
Co-Authored-By: swarm-claude <swarm@{{hostname}}.local>
```
