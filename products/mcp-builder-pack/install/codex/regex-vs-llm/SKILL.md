---
name: regex-vs-llm
description: The parsing-decision framework — try deterministic (regex, grammar, parser) first, add an LLM only for genuine linguistic ambiguity, and gate the two together with a confidence check. Covers when regex earns the job (structured text, fixed grammar, high volume, auditability), when an LLM is honest (free-form language, novel phrasing, semantic categorization), the hybrid confidence-gate pattern (deterministic → LLM on low-confidence remainder → human on disagreement), the cost/latency/auditability tradeoffs each layer buys or spends, and three worked examples (log parsing, invoice field extraction, sentiment/intent) showing the framework producing the right verdict for each. Use when choosing how to extract structure from text, when a regex is drowning in edge cases, when an LLM parser is expensive or drifting, or when reviewing a pipeline that hides an LLM call behind a "parser" name. Pairs with mcp-server-patterns Rule 4 (deterministic scripts behind tools, not LLMs).
---

# /regex-vs-llm — the parsing decision framework

Every "extract X from Y" task in a modern codebase looks the same at first
glance: text goes in, structure comes out. The trap is treating the choice
between regex and LLM as a matter of taste. It isn't. Deterministic parsers
and LLM parsers are different tools with different failure modes, latencies,
costs, and audit surfaces. Picking wrong costs money on the LLM side or
correctness on the regex side, and once a pipeline is live you rarely get to
swap.

This skill is the decision framework: **deterministic first, LLM only for
genuine ambiguity, and a confidence gate between them when both apply.**

## When to use

- Designing a new text-extraction pipeline (logs, receipts, emails, forms,
  transcripts).
- Replacing an existing parser that is either drowning in regex edge cases
  or bleeding money on LLM calls.
- Reviewing a "parser" module in an AI-built codebase to confirm whether the
  LLM call inside is earning its keep.
- Deciding what shape a parsing MCP tool should take (deterministic script
  vs LLM-behind-a-description — see `mcp-server-patterns` Rule 4).

## When NOT to use

- The input isn't text at all — images, audio, binary formats are a
  different pipeline (vision/OCR models, feature extractors).
- The extraction is trivial and one-off — a five-line grep in a Jupyter
  notebook doesn't need a framework.
- The task is generation, not parsing. This skill is about pulling
  structure OUT of text; writing text is a different decision.

## The three-tier layering (always start here)

Any parsing job breaks into three cost/certainty tiers. Design your
pipeline to consume as much as it can at tier 1 before spending on tier 2,
and reserve tier 3 for the small remainder that survives both.

| Tier | Tool | Cost / call | Latency | Auditability | Deterministic |
|---|---|---|---|---|---|
| 1 | Regex, grammar, parser, JSON/XML/YAML lib | ~microseconds, ~$0 | sub-ms | full (read the pattern) | yes |
| 2 | LLM with a fixed label set / JSON schema | ~10-100 ms, cents per 1K | 100 ms - 2 s | prompt + model version | no (drift, temperature) |
| 3 | Human review | minutes | minutes | full (reviewer notes) | yes (people disagree) |

The costs stack downward: every tier-2 call is thousands of times more
expensive than tier 1, and every tier-3 review is thousands of times more
expensive than tier 2. A pipeline that pushes 90% of volume through tier 1
and 9% through tier 2 pays roughly 1% of a pipeline that routes everything
through tier 2 — and behaves identically on the tier-1 slice.

## Rule 1 — Try deterministic first

The moment you have a schema — a known field, a known separator, a known
format — the deterministic tools own the job. Not because they are
"smarter" but because they are:

- **Free at runtime** — a regex against 100k lines costs microseconds.
- **Read-once auditable** — the pattern is the contract; there is no
  behavior hiding inside a model that might change next Tuesday.
- **Testable exhaustively** — a fixture set covers the surface. An LLM
  parser's fixture set covers what you saw during testing, not what
  the model will do next week.
- **Cachable trivially** — same input, same output, forever.

The failure mode this rule prevents: the "we'll just use an LLM to parse
it" pattern where a well-formed CSV, an ISO date, or a URL ends up
dispatched through a model at pennies-per-thousand when a five-character
regex would settle it forever. Every LLM-first parser I have seen for
structured text was rewritten to a deterministic parser inside six months.

**Diagnostic questions — if you answer YES to any, deterministic wins:**

1. Does the input have a fixed grammar (JSON, CSV, INI, RFC 3339 date,
   URL, email, IBAN)?
2. Is the source system emitting this text? (If so, it's structured on
   the way out — parse the structure, don't ask a model to guess it.)
3. Is the target field a well-defined regex class (a phone number, a
   version string, a hex color)?
4. Do you care whether the output is bit-for-bit identical between two
   runs of the same input? (Audit trails, financial data, legal
   documents.)

## Rule 2 — LLM only for genuine linguistic ambiguity

An LLM parser is honest when the input is **language** — natural,
free-form, ambiguous, novel phrasings the pattern-designer cannot
enumerate. The signal is: "would a regex require me to enumerate every
way a human might phrase X?" — and the answer is no, because you can't.

Cases where LLMs pull their weight:

- **Free-form fields** — a customer complaint, a doctor's note, a
  freeform "reason for return" field.
- **Semantic categorization** — bucketing text into a small fixed set of
  labels where the surface forms are unbounded ("angry customer,"
  "product defect," "billing question").
- **Cross-language / mixed-language input** — where a regex would need a
  copy per language and drift.
- **Novel phrasings you cannot pre-enumerate** — abbreviations, slang,
  domain jargon that shifts by industry.

The failure mode this rule prevents: the mirror-image mistake. A team
sees the deterministic parser fail on a genuinely ambiguous slice and
concludes "regex can't do this" — then applies an LLM to the ENTIRE
input, including the 95% that regex was solving fine.

**Structural discipline for every LLM parser:**

- **Fixed label set or JSON schema in the prompt.** Free-text LLM output
  is a debug session waiting to happen. Ship a schema.
- **Deterministic post-validation.** After the LLM returns, run it
  through a validator (Zod, JSON Schema, plain code). Fail closed — a
  malformed response is an error, not a "best-effort" pass through.
- **Temperature = 0 for parsing.** You want the same input to produce the
  same output; deterministic behavior is the whole point of a parser.
- **Version-pin the model.** "Latest" is a moving target that will
  reshape your labels without a PR.
- **Track cost per call.** Not per pipeline run — per call. It's how you
  notice you're spending $180/day parsing timestamps.

## Rule 3 — Hybrid with a confidence gate (the pattern that scales)

The best parsers of ambiguous inputs are almost always **hybrids** — a
deterministic first pass covers the 90% that fits a pattern, a small LLM
call covers the tail, and human review catches the disagreement
remainder. The gate is what makes the hybrid honest.

```
input → deterministic parser
         │
         ├── high confidence  ──► output (tier 1)
         │
         └── low confidence   ──► LLM parser
                                     │
                                     ├── agrees with det. (partial)  ──► output (tier 2)
                                     │
                                     └── disagrees                    ──► human review (tier 3)
```

"Confidence" is not a mystical number — it is any deterministic signal
you can compute from the tier-1 attempt:

- **Structural fit** — did the regex match the whole line, or 60% of it?
- **Coverage** — did we extract all N required fields, or only 3?
- **Value plausibility** — is the extracted date in the last 10 years?
  Is the extracted amount within 3σ of typical?
- **Uniqueness** — did more than one pattern match, tied?

Only rows that fail confidence get the LLM. The LLM's output is then
validated back against the same deterministic checks; disagreements
between tier 1 and tier 2 route to tier 3.

**Why the gate is load-bearing:** without it, the LLM sees every row and
you're back to Rule 2's failure mode with extra steps. With it, tier 2
volume drops by an order of magnitude and tier 3 becomes tractable.

## Rule 4 — The tradeoff table you actually care about

For a given input volume of N rows/day, the pipelines cost roughly:

- **Pure regex:** ~$0/day, hard cap on accuracy at the pattern's
  coverage.
- **Pure LLM:** N × per-call cost. Accuracy varies but "we don't know why
  it flipped" is a real answer to "why did last week's data change?"
- **Hybrid with confidence gate:** ~$0 for the tier-1 slice + (tail% × N
  × per-call). For most business text, tail% is 5-15%; costs drop 85-95%
  vs pure LLM.

Auditability tells the same story: every hop into tier 2 is a hop out of
"here is the pattern that decided this." Financial, legal, compliance,
and healthcare pipelines usually cannot spend that trade — pure
deterministic + human tier 3 for the rest, no LLM in the middle. Marketing
analytics, support triage, and internal dashboards usually can — hybrid
lives well there.

## Worked example 1 — Log parsing (pure regex)

**Task:** extract level, timestamp, service, request_id, latency_ms from
a structured log line.

Sample lines:

```
2026-07-14T09:12:03.221Z INFO  api-gateway [req_9f2c] GET /orders 200 42ms
2026-07-14T09:12:03.229Z ERROR checkout    [req_9f2d] POST /pay 500 812ms
```

**Verdict — pure regex, tier 1 only:**

```javascript
const LOG_RE =
  /^(?<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(?<level>\w+)\s+(?<service>\S+)\s+\[(?<req>\w+)\]\s+\w+\s+\S+\s+\d+\s+(?<latency>\d+)ms/;
```

Why not an LLM: the source system emits this format. Every field is a
fixed grammar. Volume is high (millions of lines/day). Audit needs are
absolute (we chase 500s by request_id). Adding an LLM here would spend
real money to worsen determinism.

Handle format changes with a *versioned parser*: `parseLogV1`,
`parseLogV2`. When the format shifts, add a parser; never fall back to
an LLM to "figure it out."

## Worked example 2 — Invoice field extraction (hybrid with gate)

**Task:** given a supplier PDF converted to plain text, extract
`invoice_number`, `date`, `total`, `tax`, `line_items[]`.

Sample: hundreds of suppliers, each with a slightly different layout. Big
suppliers use the same template every time; long tail is chaotic.

**Verdict — hybrid, gated:**

- **Tier 1 (regex + parser):** per-supplier extractors keyed by the
  supplier ID or a header signature. For the ~50 suppliers that make up
  80% of volume, a hand-written pattern per supplier pulls all five
  fields with 100% coverage. Confidence = "did we get all five fields
  matching plausible ranges."
- **Tier 2 (LLM with schema):** anything a per-supplier extractor
  couldn't fully populate goes to a `parseInvoice(text) -> InvoiceSchema`
  LLM call with:
  - A `zod`-validated JSON schema in the prompt.
  - Temperature 0, model version pinned.
  - Post-validation: date must be within the last 5 years; total must
    equal sum of line items ± rounding; tax must be 0-30% of subtotal.
- **Tier 3 (human):** any row where tier 1 and tier 2 produced different
  values for a numeric field, or where tier 2's post-validation failed.
  Routed to a review queue with both proposals visible.

Why not pure regex: the long tail of suppliers is unbounded and adding
one regex per supplier is a treadmill.

Why not pure LLM: the top 50 suppliers are 80% of volume and don't
change their template. Paying to LLM-parse a Vodafone invoice you have
seen 4,000 times is a mistake.

The gate is what makes this economical — tier 2 handles ~15% of volume,
not 100%.

## Worked example 3 — Sentiment / intent classification (LLM with fixed labels)

**Task:** classify incoming support messages into
`{billing, bug_report, feature_request, praise, cancellation, other}`.

Sample:

```
"hey why did you charge me twice this month??"
"the export button just spins forever on chrome 128"
"would love a dark mode 🖤"
"quick note to say I love this product"
"please cancel my subscription effective today"
```

**Verdict — LLM, tier 2 only, no useful tier 1:**

- The signal is semantic, not lexical. "Charge me twice" is billing;
  "billed twice" is billing; "double payment" is billing; "you took my
  money twice!" is billing. Enumerating this in regex is a full-time job
  that never converges.
- Fixed label set (six classes) makes the LLM's job deterministic
  enough: temperature 0, model pinned, JSON schema
  `{ label: "billing"|"bug_report"|... , confidence: number }`.
- Deterministic post-validation: the label must be one of the six. If
  the model returns something else (rare with a fixed set + temp 0), it
  is a validation failure, routed to tier 3.
- Confidence threshold: below 0.7, route to human review — not because
  the model's confidence number is a probability, but because
  "the model was hedging" correlates with "the human should look."

Why not regex: linguistic variance is the whole problem here. There is
no pattern to hand-write.

Why not human-only: volume is too high to review every ticket by hand,
and the top-of-funnel routing decision doesn't need review-grade
precision — only enough to send billing to the billing team.

Note that even here, the LLM is boxed in: fixed labels, temperature 0,
version-pinned, schema-validated, confidence-gated. The tier-2
discipline of Rule 2 is what keeps this reliable.

## Anti-patterns to catch in code review

1. **"Just ask the LLM" for structured input.** JSON, CSV, ISO dates,
   URLs — if a library exists to parse it, use the library.
2. **A "smart parser" that quietly calls an LLM.** A function named
   `parsePhoneNumber(s)` that internally calls a model is a lie. Rename
   to `interpretPhoneNumber` or move the LLM call to the caller so the
   cost is visible.
3. **LLM parser with free-text output.** No schema, no post-validation
   → shipping model drift straight to production.
4. **No confidence gate in a hybrid pipeline.** Both parsers run on
   every row; you pay tier 2 costs on 100% of volume with no
   fall-through logic. Restore the gate.
5. **Temperature > 0 for a parser.** "It's more creative" is not what
   you want when the goal is the same output for the same input.
6. **Unpinned model version in production.** The parser worked fine
   until Tuesday, when the platform swapped the default model and the
   label distribution shifted by 8%. Pin the version.

## The 30-second decision checklist

- Is the input structured (fixed grammar)? → **regex/parser** (Rule 1).
- Is the input language (free-form, ambiguous, unbounded phrasings)? →
  **LLM with fixed schema** (Rule 2).
- Is it mostly one, with a tail of the other? → **hybrid with a
  confidence gate** (Rule 3).
- Does an audit or legal review need to reconstruct why field X = value
  Y? → **deterministic + tier 3 human review**; no LLM in the middle.

If you can't answer any of those from the input sample and one page of
schema notes, you don't have the problem defined well enough to pick a
parser yet.

## Pairs with

- `mcp-server-patterns` Rule 4 (deterministic scripts behind tools) —
  the same principle applied to MCP tool internals: don't hide an LLM
  behind a tool description.
- `agent-action-space` Rule 3 (tool vs skill vs subagent) — if the
  parser is a subagent's job, the framework tells you whether that
  subagent needs an LLM at all.
- `mcp-server-build` — how to actually ship the deterministic parser
  once you've decided it belongs behind a tool.

## Origin

Original write-up for this pack. The three tiers, the confidence-gate
pattern, and the worked examples are shared practice across teams that
run production text-extraction pipelines; the taxonomy, the rule
numbering, the decision checklist, and every example above are this
pack's own.
