# Dual-Agent Command Center

Use this structure to keep Claude Code, Codex, and the human operator aligned without pasting a full transcript into every session.

## Folder structure

```text
docs/operator-system/
  version.md
  active-brief.md
  evidence-log.md
  decisions.md
  handoff.md
  deferred.md
  releases/
```

## Active brief

```markdown
# Active Brief

## Objective
[One observable outcome.]

## User and current pain
[Who needs this and what fails today?]

## Real path
[Starting state -> actions -> visible success.]

## In scope
-

## Non-goals
-

## Protected boundaries
- Authentication:
- Billing:
- Customer data:
- Production infrastructure:
- Secrets:

## Verified commands
- Develop:
- Focused test:
- Broader test:
- Build:

## Definition of done
-

## Stop condition
[When this iteration ends.]
```

## Evidence log

```markdown
# Evidence Log

## YYYY-MM-DD - [task]
- Before state:
- Change:
- Focused checks:
- Real user path:
- Screenshot, output, commit, or URL:
- Browser or device states:
- Untested:
- Result: pass | partial | fail
```

## Decision log

```markdown
# Decisions

## YYYY-MM-DD - [decision]
- Context:
- Options:
- Decision:
- Why:
- Tradeoff:
- Revisit when:
```

## Deferred list

```markdown
# Deferred

- [idea] - Not required because: [reason]. Reconsider when: [condition].
```

## Handoff

```markdown
# Handoff

## Objective

## Current observable state

## Decisions locked

## Files changed

## Verification run

## Known limits

## Exact next action

## Do not change without approval
```

## Operating rhythm

### Start

1. Read project guidance and active brief.
2. Inspect Git state and recent handoff.
3. Confirm the current user path.
4. Choose one skill and one next action.

### Build

1. Map before editing.
2. Keep one vertical slice.
3. Capture evidence while context is fresh.
4. Ask before crossing protected boundaries.

### Review

1. Give the second agent the brief, diff, and test evidence.
2. Ask for findings, not a competing rewrite.
3. Resolve high-risk findings before polish.

### Finish

1. Run Verify Before Done.
2. Update evidence and decisions.
3. Move new ideas to Deferred.
4. Write the exact next action.

## Command-center health signals

Healthy:

- The next action is obvious.
- Both agents cite the same verified project facts.
- Completed work has evidence.
- Deferred ideas do not leak into the active task.
- A new session can resume from the handoff.

Unhealthy:

- The agent repeatedly searches for commands or files.
- Different instruction files contradict each other.
- Progress depends on transcript memory.
- Multiple agents edit the same area without checkpoints.
- "Done" has no real user-path receipt.
