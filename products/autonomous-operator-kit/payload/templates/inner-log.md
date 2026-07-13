# Operator Cycle — Inner Log

Append-only cycle log. Every cycle appends ONE block conforming to the schema below. Do not edit prior entries (they are immutable history). Atomic writes only (`.tmp` + rename).

Read `CYCLE-CONTRACT.md` § 2 for the full validator rules.

---

## Entry format

Each cycle appends a block that matches this shape exactly. Section headers, order, and terminator are enforced by the log validator.

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
<one sentence: what the next cycle should attempt>

---
```

## Field rules (summary — see CYCLE-CONTRACT § 2 for full spec)

- `CYCLE <N>` — monotonic +1 from the previous entry. First entry is `CYCLE 1`.
- `Depth:` — integer 1-6. MUST be ≥ the previous cycle's depth (compounding rule).
- `Domain:` — one of the 7 canonical domains.
- `Duration:` — integer seconds. ≥ 600 (10-minute floor).
- `Commit:` — resolvable via `git rev-parse`. During the ship procedure this is written as the `0000000` placeholder, then patched to the real sha via `sed` after the commit.
- `Shipped:` — ≥1 bullet required. Every bullet references a file path or a git-sha.
- `Broke:` — caveats and known-incomplete work. Use "none" if truly nothing.
- `Surprised:` — genuine prediction errors. Use "none" if none.
- `Next-cycle hook:` — one sentence that becomes the next wake-up's `reason` field.
- `---` — required terminator between entries.

## Empty log — first cycle appends below this line

<!-- The first `## CYCLE 1` block goes below. Do not remove this comment; the marker helps the log validator recognize a fresh log. -->
