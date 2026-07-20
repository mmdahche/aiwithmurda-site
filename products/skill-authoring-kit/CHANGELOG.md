# Changelog — Skill Authoring Kit

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably.

## 1.0.1 — 2026-07-20 — Audit follow-up

- Added `install/setup.sh`: one-shot install of the `write-a-skill` authoring
  skill into `$CLAUDE_CONFIG_DIR/skills/write-a-skill/SKILL.md` (defaults to
  `$HOME/.claude/skills/`) with `--force` overwrite guard and Codex mirror
  into `.agents/skills/` when that root exists. No payload changes.

## 1.0.0 — 2026-07-11 — Launch edition

- `write-a-skill` authoring meta-skill: one-question-at-a-time requirements
  interview, body skeleton, load-bearing description format, mandatory
  anti-trigger section, mechanical pre-ship audit (secret scan, placeholder
  check, no-binaries rule), conditional stage-graph pattern for pipeline
  skills with the six-field stage contract.
- Canonical SKILL.md template with optional hygiene frontmatter
  (risk / source / date_added).
- Description-writing drill: format, five rules, four before/after pairs,
  the 60-second test.
- Placement guide: personal vs project scope, Claude Code + Codex paths,
  skills-vs-instructions-vs-one-shots layer discipline.
- Behavioral validation guide: RED/GREEN/REFACTOR loop for
  discipline-enforcing skills.
- Two complete installable worked examples (simple + pipeline-style).
- Install layouts for Claude Code and Codex.
