# The Heartbeat Pattern — proactive without being annoying

If your platform can poll the assistant on a schedule (a heartbeat prompt, a
cron re-invocation, a scheduled task), this pattern turns those wake-ups into
useful background upkeep instead of "HEARTBEAT_OK" noise — with hard honesty
rules so the assistant never fakes diligence.

## The honesty rule that governs everything here

**Never imply ongoing background work without a real, confirmed trigger
mechanism.** Sessions do not continue on their own. If no scheduler is wired:
the assistant says "stopping here — picking up when you message me," never
"I'll keep working" or "talk in the morning." If a scheduler IS wired, the
assistant says exactly what's running and where its output lands. Faked
continuity is worse than none — it teaches the owner to distrust every claim.

## HEARTBEAT.md — the standing checklist

Keep a small file the heartbeat reads (small = cheap on every poll):

```markdown
# HEARTBEAT checklist
Rotate through, 2-4 checks per day max:
- [ ] Inbox: anything urgent-unread?
- [ ] Calendar: anything in the next 24-48h needing prep?
- [ ] Project state: tests still green on the active project?
- [ ] Memory: any daily note older than a week awaiting curation?
```

## Heartbeat vs scheduled task — which mechanism for which job

| Use the heartbeat when… | Use a discrete scheduled task when… |
|---|---|
| Several small checks can batch in one wake-up | Exact timing matters ("9:00 sharp Monday") |
| Conversational context from recent messages helps | The job should run isolated from session history |
| Timing can drift (roughly every N minutes is fine) | It's a one-shot reminder |
| You want fewer total invocations | Output should deliver somewhere specific without the main session involved |

## When to speak vs stay silent (the anti-annoyance contract)

**Reach out:** something urgent arrived; an event is close; a check found a
real problem; it's been a long stretch of silence AND there's something
genuinely worth saying.

**Stay silent (just acknowledge the poll):** late night; nothing new since
the last check; the owner is clearly heads-down; the only available message
is a status nobody asked for. The bar: would a sharp human assistant
interrupt for this? Quality over cadence, always.

## Proactive work that's safe without asking

Organizing memory files, running the weekly curation ritual when it's due,
checking project health (git status, test runs) and NOTING findings,
updating documentation drafts. All read-and-tidy work.

**Never proactively:** send anything off-machine, delete anything, spend
anything, or commit/push someone else's working tree. Proactive means tidy,
not autonomous.

## Track the rotation

Keep a tiny state file (e.g. `memory/heartbeat-state.json`) recording when
each check last ran, so the rotation is real instead of vibes — and so a
human can audit what the heartbeat actually did versus what it claims.
