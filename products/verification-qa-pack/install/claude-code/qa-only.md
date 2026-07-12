---
name: qa-only
description: Report-only QA testing via browser automation. Walks a web app, finds bugs, produces a structured report with health score, screenshots, and repro steps — but never fixes anything and never commits. Use when the user says "just report bugs", "qa report only", "test but don't fix", or wants the findings before authorizing fixes. For the full test-fix-verify loop, use /qa.
---

# /qa-only — Report-only QA

Same engine as `/qa` but stops after the report. No fix loop, no commits, no
source-code touches. Use it to review the bug surface before allocating fix
effort, on a branch you don't own, or when the working tree must stay dirty
(mid-experiment).

## When to use

- The user says: "qa-only", "just report", "test but don't fix", "find bugs but don't touch the code"
- Pre-review of the bug surface before authorizing fixes
- QA on someone else's WIP branch
- The working tree must stay as-is

## When NOT to use

- The user wants bugs fixed in the same session → `/qa`
- Static code review without a browser → not this tool

## Differences from /qa

1. **No clean-tree gate** — nothing will be committed; note the dirty state in the report metadata.
2. **No fix loop, no commits** — the fix phase is skipped entirely.
3. **Severity tiers don't gate anything** — all severities are documented; the flag only affects exploration depth.

## Workflow

Run `/qa` Phases 1-6 exactly, with the two skips above. Output structure is
identical (`./qa-reports/<date>/` with REPORT.md + baseline.json +
screenshots/), and the report's fix section is replaced with:

```markdown
## Fixes — NOT ATTEMPTED (qa-only mode)
Run /qa --regression ./qa-reports/<date>/baseline.json to enter the fix loop.
```

## Discipline

Inherits `/qa`'s rules minus the commit rules. Anti-speculative-write still
applies to the report itself — never claim an issue exists without screenshot
evidence — and skipped checks (e.g. CAPTCHA-blocked pages) are always logged
with a reason, never silently omitted.

## Output (chat, when done)

"QA report complete. Score: 73/100. Top issue: <one-line>. N issues found. Report: <path>. Run /qa --regression to fix."

## Origin

Sibling of `/qa` — same clean-room adaptation from garrytan/gstack (MIT); see /qa's Origin.
