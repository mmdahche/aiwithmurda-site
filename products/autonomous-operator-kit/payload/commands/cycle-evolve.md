---
name: cycle-evolve
description: Mid-cycle self-extension. Creates a new skill, memory, diagnostic script, or operating-instruction edit based on a recurring pattern just noticed. Use during /operator-cycle when a pattern repeats 2+ times, a learning is worth codifying, or a failure mode could be auto-watchdogged.
risk: high
version: 1.0
---

# Cycle Evolve

The meta-skill that lets `/operator-cycle` grow itself mid-flight. Codifies recurring patterns into permanent artifacts.

## When to use

- A pattern the loop has repeated 2+ times that could be a slash command
- A learning worth codifying as a feedback memory
- A failure mode that could have an auto-watchdog
- A manual investigation that could be a daily diagnostic
- An anti-pattern about to be re-discovered in production
- The operator says `/cycle-evolve <description>` explicitly

## When NOT to use

- Single-file typo fixes (use a direct edit)
- One-off investigations that won't recur
- Trivial wrapper scripts that don't compound future cycles
- Anything that requires writing to the protected-path list (the firewall will block; surface instead)

## Steps

1. **Decide the artifact type** from the description:

   - Slash command / skill → your platform's skills directory (typically a protected path — route via patches dir, then manual apply by the operator)
   - Feedback memory → your platform's memory directory (also typically protected — route via patches dir)
   - Diagnostic script → `$CYCLE_ROOT/scripts/<name>.<ext>` (allowed write surface)
   - Project-local script → project repo path (must be in `project_allowlist`)
   - Operating-instruction edit → your platform's root guidance files (PROTECTED — never write via `/cycle-evolve`; surface as a proposal instead)

2. **Write the artifact** with:

   - Frontmatter (for memories / skills — match your platform's skill template if you have one)
   - Self-contained runnable code (for scripts)
   - One paragraph on WHY it exists (the recurring pattern that justified it)
   - Clear application criteria (when does this fire / get applied)

3. **Route through a patches directory for protected destinations:**

   - If the destination is a protected path (your platform's skills / hooks / agents / memory dirs), write to `$CYCLE_ROOT/patches/evolve-<name>-<date>/` with an `APPLY.md` describing the manual apply steps.
   - Surface to the operator with the patch path — DO NOT attempt to bypass the firewall.

4. **Wire it in:**

   - Memory → add a line to your memory index (patches dir if protected)
   - Script → register via `/schedule-task` if it should recur
   - Skill → apply the patch, then reload skills in your platform

5. **Append to `capabilities.jsonl`** (CYCLE-CONTRACT § 3):

   ```json
   {"ts":"<ISO-8601>","cycle":<N>,"capability":"<kebab-case>","category":"skill|memory|diagnostic|refactor|cron|firewall","artifact_path":"<absolute path>","trigger":"<one-sentence cause>","effect":"<one-sentence forward impact>","commit":"<sha>","depth_level":<1-6>}
   ```

   `artifact_path` must exist on disk before this line is written (anti-speculative-write).

6. **Output:**

   - Path of new file(s)
   - One-sentence summary
   - How to invoke / when it triggers
   - Patch-apply instructions if the destination was protected
   - Capability log entry written

## Naming convention

- Skills / commands: kebab-case verb-noun (`depth-check`, `cycle-evolve`, `agent-status`)
- Memories: `feedback_<topic_or_pattern>.md`
- Scripts: kebab-case (`agent-task-hygiene.sh`, `memory-watchdog.js`)

## Anti-pattern

Don't invoke `/cycle-evolve` for trivial changes. If the description doesn't describe a recurring pattern that needs codifying, decline and propose what should be evolved instead.

## Firewall-aware behavior

Per CYCLE-CONTRACT § 5, `/cycle-evolve` MAY write only to:

- `$CYCLE_ROOT/**`
- Project repos in `project_allowlist`
- Its own companion skills (`operator-cycle.md`, `depth-check.md`, `cycle-evolve.md`, `schedule-task.md`, etc.)

For ANY other destination, route through `$CYCLE_ROOT/patches/evolve-<name>-<date>/` and surface to the operator. The firewall enforces this — attempting to bypass will hard-block the cycle.

## Why it exists

The compounding-depth rule + the self-evolve rule jointly require that each cycle produce new capabilities. `/cycle-evolve` is the explicit lever for that. Without it, the loop degenerates into "ship bug fixes" — which violates the must-ship-and-self-evolve composition.

## Related

- `/operator-cycle` calls this when a pattern repeats.
- `/schedule-task` for the cron-registration case (separate skill).
- Optional decision-review process for evolve decisions that involve tradeoffs (e.g., a new memory whose generality is unclear).
