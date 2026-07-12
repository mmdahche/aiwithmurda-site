# START HERE — Verification & QA Pack

You bought the pack that makes "it works" mean something. Six disciplines that
close the gap between an AI agent SAYING the work is done and the work being
provably done: claim gating, dead-button tracing, blind-spot testing, browser
QA with a fix loop, report-only QA, and ranked test-gap detection.

All markdown skills — no dependencies, no installs beyond copying files.

## Your first win in 3 steps (~15 minutes)

1. **Install the claim gate first:** copy
   `install/claude-code/verify-before-claiming.md` into your skills/commands
   folder (Codex: `install/codex/verify-before-claiming/SKILL.md` →
   `.agents/skills/`). This one file changes agent behavior immediately — no
   completion claims without fresh evidence.
2. **Catch it working:** ask your agent to fix any small bug, and watch the
   difference — it must run the verification command in the same message it
   claims success, or the claim doesn't count.
3. **Then install the other five** the same way, and skim
   `examples/dead-button-walkthrough.md` to see the state-sequence audit catch
   a bug that function-level debugging certifies as "no bugs found."

## Where everything is

- `payload/verify-before-claiming.md` — the Iron Law: evidence before claims, and never trust a sub-agent's success report *(also ships in Safe-Autonomy Guardrails — same canonical file, included here because the pack is incomplete without it)*
- `payload/state-sequence-audit.md` — trace buttons through their full state-change sequence; the six shapes of "everything works but the button does nothing"
- `payload/ai-blind-spot-testing.md` — tests for code the reviewer also wrote: known-answer tables, sandbox-mode API testing without a database, the bug-check loop, second-agent review
- `payload/qa.md` — systematic browser QA with health scores and an atomic fix-commit loop
- `payload/qa-only.md` — the same engine, report-only
- `payload/test-gap-detector.md` — ranked untested-file finder (risk × recency × API surface)
- `install/claude-code/` + `install/codex/` — the same six in both agent layouts
- `examples/dead-button-walkthrough.md` — a worked audit end to end
- `VERIFY.md` — the checklist we ran before shipping; re-run it

## The one rule

An agent's confidence is not evidence. Every discipline in this pack exists to
replace "trust me" with an artifact — a fresh test run, a screenshot, a trace,
a ranked report. Install the claim gate first; everything else compounds on it.
