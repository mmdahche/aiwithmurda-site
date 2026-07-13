---
name: depth-check
description: Meta-audit of recent operator-cycle ships to flag depth-drift. Reads the last 8 cycle entries, classifies each by depth-level 1-6, computes trend, and proposes one specific Level-N+1 investigation. Use when the operator asks "are cycles going deep enough?" or autonomously every 8 cycles.
risk: low
version: 1.0
---

# Depth Check

Read-only meta-audit that enforces the compounding-depth rule: each cycle ≥ depth-level of the previous. Flags regression to micro-patches.

## When to use

- The operator asks "are we drifting?", "depth audit", "are cycles getting deeper?"
- Autonomously every 8th cycle (counted via `state.json` → `cycle_counter`)
- Before an `/operator-cycle` session resumes after a pause >2 hours

## When NOT to use

- During an active cycle's work phase (this is a post-hoc audit)
- When fewer than 3 cycles exist in `inner-log.md` (insufficient data)

## Steps

1. **Read the last 8 cycle blocks** from `$CYCLE_ROOT/inner-log.md`. If fewer than 8 exist, audit what's there.

2. **Classify each by Depth field** (already declared in each block per CYCLE-CONTRACT § 2):

   - **L1** surface fix — single-file, <30 lines
   - **L2** diagnostic + fix — built a surfacing tool, then fixed
   - **L3** root-cause — traced race / silent-skip; multi-file
   - **L4** structural refactor — changed architecture to make a bug class impossible
   - **L5** system-wide audit — 4+ subsystems
   - **L6** foundation rebuild — replaced a fragile dependency chain

3. **Compute trend:**

   - **Rising** — last 3 cycles average > first 3 cycles average
   - **Flat** — within ±0.5
   - **Regressing** — last 3 average < first 3 average

4. **Verdict + concrete next-deeper investigation:**

   - Rising → praise + propose one specific Level-(current_max+1) move
   - Flat → identify the deeper layer of current work
   - Regressing → call it out + propose a specific Level-(prev_max+1) problem

5. **Output format (≤250 words):**

   ```
   DEPTH AUDIT — last <N> cycles

     [CYCLE-N]   L<d>  <summary from Shipped section>
     [CYCLE-N+1] L<d>  <summary>
     ...

   Trend: <e.g. L1×3 → L2×2 → L3×3. Rising after L1 drift.>

   Next-deeper candidate (Level <N>):
     → <specific named investigation, not "go deeper">
     Trace the actual <exit code / state / observable> in <subsystem>.
     Classify whether it requires:
       (a) <level + reason>
       (b) <level + reason>
     Don't ship a band-aid. Ship the structural fix.
   ```

6. **Do NOT ship anything.** This is read-only. Output goes to the cycle's text response, not to `inner-log.md`.

## Output discipline

- Under 250 words total.
- Specific subsystem + specific question — never "go deeper".
- Reference cycle numbers (`CYCLE-N`) not raw shas.

## Why it exists

Without active depth-monitoring, autonomous cycles drift to comfortable micro-patches. The compounding-depth rule makes the rule schema-enforced by the log validator, but human-readable audits catch subtler drift the schema misses (e.g., L3 commits that are really L2 with extra files).

## Related

- `/operator-cycle` invokes this autonomously every 8 cycles.
- Your end-of-session verification pass may use this same depth classification when reconciling cycle claims.
