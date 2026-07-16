# START HERE — Claude Setup Audit Suite

You bought the pack that answers two questions every power user eventually hits:
**"What is my Claude Code setup actually doing?"** and **"Did my last change break
it?"** Four disciplines — setup audit, context budget, config regression eval, and
pre-install skill security scanning — with two runnable scripts you can verify
yourself.

## Your first win in 3 steps (~20 minutes)

1. **Install:** from this folder run `bash install/setup.sh` (add `--force` to
   overwrite a prior install). Needs Python 3 and a Claude Code config dir
   (`~/.claude` by default).
2. **Audit:** invoke `/audit-setup` (or ask "audit my claude setup"). The collector
   prints JSON; the skill turns it into a fixed-shape markdown report you can diff
   against a friend's.
3. **Regression check:** run `sh ~/.claude/skills/eval/run-evals.sh`. Hooks you
   don't have installed SKIP; anything installed must still pass.

## Where everything is

- `payload/audit-collect.py` — deterministic inventory collector (stdlib only)
- `payload/audit-setup.md` — interprets collector JSON into the standard report
- `payload/context-budget.md` — token overhead audit across agents/skills/MCP/rules
- `payload/eval.md` + `run-evals.sh` + `scenarios.json` — setup regression harness
- `payload/scripts/skill_security_auditor.py` — pre-install skill scanner
- `payload/skill-security-auditor.md` + `threat-model.md` — scanner skill + reference
- `install/claude-code/` + `install/codex/` — dual agent layouts
- `examples/audit-diff-walkthrough.md` — diffing two audits before a merge
- `VERIFY.md` — the checklist we ran before shipping

## The one rule

Facts before opinions. The collector and eval runner produce reproducible artifacts;
the skills interpret them. Never skip the scripts and hand-wave an inventory.
