# Claude Setup Audit Suite

**Find out what your Claude setup actually costs you — then prove your fixes didn't break it.**

Four native operator disciplines for power users with bloated or high-stakes configs:

| Discipline | What it does |
|------------|--------------|
| **audit-setup** | Deterministic JSON inventory → maturity tier + permission risk flags + merge-ready report |
| **context-budget** | Token overhead map across agents, skills, MCP tools, and CLAUDE.md |
| **eval** | Free hook regression runner + optional agent scenario markers |
| **skill-security-auditor** | PASS/WARN/FAIL static scan before installing third-party skills |

## Time to first value

~20 minutes: run `install/setup.sh`, invoke `/audit-setup`, run `run-evals.sh`.

## Requirements

- Python 3.10+ (stdlib only for the collector and security scanner)
- Claude Code with a user config directory (`~/.claude` or `$CLAUDE_CONFIG_DIR`)
- Optional: safety hooks in `~/.claude/hooks/` for eval Tier 1 to test (missing hooks SKIP)

## Install

```bash
bash install/setup.sh
```

Codex layout: copy each `install/codex/<skill>/SKILL.md` into `.agents/skills/` manually, plus copy `payload/audit-collect.py`, `run-evals.sh`, and `scripts/skill_security_auditor.py` beside the matching skill folders.

## Provenance

- **audit-setup**, **eval**, **skill-security-auditor**: native Murad/Noor-authored tooling
- **context-budget**: clean-room rewrite (same workflow shape; no third-party content ported)
- **context-budget** replaces an ECC-sourced draft that never shipped

## License

MIT — see `LICENSE`.
