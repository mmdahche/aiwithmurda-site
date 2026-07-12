---
name: ai-blind-spot-testing
description: Testing discipline for AI-assisted development, where the same model writes the code and reviews it — a structural conflict of interest that produces systematic blind spots only independent checks catch. Use when setting up tests for an AI-built codebase, when an agent keeps "confirming" its own fixes, or when you need API-level regression tests that run without a real database. Pairs with /verify-before-claiming (the behavioral rule) — this file is the harness patterns.
---

# /ai-blind-spot-testing — tests for code the reviewer also wrote

When one model writes the code, reviews the code, and reports the result, you
don't have three opinions — you have one opinion expressed three times. The
same assumptions that produced a bug will approve it and then verify it.
Independent, mechanical checks are the only reviewer that doesn't share the
author's blind spots.

## The blind-spot classes (why "it reviewed itself" fails)

1. **Assumption reuse** — the model misread the spec while writing; the review
   re-reads the spec the same wrong way. The code is "correct" against a wrong
   understanding.
2. **Happy-path anchoring** — generation optimizes for the demo path; review
   walks the same path. Empty lists, nulls, duplicates, timezone edges, and
   concurrent writes live outside it.
3. **Self-consistency bias** — a reviewer that just wrote `computeTotal()`
   verifies `computeTotal()` by reading it, not by running it against a case
   with a known answer.
4. **Phantom verification** — the most dangerous: "I ran the tests and they
   pass" without a fresh run. Language about verification is not verification.

The countermeasure for all four is the same: **checks the author can't
influence** — fixed input/output pairs decided BEFORE the code existed, run
mechanically, read from real output.

## Pattern 1 — Known-answer tests before generation

Before asking the agent to implement, write (or make it write, then YOU eyeball)
5-10 input→output pairs with answers you computed independently — by hand, by
spreadsheet, by the old system. These are the contract.

```
computeCartTotal([])                        → 0
computeCartTotal([{p:10,q:2}])              → 20
computeCartTotal([{p:10,q:2},{p:5,q:1}])    → 25          # multi-item
computeCartTotal([{p:10,q:0}])              → 0           # zero qty
computeCartTotal([{p:9.99,q:3}])            → 29.97       # float discipline
```

The agent implements until the table passes. It cannot argue with a table.

## Pattern 2 — Sandbox-mode API testing (no database required)

Regression tests that need a live DB rot fast and get skipped. Give every
service a sandbox seam instead:

- **Boundary injection:** the handler receives its store (repository object,
  client, or function set) as a parameter; production wires the real one, tests
  wire an in-memory fake with the same interface.
- **Sandbox flag at the app edge** (`APP_MODE=sandbox`): the composition root
  swaps in fixture-backed stores. The ENTIRE request path — routing, auth
  parsing, validation, serialization — still runs for real; only persistence is
  faked. Most AI-introduced regressions live in that path, not in SQL.
- **Fixtures are versioned files**, not setup code: `fixtures/orders.json`
  read at sandbox boot. Reviewing a fixture diff is reviewing the test.

Then API regression tests are plain HTTP assertions:

```
POST /api/orders {bad payload}      → 422 with field errors (not 500)
GET  /api/orders/missing-id         → 404 (not empty 200)
POST /api/orders {valid}            → 201, body echoes computed total
GET  /api/orders?page=2&limit=1     → second fixture order only
```

Fast enough to run on every change; no DB to provision; no cleanup to forget.

## Pattern 3 — The automated bug-check loop

Make the agent's "done" claim pass through a gate it doesn't control:

1. **Reproduce first.** A reported bug becomes a failing test BEFORE any fix.
   If you can't reproduce it in a test, you don't understand it yet.
2. **Fix until that test passes** — and the rest still pass.
3. **The claim is the output.** The agent's completion message must quote the
   fresh runner output (counts, exit code). "Should pass now" is a red flag,
   not a report (see `/verify-before-claiming`).
4. **Keep the test forever.** Every fixed bug is a regression tripwire; AI
   regressions love re-introducing previously-fixed behavior during unrelated
   refactors.

## Pattern 4 — Second-agent review with artifacts, not summaries

When you do want an AI reviewer, break the self-review loop structurally:

- A DIFFERENT session (or model) reviews — one that didn't write the code.
- It receives the DIFF and the CONTRACT (the known-answer table, the endpoint
  expectations), never the author's reasoning or summary — summaries transmit
  the author's blind spots.
- Its instruction is adversarial: find what's wrong, assume the author was
  overconfident, do not validate.

## What to test first in an AI-built codebase (priority order)

1. Money paths — checkout, billing, refunds, entitlements
2. Auth boundaries — who can see/do what; the 401/403/404 triangle
3. Input validation at every public edge — malformed, oversized, empty, duplicate
4. State transitions — the status fields everything else branches on
5. The bugs already fixed once — regression tripwires (Pattern 3.4)

## When NOT to lean on this

- Throwaway prototypes you'll delete this week — known-answer tables on
  disposable code is ceremony.
- UI pixel work — screenshot review beats assertion tests there.
- As a substitute for reading the diff. Tests catch behavior; only reading
  catches "this whole approach is wrong."

## Origin

Original write-up for this pack, distilled from the author's working
verification stack (fresh-evidence discipline, second-agent review, sandbox
seams). No third-party text.
