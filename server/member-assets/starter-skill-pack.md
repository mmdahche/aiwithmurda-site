# Starter Skill Pack

These three skills are original, customer-safe workflows for Claude Code and Codex.

## Where skills live

Claude Code project skills:

```text
.claude/skills/<skill-name>/SKILL.md
```

Codex project skills:

```text
.agents/skills/<skill-name>/SKILL.md
```

Personal skills use the corresponding skill directory in your home folder. Use project scope while learning so each skill stays with the project it was tested on.

Before installing any skill, read the full file and inspect every supporting script or command.

---

## Skill 1 - Project Map

Create `project-map/SKILL.md`:

```markdown
---
name: project-map
description: Maps an unfamiliar project before implementation. Use when the user asks where a feature lives, how a request flows, or which files a change should touch.
---

Inspect the project without editing.

1. Read the nearest project guidance and package scripts.
2. Identify the entry point, main runtime boundaries, and relevant user path.
3. Trace the request or data flow through the smallest necessary set of files.
4. List verified commands for development, testing, and build.
5. Flag missing context, risky assumptions, protected files, and likely regression areas.

Return:
- Project purpose
- Stack and entry points
- Relevant file map
- User or request flow
- Verified commands
- Risks and unknowns
- Recommended next inspection

Do not edit files, install dependencies, or run destructive commands.
```

Test with: `Map this project before we change the member login path.`

---

## Skill 2 - Build One Slice

Create `build-one-slice/SKILL.md`:

```markdown
---
name: build-one-slice
description: Scopes and implements one small user-visible outcome. Use when a feature request is broad, a first version is needed, or scope is starting to expand.
---

Turn the request into one vertical slice.

1. Inspect the current user path and relevant files.
2. Write a short brief with user, current pain, expected outcome, non-goals, risks, verification, and stop condition.
3. Confirm the plan is grounded in existing project patterns.
4. Implement only the smallest change required for the outcome.
5. Run the real user path and project checks.
6. Stop when the agreed result passes, then checkpoint or hand off.

Return:
- Approved scope
- Files changed
- Verification evidence
- Anything not tested
- Next-build list

Do not add unrelated features, dependencies, refactors, or infrastructure.
```

Test with: `Use build-one-slice to add a useful empty state to this page.`

---

## Skill 3 - Verify Before Done

Create `verify-before-done/SKILL.md`:

```markdown
---
name: verify-before-done
description: Verifies a completed change through the real user path before work is called done. Use after implementation, before a commit, or when a result only looks correct.
---

Verify the change; do not assume it works.

1. Read the original request and definition of done.
2. Inspect the diff for unrelated edits, secrets, debug output, and accidental generated files.
3. Run the narrow tests that cover the change.
4. Run broader build, lint, or type checks required by project guidance.
5. Exercise the real user path in the appropriate browser, app, API, or terminal.
6. Record evidence, untested areas, and residual risk.

Return:
- Checks run and results
- User path verified
- Evidence captured
- Missing coverage
- Remaining risk
- Ready or not ready

Never claim success for a check that was not run.
```

Test with: `Verify the current change before we call it complete.`

## Customization worksheet

- Repeated task this skill should remove:
- Trigger phrases:
- Project commands to run:
- Files or actions it must never touch:
- Expected output:
- Quality bar:
- Stop condition:
- First practice task:
- What changed after the first test:

## Installation receipt

- [ ] I chose personal or project scope intentionally.
- [ ] I read every skill before installing it.
- [ ] I installed only the three starter skills.
- [ ] I invoked each skill explicitly.
- [ ] I tested one natural-language trigger.
- [ ] I customized one skill with verified project commands.
