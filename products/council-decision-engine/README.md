# The Council — 5-Advisor Decision Engine

Never make a big call solo again. Five different AI models argue your decision
from five fixed, opposing lenses — Contrarian, First Principles, Expansionist,
Outsider, Executor — then five anonymized peer reviewers grade the arguments
on merit, and the session that dispatched them synthesizes a 7-section verdict
as Chairman. Built to break the "yes, great idea!" bias that a single AI
assistant defaults to.

This is the exact engine Murad runs before committing his own time and money.
The example run in `examples/` is from his real archive.

## Who this is for

Solo operators and small teams who make consequential calls alone: which tier
to pay for, which feature to build next, which vendor, which architecture,
whether to port a competitor's pattern. If your AI assistant has ever
enthusiastically agreed with two contradictory plans in one week, this is the
countermeasure.

## Time to first value

~10 minutes: install (2 min) + free Groq key (3 min) + your first real
council run (5 seconds of compute, a few minutes of reading the verdict).
Follow `00-START-HERE.md`.

## What's inside

| Path | What it is |
|---|---|
| `payload/council/runner.py` | The engine — pure Python standard library, no pip installs |
| `payload/council/council.sh` | Wrapper that loads your key and dispatches |
| `payload/council/advisors/` | The 5 advisor system prompts (tuned, incl. the anti-"demand a glossary" Outsider fix) |
| `payload/council/reviewers/` | The anonymized peer-review prompt |
| `payload/council/.secrets/groq.env.example` | Key template — never commit the real one |
| `payload/framing-template.md` | Fill this before every run; framing quality = verdict quality |
| `payload/companions/office-hours.md` | Companion skill: 6 forcing questions BEFORE an idea becomes a plan |
| `payload/companions/grill.md` | Companion skill: Socratic interrogation of a plan that exists |
| `install/setup.sh` | One-time installer to `~/.council` |
| `install/claude-code/council.md` | Drop-in skill: your Claude Code agent dispatches the council itself |
| `install/codex/council/SKILL.md` | Same skill in Codex layout |
| `examples/example-run.md` | Real run (trimmed): the council talking Murad OUT of a purchase |

## Setup

**Requirements:** Python 3.10+ (macOS/Linux/WSL; on Windows use WSL or Git
Bash for `council.sh`, or call `runner.py` directly), a free Groq account.

- **macOS:** `python3 --version` (install via `xcode-select --install` or Homebrew if missing) → `bash install/setup.sh`
- **Linux:** `sudo apt install python3` (or equivalent) → `bash install/setup.sh`
- **Windows:** install Python from python.org, then either use WSL for the shell wrapper or run `set GROQ_API_KEY=...` and `python runner.py "question"` directly from the payload folder.

Then follow `00-START-HERE.md` step 2 for the key. Verify with the fast-mode
one-liner in `VERIFY.md`.

## Using it with your AI agent (the intended way)

Copy `install/claude-code/council.md` into your Claude Code commands/skills
folder (or `install/codex/council/` into `.agents/skills/`). Your agent then
frames questions with the template, dispatches the runner, and synthesizes
the Chairman verdict in-session — with all the context the Groq advisors
never saw. That context asymmetry is the design: cheap diverse advisors,
one context-rich Chairman.

## Using it standalone (no agent)

```bash
~/.council/council.sh "framed question"          # full council, ~5s
~/.council/council.sh --mode fast "question"     # 1 primary + 1 cross-judge, ~2s
```

You play Chairman: read the bundle, apply the 7-section synthesis from the
skill file, decide.

## Cost and limits

$0 per run on the Groq free tier (~100 full runs/day of headroom). No
subscription, no telemetry, nothing phones home except the Groq API calls
you dispatch. Every full run archives to `~/.council/runs/<timestamp>/` and
writes a self-contained HTML report — your decision paper trail.

## What this is NOT

- Not a magic oracle — the Chairman synthesis (you or your agent) still decides.
- Not an autonomous agent — it runs when you dispatch it, never on its own.
- No income or outcome promises. It improves decision QUALITY inputs; the
  decisions and results stay yours.

## Support boundary

Digital product. Setup questions answered by email (murad@aiwithmurda.com);
no custom implementation included. See LICENSE for use terms.

## Lineage (honesty note)

Council pattern lineage: karpathy/llm-council (multi-model council +
anonymized peer review), with an original 5-persona advisor layer, chairman
protocol, adversarial mode, and runner implementation. Companion skills
office-hours and grill are clean-room adaptations of MIT-licensed methods
(garrytan/gstack and mattpocock/skills respectively) — attribution preserved
in each file's Origin section.
