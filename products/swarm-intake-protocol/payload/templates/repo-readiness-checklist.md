# Swarm repo-readiness checklist (the dispatch gate, M12 §3.6)

The deterministic collector `lib/readiness_check.py` is the machine form of this
checklist; this doc is the human form. **All 10 must PASS before Stage-4 `/swarm`
dispatch** — `NOT-READY` produces an ordered remediation list and loops back.
Run it: `lib/readiness_check.sh <project-dir> --format human`.

| # | Check | Required artifact(s) | Pass condition |
|---|---|---|---|
| C1 | Workspace manifest matches declared modules | `swarm.config.yml` (`workspace:`), `pnpm-workspace.yaml` **or** `packages/`/`modules/` dirs | manifest present + every declared module dir exists |
| C2 | Root CLAUDE.md, security first | `CLAUDE.md` | present + first `##` section is the security boundary |
| C3 | Per-module CLAUDE.md | `{pkg}/{module}/CLAUDE.md` for every module | every declared module has a scoped CLAUDE.md |
| C4 | CODEOWNERS coverage | `.github/CODEOWNERS` | every module path covered; `shared`/`integrations` have ≥2 owners |
| C5 | swarm.config.yml schema-valid | `swarm.config.yml` | all 7 blocks present; `deterministic_checks` non-empty |
| C6 | CI matrix + lint + typecheck | `.github/workflows/ci.yml` | matrix covers every module; a lint step + a typecheck step exist |
| C7 | PROJECT_STATE complete | `docs/PROJECT_STATE.md` | acceptance-criteria + decisions + architecture sections present |
| C8 | Task graph fully specified | `.swarm/intake/tasks.yaml` | every task has goal/until/without + acceptance_criteria + module + blockedBy + complexity + cross_module |
| C9 | Memory seeded | `.swarm/memory.md` | present + non-empty |
| C10 | No committed secrets (fail-closed) | whole repo | zero credential-shaped matches (G3 set); any scan error ⇒ FAIL |

## Monorepo layout (polyglot-aware)

- **JS/TS** → `pnpm-workspace.yaml` + `packages/<module>/`.
- **Polyglot / non-JS** (iOS, Android, Rust, Python, Go, …) → plain-directory
  monorepo `modules/<module>/` with per-module CI carrying that language's
  toolchain; the workspace-link mechanism is recorded in `swarm.config.yml`
  (`workspace.manager: directory`), never assumed.
- `shared/` (language-neutral contracts) and `integrations/` (adapters) are
  all-team. `blueprints/` is founder-owned (M13). No module imports another
  directly — they talk through `shared/`.

## Phase-0 picks to gather before S1 (from Swarm §10)

1. Repo name 2. GitHub org 3. Each owner's GitHub username 4. Pilot task
5. Tailnet name 6. R2 backup account. Unknowns → `/deep-research` (metadata only).
