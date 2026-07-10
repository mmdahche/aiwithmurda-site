# Dual-Agent Project Starter

Use this packet to give Claude Code and Codex the same project facts without duplicating a giant handbook.

## 1. PROJECT-BRIEF.md

```markdown
# Project Brief

## Purpose
[One sentence describing the useful outcome.]

## Primary user
[One specific person or role.]

## Current pain
[What is slow, broken, manual, confusing, or missing?]

## First useful outcome
[One action the user can complete and one visible success state.]

## Non-goals
- [Feature deliberately excluded]
- [Infrastructure deliberately deferred]
- [Polish deliberately deferred]

## Success check
[The exact browser path, command, test, or output that proves the first outcome works.]

## Known constraints
- Stack:
- Hosting:
- Data:
- Accessibility:
- Security:
```

## 2. AGENTS.md

Codex uses `AGENTS.md` as durable project guidance. Keep it small and project-specific.

```markdown
# Project Guidance

## Purpose
- Read PROJECT-BRIEF.md before planning feature work.

## Commands
- Install: `[verified command]`
- Develop: `[verified command]`
- Test: `[verified command]`
- Build: `[verified command]`

## Important paths
- App entry:
- API entry:
- Tests:
- Public assets:

## Working rules
- Inspect the relevant user path before editing.
- Keep changes scoped to the requested outcome and listed non-goals.
- Do not edit `.env` or secret files.
- Do not run production deploys, payments, migrations, or destructive commands without explicit approval.
- Run the real verification path before calling work complete.

## Definition of done
- The requested user path works.
- Project checks pass.
- The diff contains no unrelated changes or secrets.
- README or handoff is updated when behavior or setup changed.
```

## 3. CLAUDE.md

Claude Code reads `CLAUDE.md`. If both agents should share the same guidance, import `AGENTS.md` and add only Claude-specific notes.

```markdown
@AGENTS.md

## Claude Code
- Ask before broadening scope beyond PROJECT-BRIEF.md.
- Use plan or read-only inspection before medium-risk changes.
```

## 4. .gitignore starter

Adjust this to the stack. Do not copy rules you do not understand.

```gitignore
.env
.env.*
!.env.example
node_modules/
dist/
build/
.DS_Store
*.log
coverage/
```

## 5. Baseline checkpoint

Before staging, inspect the working tree:

```bash
git status
git diff --check
git diff
```

Stage only the intended starter files, then create a descriptive checkpoint.

## 6. Dual-agent handoff

```markdown
# Handoff

## Goal

## What exists now

## What changed

## Verification run

## Known limits

## Files touched

## Next smallest task

## Do not change without approval
```

## Project-packet review prompt

```text
Review PROJECT-BRIEF.md, AGENTS.md, CLAUDE.md, .gitignore, and the current project scripts. Flag invented commands, duplicated rules, contradictions, secret exposure, machine-specific paths, and missing verification steps. Recommend only necessary edits.
```
