# Example — what healthy cycle log entries look like

Three inner-log entries showing the shapes you WANT to see: a real ship, an
honest null, and a blocked-write finding. Written fresh for this kit in the
contract's exact format — compare against `CYCLE-CONTRACT.md` § 2. (The
author's production loop has logged 20+ cycles in this format; these
examples are sanitized shapes, not pasted logs.)

## Entry shape 1 — a real ship (the common case)

```markdown
## Cycle 7 — 2026-07-14T02:12:00Z
**Depth:** L3 (root-cause)
**Domain:** pipeline_fix
**Duration:** 1140s
**Commit:** 4f2c9a1

**Shipped:** Traced the flaky import job to a race between the CSV parser's
async row emit and the validator's batch close; serialized the handoff and
added the regression test that reproduces the original interleaving.
**Broke:** Nothing observed; test suite green before and after (evidence:
test-output.txt).
**Surprised:** The race only manifests above ~400 rows — explains why the
staging fixture (50 rows) never caught it.
**Next-cycle hook:** The validator's batch close has a second caller in the
export path — audit it for the same race.
```

Why it's healthy: depth claimed matches work described; the counter-action
lives in "Broke" as checked evidence; "Surprised" records something learned;
the hook gives the next cycle a running start.

## Entry shape 2 — an honest null (target >20% of cycles)

```markdown
## Cycle 8 — 2026-07-14T02:35:00Z
**Depth:** L2 (diagnostic + fix)
**Domain:** knowledge_expansion
**Duration:** 760s
**Commit:** 8810b2e

**Shipped:** Null result. Built the extraction pass over the last 20 log
entries expecting recurring themes; the clustering produced no grouping
stronger than noise. Wrote the diagnostic (theme-scan.md) so the next
attempt starts from evidence instead of vibes.
**Broke:** Nothing — no project files touched beyond the cycle root.
**Surprised:** Expected at least the deploy-related entries to cluster; they
don't, because the log vocabulary is inconsistent ("deploy" vs "ship" vs
"release"). That inconsistency IS the finding.
**Next-cycle hook:** Normalize the log vocabulary before re-attempting
theme extraction.
```

Why it's healthy: the null is stated in the first two words, the
investigation still produced an artifact, and the failure explains itself
into next cycle's plan. A loop whose log never looks like this is
performing, not investigating.

## Entry shape 3 — a blocked write, recorded as a finding

```markdown
## Cycle 9 — 2026-07-14T03:01:00Z
**Depth:** L1 (surface fix)
**Domain:** dashboard_refresh
**Duration:** 310s
**Commit:** c3d7e05

**Shipped:** Refreshed the cycle root's stale metrics bundle. The planned
second edit (the project's own dashboard JSON) was BLOCKED by the write
boundary — the project is not on the allowlist. Recorded here as a finding
per contract; did not retry.
**Broke:** Nothing.
**Surprised:** The allowlist omission was deliberate two weeks ago (project
was mid-migration) and nobody revisited it. Flagging for the operator:
add the project or keep the block, but decide.
**Next-cycle hook:** Await operator's allowlist decision; pick a different
domain until then.
```

Why it's healthy: the block became information for the human instead of a
workaround. "Firewall block = finding, not retry" is the loop's most
important reflex — this is what it looks like in practice.

## The shapes that mean trouble (spot these in `/cycle-brief`)

- Every entry claims L4+ depth with two-minute durations → depth inflation;
  run `/depth-check`.
- Zero nulls across 10+ cycles → the loop is grading its own homework.
- The same "Next-cycle hook" three cycles running → a silent stall the
  anti-decay forcing should have broken; check the domain rotation config.
