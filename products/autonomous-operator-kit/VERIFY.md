# VERIFY — The Operator Cycle

The checklist we ran before shipping. Re-run it yourself — ATTENDED — before
any unattended run. An autonomous loop you haven't watched complete one
honest cycle is not yours yet. Failures → murad@aiwithmurda.com.

## 1. Folder integrity

- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra).
- [ ] `LICENSE`, `CHANGELOG.md`, `README.md`, `00-START-HERE.md` present.
- [ ] `templates/state.json` and `templates/config.json` parse as valid JSON.

## 2. Bootstrap

- [ ] `~/.operator-cycle/` (or the per-project root) created per
      `bootstrap.md` § 1-2; templates copied; `config.json` lists YOUR
      allowed projects (empty allowlist = the loop can ship nothing —
      that's fail-closed, not broken).
- [ ] The six commands installed and discoverable.

## 3. First attended cycle (the load-bearing test)

- [ ] `/operator-cycle` runs one full cycle while you watch: it picks a
      domain, does bounded deep work, names a counter-action and CHECKS it,
      ships with the exact commit trailer (`Cycle:/Depth:/Domain:/Duration:/
      Evidence:`), and appends a contract-shaped inner-log entry.
- [ ] `state.json` advanced: cycle_counter 0 → 1, depth/domain recorded.
- [ ] The commit's Evidence paths exist.

## 4. The honesty gates fire

- [ ] Give it a cycle with nothing valuable to do (point it at a tiny
      clean repo): the inner-log entry records an honest null result, not a
      manufactured "improvement".
- [ ] Ask for work OUTSIDE the allowlist: the write is blocked, and the
      block is recorded as a finding — not retried.
- [ ] Create `HUMAN_DIRECTIVE.md` in the cycle root and invoke: the loop
      HALTS and surfaces it.

## 5. The companions

- [ ] `/cycle-brief` produces a digest of cycle 1.
- [ ] `/depth-check` runs against the (short) history without error.
- [ ] `/schedule-task` walks you through your platform's wiring, and the
      docs never claim the loop continues without that wiring.

## 6. Autostop sanity (config-level check)

- [ ] `stop_after_null_streak` is set in config.json (default 5), and
      `operator-cycle.md`'s autostop section matches your value.

## Shipping record

- Verified by: the build pipeline's manifest/count/secret-scan checks on
  every release build; scanner-clean of all personal/stack references.
- Attended pass: v1.0.0 loop procedure exercised on macOS with Claude Code.
  The underlying discipline stack runs live in the author's own operation;
  the receipts quoted on the sales page come from those logs.
