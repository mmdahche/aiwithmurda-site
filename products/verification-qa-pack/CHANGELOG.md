# Changelog — Verification & QA Pack

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably.

## 1.0.1 — 2026-07-20 — Audit follow-up

- Added `install/setup.sh`: one-shot install of all six skills
  (`verify-before-claiming`, `state-sequence-audit`, `ai-blind-spot-testing`,
  `qa`, `qa-only`, `test-gap-detector`) into
  `$CLAUDE_CONFIG_DIR/skills/<name>/SKILL.md` with `--force` overwrite guard
  and Codex mirror into `.agents/skills/` when that root exists. Skill
  contents unchanged.

## 1.0.0 — 2026-07-12 — Launch edition

- `verify-before-claiming`: the Iron Law (no completion claims without fresh
  verification evidence), the gate function, the claim→evidence table, and
  the never-trust-sub-agent-reports rule. Shared canonical file with
  Safe-Autonomy Guardrails.
- `state-sequence-audit` (original write-up): store side-effect mapping,
  call-order tracing, the six bug shapes (sequential undo, async race, stale
  closure, missing transition, dead conditional, watcher interference),
  fixed report schema, scoping guidance.
- `ai-blind-spot-testing` (original write-up): the four blind-spot classes,
  known-answer tables before generation, sandbox-mode API testing without a
  database, the automated bug-check loop, second-agent review with artifacts.
- `qa`: systematic browser QA — four modes, three severity tiers, per-page
  walk protocol, evidence-required issue schema, weighted health rubric, and
  the atomic fix-commit loop with revert-on-regression.
- `qa-only`: the same engine, report-only.
- `test-gap-detector`: convention detection per ecosystem, noise-excluded
  scanning, signal-ranked gaps (recency, API surface, security paths, size),
  dead-code deprioritization.
- Both agent layouts (Claude Code + Codex) for all six skills.
- Worked example: a dead "Save Draft" button traced end to end.
