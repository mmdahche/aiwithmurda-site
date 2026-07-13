# Operator Cycle Contract — Artifact + Trailer + Firewall Spec

**Status:** v1.0
**Purpose:** Lock the schemas, signatures, and protected-path firewall that `/operator-cycle` writes into. Without this contract, "communicate via artifacts" is unverifiable and any downstream verification pass cannot audit cycles.
**Reads downstream:** briefing renderer (`/cycle-brief`), verification pass, optional decision-review process.
**Authoritative scope:** anything `/operator-cycle`, `/depth-check`, `/cycle-evolve`, `/schedule-task` writes.

---

## 1. Why this contract exists

An autonomous loop that ships code without a stable communication contract is a liability. Three blind spots surface immediately in any real deployment:

1. **No signed / versioned commit pipeline** — a verifier cannot confirm what the loop claims it shipped.
2. **No schema-locked artifact contracts** — `inner-log.md` and `capabilities.jsonl` drift, and every downstream reader breaks silently.
3. **No protected-path firewall** — `/cycle-evolve` can write new skills and scripts. What stops it from overwriting your identity files or `~/.ssh/`?

This document closes all three.

---

## 2. Artifact: `inner-log.md`

**Location:** `$CYCLE_ROOT/inner-log.md`
**Write mode:** append-only, atomic (`.tmp` + rename, no direct overwrite).
**Reader:** `/cycle-brief`, your end-of-session verification pass.

### Entry schema (strict, validator-enforced)

Each cycle appends ONE block. Schema:

```markdown
## CYCLE <N> — <ISO-8601 UTC timestamp>

**Depth:** L<1-6>
**Domain:** <pipeline_fix | content_harvest | knowledge_expansion | self_optimize | recursive_learn | unasked_creative | dashboard_refresh>
**Duration:** <work_seconds>s
**Commit:** <git short-sha>

### Shipped
- <bullet with evidence path or git-sha>
- <bullet with evidence path or git-sha>

### Broke (caveats / known-incomplete)
- <bullet, or "none">

### Surprised (genuine prediction errors)
- <bullet, or "none">

### Next-cycle hook
<one sentence: what the next cycle should attempt, fed to the wake-up scheduler's reason field>

---
```

### Validator rules

- `CYCLE <N>` — N is monotonic +1 from the previous entry (or 1 if first).
- `Depth:` — integer 1-6, MUST be ≥ previous cycle's depth (compounding-depth rule).
- `Domain:` — exact match from the 7-value enum above.
- `Duration:` — integer ≥ 600 seconds (10-min floor).
- `Commit:` — must resolve via `git rev-parse <sha>` in the current repo.
- `Shipped:` — ≥1 bullet required (must-ship rule); each bullet must reference a file path OR a git-sha.
- All four section headers present, in order.
- `---` terminator required.

Validator script goes at `$CYCLE_ROOT/scripts/validate-log.sh` (customer implements — hook signature: exit 0 pass, exit 1 hard block, exit 2 warning-allow). Wire it as a PreToolUse hook on Write/Edit of `inner-log.md`. Pre-commit gate: cycle commit FAILS if the validator rejects.

---

## 3. Artifact: `capabilities.jsonl`

**Location:** `$CYCLE_ROOT/capabilities.jsonl`
**Write mode:** append-only NDJSON, atomic per-line.
**Reader:** `/cycle-brief` (growth-curve metric), `/depth-check` (capability trend), verification pass.

### Row schema

```json
{
  "ts": "<ISO-8601 UTC>",
  "cycle": <integer>,
  "capability": "<kebab-case-name>",
  "category": "skill|memory|diagnostic|refactor|cron|firewall",
  "artifact_path": "<absolute path of file created or modified>",
  "trigger": "<one-sentence cause>",
  "effect": "<one-sentence forward impact>",
  "commit": "<git short-sha>",
  "depth_level": <1-6>
}
```

### Validator rules

- Valid JSON per line, no embedded newlines in string values.
- `cycle` matches an existing `inner-log.md` entry.
- `category` from the 6-value enum.
- `artifact_path` must exist on disk at write-time (anti-speculative-write: verify before claim).
- `commit` must resolve in git.

---

## 3b. Artifact: `relations.jsonl` (optional)

**Location:** `$CYCLE_ROOT/relations.jsonl`
**Write mode:** append-only NDJSON.
**Reader:** any downstream cycle-graph query tool you build; optional.

### Row schema

```json
{
  "ts": "<ISO-8601 UTC>",
  "cycle": <integer>,
  "capability_keys": ["<kebab-case-name>", ...],
  "depends_on_cycles": [<integer>, ...],
  "commit": "<git short-sha>",
  "summary": "<one-sentence relation>"
}
```

Every prior row is immutable. Enrich only the LAST row post-hoc if fields need filling.

Skip this artifact entirely if you don't yet need cross-cycle graph queries. The loop functions without it.

---

## 4. Commit trailer format

Every cycle commit ends with a structured verifier-friendly trailer.

```
<commit subject line — descriptive, present-tense>

<optional body explaining the change>

Cycle: <N>
Depth: L<1-6>
Domain: <one of the 7 domains>
Duration: <seconds>s
Evidence: <path1>,<path2>,<path3>
Co-Authored-By: Operator Cycle <cycle@localhost>
```

### Validator rules

- All five trailer fields (`Cycle`, `Depth`, `Domain`, `Duration`, `Evidence`) present.
- `Cycle: N` matches the latest `inner-log.md` entry.
- `Depth: L<n>` matches the inner-log entry's `Depth`.
- `Evidence:` paths must exist on disk OR be valid git-sha references.
- `Co-Authored-By: Operator Cycle` is the canonical author signature — distinct from any other co-authorship trailer, so downstream filters can select cycle commits.

Pre-commit hook goes at `$CYCLE_ROOT/scripts/validate-trailer.sh` (customer implements).

---

## 5. Protected-path firewall

`/cycle-evolve` and `/schedule-task` MAY write to:

- `$CYCLE_ROOT/**` (own artifacts)
- The operator-cycle's own companion skills (`operator-cycle.md`, `depth-check.md`, `cycle-evolve.md`, `schedule-task.md`, etc.) — but only through the patches-directory pattern if those files live in a protected platform path.
- Project repos in the explicit allowlist (see § 5a).

**Path detection is allowlist-based, NOT pwd-based.** pwd is unreliable when `/operator-cycle` is invoked from `~/`.

### 5a. Project allowlist (explicit)

The active allowlist is loaded from `$CYCLE_ROOT/config.json` → `project_allowlist`. Ship with an empty array; the operator adds their own project paths. Adding/removing entries requires editing `config.json` directly, which is itself on the protected-path list (cannot be modified by `/cycle-evolve`).

Anything not on the list = firewall block.

### 5b. Deny-list (default, always-blocked)

`/cycle-evolve` and `/schedule-task` MUST NEVER write to:

- Your platform's core config directories (skills, hooks, agents, memory, root guidance files) — reachable only through the patches-directory pattern
- Shell / environment configs (`~/.zshrc`, `~/.bashrc`, `~/.profile`, `~/.zprofile`, `~/.zsh_history`)
- SSH keys and known_hosts (`~/.ssh/**`)
- Environment / secret files (`~/.env`, `~/.secrets/**`)
- Cloud / tool configs (`~/.config/**`, `~/.aws/`, `~/.gcp/`, and any other AI-tool config dirs)
- Any path containing `.env`, `credentials`, `secret`, or `private-key` in the filename
- `$CYCLE_ROOT/config.json` itself (the config is protected from self-modification)
- This contract file (`CYCLE-CONTRACT.md`)

### Enforcement

This is NOT policy. It is hook-enforced. Wire a PreToolUse hook on Write/Edit/Bash that:

- On block: writes a structured deny entry to `$CYCLE_ROOT/activity-log.md` + halts the cycle.
- Exit codes: 0 = pass, 1 = hard block, 2 = warning-allow.

### Cron firewall (`/schedule-task`)

A scheduled task MAY:

- Run scripts under `$CYCLE_ROOT/scripts/**` or project repo paths in `project_allowlist`.
- Write to `$CYCLE_ROOT/**`.

A scheduled task MUST NEVER:

- Run scripts under your platform's protected system paths (e.g. `/usr/local/bin/`, `/opt/`) unless the operator explicitly allowlisted the target.
- Use `sudo`, `rm -rf`, `dd`, `mkfs`, `chmod 777`, `git push --force`.
- Make network calls to non-allowlisted hosts. Per-task allowlist is required at register-time, validated against the global default below.

### 5c. Cron host allowlist

Global default in `$CYCLE_ROOT/config.json` → `cron_host_allowlist` (ship with):

- `localhost`, `127.0.0.1`, `::1`

Per-task additions must be declared at `/schedule-task` register-time and validated against the project's known dependencies (e.g., `api.github.com` for GitHub-integrated repos, your API host, your LLM provider). Anything not on the global default OR the task's declared allowlist = task-register rejected.

---

## 6. Verification protocol

Your end-of-session verification pass (or its equivalent) runs after each cycle commit (or batch at end of session) and verifies:

1. **Trailer integrity** — every cycle commit has all 5 trailer fields; rejection logged.
2. **Inner-log ↔ git correspondence** — every `CYCLE N` entry in `inner-log.md` has a matching commit with `Cycle: N` trailer.
3. **Capability ↔ artifact** — every row in `capabilities.jsonl` points to an `artifact_path` that exists on disk.
4. **Depth monotonic** — depths are non-decreasing across consecutive cycles within a session (drift across sessions allowed; flagged not blocked).
5. **Firewall hits** — count deny entries in `activity-log.md`; non-zero = report to the operator.

Filter cycle commits with `git log --author='Operator Cycle'` or by grepping for `Co-Authored-By: Operator Cycle`.

---

## 7. Validator implementations

Three hook scripts live under `$CYCLE_ROOT/scripts/`:

1. **`validate-log.sh`** — runs on Write/Edit of `inner-log.md`. Parses the last appended cycle block, applies § 2 rules. Exit 0 = pass, exit 1 = block with reason.
2. **`validate-trailer.sh`** — runs as git pre-commit when `Co-Authored-By: Operator Cycle` is in the commit message. Applies § 4 rules.
3. **`firewall.sh`** — PreToolUse hook on Write/Edit/Bash. Applies § 5 deny-list. Logs deny to `$CYCLE_ROOT/activity-log.md`.

All three exit-code disciplined: 0 = pass, 1 = hard block, 2 = warning-allow.

**The customer implements these hooks.** Reference implementations are outside this payload — treat this file as the spec, not the code.

---

## 8. Bootstrap order

Before `/operator-cycle` runs for the first time, the following must exist in this order:

1. This contract (bundled — you are reading it).
2. `$CYCLE_ROOT/` directory + empty `inner-log.md` + empty `capabilities.jsonl` + `state.json` + `config.json` (populate from `templates/`).
3. Three hook scripts implementing § 2 / § 4 / § 5 validators.
4. Author-signature registered (git config or commit-template) — `Operator Cycle <cycle@localhost>`.
5. Verification pass (whatever tool you use) updated to recognize the `Co-Authored-By: Operator Cycle` filter.
6. THEN invoke `/operator-cycle`.

Steps 2 are handled by `bootstrap.md`. Steps 3-5 are the operator's responsibility per their platform.

---

## 9. Change protocol

This contract is itself in the protected-path firewall (§ 5). Changes require:

- Explicit operator approval.
- Peer review (via your decision-review process, if you run one) for any change to schemas (§ 2-4) or firewall (§ 5).
- Version bump at the top of this file.
- Old version retained as `CYCLE-CONTRACT.md.v<N>.<date>`.

The entire trust property of the loop depends on these schemas being stable. Drifting the contract = drifting the verifier = collapsing the trust triangle.

---

## 10. Locked decisions (v1.0)

1. **Project allowlist for `/cycle-evolve` writes** — explicit allowlist, NOT pwd-based. Ships empty; the operator populates it. Stored in `config.json` → `project_allowlist`. See § 5a.

2. **Cron host allowlist** — global default (always-allowed): `localhost`, `127.0.0.1`, `::1`. Per-task additions declared at register-time. Stored in `config.json` → `cron_host_allowlist`. See § 5c.

3. **Cycle ID space** — global monotonic across all sessions per scope. Persisted in `$CYCLE_ROOT/state.json` → `cycle_counter`. Rationale: the compounding-depth rule (`Depth: L<n>` must be ≥ previous cycle's depth) is meaningless if the counter resets per session.

4. **Operator-cycle author email** — `cycle@localhost`. Clean `git log --author='Operator Cycle'` filter; the `.local`-style domain bounces silently if ever pushed to a remote with author-emailing CI, so no real address leaks. Defense-in-depth alongside the commit trailer.

---

## 11. Briefings

Cycles write rich detail to `inner-log.md` + `capabilities.jsonl` but those don't scale for human reading after 20+ cycles. The briefing artifact closes that gap.

### 11a. Briefing artifact

**Location:** `$CYCLE_ROOT/briefings/BRIEFING-<ISO-8601 UTC>.md`
**Write mode:** whole-file write per briefing (not append). Atomic via `.tmp + rename`.
**Reader:** the operator (direct read), `/cycle-brief` (re-render on demand).

### 11b. Briefing schema

```markdown
# Operator-Cycle Briefing — <YYYY-MM-DD HH:MM> → <YYYY-MM-DD HH:MM>

**Scope:** <global | per-project (<project-path>)>
**Cycles in window:** <N>
**Session(s):** <session-id list>
**Generated:** <ISO-8601 UTC>

## Bottom line
<one sentence: what changed, what to look at first>

## Cycles ran
| # | Depth | Domain | Duration | Shipped (one line) | Commit |
|---|-------|--------|----------|--------------------|--------|
| 1 | L2    | ...    | 612s     | ...                | abc123 |

## Depth distribution
- L1: <count>
- L2: <count>
- L3: <count>
- L4+: <count>
- Trend: <rising | flat | regressing>

## Ships by domain
- pipeline_fix: <count> — <one-line summary>
- unasked_creative: <count> — ...

## Capabilities added (from capabilities.jsonl)
- <name> (<category>) — <effect>

## Firewall hits
- <count> — <one-line summary, paths attempted, why blocked>

## Verification verdicts (if a verification pass ran)
- VERIFIED: <N>
- PARTIAL: <N>
- CONTRADICTED: <N>  ← read first
- UNVERIFIED: <N>

## Look at first
1. <specific cycle # + reason> — usually: contradicted verification finding, firewall hit, or a depth-regression cycle
2. ...
```

### 11c. When briefings are written

Three triggers:

1. **Brief-on-stop** — when the operator says "stop" / "pause" / "I'm done" or the session ends with `.cycle-active` still set. `/operator-cycle` exit path writes the briefing before clearing the flag.
2. **Brief-on-demand** — `/cycle-brief` invoked manually. Defaults to "since last briefing." Optional args: `--since <iso>`, `--last <N>`, `--session <id>`.
3. **Brief-on-Nth-cycle** — every 8th cycle (configurable via `config.json` → `briefing_every_n_cycles`, default 8) writes a rolling briefing. Surfaces drift without waiting for session end.

### 11d. Validator rules

- Window timestamps must parse as ISO-8601 UTC.
- "Cycles in window" count must match the table row count.
- Every cycle-row commit must resolve in git.
- "Look at first" must reference real cycle numbers from the table.
- Verification verdict counts (if present) must sum to "Cycles in window".

Validator script is optional — briefing is downstream, less load-bearing than inner-log.

### 11e. Briefing retention

Briefings are append-only history. Never delete. Pruning policy (manual, not auto): keep all briefings from the last 30 days verbatim; then compact older briefings into monthly digests if the directory size exceeds 100 MB.

---

## 12. Goal mode addendum

Companion skill: `commands/cycle-goal.md`.

### 12a. Why this exists

`/operator-cycle` is process-driven — it cycles forever, rotates domains, climbs a depth ladder, compounds growth. There is no exit condition.

`/cycle-goal` is goal-driven — it runs until a measurable done-condition is met, then pauses for human review. There IS an exit condition.

Both share the same pwd-based scope resolution, append-only inner-log discipline, and commit-trailer convention. They are mutually exclusive at the session level — only one autonomous loop active at a time, enforced via flag check (see § 12d).

### 12b. Goal directive format

The recommended format for `/cycle-goal` invocations AND for `HUMAN_DIRECTIVE.md` files (which can redirect `/operator-cycle` cycles):

```
Goal: <one-line primary objective>
Until: <measurable done condition — observable state change>
Without: <constraints — scope guards, do-not-touch lists>
```

`Until` is required. `Without` is optional; defaults to "no scope creep, no new dependencies, no writes outside the project scope, no protected-path writes."

### 12c. Goal artifacts (parallel to operator-cycle artifacts)

Per-scope, under `<scope>/.operator-cycle/goal/`:

- `state.json` — current goal state (active or last completed)
- `inner-log.md` — append-only iteration log
- `.active` — sentinel flag, present while goal is running
- `.paused` — sentinel flag, present when `/pause` is invoked
- `handoffs/` — per-goal completion handoffs (one file per shipped goal)
- `cleared/` — abandoned-goal preservation (one directory per cleared invocation)

Where `<scope>` resolves the same way as `/operator-cycle`.

### 12d. Cross-skill invariants

- **Mutual exclusion.** Before starting, `/cycle-goal` checks `$CYCLE_ROOT/.cycle-active`. If set, `/cycle-goal` halts and tells the operator to wait or pause. Before starting, `/operator-cycle` should check `$CYCLE_ROOT/goal/.active` and halt similarly.
- **Commit trailer distinction:**
  - `/operator-cycle` commits use author `Operator Cycle <cycle@localhost>` with trailer fields `Cycle / Depth / Domain / Duration / Evidence`.
  - `/cycle-goal` commits use author `Operator Cycle (Goal) <cycle-goal@localhost>` with trailer fields `Goal / Until / Iterations / Duration / Evidence`.
  - The trailer validator (currently operator-cycle-only) ignores non-operator-cycle commits — it triggers only when the canonical `Co-Authored-By: Operator Cycle` line is present. Goal commits pass through (validator-agnostic in v1.0).
- **No cross-writes.** `/cycle-goal` never writes to `$CYCLE_ROOT/` root files; `/operator-cycle` never writes to `$CYCLE_ROOT/goal/`.
- **Handoff cross-reference is allowed.** `/operator-cycle`'s "Next-cycle hook" section may reference a recent `/cycle-goal` handoff path, and vice versa, for context continuity.

### 12e. Selection rule

| Situation | Use |
|---|---|
| "Keep shipping on this project, climb the depth ladder" | `/operator-cycle` |
| "Do this specific task, then stop and let me check it" | `/cycle-goal` |
| Recursive learning, domain rotation, compounding | `/operator-cycle` |
| One-shot research / README cleanup / single feature | `/cycle-goal` |
| Operator AFK, wants unattended progress | `/operator-cycle` |
| Operator wants explicit review checkpoint after defined work | `/cycle-goal` |
| Multi-cycle architectural refactor (depth L4-L6) | `/operator-cycle` |
| Single-cycle research with measurable deliverable | `/cycle-goal` |

---

## 13. Failure counter-actions

Deterministic counter-actions when a cycle unit fails — the loop-level analogue of a stagnation rule.

- **FREEZE-after-2.** Same error signature twice → STOP retrying that unit. Log the signature + last diff to `inner-log.md` and move on. Two identical failures = wrong approach, not insufficient force.
- **Fresh-session retry.** A retry runs in a FRESH session seeded with ONLY the unit definition + the specific error — never the whole loop history. Bounds context growth across retries.
- **Unverified-output debt (mechanized verify-before-claiming).** Rolling ledger:

  - `no_judge +2`
  - `run_failed +3`
  - `judged_pass −2` (floor 0)

  At debt ≥ THRESHOLD the loop is FORCED into the verified / judged lane until verified work pays it down.

  **Exploration exemption:** a cycle explicitly tagged `spike` or `depth-probe` accrues NO `no_judge` debt — the loop must stay free to take exploratory swings (compounding depth is the point).

  THRESHOLD starts at 6 but is **tune-from-telemetry** (adjust from freeze-rate + debt trends in `inner-log.md` / `capabilities.jsonl`). Do not treat 6 as sacred.

**Phase 2 (deferred — needs telemetry):** Integration gate — every N units run the full integration / build once; N set empirically from cycle-timing data, not guessed.

**Provenance:** FREEZE-after-2 + fresh-session-retry come from the continuous-agent-loop pattern library. The debt ledger is a clean-room adaptation of a published unverified-output-debt mechanism, concept-only (no code vendored). The entropy gate from that same study belongs elsewhere in a stack (dual-draft reconciliation) and is not part of this loop.

Adopt sequenced: Phase 1 = these three rules; Phase 2 = integration gate. Enforcement code is a separate future build.

---
