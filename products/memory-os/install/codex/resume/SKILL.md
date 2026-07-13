---
name: resume
description: Rehydrate a session from the most recent handoff for the current project — read it fully, present "here's where we left off" (state, open threads, suggested next move), then wait for the user to pick a lane. Use when the user says "pick up where we left off", "resume", "where were we", or opens a project cold after a break.
---

# /resume — pick up where the last session left off

Bring a fresh session back up to speed from the latest handoff, present the
state cleanly, and let the user choose the thread. The counterpart to
`/handoff`.

## When to use

- The user says: "pick up where we left off", "resume", "where were we", "what were we working on"
- A fresh terminal opens in a project that has a handoff less than a day old
- After a reboot or a break longer than a few hours

## When NOT to use

- No prior handoff exists — say so plainly and ask what to work on; don't improvise a history
- The user says "fresh start" or "new task" — respect the framing, skip the rewind
- The question is cross-project/meta — project handoffs are the wrong source

## Steps

1. **Find the latest handoff** for this project: `handoffs/*.md`, filtered by
   the project, newest mtime first.
2. **Read it in full** — every section. (Skimming a handoff defeats the
   entire system; it's already the compressed version.)
3. **Cross-check the memory index** for recent entries pointing at additional
   context for the same topic.
4. **Present the tight summary:**
   - **Last session ended:** when + the one-line goal
   - **Current state:** done / in-flight
   - **Open threads:** in priority order
   - **Suggested next move:** the handoff's own next step
5. **Offer 2-4 threads, then STOP.** The user picks the lane; never
   auto-execute the resume.

## Staleness rules (state drifts; say so)

| Handoff age | Behavior |
|---|---|
| < 24h | Load fully, no caveat |
| 1-7 days | Load fully + "this is from N days ago; state may have drifted" |
| > 7 days | Load with a prominent warning; recommend a quick fact-check (git log, file mtimes) before acting on contents |
| > 30 days | Historical context only; treat as starting fresh |

## Surface vs keep quiet

**Surface:** open threads, blockers, anything the user was waiting on.
**Keep quiet unless asked:** exhaustive file lists, every commit hash, full
decision rationale — they bury the lede; the user can ask.

## Multiple recent handoffs for one project

That usually means parallel terminals on different aspects. List the 2-3 most
recent by topic and ask which to load — never merge them automatically.

## Related

- `/handoff` — the producing side.
