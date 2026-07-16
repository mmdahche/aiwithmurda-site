# Browser Automation Studio

**Point your agent at any site: scrape it, test it, drive it.**

Customer-safe conductor skill for browser automation — backend routing
(Playwright, agent-browser, bulk extractors), scraper robot definitions,
anti-rabbit-hole rules, screenshot discipline, and blocker reporting.

| Component | What it does |
|-----------|--------------|
| **browser-automation** | Routes tasks, enforces safety, defines robot JSON, ships receipts |

## Time to first value

~10 minutes: install the skill, run one public-page snapshot with an explicit
backend choice logged.

## Install

**Claude Code:** `bash install/setup.sh` copies into `~/.claude/skills/browser-automation/`

**Codex:** copies into `.agents/skills/browser-automation/`

## Provenance

Sanitized from the operator's production browser conductor (2026-07-16).
Customer edition removes environment-specific MCP paths and project names.
Patterns for scraper robots and telemetry opt-out are original packaging.

## License

MIT — see `LICENSE`.
