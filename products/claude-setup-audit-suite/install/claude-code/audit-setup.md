---
risk: low
name: audit-setup
description: Audit a Claude Code setup into a fixed-shape inventory, maturity tier, and risk flags. Runs the deterministic collector audit-collect.py, then interprets its JSON into a standardized report two setups can be diffed against. Use when reviewing how Claude Code is configured or preparing a setup for sharing. Invoke with /audit-setup or "audit my claude setup".
---

# /audit-setup — Claude Code Setup Auditor

Produce a **read-only audit** of a Claude Code configuration. The report uses a
fixed section order so two people's audits can be diffed side by side.
**Do not modify any configuration** — recon only.

## Step 1 — Run the deterministic collector

Facts come from a script, not from ad-hoc scanning:

```bash
python3 ~/.claude/skills/audit-setup/audit-collect.py
```

To audit a **project-level** `.claude` directory instead of the user-level one:

```bash
python3 ~/.claude/skills/audit-setup/audit-collect.py /path/to/project/.claude
```

The script prints JSON to stdout and saves a timestamped copy to the OS temp dir
(path on stderr). If Python is missing, say so and stop — do not fabricate an inventory.

## Step 2 — Interpret the JSON into the standardized report

Write the report to the OS temp dir as `claude_audit_report_<hostname>_<timestamp>.md`
and surface the digest in chat. Keep these section headers **verbatim and in order**:

```
# Claude Setup Audit — <hostname> (<platform>)

## 0. Maturity
Tier: <maturity.tier> (score <maturity.score>)
<one sentence on what that means>
Signal breakdown: <list maturity.signals as "+N <signal>">

## 1. Subagents (<count>)
| Agent | Model | Tools | Purpose |

## 2. Slash commands (<count>)
| Command | Purpose |

## 3. Skills (<count>)
| Skill | Purpose | Extra files |

## 4. Hooks (<count> wired)
| Event | Matcher | Script |
orphaned scripts = <hooks_dir.orphaned_scripts>
referenced-but-missing = <hooks_dir.referenced_but_missing>

## 5. Plugins
Enabled: <plugins.enabled> | Marketplaces: <plugins.marketplaces>

## 6. Permissions & risk
Allow: <allow_count> | Deny: <deny_count> | Wildcards: <wildcard_allow_count>
Deny-list present: <has_deny_list>
Flagged rules: list permissions.flagged_allows as "[severity] <rule> — <reason>"
Suspected inline secrets: <secrets_suspected> (key paths only)

## 7. Memory
Total facts: <memory.total_facts> across <locations>

## 8. Hygiene
Stale/backup files: list stale_files
settings.json parse errors: <settings_json_error / settings_local_error>

## 9. Merge classification (Layer A vs Layer B)
Label each component portable (Layer A) vs personal overlay (Layer B).
One-paragraph merge-readiness verdict.
```

## Discipline

1. **Read-only.** Only create the report file in temp.
2. **Facts from the collector.** Do not recompute maturity scores.
3. **Never print secret values.** List suspected key paths only.
4. **State scope.** User-level runs do not include project repos unless a path is passed.

## Post-change verification

Run `/audit-setup` again after merging or editing core config. Regressions to watch:

- `referenced_but_missing` hooks must be empty
- No new `flagged_allows` or `secrets_suspected` vs the prior report
- `settings_json_error` must be null
