# Bootstrap — Initialize the Operator Cycle

This document walks a fresh install from empty directory to first cycle. Everything you need is in this payload; no external scripts to install.

**Time budget:** 5-10 minutes for the first bootstrap. Subsequent per-project bootstraps take ~2 minutes.

---

## 1. Pick a scope: global or per-project

The loop supports two scopes. Pick one for your first bootstrap; you can add more later.

### Global (one loop, cross-project)

- **Location:** `~/.operator-cycle/`
- **Use when:** you want a single lineage that cycles across your whole workspace, or you don't have a specific project yet.
- **Cycle counter:** monotonic across everything.

### Per-project (one loop per repo)

- **Location:** `<project>/.operator-cycle/`
- **Use when:** you want each project to have its own independent lineage, depth ladder, and briefing history.
- **Cycle counter:** independent per project.

You can run both — a global lineage plus per-project lineages — but only one is active at a time within a session. Scope is bound from `pwd` at invocation and cannot be swapped mid-cycle.

---

## 2. Create the directory and copy templates

### Global

```bash
mkdir -p ~/.operator-cycle/{briefings,handoffs,scripts,patches}
cp <this-payload>/templates/state.json      ~/.operator-cycle/state.json
cp <this-payload>/templates/inner-log.md    ~/.operator-cycle/inner-log.md
cp <this-payload>/templates/config.json     ~/.operator-cycle/config.json
cp <this-payload>/templates/GOAL.md         ~/.operator-cycle/GOAL.md
: > ~/.operator-cycle/capabilities.jsonl
: > ~/.operator-cycle/activity-log.md
```

### Per-project

Run from inside the project's root directory:

```bash
mkdir -p .operator-cycle/{briefings,handoffs,scripts,patches}
cp <this-payload>/templates/state.json      .operator-cycle/state.json
cp <this-payload>/templates/inner-log.md    .operator-cycle/inner-log.md
cp <this-payload>/templates/config.json     .operator-cycle/config.json
cp <this-payload>/templates/GOAL.md         .operator-cycle/GOAL.md
: > .operator-cycle/capabilities.jsonl
: > .operator-cycle/activity-log.md
```

Then edit the per-project `.operator-cycle/config.json` and add the project's absolute path to `project_allowlist`. Also add the same path to the GLOBAL `~/.operator-cycle/config.json` → `project_allowlist` so the outer scope recognizes this project (create the global config from the template first if it doesn't exist yet — the global config file needs to exist as the source of truth for cross-project allowlist decisions).

---

## 3. Install the companion commands into your agent platform

The `commands/` directory in this payload contains six markdown skill files:

- `operator-cycle.md` — the main loop
- `depth-check.md` — depth-drift audit
- `cycle-brief.md` — briefing renderer
- `cycle-goal.md` — focused-task loop (companion)
- `cycle-evolve.md` — mid-loop self-extension
- `schedule-task.md` — cron / launchd / timer registration

Copy these into your agent platform's skills or commands directory (the exact path depends on your platform — Claude Code, Codex, or another compatible runner). If the target dir is a protected path, use whatever patch-apply pattern your platform requires; the loop's own `/cycle-evolve` uses a patches directory for this exact reason.

Verify with your platform's command list — `/operator-cycle`, `/depth-check`, `/cycle-brief`, `/cycle-goal`, `/cycle-evolve`, `/schedule-task` should all appear.

---

## 4. Implement the three hook scripts (customer responsibility)

`CYCLE-CONTRACT.md` § 7 specifies three validator hooks. Ship your own implementations under `$CYCLE_ROOT/scripts/`:

- `validate-log.sh` — parses the last block of `inner-log.md`, applies § 2 rules.
- `validate-trailer.sh` — pre-commit hook when `Co-Authored-By: Operator Cycle` is in the commit message.
- `firewall.sh` — PreToolUse hook on Write/Edit/Bash; enforces § 5 deny-list.

All three use the exit-code discipline: `0` pass, `1` hard block, `2` warning-allow. Wire them via your agent platform's hooks system (or your git pre-commit hooks for the trailer validator).

The contract is precise enough that a competent engineer can implement all three in an afternoon. If you want a reference implementation, treat the contract as the spec.

---

## 5. Configure the git author

The loop's commits use a canonical author so `git log --author='Operator Cycle'` cleanly filters cycle commits from your manual ones:

```bash
# One-shot per commit (safer — no global config change):
git commit --author="Operator Cycle <cycle@localhost>" ...

# Or a commit template scoped to this repo:
git config commit.template <path-to-template>
```

Do NOT set this as a global user.name / user.email — you want your normal commits to keep your real signature.

---

## 6. Arm and disarm the write-boundary flag

The firewall is a per-cycle switch. It arms at the start of every cycle and disarms at the end.

**Arm** (start of cycle — done automatically by `/operator-cycle` Pre-cycle step 1):

```bash
touch $CYCLE_ROOT/.cycle-active
```

**Disarm** (end of cycle — done automatically by `/operator-cycle` End-of-cycle):

```bash
rm $CYCLE_ROOT/.cycle-active
```

If a crash leaves the flag set across a cycle boundary, that's a signal — find the cycle that didn't reach End-of-cycle and start there. The flag is not a session-wide switch; treat a persistent one as a bug, not as expected state.

---

## 7. First run

From your chosen scope's directory:

```
/operator-cycle
```

The loop will:

1. Read `pwd`, resolve scope, arm the firewall.
2. Read `state.json` (cycle_counter = 0 on the first run).
3. Check for `HUMAN_DIRECTIVE.md` (won't exist yet — that's fine).
4. Skip the anti-decay checks (no history to check).
5. Pick a domain from `domain_rotation`.
6. Do ≥10 min of substantive work.
7. Ship: append inner-log, update state, commit, patch sha, append `capabilities.jsonl` if a capability landed, activity-log line.
8. Schedule the next wake-up (see § 8 below).
9. Disarm the firewall.

If your platform doesn't support scheduled wake-ups, the loop will complete cycle 1 and stop. Re-invoke `/operator-cycle` manually to run cycle 2. See § 8 for cadence options.

---

## 8. Wake-up mechanism — how the loop keeps running

**Sessions do not auto-continue. The loop continues only when a scheduler or human re-invokes it.**

Three options, in order of preference:

### Option A — native scheduled wake-ups (best if your platform supports it)

Some agent platforms expose a `ScheduleWakeup` (or similarly named) primitive. If yours does, `/operator-cycle` fires this at the end of every cycle:

```
ScheduleWakeup({
  delaySeconds: 120,
  reason: "<next-cycle hook from inner-log>",
  prompt: "/operator-cycle"
})
```

120s is the gap between cycles, NOT the work duration inside a cycle. Each cycle's real work targets ≥600s; 120s is enough gap to keep the platform from thrashing.

### Option B — cron / launchd / systemd re-invocation

If your platform has no native scheduler, register a periodic job that re-invokes the loop:

- **cron:** `*/5 * * * * <invoke-agent-with-prompt> "/operator-cycle" >> $CYCLE_ROOT/activity-log.md 2>&1`
- **launchd (macOS):** a plist under `~/Library/LaunchAgents/` with `StartInterval=300` and a `ProgramArguments` that invokes your agent CLI with the prompt.
- **systemd timer (Linux):** `.timer` + `.service` unit pair under `~/.config/systemd/user/`.

Cadence: match the 120s gap if your invoke CLI is cheap; stretch to 5-10 minutes if it's expensive.

### Option C — manual re-prompt

If no scheduler is available, the loop still works — just type `/operator-cycle` again when you're ready for the next cycle. The loop reads state, picks up cleanly, and continues. Slower iteration, but the artifacts are still coherent across manual re-runs.

**In every case:** the loop works at any cadence. Self-scheduling is the ideal, not the requirement.

---

## 9. Bootstrap a second (per-project) loop after the global exists

Once the global lineage is running, adding a per-project loop is:

```bash
cd <project-root>
mkdir -p .operator-cycle/{briefings,handoffs,scripts,patches}
cp <this-payload>/templates/state.json      .operator-cycle/state.json
cp <this-payload>/templates/inner-log.md    .operator-cycle/inner-log.md
cp <this-payload>/templates/config.json     .operator-cycle/config.json
cp <this-payload>/templates/GOAL.md         .operator-cycle/GOAL.md
: > .operator-cycle/capabilities.jsonl
: > .operator-cycle/activity-log.md
```

Edit the new `.operator-cycle/config.json` and set `project_allowlist` to `["<abs project path>"]` — only this project.

Then edit `~/.operator-cycle/config.json` and add the same absolute path to its `project_allowlist` so the global scope recognizes the project.

Copy the same three hook scripts (or symlink them) into `.operator-cycle/scripts/`.

From here on, `cd <project-root> && /operator-cycle` uses the per-project lineage; `cd ~ && /operator-cycle` uses the global lineage.

---

## 10. Sanity check before the first cycle

- [ ] `$CYCLE_ROOT/state.json` exists and is valid JSON (`cycle_counter: 0`).
- [ ] `$CYCLE_ROOT/config.json` exists with a domain rotation and a non-empty `project_allowlist` (for per-project) or an intentionally empty one (for global with no allowlisted projects yet).
- [ ] `$CYCLE_ROOT/inner-log.md` exists with the header.
- [ ] `$CYCLE_ROOT/capabilities.jsonl` exists (empty file is fine).
- [ ] `$CYCLE_ROOT/activity-log.md` exists (empty file is fine).
- [ ] Three hook scripts implemented and wired.
- [ ] `git log --author='Operator Cycle'` returns nothing yet (no cycle commits) — sanity check that the filter works.
- [ ] `/operator-cycle` command is registered in your agent platform.

If all boxes tick, run `/operator-cycle`.

---

## 11. Troubleshooting

- **Firewall blocks during the first cycle** — your platform's own protected-path guard doesn't recognize `$CYCLE_ROOT/**`. Add that prefix to whatever allowlist your platform uses. See `CYCLE-PITFALLS.md` § 1.
- **`sed: bad flag in substitute command`** — you're on macOS BSD sed and the loop used GNU syntax. Update the sed idiom per `CYCLE-PITFALLS.md` § 3.
- **`capabilities.jsonl` clobbered** — something used Write instead of shell `>>`. Restore from git history and audit the code path per `CYCLE-PITFALLS.md` § 4.
- **Worktree loop keeps blocking its own writes** — see `CYCLE-PITFALLS.md` § 7 (worktree gotcha) — add the worktree's own path to its own `config.json` → `project_allowlist`.
- **Loop keeps running "null" cycles** — that's healthy up to a point. If 5 consecutive nulls hit, the autostop gate fires and the loop stops for review. See `operator-cycle.md` § Schedule next wake-up.
- **`ScheduleWakeup` not fired but the loop stopped** — confirm the platform's scheduler is actually loaded and running. Fall back to Option B or C from § 8.
