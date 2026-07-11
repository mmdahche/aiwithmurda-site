---
name: grill
description: Socratic plan interrogation — a relentless one-question-at-a-time interview that walks every branch of the decision tree, challenges terminology against the project's own vocabulary docs, stress-tests with concrete edge-case scenarios, and explores the codebase when a question can be answered without asking. Recommends an answer for each question rather than just asking. Use when the user says "grill me", "stress-test this plan", "challenge this plan", "pressure-test this", "interrogate this design", "find holes in this". Does NOT generate a plan — only interrogates one that exists. For multi-model peer review on commitments, use /council. For a pre-build idea diagnostic, use /office-hours.
---

# /grill — Relentless Socratic plan interrogation

Plan-stress-test mode. Interview the user relentlessly until you reach shared understanding of every branch of the design tree. Resolve dependencies between decisions one at a time. For every question, **state your recommended answer first**, then ask — that surfaces disagreement faster than open questions.

## When to use

- The user says: "grill me", "stress-test this plan", "challenge this", "pressure-test this", "interrogate this design", "find holes in this", "what am I missing"
- Start of planning for a non-trivial feature (anything bigger than a single-file change)
- Right before locking a plan's scope
- A plan exists but feels under-specified or hand-wavy

## When NOT to use

- The user just wants you to write the plan — that's a planning task, not an interrogation
- Multi-model peer review (cross-model second opinion) — that's `/council`
- Pre-commitment "is this idea even worth doing" — that's `/office-hours`
- The plan was already executed and needs a code review

## Method

### Rule 1 — One question at a time

Ask one question. Wait for the answer. Never list five questions in one message. The interrogation works because each answer reshapes the next question.

### Rule 2 — State your recommendation, then ask

Don't ask open-ended "what should X be?" — propose the answer you'd give and ask the user to confirm or correct:

> Format: "I think X because Y. Does that match your intent, or am I misreading?"

This surfaces disagreement faster (people push back on a wrong recommendation harder than they volunteer an opinion), forces you to actually have a view, and kills "I dunno, what do you think?" loops.

### Rule 3 — Explore the codebase instead of asking when possible

If the answer is already in the code, find it. Don't burn the user's time asking what a file does or whether a function exists. Search first; ask only if the codebase is silent or ambiguous.

### Rule 4 — Challenge against project vocabulary

Before grilling, read the project's vocabulary source: a glossary/concepts doc at the project root, or the vocabulary section of the project's agent instructions (CLAUDE.md / AGENTS.md). If no canonical vocabulary exists, note it — that itself is a finding.

When the user uses a term that conflicts with the project vocabulary, call it out: "Your docs define 'Order' as X, but you seem to mean Y — which is it?" When a term is vague or overloaded, propose a precise canonical term.

### Rule 5 — Stress-test with concrete scenarios

Don't abstract-argue. Invent specific scenarios that probe boundaries:

- "What happens if the user cancels mid-checkout after the payment webhook fires but before inventory adjusts?"
- "Two locations have stock = 1 for the same SKU. A customer orders 2. What's the failure mode?"

Concrete scenarios surface gaps that abstract requirements lists hide.

### Rule 6 — Cross-reference user claims against code

When the user states how something works, verify against the code. Surface contradictions immediately:

> "You said partial cancellation is supported, but `cancelOrder()` only handles full cancellation. Which is right?"

This catches stale mental models — extremely common after a few weeks away from a module.

## When to flag architectural decisions

If the grilling surfaces a decision that is (1) hard to reverse, (2) surprising without context, AND (3) the result of a real trade-off — tell the user "this should be logged as an architectural decision" and capture a one-liner in the project's decision log or notes. Fewer than all three → skip the flag. Over-flagging dilutes the signal.

## Discipline rules

- **Never generate the plan.** This skill only interrogates a plan that exists.
- **Never batch questions.** One at a time, every time.
- **Never assume.** If the codebase says X and the user says Y, surface it.
- **Recommendations must be load-bearing.** If you don't know, say so — don't invent a recommendation to fill the slot.
- **Vocabulary challenges are non-negotiable.** Sloppy language now is a bug later.
- **Stop when answers stabilize.** When two consecutive answers don't change the design, the grilling is done. Don't manufacture questions to look thorough.

## Output during the session

Each turn is one question + your recommended answer. No preamble:

> **Q3 of however-many.** I'd handle the partial-cancellation case with a separate `partial_refund` event the inventory adjuster subscribes to — keeps cancellation atomic. Does that match how you'd want it, or do you want it inline?

## Output when done

> Grilling done. N decisions resolved. Open: [anything punted]. Architecture flags: [count]. Ready to plan.

## Related

- `/office-hours` — pre-commitment idea diagnostic. Run BEFORE /grill if the idea is fuzzy. /grill assumes the plan exists.
- `/council` — multi-model peer review. Use AFTER /grill on commitments/tradeoffs. /grill is single-model deep; /council is multi-model wide.

## Origin

Clean-room merge of mattpocock/skills `/grill-me` + `/grill-with-docs` (MIT). Kept: one-question-at-a-time discipline, explore-codebase-instead-of-asking, vocabulary challenge, concrete-scenario stress-testing, claim-vs-code cross-reference, recommend-then-ask pattern. Adapted: generic vocabulary-source resolution and decision-log flagging instead of tool-specific conventions.
