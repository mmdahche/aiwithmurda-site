---
name: council
description: Runs The Council — 5 perspective-based advisors (Contrarian / First Principles / Expansionist / Outsider / Executor) on different Groq models, an anonymized peer-review pass, and a Chairman synthesis in-session. Use when the user is about to commit time, money, or infrastructure, when a real tradeoff has both sides plausible, when excitement about a new idea is high (false-hope risk), or when the user says "run the council", "council this", "pressure-test this decision", "what do you think" on a question with real downside.
---

# /council — 5-advisor decision engine

**Purpose:** pressure-test a decision against 5 orthogonal perspectives and an anonymized peer-review pass before you (the AI session) answer from your default agree-with-the-user bias. Built to break sycophancy on high-stakes tradeoffs without asking the same model five times.

## When to use

- The user is committing time, money, or infrastructure to a direction ("should we build X next", "should I pay for Y", "which vendor / tier / architecture")
- Both sides of a tradeoff are plausible and the cost of being wrong is non-trivial
- The user sounds excited about a new idea — false-hope bias is highest and most expensive there
- You notice you're about to default to "yes, that sounds great" on something non-trivial
- The user explicitly asks "what do you think" on an open question with real downside

## When NOT to use

- Trivial questions ("what time is it", "which file is X in")
- Obvious next steps with no branching
- Bug fixes where the root cause is already diagnosed
- Anything the user can decide in under 10 seconds
- The user says "don't council this" or "just tell me"

## Setup (one time)

Run `install/setup.sh` from the product folder, then put a free Groq key in
`~/.council/.secrets/groq.env` (template provided). Verify:

```bash
~/.council/council.sh --mode fast "Is the council installed correctly?"
```

## Steps

1. **Frame the question** using `framing-template.md`: decision, context, constraints, what sparked it, cost of being wrong, current lean. Garbage framing = garbage verdict.
2. **Announce** in one line — "This is council-worthy — running the council" — so the user can veto before the ~5 second wait.
3. **Dispatch:** `~/.council/council.sh --mode multi-model "<framed question>"` (default; `--mode personas` only as a rate-limit fallback).
4. **Wait ~3-6 seconds.** The runner returns a text bundle to stdout and writes an HTML artifact to `~/.council/reports/`.
5. **Read the bundle:** 5 advisor outputs (identities visible to you as Chairman), the anonymization map, and 5 peer reviews (which saw only A-E).
6. **Synthesize as Chairman.** Fixed 7-section verdict:
   1. WHERE THE COUNCIL AGREES (consensus)
   2. WHERE THE COUNCIL CLASHES (direct contradictions)
   3. PARTIAL COVERAGE (topics only some advisors addressed — name who covered what)
   4. UNIQUE INSIGHTS (points made by exactly ONE advisor that deserve elevation)
   5. BLIND SPOTS THE COUNCIL MISSED (peer reviewers surfaced these)
   6. THE RECOMMENDATION
   7. THE ONE THING TO DO FIRST
7. **Add the Chairman overlay.** You hold context the Groq advisors never saw — the user's projects, constraints, and history. Weigh advisor takes against it; you are Chairman because you hold full context.
8. **Point the user at the HTML artifact** (`~/.council/reports/council-report-<timestamp>.html`) so they can browse the raw advisor views.

## Adversarial mode (in-flight doubt, not post-hoc verdict)

When fired mid-decision — right before committing a non-trivial change or an irreversible call — use the adversarial protocol:

1. **CLAIM (keep to yourself):** write the claim in 2-3 lines. Do NOT pass it to reviewers — it biases them toward agreement.
2. **EXTRACT:** hand reviewers the smallest reviewable ARTIFACT (diff/plan/function) + a CONTRACT (3-5 sentences of what it must satisfy). Strip your reasoning.
3. **DOUBT:** the reviewer prompt is adversarial, not validating: "Find what's wrong. Assume the author is overconfident. Look for unstated assumptions, edge cases, hidden coupling, contract-violation paths. Do NOT validate. Do NOT summarize."
4. **RECONCILE — classify findings in this precedence:** (1) contract misread → fix contract first; (2) valid + actionable → change the artifact; (3) valid trade-off → document explicitly; (4) noise → note and move on.
5. **STOP — bounded loop:** trivial findings, OR 3 cycles complete, OR the user says "ship it". If 3 cycles still surface substantive issues, the artifact may not be ready.

**Doubt theater (failure mode):** if across 2+ cycles reviewers surfaced real findings and zero were classified actionable, you're validating, not doubting. Stop and say so.

## Modes

| Mode | Advisors | When |
|------|----------|------|
| `multi-model` (default) | Llama 3.3 70B / Qwen 3 32B / GPT-OSS-120B / Llama 4 Scout / GPT-OSS-20B | Default. Five different models produce real cognitive diversity; one model role-playing five personas collapses into its house style. |
| `personas` | All 5 advisors on Llama 3.3 70B | Rate-limit fallback only. |
| `fast` | 1 primary + 1 cross-judge, sequential | Sub-2-second sanity check when the full council is overkill but you want a second opinion to break self-judging bias. No HTML report, no archive. |

## Notes

- **Cost:** free on the Groq free tier. ~5 seconds end-to-end. The free tier covers ~100 runs/day — orders of magnitude above real need.
- **Model quirks the runner already handles:** GPT-OSS models put reasoning in a separate `reasoning` field (runner falls back to it when `content` is empty); Qwen emits `<think>...</think>` inline (runner strips before writing content).
- **Archive:** every full run is saved to `~/.council/runs/<timestamp>/` with `advisors.json`, `reviewers.json`, `mapping.json`, `question.txt` — your decision paper trail.
- **Companions:** `/office-hours` (pre-commitment idea diagnostic — run BEFORE council when the idea is fuzzy) and `/grill` (Socratic plan interrogation — single-model deep; council is multi-model wide).

## Origin

Council pattern lineage: karpathy/llm-council (multi-model council + anonymized peer review) with a 5-persona advisor layer. Built and adapted as original work; the advisor prompts, chairman synthesis, adversarial protocol, and runner are this product's own implementation.
