---
name: context-budget
description: Audit Claude Code context overhead across agents, skills, MCP servers, hooks, and rules. Surfaces bloat, redundant components, and prioritized token-savings recommendations. Use when sessions feel sluggish, after adding many skills or MCP servers, or before expanding the stack further.
---

# Context Budget

Measure how much of the context window your Claude Code setup consumes before you
even ask a question — then get a ranked list of what to trim, lazy-load, or remove.

## When to use

- Output quality is slipping or sessions feel slow
- You recently added skills, agents, MCP servers, or long rules files
- You want headroom before installing more tooling
- Someone asks "why is my context so full?"

## Phase 1 — Inventory

Scan the active configuration and estimate token load. Use `words × 1.3` for
prose and `chars / 4` for code-heavy files.

**Agents** (`agents/*.md` or project agent definitions)

- Lines and estimated tokens per file
- Frontmatter `description` length (this loads on every Task spawn)
- Flag: file >200 lines, description >30 words

**Skills** (`skills/*/SKILL.md`)

- Tokens per skill file
- Flag: SKILL.md >400 lines
- Skip duplicate copies if the same skill exists in multiple layouts

**Rules** (`rules/**/*.md`)

- Tokens per rule file
- Flag: file >100 lines or obvious overlap with CLAUDE.md

**MCP servers** (`.mcp.json` or active MCP config)

- Server count and total tool count
- Estimate ~500 tokens per tool schema
- Flag: >10 servers, servers that wrap CLI tools you already have (`gh`, `git`, `npm`)

**CLAUDE.md chain** (user + project)

- Combined line count and tokens
- Flag: combined total >300 lines of always-on instructions

## Phase 2 — Classify

| Bucket | Criteria | Action |
|--------|----------|--------|
| **Always needed** | Referenced in CLAUDE.md or matches current project work | Keep |
| **Sometimes needed** | Domain-specific, not referenced in CLAUDE.md | Lazy-load or move to skills |
| **Rarely needed** | Overlapping, unreferenced, or stale | Remove or archive |

## Phase 3 — Detect issues

- Bloated agent descriptions (hidden tax on every Task call)
- Heavy agents loaded but never invoked
- Redundant skills vs rules vs CLAUDE.md paragraphs
- MCP over-subscription (tools cost more tokens than entire skill libraries)
- Verbose CLAUDE.md sections that belong in on-demand docs

## Phase 4 — Report

Produce this shape:

```
Context Budget Report
═══════════════════════════════════════

Estimated overhead: ~XX,XXX tokens
Model window: (state the model — e.g. 200K)
Headroom after overhead: ~XX% usable

Component Breakdown:
┌─────────────────┬────────┬───────────┐
│ Component       │ Count  │ Tokens    │
├─────────────────┼────────┼───────────┤
│ Agents          │ N      │ ~X,XXX    │
│ Skills          │ N      │ ~X,XXX    │
│ Rules           │ N      │ ~X,XXX    │
│ MCP tools       │ N      │ ~XX,XXX   │
│ CLAUDE.md       │ N      │ ~X,XXX    │
└─────────────────┴────────┴───────────┘

Issues (ranked by savings):
1. [action] → ~X,XXX tokens
2. [action] → ~X,XXX tokens
3. [action] → ~X,XXX tokens

Potential savings: ~XX,XXX tokens (XX% of overhead)
```

Verbose mode adds per-file counts, MCP tool lists, and side-by-side overlap notes.

## Discipline

- Read-only — never delete or edit the user's config during the audit
- Estimates are estimates; say so plainly
- MCP tool schemas are usually the biggest lever — call that out when true
- Re-run after every major addition to catch creep early
