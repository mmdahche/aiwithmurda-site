# START HERE — Memory OS ("Give Your Claude a Soul")

You bought the persistence layer: identity that survives session death, a
memory system that stays cheap to load and true over time, and the three
commands that bridge sessions — handoff, resume, dispatch. This is the
de-personalized template edition of the system the author runs his own
operation on, every day.

## Your first win in 3 steps (~30 minutes)

1. **Write the soul (15 min):** open `payload/templates/SOUL.md`, fill the
   brackets — name, role, voice, five standing rules, red lines. This is the
   highest-leverage file in the product; don't rush the voice section.
2. **Install the contract (10 min):** merge `payload/templates/AGENTS-ADDON.md`
   into your agent's workspace file (AGENTS.md or CLAUDE.md), create
   `MEMORY.md` from the template plus empty `memory/` and `handoffs/` dirs,
   and copy the three commands from `install/claude-code/` (Codex:
   `install/codex/`).
3. **Prove the bridge (5 min):** end your next real session with `/handoff`,
   open a fresh terminal, `/resume`. Watching a cold session present
   yesterday's open threads is the moment this product clicks.

Then read `examples/first-week.md` — a realistic day-by-day of the first
seven days, including the one failure mode that kills the system (skipping
the weekly ten-minute curation).

## Where everything is

- `payload/templates/SOUL.md` — the identity template (fill-in, two pages max)
- `payload/templates/AGENTS-ADDON.md` — the memory operating contract for your workspace file
- `payload/templates/MEMORY.md` + `daily-note.md` — the slim index + the raw daily note
- `payload/templates/workspace-map.md` — the multi-project router (for portfolio owners)
- `payload/boot-ritual.md` — what loads at session start, in what order, and what never auto-loads
- `payload/memory-index-system.md` — clusters, the always-on set, correctness-beats-age, the weekly ritual
- `payload/heartbeat.md` — proactive background upkeep with hard honesty rules
- `payload/commands/` — `/handoff`, `/resume`, `/dispatch` (both agent layouts in `install/`)
- `VERIFY.md` — the checklist we ran before shipping; re-run it

## The one rule

The system is rituals, not files. The files are twenty minutes of setup; the
value is the ten-minute weekly curation and the handoff-at-session-end habit.
Keep those two alive and the assistant compounds; drop them and you own a
folder of templates.
