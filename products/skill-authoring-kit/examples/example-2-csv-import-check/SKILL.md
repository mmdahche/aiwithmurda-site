---
name: csv-import-check
description: Validate a CSV against an import schema before any row touches the database — column mapping, type checks, duplicate detection, and a per-row error report. Use when the user says "check this CSV", "validate the import file", "is this spreadsheet safe to import", or attaches a .csv destined for a bulk import. Report-only — never performs the import itself.
---

# /csv-import-check — prove the file before the import

Pipeline-style example: REQUIRED and OPTIONAL stages declared with the
six-field contract, terminal stages EXPORT then VERIFY kept separate.

*(This is a worked EXAMPLE from the Skill Authoring Kit, in the Codex
`.agents/skills/` layout. Study how a multi-stage skill declares its stage
graph — the pattern from `write-a-skill.md` Phase 1.5 — so optional stages
are gated by need, not always-on.)*

## When to use

- The user says "check this CSV", "validate the import file", "is this spreadsheet safe to import"
- Any bulk-import task where bad rows would corrupt records

## When NOT to use

- The file is JSON/XLSX — convert first (say which tool), then re-run
- The user asked you to actually IMPORT — this skill is report-only; hand off to the import command after a clean report
- Single-row edits — no pipeline needed, just check the one record

## Stage graph

| # | Stage | Required? | Gate |
|---|---|---|---|
| 1 | parse | REQUIRED | — |
| 2 | schema-map | REQUIRED | — |
| 3 | type-check | REQUIRED | — |
| 4 | dedupe-scan | OPTIONAL | user mentioned duplicates OR target table has a uniqueness rule |
| 5 | export report | REQUIRED (terminal) | — |
| 6 | verify report | REQUIRED (terminal) | — |

Stage contract example (the discipline: every stage has a failure_condition):

```
slug: type-check
purpose: Confirm every mapped column's values parse as the schema type.
inputs: mapped rows + schema types
outputs: pass, or per-row/per-column failure list
tool: deterministic checker script (not LLM judgment)
approval_required: false
success_condition: 0 rows fail type parsing
failure_condition: >0 rows fail; report row numbers and offending values
```

## Steps

1. **parse** — read the CSV, detect delimiter/encoding/header row; malformed file → stop with line number.
2. **schema-map** — map headers to schema fields; unmapped REQUIRED field → stop; unmapped extra columns → list as "ignored".
3. **type-check** — run the contract above.
4. **dedupe-scan** (only if gated in) — flag rows duplicating an existing key or another row in the file.
5. **EXPORT** — write `import-check-report.md`: counts, mapping table, failures by row, ignored columns, dedupe hits.
6. **VERIFY** — reopen the written report, confirm it exists and its totals equal the in-memory counts, then print the one-line summary. Never skip: the report the user reads must be the report on disk.

## Output

> Import check: 1,204 rows — 1,187 clean, 17 failing (rows listed in import-check-report.md), 3 columns ignored. Safe to import the clean set only.

## Notes

- Deterministic checks live in a script; the skill narrates and gates. Don't let an LLM "eyeball" types.
- Large files: sample-check the first 5,000 rows, say so explicitly, and offer a full pass.
