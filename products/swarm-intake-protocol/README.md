# Swarm Intake Protocol

**Make any project parallel-agent-ready before the first dispatch.**

Turn an idea, a brief, or an existing repo into a swarm-ready package: layered
context, locked spec with testable acceptance criteria, a task graph with
collision-free routing, and a deterministic readiness gate that must return
READY before anything dispatches.

| Component | What it does |
|-----------|--------------|
| **swarm-intake skill** | 5-stage guided pipeline with a human gate after each stage |
| **readiness collector** | Stdlib Python — 10 checks, fixed-shape JSON, exit 0 = READY |
| **templates/** | Monorepo scaffold, CODEOWNERS, CI matrix, PROJECT_STATE, task graph |
| **tests/** | 16 table-driven tests + golden ready fixture |

## Time to first value

~30 minutes on a throwaway repo: install the skill, run Stage 0–3 on a small
pilot module, run `lib/readiness_check.sh` until READY.

## Install

**Quick path:** `bash install/setup.sh`

**Manual:** copy `install/claude-code/swarm-intake.md` to
`~/.claude/skills/swarm-intake/SKILL.md` plus `payload/lib/`, `payload/templates/`,
and `payload/tests/` into the same skill folder. Codex: use `install/codex/swarm-intake/`.

## Swarm vs standalone

The skill produces the four inputs any parallel-agent system needs. If you run
the Teamwork Swarm, Stage 4–5 wire into `/swarm` dispatch and a live pilot.
Without a swarm daemon, Stages 0–3 plus the readiness gate are fully usable —
you get the artifacts and can dispatch manually to any agent layout.

## Provenance

**Native Murad skill** (M12 / Teamwork intake protocol). Shipped as-is from the
author's operator library — not a third-party port. Bundled code is stdlib-only
Python + templates; no cloud billing path.

## License

MIT — see `LICENSE`.
