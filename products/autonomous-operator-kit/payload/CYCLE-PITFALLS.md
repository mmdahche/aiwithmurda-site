# Operator Cycle Pitfalls — Scars from the Loop

Real frictions the loop has hit in production, distilled into rules that survive even when the procedure gets rewritten.

Read this once per session, not every cycle. The procedure in `commands/operator-cycle.md` already encodes the fixes; this file is the WHY.

---

## 1. Two firewalls can coexist — don't assume one covers the other

A write into a sensitive path can pass through multiple guards:

- The operator-cycle firewall (CYCLE-CONTRACT § 5) — permissive for own-skill / own-hook / own-artifact paths.
- Your platform's own protected-path guard (auto-run allowlist, path guard, etc.) — independent, potentially narrower.

If you install the operator-cycle firewall but don't widen your platform's allowlist for `$CYCLE_ROOT/**`, the very first cycle will hit a block during pre-commit bookkeeping — even though the operator-cycle firewall is happy.

**Rule for any new project running the loop:** confirm your platform's protected-path allowlist includes `$CYCLE_ROOT/**` (and the operator-cycle's own skill paths if those live in a protected dir). Fix this before the first cycle.

---

## 2. Commit-sha chicken-and-egg

Three validators with incompatible state requirements:

- Inner-log `Commit:` field is regex-validated as `[0-9a-f]{7,40}` — but the real sha is unknown until AFTER `git commit` runs.
- Trailer validator requires `Cycle: N === state.cycle_counter` AT COMMIT TIME.
- Log validator requires `cycleN === state.cycle_counter + 1` AT LOG WRITE TIME.

The ordering in `operator-cycle.md` § Ship is the ONLY one that satisfies all three:

1. Append log with placeholder sha (`0000000`). State still `N-1` → log validator's `N === prev+1` passes.
2. Update state to `N` → trailer validator's `Cycle: N === state` will pass at commit time.
3. Commit → get real sha.
4. Patch placeholder via `sed` (NOT Edit/Write — those re-trigger the log validator, which now fails because state is already `N`).

**Do not** `git commit --amend` after writing the log. The trailer validator re-runs and now sees `state.cycle_counter = N` while expecting `N+1` for the amended commit.

---

## 3. BSD sed ≠ GNU sed

macOS ships BSD sed which does NOT accept GNU's `0,/pattern/{ s/foo/bar/ }` range syntax. It will error with `bad flag in substitute command`.

Use plain `s/foo/bar/` — safe when the pattern is unique in the file. Idiom for in-place edit that works on both BSD and GNU:

```bash
sed -i.bak '...' file && rm file.bak
```

The `.bak` argument is required on BSD (empty argument fails); on GNU it's harmless. Removing the backup afterwards keeps the tree clean.

---

## 4. `Write` clobbers append-only files

Both `capabilities.jsonl` and `relations.jsonl` are append-only NDJSON. The Write tool would overwrite the whole file with a single row.

Use `echo "$row" >> file.jsonl` for these. If you build an extractor script, have it use shell redirection (`>>`) rather than a language-level file write that could open the file in truncate mode.

To enrich fields post-extraction (e.g. adding `capability_keys` or `depends_on_cycles` in `relations.jsonl`), in-place-edit the LAST row of the file ONLY. Every other row is immutable history.

---

## 5. Live smoke-tests get skipped, transparently

Loops that ship client-side changes tend to pass type-check + build but never open the actual browser / device / integration to test the behavior. `tsc + build passes` ≠ feature works.

**Rule:** note this as a "Broke" caveat in inner-log every cycle that doesn't run a real smoke test (dev server, live query, actual API call). The verification pass catches the gap eventually, but the operator reads inner-log first — surface it there.

---

## 6. Three same-domain cycles is the anti-decay limit

If cycles 1-3 are all `pipeline_fix` and cycle 4's Next-cycle hook says `pipeline_fix` again — OVERRIDE. The anti-decay rule fires at 3, not "when it becomes obviously boring". Pick a different domain.

If the loop still nulls out after the switch, the K-null-streak autostop gate (default 5) fires and the loop stops itself. Anti-decay and autostop stack: the switch fires first, autostop fires only if the switch already failed to break the streak.

---

## 7. Scope is bound, not re-read

Scope (`CYCLE_ROOT`) is set ONCE in Pre-cycle step 0 from `pwd` at invocation. If the bash session changes cwd mid-cycle, scripts still write to the originally-bound `$CYCLE_ROOT`. NEVER mix scopes mid-cycle.

Two modes:

- **Per-project mode** — cwd is in `project_allowlist`. State at `<project>/.operator-cycle/`. Allowlist locked to that single project. Cycle counter is independent.
- **Global mode** — cwd is `~/` or non-allowlisted. State at `~/.operator-cycle/`. Cross-project push mode.

### Bootstrap new per-project loop

See `bootstrap.md`. In short: create `<project>/.operator-cycle/`, copy the templates, add the project's absolute path to that new config's `project_allowlist`, add the same path to the GLOBAL `~/.operator-cycle/config.json` → `project_allowlist` so the outer firewall recognizes the project.

### Worktree gotcha

`.operator-cycle/` inside a project is git-tracked. If you use git worktrees, a NEW WORKTREE of an already-bootstrapped repo will INHERIT whatever `config.json` was committed at that branch point — including its `project_allowlist`, which is bound to the ORIGINAL worktree's absolute path, not the new one.

The firewall resolves the ACTIVE SCOPE from the GLOBAL config, but then re-checks each write against the PER-PROJECT config's own `project_allowlist`. So the moment a worktree's `.cycle-active` flag makes its scope correctly resolve, the firewall self-locks every write inside that worktree (because the per-project `project_allowlist` only ever matches the original path).

**Fix for any new-or-existing worktree hitting this:** add the worktree's OWN absolute path to its OWN `<worktree>/.operator-cycle/config.json` → `project_allowlist` (not just the global one). This file is git-tracked but not on the hardcoded protected-path list — a normal edit is sufficient, no firewall exception needed.

---

## 8. Cross-project handoff pattern

When a cycle reshapes architecture in a way that unblocks work in another project:

1. Write a handoff under `$CYCLE_ROOT/handoffs/<YYYY-MM-DD>_<HH-MM>_<topic>.md`.
2. Append a dispatch line to a global inbox file (e.g. `~/INBOX.md`): `[YYYY-MM-DD HH:MM] [<from-scope> → <to-scope>] <one-line trigger> — see <handoff path>`.
3. Optionally notify via whatever channel your session-start ritual reads first.

The next session that opens from the target scope picks up the dispatch and acts on it.

---

## 9. Null-result honesty is load-bearing

A loop that never posts a null result is a loop that is performing rather than investigating. Target null-rate: >20% of cycles. If you're under that, you're either genuinely finding actionable work every cycle (rare after 10+ cycles) or you're inflating trivial changes into "ships".

Say "null" plainly in the Shipped section. It counts as a valid cycle. Don't dress it up.

---

## 10. The write-boundary flag is per-cycle, not per-session

`$CYCLE_ROOT/.cycle-active` arms the firewall. It gets removed at the end of every cycle and re-created at the start of the next. It is NOT a session-wide switch.

If you find the flag persisting across a cycle boundary, something crashed. Check the log for the last cycle that didn't reach the `End-of-cycle` step and start there.

---

## 11. Dispatch is a discipline, not an optimization (when `$ROUTER_CLI` is set)

If you own a cheap-tier LLM router and export `$ROUTER_CLI`, the dispatch matrix in `operator-cycle.md` is non-optional for the marked rows. Rationalizing "the work was small enough" for a >500-token step that the matrix says MUST DISPATCH is behavioral drift.

The self-check at the bottom of the cycle catches this. When it fires, log to "Surprised" and force-dispatch on the next cycle. Do not swallow it silently.

If `$ROUTER_CLI` is unset, this section is a no-op — generate inline as normal.

---
