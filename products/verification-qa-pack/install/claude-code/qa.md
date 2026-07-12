---
name: qa
description: Systematically QA test a web application via browser automation (Playwright MCP or equivalent) and fix the bugs found. Runs QA, then iteratively fixes bugs in source, committing each fix atomically and re-verifying. Use when the user says "qa this", "test the site", "find bugs", "test and fix", or wants verification before shipping. Three tiers (Quick/Standard/Exhaustive) gate fix severity; four modes (Diff-aware/Full/Quick/Regression). Produces health scores, fix evidence, and a ship-readiness summary. For report-only mode (no fixes), use /qa-only.
---

# /qa — Systematic QA + fix loop

Live-URL QA via browser automation. Walks the app, finds bugs, fixes them in
source, commits each fix atomically, re-verifies. Produces a health-scored
report.

## When to use

- The user says: "qa this", "QA on <url>", "test the site", "test and fix", "find bugs", "ship-readiness check"
- Pre-release verification of any project
- The user says a feature is "ready" or "done" — offer it, don't auto-fire

## When NOT to use

- Report-only request → `/qa-only` (same engine, no fix loop, no commits)
- Static codebase audit without a browser → a code review, not this
- Working tree is dirty AND the user didn't authorize handling it → STOP and ask (Phase 1)
- No running app and no staging URL → ask for a URL before starting

## Inputs

| Input | Default | Override |
|---|---|---|
| Target URL | auto-detect from feature branch / local dev ports | `qa https://staging.example.com` |
| Tier | Standard | `--quick` (critical+high only) or `--exhaustive` (+ low/cosmetic) |
| Mode | Diff-aware (feature branch, no URL), else Full | `--full`, `--quick`, `--regression <baseline.json>` |
| Output dir | `./qa-reports/<YYYY-MM-DD>/` in the project | not configurable — keeps reports findable |
| Scope | Full app (or diff-scoped) | "focus on the billing page" |
| Auth | none | "sign in as user@example.com first" — ask before doing |

**Tier → fix gating:** Quick = critical+high only · Standard = +medium (default) · Exhaustive = +low/cosmetic.

## Phase 1 — Initialize

1. Resolve the project (git toplevel) and target URL (see modes).
2. **Clean-tree gate:** `git status --porcelain`. If dirty, STOP and ask: commit current changes first (recommended) / stash and pop after / abort. Each QA fix needs its own atomic commit.
3. `mkdir -p ./qa-reports/<date>/screenshots/`
4. Record baseline: current HEAD sha, timestamp, tier, mode.

## Phase 2 — Test-plan context (use the richest source available)

1. Did the user describe a specific feature this session? Scope to it.
2. A written plan / UAT criteria for the current work, if one exists.
3. A TODO/known-bugs file in the repo — known bugs become required cases.
4. PR description / `git log main..HEAD --oneline` on a feature branch.
5. `git diff main...HEAD --name-only` as the final fallback → infer affected routes.

## Phase 3 — Mode selection

**Diff-aware** (default on a feature branch): map changed files → pages/routes (routes/controllers → paths; components → pages; API endpoints → direct fetch checks), detect the running app on common dev ports (3000/4000/5173/8080), test each affected page, and cross-reference INTENT — the change should do what its commit message claims.

**Full** (default with a URL): systematic walk of every reachable page. **Quick:** 30-second smoke — homepage + top 5 nav targets, loads/console/broken-links only. **Regression:** run Full, then diff against the named `baseline.json` — fixed / new / score delta.

## Phase 4 — Walk + verify (per page)

1. Navigate; wait for stable (network idle or a known selector).
2. Console check — record every error/warning.
3. Network check — flag 4xx/5xx.
4. Accessibility snapshot + screenshot (PNG → output dir).
5. Interactive test where the change was interactive: act, snapshot before/after, confirm the intended effect actually happened.
6. Document every bug IMMEDIATELY when found (Phase 5) — never batch.

CAPTCHA blocks → hand to the user, resume after. Auth wall without credentials → ask; never improvise logins.

## Phase 5 — Document issues (fixed schema, evidence required)

```markdown
### ISSUE-<NNN>: <one-line title>
- **Severity:** critical | high | medium | low | cosmetic
- **Category:** console | links | visual | functional | ux | performance | content | accessibility
- **Page:** <url>
- **Evidence:** screenshots/issue-NNN-*.png
- **Repro:** steps + expected vs actual
- **Why this severity:** <one sentence>
```

Interactive bugs need before-action AND after-action screenshots; static bugs need one annotated screenshot. **No screenshot, no issue** — never claim a bug without evidence.

Severity: **Critical** = blocks core flow / data loss / security / prod down · **High** = major feature or payment/auth path broken · **Medium** = degraded, edge case, console error without user impact · **Low** = polish · **Cosmetic** = spacing/typos.

## Phase 6 — Wrap up

Health score (rubric below), "Top 3 Things to Fix", console summary, severity-count table, and a machine-readable `baseline.json` (project, date, url, mode, tier, healthScore, categoryScores, issues[]) for future `--regression` runs.

## Phase 7 — Fix loop (skipped by /qa-only)

Iterate severity-first, gated by tier. Per issue:

1. Root-cause fix only — no band-aids; if the cause is uncertain, build the diagnostic first.
2. Smallest correct edit.
3. Browser smoke-test: reproduce the original failing action, verify it now passes, screenshot the fixed state.
4. Atomic commit: `fix(qa): <one-line>` citing ISSUE-NNN + the report path. One issue = one commit, never bundled.
5. Re-verify post-commit. If the fix introduced new console errors: revert immediately, mark ATTEMPTED-REVERTED with the reason, continue.

## Health-score rubric

Console 15% (0 errors=100, 1-3=70, 4-10=40, 10+=10) · Links 10% (-15 each broken, floor 0) · Functional 20%, UX 15%, Accessibility 15%, Visual 10%, Performance 10%, Content 5% — each starts at 100 and deducts per finding: critical -25, high -15, medium -8, low -3, cosmetic -1 (floor 0). Overall = weighted sum.

**90-100** ship-ready · **75-89** ship with notes · **60-74** hold one cycle · **<60** do not ship.

## Discipline rules

- **Anti-speculative-write:** never write "fixed" until the re-verification screenshot exists.
- **Atomic commits, root-cause only, no silent skips** — every issue dropped by the tier gate is logged with its reason.
- **Incremental save:** persist progress after each fix so an interruption loses nothing.
- **Never push** — commits stay local until the user says push.

## Output (chat, when done)

1-3 sentences, verb first: "QA complete. Score: 73/100. Top issue: <one-line>. Fixed N of M (tier=standard). Report: <path>." If it holds shipping, lead with the hold.

## Related

- `/qa-only` — same engine, report only.
- `/state-sequence-audit` — code-path tracing for dead buttons (different evidence; run both pre-launch).
- `/verify-before-claiming` — the claim discipline every fix report must obey.

## Origin

Methodology clean-room adapted from garrytan/gstack `/qa` (MIT). Kept: the health rubric, tier ladder, mode set, phased workflow, and atomic-commit-per-fix loop. Adapted: browser automation via Playwright MCP or equivalent; project-local report paths; all personal-stack scaffolding removed.
