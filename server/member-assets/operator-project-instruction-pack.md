# Project Instruction Pack

These templates are intentionally small. Replace placeholders with verified facts and remove irrelevant sections.

## PROJECT-BRIEF.md

```markdown
# Project Brief

## Purpose

## Primary user

## Current pain

## First useful outcome

## Non-goals
-

## Success check

## Known constraints
- Stack:
- Hosting:
- Data:
- Authentication:
- Billing:
- Accessibility:
- Security:
```

## AGENTS.md

```markdown
# Project Guidance

## Purpose
- Read PROJECT-BRIEF.md and docs/operator-system/active-brief.md before feature work.

## Verified commands
- Install: [command]
- Develop: [command]
- Focused test: [command]
- Test: [command]
- Build: [command]

## Important paths
- App entry:
- API entry:
- Tests:
- Public assets:
- Migrations:

## Protected boundaries
- Do not edit secret or environment files.
- Do not run production payments, migrations, deploys, or destructive commands without explicit approval.
- Do not expose customer or private business data.

## Working rules
- Inspect the relevant user path before editing.
- Follow existing project patterns and ownership boundaries.
- Keep changes inside the approved brief and non-goals.
- Record deferred ideas instead of adding them silently.
- Run the real verification path before calling work complete.

## Definition of done
- The requested user path works.
- Required project checks pass.
- The diff contains no unrelated changes, debug output, or secrets.
- Evidence and handoff are current.
```

## CLAUDE.md

```markdown
@AGENTS.md

## Claude Code notes
- Use read-only inspection before medium or high-risk work.
- Ask before broadening scope or crossing a protected boundary.
- Keep project-specific memory in documented project files, not hidden assumptions.
```

## .env.example

```dotenv
# Public or publishable configuration only. Never paste live values here.
PUBLIC_APP_URL=
PUBLIC_API_URL=

# Server-side names document required configuration without values.
DATABASE_URL=
PAYMENT_SECRET_KEY=
WEBHOOK_SECRET=
```

## .gitignore additions

```gitignore
.env
.env.*
!.env.example
.secrets/
*.local
*.log
coverage/
dist/
build/
node_modules/
.DS_Store
```

Adjust to the stack. Confirm whether generated build folders are intentionally committed before ignoring them.

## Definition-of-done template

```markdown
# Definition of Done

- [ ] Original request and user are named.
- [ ] Observable success state exists.
- [ ] Non-goals stayed deferred.
- [ ] Focused checks passed.
- [ ] Broader required checks passed.
- [ ] Real user path passed from a clean state.
- [ ] Responsive and accessibility states were checked when relevant.
- [ ] No secret, customer data, or debug output entered the diff.
- [ ] Evidence and known limits are recorded.
- [ ] Next action or completion handoff is written.
```

## Instruction review prompt

```text
Review PROJECT-BRIEF.md, AGENTS.md, CLAUDE.md, .env.example, .gitignore, and the current project scripts without editing. Flag invented commands, duplicated or contradictory rules, missing protected boundaries, secret exposure, machine-specific paths, and definitions of done that cannot be verified. Recommend only necessary changes.
```
