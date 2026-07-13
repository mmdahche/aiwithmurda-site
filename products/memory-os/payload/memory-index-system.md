# The Memory Index System — slim index, clustered corpus

Long-term memory fails in two directions: the assistant remembers nothing
(no system), or the "memory" becomes a swamp the assistant can't afford to
load (everything system). The slim-index pattern threads it: a small index
that routes, clusters that hold content, and a curation rhythm that keeps
both honest.

## The architecture

```
MEMORY.md                     ← the INDEX: one line per memory, grouped in clusters
memory/
  YYYY-MM-DD.md               ← daily notes: raw, cheap, append-as-you-go
  clusters/
    <topic>_<thing>.md        ← durable memories: decisions, references, feedback rules
handoffs/
  YYYY-MM-DD_HH-MM_<topic>.md ← session state snapshots (see the /handoff command)
```

## MEMORY.md — the index contract

- **One line per memory:** `[[cluster_file_name]] — one-sentence description
  with the trigger ("read when…")`. The description is the retrieval surface;
  write it for the moment it should fire, not as a summary.
- **Grouped in clusters:** decisions / references / feedback-rules / projects
  — whatever cuts your work at its joints. A session loads a cluster, not the
  index's whole tree.
- **An ALWAYS-ON set, kept brutal-small:** 3-7 load-bearing memories marked
  for every session (your equivalent of "the stove is hot"). Everything else
  loads by trigger.
- **The index never holds content.** The moment a MEMORY.md line grows a
  second sentence of substance, that substance belongs in the cluster file.

## The three memory types (name them in frontmatter)

| Type | What it is | Example shape |
|---|---|---|
| `decision` | A call that was made, with the why — so it isn't re-litigated | "We charge one-time, not subscription, because…" |
| `reference` | Stable facts about a system/tool/account | "The deploy pipeline: push → build → smoke; the gate is X" |
| `feedback` | A behavioral rule learned from a mistake — the scar tissue | "Never rename entitlement keys; add only. Origin: the day we…" |

Feedback memories are the highest-value class: each one is a bug in the
assistant's behavior, patched permanently. When the owner corrects the
assistant twice for the same thing, that's a feedback memory being born.

## Correctness beats age

Never prune a memory because it's old — prune it because it's WRONG. A
two-year-old decision that still binds is load-bearing; a two-week-old note
superseded yesterday is noise. Curation asks one question per line: "is this
still true and still needed?" — never "is this recent?"

## Write-it-down (no mental notes)

If it should survive the session, it goes in a file — during the session,
not at the end from memory:

- Owner says "remember this" → daily note now, cluster file at curation.
- A lesson is learned → feedback memory, with the origin story in one line.
- A decision locks → decision memory, with the losing options named.

"Mental notes" die at session end. Text survives. That rule is the whole
system in one sentence.

## The curation ritual (weekly, ~10 minutes — the system's heartbeat)

1. Read the week's daily notes once.
2. Promote: 1-3 things that deserve cluster files get them (most days
   produce zero promotions — that's healthy).
3. Update the index: one line each, trigger-phrased.
4. Demote: any always-on memory that didn't earn its slot this week loses it.
5. Correct: anything the week proved wrong gets fixed IN the memory file,
   with a one-line "corrected YYYY-MM-DD because…" trail.

Skip the ritual for a month and the index quietly rots into fiction — the
staleness rules in `/resume` are the backstop, not the plan.

## Privacy boundary (non-negotiable)

MEMORY.md and cluster files are OWNER-PRIVATE. They load in direct sessions
only — never in group contexts, never into subagent briefings wholesale
(dispatch passes the 2-4 specific files a task needs, by path). The memory
system knows things about your business and your people; treat its files
like the credentials they effectively are.
