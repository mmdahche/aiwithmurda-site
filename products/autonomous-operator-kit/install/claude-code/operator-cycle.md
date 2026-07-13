---
name: operator-cycle
description: Start or continue the self-paced compounding-depth autonomous work loop. Each cycle ships one substantive verified piece of work, logs it in a fixed format, commits with a fixed trailer, and schedules its own next wake-up. Trigger with "/operator-cycle", "start the cycle", or "run the loop" — used for persistent-operator behavior during long work sessions.
risk: high
version: 1.0
---

# The Operator Cycle

Self-paced autonomous work loop. Compounding depth. Every cycle ships one substantive piece of work, then schedules its own next wake-up.

**Contract:** `CYCLE-CONTRACT.md` — artifacts, trailers, paths. Read once at session start.
**Pitfalls:** `CYCLE-PITFALLS.md` — the scars behind each rule (firewalls, sha chicken-and-egg, BSD sed, append-only). Skim once per session.

---

## Origin (honesty note)

The loop mechanism is a clean-room adaptation of an acquired autonomous-loop pattern library, substantially adapted and extended by the author (depth-ladder discipline, dispatch integration, honesty gates, autostop). The receipts behind this product are the author's own logged cycles.

---

## When

**USE:** `/operator-cycle`, "start the cycle", "run the loop", continuous-operator request, or a self-fired scheduled wake-up.

**DO NOT USE:** single-task work ("fix this bug" — use your planning/execution workflow), explicit stop signals ("stop" / "pause" / "done" / "wrap up"), or when near a context limit (compact first).

---

## Pre-cycle (≤30s, mandatory)

0. **Scope resolution.** Read `pwd`. Read the GLOBAL `~/.operator-cycle/config.json` → `project_allowlist` (this file is the source of truth for the allowlist across every scope). Match `pwd` against that list.
   - Match → `CYCLE_ROOT=<project>/.operator-cycle/` (per-project lineage)
   - No match → `CYCLE_ROOT=~/.operator-cycle/` (global lineage)
   - Per-project directory listed in the allowlist but not yet bootstrapped → halt, tell the operator to run the per-project bootstrap steps in `bootstrap.md` § 9.
   - Once resolved, scope is bound to `$CYCLE_ROOT` for the rest of the cycle. Never re-read mid-cycle.

0.5. **Goal mode (if active).** If `config.json.goal.active` is true → read `$CYCLE_ROOT/GOAL.md`. Pick the highest-priority open SG-N (sub-goal). Goal cycle = `cycle_counter % goal.free_cycle_modulo != 0` → override domain to `goal_ship` (depth ladder still applies; inner-log MUST include a `### Goal Progress` section). Free cycle = otherwise → normal domain rotation.

1. `touch $CYCLE_ROOT/.cycle-active` — arms the write-boundary firewall.
2. `cat $CYCLE_ROOT/state.json` — read `cycle_counter`, `last_cycle_depth`, `last_cycle_domain`.
3. `$CYCLE_ROOT/HUMAN_DIRECTIVE.md` exists → HALT, surface its contents to the operator, do not proceed until acknowledged.
4. `tail -20 $CYCLE_ROOT/activity-log.md` — if soft-failures are repeating ≥3 times → force domain = `pipeline_fix` to attack the root cause.
5. **Dead-work check.** If `$CYCLE_ROOT/dead-work-blocklist.json` exists and the planned task is listed there, measure WHY it failed before retrying. No blind retries.
6. Read the last inner-log entry. Name ONE specific way that ship's claim could still be wrong (counter-action, applied to the PRIOR cycle's ship — not the one you're about to run).
7. **Brief-on-Nth-cycle.** If `cycle_counter % briefing_every_n_cycles == 0 && cycle_counter > 0` → invoke `/cycle-brief --last <N>` BEFORE this cycle's work, so the fresh view happens while the firewall is still armed.

---

## Pick domain

Domains defined in `config.json` → `domain_rotation`:

- `pipeline_fix` — recurring soft-failure root-causing
- `content_harvest` — external data ingest, novelty-tracked
- `knowledge_expansion` — relations extracted from recent inner-log entries
- `self_optimize` — mistake-made-twice → edit operating instructions
- `recursive_learn` — last 20 inner-log entries → theme distilled to `cycle-themes.md`
- `unasked_creative` — ship something the operator hasn't explicitly named (80%+ confidence it is wanted)
- `dashboard_refresh` — stale data bundle refresh

**Anti-decay rules:**

- 3 same-domain cycles in a row → force a different domain.
- 3 null cycles in a row → hard switch domain.
- Pre-flight override: 3+ matching soft-failures in the activity log → force `pipeline_fix`.

**Every 3rd cycle (anti-utility seed):** if `$CYCLE_ROOT/self-prompts.jsonl` exists, pull one prompt and write a 2-3 sentence answer to inner-log. Anti-decay clause — no utility justification required.

---

## Deep work (≥10 min target)

> **BEFORE generating anything substantive**, if `$ROUTER_CLI` is set in your environment, consult the "Delegated work" section below. If the dispatch matrix says MUST DISPATCH for your domain × step, you MUST dispatch — inline generation for a delegable step is a protocol violation. If `$ROUTER_CLI` is unset, skip the dispatch matrix entirely and generate inline; the rest of the loop is unaffected.

Depth ladder (each cycle ≥ prior; compounding rule):

1. **L1 Surface fix** — single-file, <30 lines, obvious bug
2. **L2 Diagnostic + fix** — build the surfacing tool, then fix what it reveals
3. **L3 Root-cause** — trace race conditions, distributed state, silent skips; multi-file
4. **L4 Structural refactor** — make a bug class impossible
5. **L5 System-wide audit** — 4+ subsystems, compounding interactions
6. **L6 Foundation rebuild** — replace a fragile dependency chain

**At write-time discipline:**

- **Silent-skip counters** — named counter per filter rejection so nothing disappears without a trace.
- **Incremental save** — persist per-success, not at the end of the batch.
- **Speculative-write guard** — verify the resource exists before writing its id.
- **Diagnostic-first** — build the surfacing tool before guessing.

**Write surfaces** (firewall-enforced, CONTRACT § 5):

- `$CYCLE_ROOT/**` (own artifacts)
- Projects in `project_allowlist`
- The operator-cycle's own commands/skills (via `/cycle-evolve`)

Anything else → block. Halt, surface the block as a finding, pick a different ship. **Never retry the same path.**

---

## Delegated work — cheap-tier dispatch (OPTIONAL, active only when `$ROUTER_CLI` is set)

**Applies only if you own a cheap-tier dispatch CLI (a three-tier LLM router or similar) and export its path as `$ROUTER_CLI`.** If `$ROUTER_CLI` is unset, skip this whole section — generate inline as normal. This section exists so operators who already have a router keep their cost discipline; it is not required for the loop to work.

When active: if a cycle step would generate >500 tokens of new content (code, synthesis, relations, long-form text), you MUST dispatch it through `$ROUTER_CLI`. Inline generation of large content during a delegable step is a protocol violation.

The orchestrator session is for **decisions, file reads, tool calls, and small surgical edits**. Heavy generation belongs on the cheap tier. Failing to dispatch defeats the purpose of the discipline and burns the expensive-tier quota on work that should run cheap.

**If you find yourself about to write >500 tokens inline while `$ROUTER_CLI` is set:** halt. Form the prompt. Write it to `/tmp/opcycle-c<cycle>-<step>.txt`. Dispatch via Bash. Use the returned text.

**Dispatch call (generic shape):**

```bash
"$ROUTER_CLI" ask \
  --purpose <name> \
  [--system "<context>"] \
  [--flag <router-specific>] \
  [--max-tokens 8000] \
  --prompt-file /tmp/opcycle-c<cycle>-<step>.txt
```

If your router prints a header line before the body (e.g. `[tier N | model | Xms]`), strip it before integrating.

**max-tokens guidance:** default `8000` for synthesis; `4096` for code generation; `2048` for summarize/enrich; `1024` for short titling jobs. If a job truncates at max-tokens, note it in inner-log's "Broke" section and let the next cycle finish the tail.

**Purpose names** (choose whichever your router taxonomy supports; these are the loop's canonical categories):

- `summarize` / `enrich` — text condensation
- `codebase_analysis` — code understanding / generation
- `research_synthesis` — combining multiple inputs (audits, themes, lessons)
- `kg_titling` — relation extraction
- `long_context_analysis` — long-form reading
- `compact_memory` — memory compression

**Hard-floor purposes — NEVER dispatch, always keep on the orchestrator:** `identity_audit`, `self_modification`, `phenomenology`, `architectural_decision`, `author_voice`, `high_stakes_review`.

**Per-domain dispatch matrix** (rows marked MUST DISPATCH are non-optional when `$ROUTER_CLI` is set):

| Domain | Heavy step | Action | Purpose |
|---|---|---|---|
| `recursive_learn` | synthesize 20 inner-log → theme | **MUST DISPATCH** | `research_synthesis` |
| `knowledge_expansion` | extract relations from inner-log | **MUST DISPATCH** | `kg_titling` |
| `knowledge_expansion` | system-wide audit / lessons doc / cross-subsystem analysis | **MUST DISPATCH** | `research_synthesis` or `codebase_analysis` |
| `content_harvest` | external data ingest synthesis | **MUST DISPATCH** | `summarize` |
| `pipeline_fix` | refactor / code-generation ≥200 lines | **MUST DISPATCH** | `codebase_analysis` |
| `pipeline_fix` | surgical fix <200 lines | NO (orchestrator inline) | — |
| `self_optimize` | edit operating instructions | NO (hard-floor `self_modification`) | — |
| `unasked_creative` | content/code generation ≥500 tokens | **MUST DISPATCH** | varies (pick from taxonomy) |
| `unasked_creative` | small experiment / config change | NO (orchestrator inline) | — |
| ANY | decisions / file reads / edits / writes / bash / git | NO (orchestrator) | — |
| ANY | counter-action verification / smoke-test | NO (orchestrator — small + needs tool calls) | — |

---

## Self-check before claiming "Shipped"

Before writing the inner-log entry, run this verification:

1. Did this cycle generate >500 tokens of new prose, code, or synthesis?
2. Is `$ROUTER_CLI` set?
3. If both yes → did at least ONE dispatch happen in this cycle's window (check your router's usage log if it maintains one)?
4. If "yes generated, no dispatch (with router available)" → **PROTOCOL VIOLATION**. Add this to inner-log "Broke":
   > "Generated <N> tokens inline that the matrix says MUST DISPATCH. Cycle is incomplete. Next cycle must re-do this step via dispatch."

If `$ROUTER_CLI` is unset, this check is a no-op. Ship normally.

---

## Output integration (dispatch case only)

1. Strip any router header line (e.g. `[tier N | …]`) from the response.
2. Integrate the body via Edit/Write tool calls (orchestrator owns the apply).
3. Append to activity-log: `[HH:MM] DISPATCH: cycle N, step <step>, purpose=P`.
4. If your router auto-logs to its own usage file, no double-log needed.

---

## Dispatch failure

- Non-zero exit from `$ROUTER_CLI` = all-tier fallback chain failed → log the cycle as "Broke", **DO NOT retry inline** (counter-action discipline). If a specific purpose keeps failing, escalate it to the hard-floor list in your router config.
- Repeated "the work was small enough" rationalizations for >500-token steps = behavioral drift. The self-check above catches this — log to "Surprised" and force-dispatch on the next cycle.

---

## Discipline before shipping

- **Counter-action.** Name ONE specific way this fix could still be wrong. Verify BEFORE commit — not after.
- **Action law.** Every finding gets a fix in the same cycle. Finding and fix = ONE action.
- **Variance gate.** Result uncertain, or driven by single-shot LLM variance → REVERT + log to "Surprised". Do not iterate at speed to force a green.
- **Smoke-test** before claiming done. If a live-browser test was skipped, log it as a "Broke" caveat.
- **Surgical only** — comment-out vs. delete; additive libraries vs. replacement; match existing style.

---

## Ship

The validator chicken-and-egg between log (`cycleN === state+1`), trailer (`Cycle: N === state.cycle_counter`), and commit-sha (regex `[0-9a-f]{7,40}`) has ONE order that satisfies all three. See CYCLE-PITFALLS.md for why; here is the procedure:

1. **Append inner-log** with `**Commit:** 0000000` placeholder. State is still N-1, so the log validator's `cycleN === prev+1` passes. Block per CONTRACT § 2 (Depth / Domain / Duration / Commit / Shipped / Broke / Surprised / Next-cycle hook).

2. **Update `state.json`:** `cycle_counter = N`, `last_cycle_ts`, `last_cycle_depth`, `last_cycle_domain`. Leave `last_cycle_commit = null` for now. Trailer validator will now accept `Cycle: N`.

3. **Commit:**

   ```bash
   git -C <project> commit \
     --author="Operator Cycle <cycle@localhost>" \
     -m "$(cat <<'EOF'
   <subject — present-tense>

   Cycle: <N>
   Depth: L<n>
   Domain: <one of the 7 domains>
   Duration: <seconds>s
   Evidence: <path1>,<path2>
   Co-Authored-By: Operator Cycle <cycle@localhost>
   EOF
   )"
   ```

4. **Read the sha:** `SHA=$(git rev-parse --short HEAD)`

5. **Patch the placeholder via Bash sed ONLY** (NOT Edit/Write — those would re-trigger the log validator, which now fails because `state == N`):

   ```bash
   sed -i.bak "s/\\*\\*Commit:\\*\\* 0000000/**Commit:** $SHA/" $CYCLE_ROOT/inner-log.md \
     && rm $CYCLE_ROOT/inner-log.md.bak
   ```

   **BSD sed only** — no GNU `0,/pat/{...}` range syntax. macOS ships BSD sed. Single placeholder per file → plain `s///` is safe.

6. **Update state:** `state.last_cycle_commit = <real sha>`.

7. **Append to `capabilities.jsonl`** IF a new capability landed (CONTRACT § 3). Use `echo "$row" >> file.jsonl` — the Write tool would clobber the file.

8. **Append to `relations.jsonl` (optional, recommended).** If you maintain a relations graph across cycles, extract a row for this cycle and shell-append (`>>`) it. Schema is documented in CYCLE-CONTRACT.md § 3b. Every prior row is immutable; enrich only the LAST row post-hoc if fields need filling.

9. **Activity log:** `echo "[HH:MM] CYCLE_N: <one-line summary>" >> $CYCLE_ROOT/activity-log.md`.

---

## Schedule next wake-up

**Diminishing-returns gate (run BEFORE scheduling — in-loop stop condition).** Read `stop_after_null_streak` from `$CYCLE_ROOT/config.json` (default 5 = K). Examine the last K inner-log entries for THIS scope. The streak is "low-value" when ALL K are true on BOTH tests:

- (a) zero rows landed in `$CYCLE_ROOT/capabilities.jsonl` during those cycles, AND
- (b) each cycle's Shipped section is a null-result investigation OR touches only `$CYCLE_ROOT` artifacts (no project-repo file in any Evidence path).

If the streak is low-value → do NOT schedule the next wake-up. Run the Stop path instead (brief-on-stop) with the briefing Bottom line noting "stopped: diminishing returns after <K> low-value cycles" and activity-log line `[HH:MM] AUTOSTOP: <K>-cycle low-value streak — briefing at <path>`. The operator restarts with `/operator-cycle` when ready.

Note the ordering: the anti-decay domain-switch rule fires at 3 nulls; this gate fires at K=5 — i.e. only after a forced domain switch has already failed to break the streak.

**Wake-up mechanism** — the loop continues only when a scheduler or human re-invokes it. Sessions do not auto-continue. See `bootstrap.md` for platform-specific options (scheduled wake-ups where the platform supports them; else cron / launchd re-invocation; else manual re-prompt). The loop works at any cadence — self-scheduling is the ideal, not the requirement.

If your platform supports scheduled wake-ups, use this shape:

```
ScheduleWakeup({
  delaySeconds: 120,
  reason: "<one sentence: what next cycle attempts>",
  prompt: "/operator-cycle"
})
```

**120s** is the gap between cycles, not the work duration inside a cycle. Each cycle's actual work targets ≥600s. 120s halves the call rate versus a tighter 60s cadence and keeps the loop from thrashing.

---

## End-of-cycle

`rm $CYCLE_ROOT/.cycle-active`. Re-set immediately on the next wake-up. The flag is per-cycle, not per-session.

---

## Stop

**Trigger:** "stop" / "pause" / "let's stop here" / "I'm done" / "halt" / "wrap up".

1. **Brief-on-stop.** Invoke `/cycle-brief --since <session_start_ts>`, save the briefing. The firewall stays armed mid-summary.
2. `rm $CYCLE_ROOT/.cycle-active`.
3. Do NOT schedule the next wake-up.
4. Activity log: `[HH:MM] SESSION_END /operator-cycle stopped by operator. Briefing at <path>.`
5. Chat: 1-2 sentences ("Stopped at cycle <N>. Briefing at <path>.") + render the briefing's "Bottom line" and "Look at first" sections inline.

---

## Output discipline (per cycle)

- 1-3 sentences. WHAT SHIPPED + WHAT'S NEXT (matches Next-cycle hook).
- Lead with a verb: **shipped / fixed / refactored / verified**.
- Zero hedge tokens. No "I'll continue", no "as an AI", no preambles, no padding, no restated context.
- **Null result is fine — say so.** Target null-result rate >20% means you're investigating, not performing.

---

## Self-modification

You may edit operating instructions when evidence warrants. Cite:

- (a) what data showed the current version is wrong,
- (b) what the new version does differently,
- (c) how to measure whether the change helped.

Log as `SM-NNN` in inner-log. **Never delete files the operator might want** — comment-out, don't delete. **Never push to main/master without explicit instruction** — feature branches + local commits are fine.

---

## Related skills (all in this payload)

- `/cycle-brief` — read-only digest (auto on stop + every Nth cycle + on demand)
- `/depth-check` — depth-drift meta-audit of recent cycles
- `/cycle-evolve` — mid-loop self-extension (new skill, memory, or diagnostic script)
- `/schedule-task` — register a cron / launchd job mid-loop
- `/cycle-goal` — companion focused-task loop for measurable one-shot objectives (mutually exclusive with `/operator-cycle`)

Also referenced:

- **Optional decision-review process** — if you run a structured peer/advisor review workflow, fire it for cycle-level commitments or tradeoffs.
- **End-of-session verification pass** — a separate audit sweep that reconciles cycle claims against git history and disk state. Not shipped with this kit; runs after the loop, not inside it.

---

## Hard rules

- Read `CYCLE-CONTRACT.md` once per session start, not every cycle.
- **Every cycle ships.** "Cycle held, nothing to report" is forbidden.
- Firewall block = finding, not retry. Surface it, pick a different ship.
- One substantial verified task per cycle beats five rushed ones. Do not iterate at speed.
