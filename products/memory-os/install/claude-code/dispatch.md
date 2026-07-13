---
name: dispatch
description: Send a background subagent to do well-scoped project work while the main session stays available for conversation. Codifies the briefing template, project scoping, work cap, and structured report contract so subagents inherit the right context without inheriting the whole conversation. Use when the user says "run that in the background", "kick off X in parallel", or wants multiple tasks moving while you keep talking.
---

# /dispatch — background work with a hard contract

A dispatched subagent starts fresh: it does NOT share your conversation,
your loaded memories, or your session's judgment. This command closes that
gap with a fixed briefing template — and a fixed report contract so its
"done" can be checked rather than believed.

## When to use

- The user says: "send an agent to fix X", "run that in the background", "kick off Y in parallel", "research Z while we keep talking"
- The task is well-scoped, has clear success criteria, and needs no mid-stream judgment from the user
- Genuinely independent tasks that can run concurrently

## When NOT to use

- The task needs ambiguity resolved mid-stream → keep it foreground and talk it through
- A lookup that fits in a handful of tool calls → just do it; a subagent is overhead
- Anything needing the user's approval mid-flight → foreground only

## The briefing template (HARD CONTRACT — every dispatch includes all sections)

```
## Working directory
cd to <absolute project root>. (Project-level instruction files auto-load there.)

## Project context
Read BEFORE any work:
1. The project's agent instructions (CLAUDE.md / AGENTS.md), if present
2. <2-4 SPECIFIC memory/handoff files relevant to THIS task — explicit paths,
   never "read the memory folder">

## Task
<one tight paragraph: what to do, why, and what success looks like>

## Constraints
- Work cap: stay within a bounded effort (default: one focused task's worth).
  If the task needs more, STOP and report back rather than sprawling.
- Don't touch files outside the project unless this brief says so.
- Don't dispatch your own subagents — return here if you need help.
- Follow the standing rules in the boot files (security, no fabrication).

## Required report (exact fields)
- status: success | partial | failed
- summary: 2-3 sentences — what you did, what came of it
- files_changed: absolute paths, or "none"
- tests_run: what passed/failed, or "none run"
- deviations: anything done differently than briefed, with the reason
- next_move: specific and actionable
- blockers: what stopped you, or "none"
```

## Why the work cap exists

A cap forces scoping and keeps cost predictable. Most well-briefed tasks fit
comfortably; when one genuinely doesn't (a deep multi-source research pass, a
multi-file feature), RAISE the cap explicitly in the brief — never let an
agent decide to spiral on its own.

## After dispatch — the main session's job

1. Acknowledge in one line ("sent a builder to <project> for <task>") and stay available.
2. When the report returns: **read the artifact, not just the report.** A
   subagent's "success" is its intent, not established fact — open the files
   it claims it changed, spot-check the load-bearing claims, THEN relay,
   distinguishing "it reports X" from "I verified X".
3. `status: failed` or non-empty `deviations` → surface to the user immediately.
4. Log the dispatch and the return in your activity/audit note.

## Failure modes to watch

- Empty/null report → broken dispatch; escalate, don't retry blind
- `files_changed` doesn't match the actual diff → check version control for what really moved
- "Success" with no test output → push back for the evidence
- Two agents writing overlapping files → a coordination bug; serialize next time

## Parallel dispatch

Independent tasks dispatch together in one message and return independently.
Parallelism is free when the tasks share nothing; it's a mess when they share
files — decide which BEFORE dispatching.

## Related

- `/handoff` — when the work should stop instead of continue in the background.
- The verify-before-claiming discipline — the report contract exists so it can be applied to subagents too.
