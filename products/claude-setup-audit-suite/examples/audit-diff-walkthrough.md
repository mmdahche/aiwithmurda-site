# Walkthrough — diffing two setup audits before a merge

This example is synthetic but mirrors the real workflow: two operators each run
`/audit-setup`, diff the reports, merge Layer A (portable) components, then re-run
`/eval` to prove nothing regressed.

## Scenario

**Alex** runs a stock Claude Code install with three skills and no deny-list.
**Jordan** runs an elaborate setup: twelve skills, four wired hooks, and a broad
allow-list. They want one shared Layer A core without copying Jordan's personal
memory or risky permissions.

## Alex's maturity signal (abbreviated)

```
Tier: light (score 5)
Signals: +2 global CLAUDE.md, +3 slash commands, +0 deny-list
Permissions: allow_count 4, deny_count 0, flagged_allows 0
```

## Jordan's maturity signal (abbreviated)

```
Tier: elaborate (score 18)
Signals: +5 skills, +4 wired hooks, +1 plugins enabled
Permissions: allow_count 22, deny_count 0, flagged_allows 3 (medium outbound network)
```

## Diff decisions

| Component | Verdict |
|-----------|---------|
| Jordan's `pre-commit-secrets.sh` hook | **Layer A** — merge into shared core |
| Jordan's project-specific skills (`client-acme-*`) | **Layer B** — stay personal |
| Jordan's wildcard allow rules | **Block merge** — tighten before share |
| Alex's minimal CLAUDE.md | **Layer A** — becomes shared baseline |

## After merge — eval gate

```bash
sh ~/.claude/skills/eval/run-evals.sh
# Expect: secret-hook + destructive-guard PASS if installed; others SKIP
```

Then `/audit-setup` again:

- `referenced_but_missing` must be empty
- `flagged_allows` must not increase vs Jordan's pre-merge report
- `settings_json_error` must be null

If all three hold, the merge is clean enough to trust for daily use.
