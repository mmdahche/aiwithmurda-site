---
name: eval-rubric
description: Two-tier judgment rubric (behavior gate + quality score) for the /eval skill — reference doc.
risk: low
---

# /eval rubric

Two tiers of judgment — behavior gates the merge; quality is scored by hand.

## Behavior (pass/fail — the gate)
- Tier-1 hook scenarios: every safety hook fires as specified (run-evals.sh).
- Tier-2 agent scenarios: output contains every `require_markers` regex.
- A behavior failure is a REGRESSION — fix before shipping/merging.

## Quality (1-5 — by hand, optional)
Score a real run's output, not just pass/fail:
- 5 — precise, actionable, correct file:line, no noise.
- 3 — finds the issue but vague or padded.
- 1 — misses the issue or hallucinates.

## Determinism
Run any flapping scenario **3×**. If the verdict varies between runs, the agent
prompt is not deterministic enough — tighten it. Score behavior on REQUIRED
MARKERS (did it flag X?), never on exact wording, because model output varies.

## Reliability vs stability (numeric gates)
Two different questions, two different metrics:
- **pass@k (RELIABILITY)** — of k runs, did it pass at least once? Gate for capability
  scenarios: **pass@3 ≥ 0.90**.
- **pass^k (STABILITY)** — of k runs, did it pass EVERY time? Gate for regression / safety-hook
  scenarios: **pass^3 = 1.00** (a safety hook that fires 2 of 3 times is a failure).
- Anti-pattern: do NOT chase pass-rate while cost/latency drifts — record tokens+time per run;
  a scenario that starts passing but doubled in cost is a regression too.

## Maintenance
Keep the scenario set small and fixed. Add ONE scenario whenever a real session
surfaces a miss the harness didn't catch — that is how the net tightens over time.
