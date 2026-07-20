# START HERE — The Operator Cycle (Autonomous Operator Kit)

You bought the persistent-operator loop: each cycle ships ONE substantive,
verified piece of work, logs it in a fixed format, commits with a fixed
trailer, and schedules its own next wake-up — governed by the honesty gates
and anti-decay discipline that make an unattended loop trustworthy instead
of a token furnace.

One thing to be clear about before anything else, because this product
refuses to oversell it: **sessions do not auto-continue.** The loop runs
when a scheduler or a human re-invokes it. `bootstrap.md` gives you three
wiring options; the loop's value works at any cadence.

## Your first cycle in 4 steps (~30 minutes)

1. **Bootstrap the root:** follow `payload/bootstrap.md` § 1-2 — create
   `~/.operator-cycle/` (global) or `<project>/.operator-cycle/`, copy the
   four templates in, list your allowed projects in `config.json`.
2. **Install the six commands:** `bash install/setup.sh` (add `--force` to
   overwrite an existing install) copies the six command-skills into
   `$CLAUDE_CONFIG_DIR/skills/<name>/SKILL.md` and mirrors them into
   `.agents/skills/` when that Codex root exists. Manual: copy
   `install/claude-code/*.md` into your commands/skills folder (Codex layouts
   in `install/codex/`).
3. **Run cycle 1 attended.** Say `/operator-cycle` and watch a full cycle:
   domain pick → deep work → counter-action → ship with the trailer →
   inner-log entry. Attended first runs catch config mistakes cheaply.
4. **Wire the wake-up** (bootstrap § 8) — scheduled wake-up, cron/launchd,
   or manual re-prompt — and read `examples/example-cycle-log.md` so you
   know what healthy cycle output looks like (including honest nulls).

## Where everything is

- `payload/commands/operator-cycle.md` — the loop itself: pre-cycle checks, domain rotation, depth ladder L1-L6, dispatch discipline, the ship procedure, autostop
- `payload/commands/` — the five companions: `/depth-check` (drift audit), `/cycle-brief` (digest), `/cycle-goal` (goal mode), `/cycle-evolve` (self-extension), `/schedule-task` (the wake-up wiring)
- `payload/CYCLE-CONTRACT.md` — the artifact/trailer/schema spec the loop is validated against
- `payload/CYCLE-PITFALLS.md` — the scar tissue: the failure modes already hit and coded around
- `payload/templates/` — state.json, config.json, inner-log.md, GOAL.md
- `payload/bootstrap.md` — init, write-boundary arming, git author, the three wake-up mechanisms
- `examples/example-cycle-log.md` — what real cycle entries look like
- `VERIFY.md` — the checklist we ran; re-run it, attended, before going unattended

## The one rule

Every cycle ships or honestly records a null — never performs. A >20%
null-result rate means the loop is investigating reality; a 0% null rate
means it's lying to you. Read the pitfalls file before your first unattended
night; it's short and it's all true.
