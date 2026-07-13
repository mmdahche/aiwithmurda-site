---
name: cycle-goal
description: Run a focused autonomous task until a measurable done-condition is met, then PAUSE for operator review. Triggers when the operator says "/cycle-goal", "set a goal", or "work on X until Y". Companion to /operator-cycle — same pwd-based scope resolution, opposite philosophy. /operator-cycle compounds forever via domain rotation; /cycle-goal finishes one thing and stops. Use for research, README cleanup, single-feature builds, focused deep-work.
risk: medium
version: 1.0
---

# Cycle Goal — focused task loop until done

Entry point for goal-driven autonomous work. Unlike `/operator-cycle` (which compounds forever), `/cycle-goal` runs until a measurable done-condition is met, then pauses and returns control for review.

**Companion contract:** `CYCLE-CONTRACT.md` § 12 (Goal mode addendum).

## When to use

- `/cycle-goal [task] until [measurable end state] without [constraints]`
- `/cycle-goal research [topic]`
- `/cycle-goal improve [file] until [criteria]`
- Single focused objective with a clear done-condition.

## When NOT to use

- General "keep working / keep compounding" — use `/operator-cycle`.
- Tasks without measurable completion — clarify the `until` before invoking.
- Tasks needing multi-cycle depth-ladder compounding — use `/operator-cycle`.
- Multiple competing objectives — split them or use `/operator-cycle`.

## The 3-element formula

```
/cycle-goal [do the work] until [measurable end state] without [constraints]
```

- **Goal:** what to do (one clear sentence)
- **Until:** the done-condition — must be *observable* (file exists, test passes, query returns N rows, grep matches, etc.). Required.
- **Without:** constraints — scope guards, do-not-touch lists. Optional; defaults to "no scope creep, no new dependencies, no writes outside project scope, no protected-path writes."

### Examples

- `/cycle-goal research everything recent about autonomous agent loops until I have a structured comparison of the top 5 community frameworks in docs/loops-compare.md without installing anything`
- `/cycle-goal improve README so any contributor can install/run/test until a fresh-clone test passes (clone → make install → make test exits 0) without breaking existing examples`
- `/cycle-goal build parser v1 until 10 sample inputs in tests/fixtures/ parse correctly per SPEC.md § 6 without touching modules outside src/parser/ or adding dependencies`

## Pre-goal setup (≤30s)

0. **Resolve scope (pwd-based, same as `/operator-cycle`).** Read `pwd`. Read the GLOBAL `~/.operator-cycle/config.json` → `project_allowlist`. If `pwd` matches, set `GOAL_ROOT=<that_project>/.operator-cycle/goal/`. Else `GOAL_ROOT=~/.operator-cycle/goal/` (global).

1. **Refuse if a `/cycle-goal` is already active** — check `$GOAL_ROOT/.active`. If present, surface the current state and HALT — tell the operator to `/pause`, `/cycle-goal clear`, or wait for completion.

2. **Refuse if `/operator-cycle` is active** — check `$CYCLE_ROOT/.cycle-active`. If present, HALT — only one autonomous loop at a time per session.

3. **Parse the invocation:**

   - Strip leading `/cycle-goal`.
   - Split at ` until ` — left = goal text, right continues.
   - Split right at ` without ` — left = done condition, right = constraints.
   - **Refuse if `until` is missing** — the loop has no exit condition.

4. **Initialize state:** `mkdir -p $GOAL_ROOT` then write `$GOAL_ROOT/state.json`:

   ```json
   {
     "goal": "<parsed>",
     "until": "<parsed>",
     "without": "<parsed or default>",
     "started_at": "<ISO timestamp>",
     "iteration": 0,
     "max_iterations": 20,
     "status": "active",
     "scope": "<project slug or 'global'>"
   }
   ```

5. **Set active flag:** `touch $GOAL_ROOT/.active`.

6. **Initialize inner-log:** create `$GOAL_ROOT/inner-log.md` with header. Append-only thereafter.

## Iteration loop

Each iteration targets ≤10 min. Hard cap: 20 iterations by default (configurable in `state.json`).

1. **Check pause flag:** if `$GOAL_ROOT/.paused` exists, write a PAUSED entry to inner-log, surface state, HALT. Do not auto-resume — the operator must `/cycle-goal resume`.

2. **Do work.** Focused on the goal. Touch only files needed. Respect `without` constraints — if a candidate write would violate them, log a "Surprised" note in inner-log and pick a different approach. Do NOT auto-bypass.

3. **Check done condition.** Evaluate the `until` predicate against *observable* state:

   - File existence / count
   - Test command exit code + output pattern
   - Grep match / JSON field value
   - **Measurable, not vibey.** "Until it's better" → reject; ask for a measurable `until`.

4. **Append iteration entry** to `inner-log.md`:

   ```
   ## ITERATION <N> — <ISO timestamp>
   **Done this iteration:** ...
   **Remaining toward done:** ...
   **Why not done yet:** ...
   ---
   ```

5. **Increment iteration counter** in `state.json`.

6. If done → go to Ship. If not done and iteration < max → continue (schedule the next wake-up if your platform supports it, or run inline). If iteration == max → HALT with an "iteration cap reached" handoff.

## Ship (done-condition met)

1. **Final smoke-test.** Verify the `until` predicate actually holds. If verification fails, log "Surprised" and continue iterating.

2. **Commit changes with the goal trailer** (if files changed):

   ```
   <commit subject>

   Goal: <one-line>
   Until: <done condition>
   Iterations: <N>
   Duration: <total seconds>
   Evidence: <comma-separated paths or shas>
   Co-Authored-By: Operator Cycle (Goal) <cycle-goal@localhost>
   ```

3. **Write completion handoff** at `$GOAL_ROOT/handoffs/<YYYY-MM-DD>-<slug>.md`:

   - Goal, until, without
   - Iterations + duration
   - What shipped (paths / shas)
   - What was outside scope (paused for human review)
   - Next-cycle hook (optional follow-up candidate)

4. **Clear `.active`.** Update `state.json`: `status = "completed"`, `completed_at = "<ISO>"`.

5. **Append `SESSION_END`** entry to inner-log.

6. **Announce completion** with a concrete summary + handoff path.

## Pause / clear / status / resume

- **`/pause`** — `touch $GOAL_ROOT/.paused`. Goal halts at the next iteration boundary.
- **`/cycle-goal clear`** — abandon the current goal. Move `state.json` + `inner-log.md` to `$GOAL_ROOT/cleared/<ISO>/`. Remove flags. `status = "cleared"`.
- **`/cycle-goal status`** — print `state.json` + iteration count + time elapsed + last 3 iteration entries.
- **`/cycle-goal resume`** — remove `.paused`, continue the iteration loop. Requires `.active` still present.

## Pairing with `/operator-cycle`

- ONE autonomous loop at a time per session. `/cycle-goal` and `/operator-cycle` are mutually exclusive.
- Same pwd-based scope. `/cycle-goal` writes to `<scope>/.operator-cycle/goal/`; `/operator-cycle` writes to `<scope>/.operator-cycle/`. No cross-writes.
- A `/cycle-goal` completion can be referenced by the next `/operator-cycle` in its "Next-cycle hook" section.
- Commit trailer distinguishes: `Operator Cycle (Goal) <cycle-goal@localhost>` vs `Operator Cycle <cycle@localhost>`.

## Selection rule

| Need | Use |
|---|---|
| Keep shipping forever, climb depth ladder | `/operator-cycle` |
| Do this specific task, then stop and let me check it | `/cycle-goal` |
| Recursive learning, domain rotation | `/operator-cycle` |
| One-shot research / README / single feature | `/cycle-goal` |
| Operator is AFK and just wants progress | `/operator-cycle` |
| Operator wants an explicit review checkpoint | `/cycle-goal` |

## Pro tips

- One goal at a time per scope.
- Make the `until` measurable. "Until tests pass" ✓. "Until it's better" ✗.
- Use `without` aggressively to prevent scope creep — "without new dependencies," "without touching the auth layer," "without breaking existing tests."
- Long research goals: chunk them. Set `until` to "5 sources catalogued in X" then re-invoke with refinement.

## Firewall + safety

- `/cycle-goal` does NOT arm the operator-cycle write-boundary firewall (`.cycle-active`) by default. Project-scoped writes are still enforced by whatever protected-path rules your environment has.
- Destructive commands (`rm -rf ~`, `git push --force`, etc.) should be blocked by your usual command guards.
- A `/cycle-goal` attempting to violate the `without` constraints surfaces a "Surprised" entry — it does NOT auto-bypass.

## File layout

```
<scope>/.operator-cycle/goal/
├── state.json           # current or last-completed goal
├── inner-log.md         # append-only iteration log
├── .active              # sentinel — present while goal is running
├── .paused              # sentinel — present when paused
├── handoffs/            # per-goal completion handoffs
│   └── YYYY-MM-DD-<slug>.md
└── cleared/             # abandoned goals preserved for inspection
    └── <ISO>/
        ├── state.json
        └── inner-log.md
```

## v1.0 limitations

- No dedicated trailer validator hook. Goal-commit trailer is convention. A future version can port the operator-cycle validator into a scope-aware variant that handles both trailer formats.
- Iteration cap honored by skill, not enforced by hook.
- `/pause`, `/cycle-goal status`, `/cycle-goal resume`, `/cycle-goal clear` are documented file operations for v1.0 — a slash-command shim is future work.
- No automatic `/operator-cycle` ↔ `/cycle-goal` handoff bridging. Manual reference for now.
