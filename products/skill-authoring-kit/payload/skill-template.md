---
name: skill-name-in-kebab-case
description: One-sentence capability + trigger vocabulary. What the skill does, when to use it. This is the ONLY text the skill picker sees — be specific, include the phrases you will actually say.
---

# Skill Name

Start with a 1-2 line purpose statement. What this skill does and when the
agent should invoke it.

## When to use

- Trigger condition 1 (be specific about what the user says or what the situation looks like)
- Trigger condition 2
- Trigger condition 3

## When NOT to use

- Counter-example 1 (helps the picker distinguish this skill from near-neighbors)
- Counter-example 2

## Steps

1. First action
2. Second action
3. Third action

## Output

What the reply looks like when the skill completes (one line, a report, a
file path — say which).

## Notes

Anything subtle: edge cases, failure modes, required preconditions,
dependencies on other skills.

---

## Optional frontmatter fields (library hygiene)

Add these if you maintain a growing library — they cost nothing and make
audits possible later:

**risk** — blast radius if invoked incorrectly:
- `low` — advisory only, no file writes, no external calls
- `medium` — writes files, reads code, calls external APIs
- `high` — runs shell commands, installs dependencies, modifies config
- `critical` — destructive ops, irreversible actions (agent should ask first, always)

**source** — where the skill came from: `native` (you wrote it), a URL
(ported/derived — cite it), or `"clean-room port of <repo> (<license>)"`.
Honest provenance today saves a licensing headache tomorrow.

**date_added** — YYYY-MM-DD.
