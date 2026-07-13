# Operator Cycle — Goal Mode

Goal mode redirects `/operator-cycle` toward a named multi-cycle objective without giving up the compounding-depth loop. When `config.json.goal.active` is `true`, the Pre-cycle step reads this file and picks the highest-priority open sub-goal (SG-N) as the target for this cycle's `goal_ship` domain.

Goal cycle = `cycle_counter % goal.free_cycle_modulo != 0` → override domain to `goal_ship`; the inner-log MUST include a `### Goal Progress` section.
Free cycle = otherwise → normal domain rotation resumes.

Set `active: false` in `config.json` to disable goal mode entirely; the file below is preserved for future use.

---

## Primary goal

**Goal:** <one-line primary objective — e.g. "Ship v1 of the parser">
**Until:** <measurable done condition — an observable state change, e.g. "10 sample inputs in tests/fixtures/ parse correctly per SPEC.md § 6">
**Without:** <constraints — scope guards, do-not-touch lists>

## Sub-goals (SG-N)

Order matters — SG-1 is picked before SG-2, etc. When an SG closes, strike it (keep the line for history) and unblock the next.

### SG-1 — <short name>
**Status:** open
**Until:** <measurable done condition for this sub-goal>
**Blocks:** SG-2, SG-3
**Notes:** <optional context>

### SG-2 — <short name>
**Status:** open
**Until:** <measurable done condition>
**Blocked by:** SG-1
**Notes:** <optional context>

### SG-3 — <short name>
**Status:** open
**Until:** <measurable done condition>
**Blocked by:** SG-1
**Notes:** <optional context>

---

## Progress log

Every goal cycle appends one line here in addition to the inner-log entry. Format:

```
- [YYYY-MM-DD HH:MM] CYCLE <N> SG-<K> — <one-line progress summary>
```

<!-- First progress line goes below when the first goal cycle ships. -->
