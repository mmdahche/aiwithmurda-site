---
name: handoff
description: Save a comprehensive session handoff before closing — decisions, files modified, commits, open threads, gotchas, and the exact resume command. Writes to handoffs/YYYY-MM-DD_HH-MM_<topic>.md and updates the memory index. Use when the user says "save everything before I close", "wrap this session", "hand off", "we're stopping here", or when a session nears its context limit with work in flight.
---

# /handoff — persist the session before it evaporates

Write the current session's state to disk so the next session (today,
tomorrow, any terminal) picks up cold without losing context. The handoff is
the bridge across the assistant's amnesia.

## When to use

- The user says: "save everything before I close", "wrap this session", "hand off", "we're stopping here for now"
- The session is deep into its context budget and there's a natural breakpoint
- After a major milestone (feature shipped, decision locked) — even without closing
- Before any reboot, update, or long break

## When NOT to use

- Mid-task with no natural breakpoint — finish the immediate step first
- Trivial single-edit sessions — a normal commit message carries it
- As a substitute for committing code — commit first, then hand off

## Steps

1. **Name the topic** — short kebab-case slug for what this session was
   about (`checkout-refund-flow`, `q3-pricing-decision`).
2. **Write to** `handoffs/$(date +%Y-%m-%d_%H-%M)_<topic>.md` (project-local
   `handoffs/` dir; create it if missing). The timestamp prefix kills
   overwrite risk; the topic makes it self-describing. One convention,
   forever — schema drift is how handoffs get lost.
3. **Compose these sections** (skip only if genuinely empty):
   - **Goal** — what this session was trying to accomplish
   - **Current state** — done / in-flight / blocked
   - **Decisions locked** — each with the why and the discarded alternatives
   - **Files modified** — absolute paths, created vs edited
   - **Commits** — hash + message
   - **Environment/config changes** — anything load-bearing that would be
     expensive to rediscover (env vars set, services configured, DNS…)
   - **Open threads** — pending questions, deferred work, things awaiting the user
   - **Gotchas** — "don't do X because Y"; the hard-won context that costs
     hours if lost. Never skip this one.
   - **Next concrete step** — the exact command or action to resume with
   - **Resume command** — the literal one-line prompt to paste into a fresh session
4. **Verify before declaring done** (a handoff that hides a regression is a
   trap for tomorrow-you):
   - Run the project's test command if one exists; record pass/fail in
     Current state. "No tests" is a valid record.
   - Re-read the session's diff (staged + unstaged + untracked) and scan for
     anything unintended — secrets, debug prints, half-edits. Concerns go
     under Gotchas, and loudly in the printed summary, never buried.
5. **Update the memory index** — one line in MEMORY.md pointing at the
   handoff, trigger-phrased ("resuming <project> work → read this").
6. **Print the summary**: the handoff path + the exact resume command.

## Reference, don't paraphrase (the anti-bloat rule)

Cite artifacts by path; never restate them. Commits already have messages;
plans already have plans; reports already have findings. The handoff is a
POINTER document — if the next session needs depth, it opens the artifact.

- Wrong: three paragraphs re-describing the feature that shipped.
- Right: "Feature shipped — see commit abc123 + docs/feature.md for design."

## What always goes in, even when it feels obvious

The resume command. The open threads (they decay fastest). The gotchas
(they're the reason handoffs exist).

## Related

- `/resume` — the consuming side: loads the latest handoff and presents it.
- `/dispatch` — for work that should continue in the background instead of stopping.
