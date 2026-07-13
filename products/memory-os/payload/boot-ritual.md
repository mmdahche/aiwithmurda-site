# The Boot Ritual — what loads when a session starts

Your AI wakes up with amnesia every session. The boot ritual is the fixed,
small, auditable sequence that turns a blank model into *your* assistant in
under a thousand tokens — without dumping the whole memory corpus into
context.

## The load order (keep it this small)

1. **SOUL.md** — identity, voice, standing rules, red lines. Always. It's
   short by design; if it stops being short, it's absorbing content that
   belongs in memory files.
2. **The AGENTS addon** (AGENTS.md / CLAUDE.md, per your agent) — the
   operating contract: where memory lives, how to write it, session rules.
3. **MEMORY.md — the INDEX section only.** Never the whole file by habit.
   The index names clusters; the session opens a cluster only when the task
   touches it (see memory-index-system.md).
4. **Today's + yesterday's daily note** (`memory/YYYY-MM-DD.md`) if they
   exist — the short-term thread.
5. **The latest handoff for this project, if one exists and is fresh** — see
   the `/resume` command; staleness rules apply.

That's the whole ritual. Everything else loads on demand, by name, when the
work needs it.

## The three-grain discipline (why this stays cheap)

- **Don't load the whole index** — load the cluster the task touches.
- **Don't load the whole file** — load the section the task needs. When any
  instruction says "read X", prefer "read the [Section] of X".
- **Don't load the whole section when a search will do** — grep for the
  fact; open the file only when context around it matters.

Every layer of the ritual points at something smaller than itself. Routing
files (SOUL, the addon, the index) stay content-free — they point, they
never absorb what they point to. A routing file that duplicates content goes
stale the day after it's written.

## What NEVER auto-loads

- **MEMORY.md in shared contexts.** Group chats, channels, sessions with
  anyone who isn't the owner: long-term memory stays closed. It's personal
  context; leaking it to strangers is the failure mode.
- **Secrets.** Env files and key vaults are fetched by the process that
  needs them, never "loaded for context."
- **The corpus.** Old handoffs, old daily notes, archives — reachable by
  name, never crawled at boot.

## Session-start behavior (what the assistant does with the loaded state)

1. If a fresh handoff exists (<24h): open with "here's where we left off" —
   last state, open threads, suggested next move — then WAIT. Don't
   auto-execute; the owner picks the lane.
2. If no handoff: one line of orientation ("in [project], last commit X,
   nothing in flight") and ask what's up.
3. Never re-read boot files mid-session unless something contradicts them or
   the owner asks.

## Keeping the boot honest (monthly, 5 minutes)

Count the tokens your boot set costs (roughly: total lines × a wordy line).
If it grew, something absorbed content. Move the content to a memory cluster
and put a pointer back. The boot set's job is to be SMALL and TRUE — the
memory system's job is to be big and organized.
