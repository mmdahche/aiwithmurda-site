---
name: cycle-brief
description: Generate a human-readable digest of operator-cycle activity. Reads inner-log.md + capabilities.jsonl + state.json + recent git commits, produces a Briefing per CYCLE-CONTRACT § 11. Use when the operator asks "what did the cycles do?", "brief me", "show me what shipped overnight", or returns to the computer after autonomous cycles ran.
risk: low
version: 1.0
---

# Cycle Brief

Read-only digest engine for operator-cycle activity. One engine, three triggers: brief-on-stop, brief-on-demand, brief-on-Nth-cycle.

## When to use

- The operator says `/cycle-brief`, "brief me on cycles", or "what did the loop do?"
- The operator returns to the computer after autonomous cycles ran ("good morning" + cycles ran overnight)
- Called by `/operator-cycle` on the stop / pause exit path (brief-on-stop)
- Called by `/operator-cycle` every 8th cycle (brief-on-Nth-cycle)

## When NOT to use

- No cycles have run yet (`state.json.cycle_counter == 0`) — say so and exit.
- For verifying claims against reality — that is your end-of-session verification pass's job, not `/cycle-brief`.

## Arguments

- `--since <ISO>` — cycles after this timestamp (default: since the last briefing file's `Generated:` field; if none, all time)
- `--last <N>` — last N cycles regardless of time (overrides `--since`)
- `--session <id>` — cycles tagged with this `session_id` only
- `--scope <global|project-path>` — explicit scope override. Default: pwd-based (mirrors `/operator-cycle` Pre-cycle step 0).
- `--no-write` — print only, don't save to `briefings/`
- `--save` (default true) — save to `$CYCLE_ROOT/briefings/BRIEFING-<ISO>.md`

## Steps

0. **Resolve scope (pwd-based, mirrors `/operator-cycle` Pre-cycle step 0).** Read `pwd`. Read the GLOBAL `~/.operator-cycle/config.json` → `project_allowlist`. If `pwd` matches, set `CYCLE_ROOT=<that_project>/.operator-cycle/`. Otherwise, `CYCLE_ROOT=~/.operator-cycle/`. `--scope` overrides pwd-based resolution: `--scope global` forces the global lineage; `--scope <project-path>` forces that project. All subsequent paths use `$CYCLE_ROOT`.

1. **Resolve window** — determine which cycles to include based on args.

2. **Read sources** (all scope-aware via `$CYCLE_ROOT`):

   - `$CYCLE_ROOT/inner-log.md` — parse `## CYCLE <N>` blocks.
   - `$CYCLE_ROOT/capabilities.jsonl` — filter rows in window.
   - `$CYCLE_ROOT/state.json` — current counter, last session id.
   - `git log --author='Operator Cycle' --since=<window-start> --pretty=format:'%H %s' --all` — confirm commits exist for each cycle (anti-speculative-write check at the briefing layer). Per-project cycles commit into the project's git repo; global lineage cycles commit into whatever repo lives at `~/.operator-cycle/` (or use empty commits if you keep no repo there). Run `git log` from `$CYCLE_ROOT/..` or the project root as appropriate.
   - `$CYCLE_ROOT/activity-log.md` — count `FIREWALL_BLOCKED` entries in the window.
   - If `$ROUTER_CLI` is set AND its usage log is in a known location, filter rows in the window for the cost rollup section. Otherwise skip that section.

3. **Build the table + sections** per CYCLE-CONTRACT § 11b:

   - **Cycles table** — one row per cycle: #, Depth, Domain, Duration, one-line ship, commit-sha.
   - **Depth distribution** — count by L1-L6 + trend (rising / flat / regressing — compare first third vs last third of window).
   - **Ships by domain** — count + one-line aggregate per domain.
   - **Capabilities added** — list from `capabilities.jsonl`.
   - **Firewall hits** — count + paths blocked.
   - **Cost (optional)** — only if `$ROUTER_CLI` is set and you can read its usage log. Otherwise omit the section. When included: dispatch count, tokens by tier, tier-mix %, and flag any cycle whose domain was synthesis/audit/big-codegen but had 0 dispatches (protocol smell). No hard gate; note the smell.
   - **Verification verdicts (if a verification pass ran)** — read the latest verification report.
   - **"Look at first"** — algorithmic priority order: any CONTRADICTED verification finding → top; then firewall hits > 0 → next; then any depth-regression cycle → next; then most recent ship.
   - **Scope banner** — top of every briefing reads `**Scope:** global` OR `**Scope:** per-project (<project-path>)` so the reader knows which counter and log they're looking at.

4. **Bottom line** — one-sentence summary written LAST, after sections are built. Format: "<N> cycles ran, depth <distribution>, <highest-priority finding from Look-at-first>."

5. **Write to disk** (unless `--no-write`):

   - Path: `$CYCLE_ROOT/briefings/BRIEFING-<ISO-8601 UTC>.md`
   - Atomic: write to `.tmp` then rename.
   - `mkdir -p` the `briefings/` dir if missing.
   - Per-project briefings live alongside per-project inner-log — they don't pollute the global briefings dir.

6. **Output to chat:**

   - The full briefing markdown rendered inline (the operator reads it in the chat — no need to open the file).
   - Path of saved file at the bottom.
   - If invoked as part of brief-on-stop: also say "Briefing saved. Session can resume with `/operator-cycle` anytime."

## Validator pass

After write, validate against CYCLE-CONTRACT § 11d:

- Window timestamps parse as ISO-8601.
- Cycles-in-window count matches the table row count.
- Every commit-sha in the table resolves via `git rev-parse`.
- "Look at first" references real cycle numbers.
- Verification verdict counts (if present) sum to total cycles in window.

If the validator fails, surface the failure but don't block — briefing is downstream, less load-bearing than cycle commits.

## Output discipline

- Tables use markdown pipe syntax.
- "Bottom line" is one sentence, lead with the verb.
- "Look at first" never empty — at minimum, the most recent ship.
- **Scope banner is mandatory** — a per-project briefing reads identically to a global one without it, and the two get conflated.

## Related

- `/operator-cycle` calls this on stop and every 8th cycle (configurable). Scope is bound from the parent cycle's pwd at invocation time; `/cycle-brief` inherits that pwd via the shell environment.
- Your end-of-session verification pass runs orthogonal to `/cycle-brief` — verification verifies, brief summarizes. Different jobs.
