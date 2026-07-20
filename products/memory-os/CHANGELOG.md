# Changelog — Memory OS

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably.

## 1.0.1 — 2026-07-20 — Audit follow-up

- Added `install/setup.sh`: one-shot install of the three command-skills
  (`dispatch`, `handoff`, `resume`) into `$CLAUDE_CONFIG_DIR/skills/<name>/SKILL.md`
  with `--force` overwrite guard and Codex mirror into `.agents/skills/` when
  that root exists. The script deliberately does NOT touch identity + memory
  templates in `payload/templates/` — placement remains a per-workspace decision
  driven by `00-START-HERE.md`.

## 1.0.0 — 2026-07-13 — Launch edition

- Identity layer: SOUL.md template (voice contract, standing judgment rules,
  red lines, the no-faked-continuity rule) + the AGENTS addon operating
  contract.
- Memory architecture: slim-index MEMORY.md template with the always-on set,
  three memory types (decision / reference / feedback), daily-note template,
  correctness-beats-age pruning, and the weekly ten-minute curation ritual.
- Boot ritual: the fixed five-step load order, the three-grain loading
  discipline (cluster → section → grep), the never-auto-loads list, and the
  monthly boot-size audit.
- Session bridging: `/handoff` (with the verify-before-writing pass and the
  reference-don't-paraphrase rule) and `/resume` (with staleness tiers and
  present-then-wait).
- Background delegation: `/dispatch` with the hard briefing template, work
  cap, structured report contract, and read-the-artifact verification.
- Heartbeat pattern for proactive upkeep, governed by hard honesty rules.
- Multi-project workspace-map template for portfolio owners.
- `examples/first-week.md` — a realistic day-by-day adoption path.
