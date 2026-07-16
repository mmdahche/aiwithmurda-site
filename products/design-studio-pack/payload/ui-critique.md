---
name: ui-critique
description: Structured UI critique protocol — Nielsen heuristics plus AI-slop tells for design reviews. Use when reviewing mockups, staging URLs, or PR screenshots before sign-off.
---

# UI Critique Protocol

Structured review that produces **actionable fixes**, not vague "make it pop."

## When to use

- Design review before merge
- Critique of agent-generated screens
- Stakeholder feedback synthesis into a fix list

## Review setup

1. Capture viewport: mobile 390px + desktop 1280px minimum
2. Load DESIGN.md if it exists — critique against contract, not personal taste
3. Walk primary user path once without devtools

## Nielsen heuristics (score 0–2 each)

| # | Heuristic | 0=fail 1=partial 2=pass |
|---|-----------|-------------------------|
| H1 | Visibility of system status | |
| H2 | Match real world | |
| H3 | User control & freedom | |
| H4 | Consistency & standards | |
| H5 | Error prevention | |
| H6 | Recognition over recall | |
| H7 | Flexibility & efficiency | |
| H8 | Aesthetic & minimalist design | |
| H9 | Help users recover from errors | |
| H10 | Help & documentation | |

**Ship bar:** no heuristic at 0; average ≥1.5

## AI-slop tells (binary)

- Could swap logo for any SaaS and nobody would notice
- Three equal columns with generic icons
- Gradient blob background without brand reason
- CTA says "Get Started" with no specificity
- Numbers or social proof without source

Each tell found → link to anti-slop-audit rule number.

## Critique output template

```markdown
## UI Critique — [screen/route]
Reviewer: [agent/human] · Date: · DESIGN.md: yes/no

### Top 3 blockers
1. ...
2. ...
3. ...

### Heuristic scores
H1:2 H2:1 ... (total /20)

### Slop tells: [list or none]

### Recommended fixes (ordered)
1. [file/component] — change — why
2. ...

Verdict: APPROVE / REVISE / REJECT
```

## Verdict

- **APPROVE** — heuristics pass, zero slop tells, anti-slop audit would SHIP
- **REVISE** — fixable issues listed; re-review one viewport after fixes
- **REJECT** — missing DESIGN.md + generic layout; regenerate from contract first

## Rules

- Critique behavior and hierarchy, not subject preference for blue vs green
- Every negative must include a specific fix direction
- Screenshot or route reference required per blocker
