---
name: test-gap-detector
description: Scan a codebase and report source files that don't have corresponding tests, ranked by risk signal (recently changed, exported APIs, larger files, payment/auth/security paths). Detects gaps — does NOT write tests. Use when the user says "what's not tested", "test coverage check", "show me test gaps", or before a PR/release.
---

# /test-gap-detector — ranked untested-file finder

Finds untested source files and ranks them by how much testing them would
matter. Read-only — it never writes tests. A 5,000-file gap dump is
unactionable; a top-10 sorted by risk × recency × API surface is a work list.

## When to use

- "What's not tested" / "show me test gaps" / "coverage check"
- Before a PR or release: surface high-risk untested files
- After a work phase: confirm new code got covered

## When NOT to use

- The user wants tests WRITTEN — that's the next step, a different job. This stops at "here's the gap."
- The user asks for coverage % — that's covered-lines math; use the project's coverage tool (`vitest --coverage`, `pytest --cov`).
- Throwaway scripts — testing them is bike-shedding.

## Step 1 — Detect project type and test conventions

| Type (marker) | Source pattern | Test pattern |
|---|---|---|
| JS/TS (`package.json`) | `**/*.{ts,tsx,js,jsx,mjs,cjs}` | `**/*.{test,spec}.*`, `**/__tests__/**` |
| Python (`pyproject.toml`/`setup.py`) | `**/*.py` | `**/test_*.py`, `**/*_test.py`, `**/tests/**` |
| Go (`go.mod`) | `**/*.go` | `**/*_test.go` |
| Rust (`Cargo.toml`) | `src/**/*.rs` | inline `#[cfg(test)]` + `tests/**/*.rs` |
| Shell | `**/*.sh` | `tests/test-*.sh` |

## Step 2 — List source files, excluding noise

Exclude: `node_modules`, build output (`dist`, `build`, `.next`, `.expo`),
`coverage`, generated files (`.d.ts`, codegen), and the test files themselves
(a test file in the gap list is a tautology).

## Step 3 — Match each source file to a test

For `src/foo/bar.ts`, any of: `src/foo/bar.{test,spec}.ts`,
`src/foo/__tests__/bar.test.ts`, `tests/foo/bar.test.ts`,
`__tests__/foo/bar.test.ts`. None found → gap.

## Step 4 — Rank gaps by signal

| Signal | Weight | Detection |
|---|---|---|
| Changed in last 30 days | +3 | `git log --since="30 days ago" --name-only` |
| Exports a public API | +3 | grep top-level `export` / `module.exports` |
| Security keywords (auth, password, token, payment, webhook, admin) | +5 | filename + first 50 lines |
| Integration points (DB client, `fetch(`, queue, storage) | +2 | grep |
| >100 LOC | +2 (>300 LOC: +4 instead) | `wc -l` |
| In a critical-path dir (`auth/`, `payments/`, `webhooks/`) | +5 | path check |
| Untouched >6 months AND no exports | −3 (likely dead code — consider deleting, not testing) | git log + grep |

## Step 5 — Report

Write `qa-reports/test-gaps-<date>.md`: summary counts, a High-priority table
(score ≥ 8) with per-file "why", Medium (5-7), Low listed untabled, and a
"likely dead code" section (negative scores — deletion candidates, not test
candidates). Then a 5-line chat summary: totals, top-3 by score, report path.

## Anti-patterns

- Don't propose writing tests inline — detection and writing are separate jobs.
- Don't flag generated code.
- Don't run on a dirty tree without saying so — staged source may have a staged sibling test.
- Tune the weights when they get noisy, and note why in this file.

## Pairs with

- `/ai-blind-spot-testing` — what the tests for the top gaps should look like (known-answer tables, sandbox seams).
- `/state-sequence-audit` — bugs it finds become top-priority regression tests.

## Origin

Concept derived from ruvnet/ruflo's test-gap worker (MIT) — concept only; the
implementation here is conventions + shell + ranking heuristics, no ported code.
