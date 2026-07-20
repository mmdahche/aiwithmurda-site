# Memory OS — "Give Your Claude a Soul"

Your AI stops forgetting who you are every morning. Memory OS is the
persistence layer for Claude Code / Codex power users: a written identity
(SOUL.md), a memory architecture that stays cheap to load and true over
time (slim index + clusters + daily notes), session bridging (handoff /
resume), safe background delegation (dispatch), and the boot ritual that
assembles it all in under a thousand tokens per session.

This is the de-personalized template edition of the system the author runs
his multi-project operation on daily — the patterns are lifted from working
machinery, not invented for a product page.

## Who this is for

Power users who lose context every session: re-explaining the project, the
preferences, the decisions already made, the mistakes already corrected. If
you've ever typed the same orientation paragraph into a fresh session for
the third time in a week, this is the fix.

## Time to first value

~30 minutes to a working install; the "it clicks" moment is your first
`/handoff` → fresh terminal → `/resume` round trip (day 2-3 of
`examples/first-week.md`).

## What's inside

| Piece | What it does |
|---|---|
| `templates/SOUL.md` | The identity file: name, role, voice contract, standing judgment rules, red lines — loaded every boot |
| `templates/AGENTS-ADDON.md` | The memory operating contract for your workspace file: where memory lives, write-it-down, privacy boundary, session startup |
| `templates/MEMORY.md` + `daily-note.md` | The slim index (one trigger-phrased line per memory, always-on set kept brutal-small) + the cheap raw daily note |
| `templates/workspace-map.md` | The multi-project router for home-directory portfolios |
| `boot-ritual.md` | The fixed load order, the three-grain loading discipline (cluster → section → grep), what never auto-loads |
| `memory-index-system.md` | The architecture: three memory types, correctness-beats-age pruning, the weekly ten-minute curation ritual |
| `heartbeat.md` | Proactive background upkeep — with the hard rule against faking continuity |
| `commands/handoff.md` | Session state → disk: decisions, threads, gotchas, the literal resume command — with a verify-before-writing pass |
| `commands/resume.md` | Latest handoff → "here's where we left off" with staleness rules; presents, then waits |
| `commands/dispatch.md` | Background subagents under a hard briefing + report contract; artifacts read, not believed |

All markdown. No dependencies, no services, no database — files and rituals.

## Setup

Follow `00-START-HERE.md` for the full boot ritual.

**Quick path for the three commands:** `bash install/setup.sh` (add `--force` to
overwrite). Copies `dispatch`, `handoff`, and `resume` into
`$CLAUDE_CONFIG_DIR/skills/<name>/SKILL.md` and mirrors into `.agents/skills/`
when that Codex root exists.

**Manual:** copy from `install/claude-code/` (or `install/codex/<name>/SKILL.md`
→ `.agents/skills/`).

The identity + memory templates (`SOUL.md`, `MEMORY.md`, `AGENTS-ADDON.md`,
`daily-note.md`, `workspace-map.md`) in `payload/templates/` get filled and
placed per your addon's paths — the setup script deliberately does NOT touch
those; that's a decision you make once per workspace.

## Design posture

- **Routing files never absorb content.** SOUL, the addon, and the index
  point; clusters hold. That's what keeps boot under a thousand tokens at
  scale.
- **Correctness beats age.** Memories are pruned for being wrong, never for
  being old.
- **Privacy is structural.** Long-term memory loads in direct owner sessions
  only — never group contexts, never wholesale into subagents.
- **No faked continuity.** The assistant never claims background work without
  a real scheduler confirmed running. The heartbeat doc enforces it.

## What this is NOT

- Not a vector database or RAG product — it's the file-and-ritual layer that
  makes plain markdown memory trustworthy. (It composes fine with retrieval
  systems later.)
- Not a personality pack — you write the soul; the product is the structure
  that makes it persist.
- No outcome promises. The system compounds exactly as long as the ten-minute
  weekly ritual stays alive; that part is yours.

## Support boundary

Digital product. Setup questions: murad@aiwithmurda.com. No custom
configuration service included. See LICENSE for use terms.

## Lineage (honesty note)

Original work: the templates, rituals, and command editions are the author's
own patterns, de-personalized for customer use. The daily-notes/long-term
split follows the widely-shared AGENTS.md convention for agent workspaces;
everything here is this product's own write-up of a system in daily
production use.
