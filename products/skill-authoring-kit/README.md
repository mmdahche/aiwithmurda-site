# Skill Authoring Kit

Stop copying other people's skills. Mint your own. This kit is the authoring
discipline behind a 270+ skill working library: how to decide what deserves
to be a skill, write the one field the skill picker actually reads, place it
in the right scope, audit it before it ships, and prove it changes agent
behavior instead of just reading well.

## Who this is for

Claude Code / Codex users who have installed skills but never written one —
or who wrote a few that mysteriously never fire. If you've ever explained
the same workflow to your agent three times in one week, this kit converts
that repetition into a permanent capability.

## Time to first value

~20 minutes to author and install your first working skill, following
`00-START-HERE.md`.

## What's inside

| Path | What it is |
|---|---|
| `payload/write-a-skill.md` | The authoring meta-skill: requirements interview, body skeleton, description drill, pre-ship audit, stage-graph pattern for pipeline skills |
| `payload/skill-template.md` | Canonical blank SKILL.md template with the optional hygiene fields (risk / source / date_added) |
| `payload/description-writing.md` | The load-bearing field: format, five rules, before/after drills, the 60-second test |
| `payload/placement-guide.md` | Personal vs project scope; Claude Code + Codex paths; the layer discipline (skills vs always-on instructions vs one-shots) |
| `payload/validation-tdd.md` | RED/GREEN/REFACTOR behavioral validation for skills that enforce discipline or gate destructive actions |
| `examples/example-1-release-notes/` | Complete simple skill, installable as-is |
| `examples/example-2-csv-import-check/` | Complete pipeline skill showing the six-field stage contract and export-then-verify |
| `install/claude-code/` + `install/codex/` | The authoring skill in both agent layouts |

## Setup

No dependencies.

**Quick path:** `bash install/setup.sh` (add `--force` to overwrite an existing
install). Copies the authoring skill into `$CLAUDE_CONFIG_DIR/skills/write-a-skill/SKILL.md`
(defaults to `$HOME/.claude/skills/`) and mirrors it into `.agents/skills/` when
that Codex root exists.

**Manual:**

- **Claude Code:** `install/claude-code/write-a-skill.md` → your `~/.claude/skills/` (as `write-a-skill/SKILL.md` or your flat-file convention) or `~/.claude/commands/`
- **Codex:** `install/codex/write-a-skill/SKILL.md` → `<project>/.agents/skills/write-a-skill/SKILL.md`

Then say "write a skill for <workflow>" in a session.

## The core insights this kit drills

1. **The description is the product.** The picker reads only the description
   field. Verbatim trigger phrases beat elegant summaries.
2. **Anti-triggers are half the job.** "When NOT to use" is what keeps two
   similar skills from misfiring into each other.
3. **Scripts for deterministic ops, prose for judgment.**
4. **Export and verify are separate stages.** The step that produces an
   artifact never gets to grade itself.
5. **Watch an agent fail without the skill before trusting it with the
   skill.** Otherwise you don't know what the skill teaches.

## What this is NOT

Not a pack of pre-made skills (two worked examples are included as teaching
artifacts, and they do work). The product is the authoring capability. No
income or outcome promises — skill quality compounds with practice.

## Support boundary

Digital product. Setup questions: murad@aiwithmurda.com. No custom skill
authoring included.

## Lineage (honesty note)

The authoring method is a clean-room adaptation and extension of
mattpocock/skills `/write-a-skill` (MIT) — attribution in the file's Origin
section. The stage-graph, pre-ship audit, behavioral-validation, and
placement disciplines are this kit's own additions, extracted from the
author's working library. This kit ships under the MIT license — you may
reuse and adapt it freely, attribution appreciated.
