---
risk: low
name: eval
description: Regression-test the Claude Code setup itself — verify hooks, agents, and rules still behave after edits or a merge. Runs a deterministic config self-test and optional agent-behavior scenarios scored on required markers. Use after changing agents, hooks, or rules. Invoke with /eval.
---

# /eval — Setup Regression Harness

Verify the **configuration still works** — not the user's application code, but the
agents, hooks, and review rules themselves. Keep it cheap: Tier 1 is free; Tier 2
costs model tokens.

## Tier 1 — deterministic config self-test (run always)

```bash
sh ~/.claude/skills/eval/run-evals.sh
```

The runner builds throwaway git repos and checks whether **installed safety hooks**
still fire: secret blocking, destructive-command guard, session-start injection.
Hooks that are not installed report **SKIP**, not failure. Report the pass/fail tally
verbatim. Any failure is a regression — fix before shipping.

## Tier 2 — agent-behavior scenarios (optional; costs tokens)

Read `~/.claude/skills/eval/scenarios.json` → `agent_scenarios`. For each:

1. Build the tiny fixture described.
2. Run the named agent or subagent against it.
3. **Score on `require_markers` regexes**, not exact wording.

Report passed/total. If a scenario flaps, run it 3×; varying verdicts mean the
prompt is not deterministic enough.

## Tier 3 — quality rubric (optional)

Use `~/.claude/skills/eval/eval-rubric.md` to score output quality 1–5 on a real run.

## Output

One summary: `Tier-1 X/Y`, `Tier-2 A/B`, then **config healthy** or **N regressions**.

## Discipline

- Read-only on the real config; scratch dirs only.
- Keep `scenarios.json` small; add one scenario when a real miss reveals a gap.
- Score behavior on markers, never on exact phrasing.
