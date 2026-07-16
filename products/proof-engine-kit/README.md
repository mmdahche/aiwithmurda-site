# Proof Engine Kit

**The build-in-public command center pattern — as templates and runbooks.**

Sanitized patterns extracted from a production sprint site: scoreboard data model,
daily receipt pages, OBS overlay discipline, prelaunch labeling, baseline reset,
and the sequential `smoke:launch` gate.

| Component | What it does |
|-----------|--------------|
| **Schemas + SQL** | Daily log + sprint config shapes, Postgres migration |
| **lib/** | Campaign phase engine + client tracker helpers |
| **Runbooks** | Prelaunch, OBS, baseline, launch gate |
| **Script templates** | smoke-launch orchestrator + baseline sync CLI |
| **proof-engine skill** | Agent discipline for public sprint operations |

## Time to first value

~45 minutes: copy `sprint-config.example.json`, apply `daily_logs.sql`, implement
`/day/1` using `day-receipt-page.pattern.md`, run dry-run baseline script.

## Install

**Skill:** `bash install/setup.sh`

**Scaffold:** copy `payload/` subtrees into your repo — adapt routes and env names.

## Provenance

Patterns sanitized from the operator's live sprint codebase (2026). No Murad-specific
URLs, secrets, or course content included. The live site is the reference implementation;
this kit is the portable template.

## License

MIT — see `LICENSE`.
