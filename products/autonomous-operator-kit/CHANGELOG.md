# Changelog — The Operator Cycle

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably.

## 1.0.1 — 2026-07-20 — Audit follow-up

- Added `install/setup.sh`: one-shot install of the six command-skills
  (`/operator-cycle`, `/depth-check`, `/cycle-brief`, `/cycle-goal`,
  `/cycle-evolve`, `/schedule-task`) into
  `$CLAUDE_CONFIG_DIR/skills/<name>/SKILL.md` with `--force` overwrite guard
  and Codex mirror into `.agents/skills/` when that root exists. The script
  intentionally does NOT bootstrap `~/.operator-cycle/` or arm the write
  boundary — that stays a per-workspace decision handled by
  `payload/bootstrap.md` §1-2, so attended first runs remain the required
  on-ramp to unattended cycles.

## 1.0.0 — 2026-07-13 — Launch edition

- `/operator-cycle`: the full loop — pre-cycle safety checks (write-boundary
  flag, HUMAN_DIRECTIVE halt, dead-work blocklist, soft-failure override),
  7-domain rotation with anti-decay forcing, depth ladder L1-L6 with the
  compounding rule, optional `$ROUTER_CLI` cheap-tier dispatch with the
  per-domain matrix and the pre-ship dispatch self-check, counter-action
  discipline, variance gate, the exact ship procedure (placeholder →
  state → commit → trailer → sed patch; BSD-sed safe), the K-null
  diminishing-returns autostop, and the stop path with brief-on-stop.
- Five companion commands: `/depth-check`, `/cycle-brief`, `/cycle-goal`,
  `/cycle-evolve`, `/schedule-task` (macOS launchd, cron, systemd timers,
  and Windows Task Scheduler patterns).
- `CYCLE-CONTRACT.md`: the auditable spec — inner-log entry format, state
  schema, commit trailer, artifact set, validation rules, HUMAN_DIRECTIVE
  format.
- `CYCLE-PITFALLS.md`: the paid-for failure modes, kept as scar tissue.
- Fresh templates (state.json, config.json, inner-log.md, GOAL.md) and
  `bootstrap.md` with three explicit wake-up mechanisms and the
  sessions-do-not-auto-continue rule stated plainly.
