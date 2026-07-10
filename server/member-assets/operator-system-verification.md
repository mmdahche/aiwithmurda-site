# System Verification + Recovery

Use this after initial installation and after every versioned update.

## Clean-start verification

- [ ] Open a new terminal or agent session.
- [ ] Enter the intended project explicitly.
- [ ] Confirm Git status and current branch.
- [ ] Confirm Claude Code and Codex can explain the project without edits.
- [ ] Confirm project guidance loads.
- [ ] Confirm no secret or unrelated directory is exposed.
- [ ] Confirm verified install, test, build, and run commands.

## Skill verification

For each installed skill:

- [ ] File lives in the intended project scope.
- [ ] Frontmatter name matches folder slug.
- [ ] Description clearly explains when it should trigger.
- [ ] Supporting scripts and references were inspected.
- [ ] Explicit invocation works.
- [ ] A natural-language trigger works.
- [ ] Output follows the stated return format.
- [ ] Guardrails stop unsafe or unrelated work.

## Dual-agent verification

- [ ] Builder and reviewer read the same brief.
- [ ] Builder maps before editing.
- [ ] Reviewer receives diff and evidence, not hidden context.
- [ ] Conflicts are surfaced to the human.
- [ ] Only one agent owns a shared file at a time.
- [ ] Final handoff contains an exact next action.

## Real-work verification

Run one bounded task:

1. Requirement Brief
2. Build One Slice
3. Code Review by the second agent
4. User Path Test
5. Verify Before Done
6. Context Handoff

Capture:

- Before state
- Files changed
- Focused checks
- Broader checks
- Browser or API path
- Screenshots or output
- Known limits
- Restore point

## Recovery levels

### Level 1 - Skill problem

Symptoms: incorrect trigger, noisy output, broken reference, or project mismatch.

Recovery:

1. Remove only the affected skill from the project.
2. Restore the previous skill folder.
3. Start a clean session.
4. Re-run the explicit invocation.

### Level 2 - Instruction conflict

Symptoms: agents disagree about commands, scope, or protected actions.

Recovery:

1. Compare AGENTS.md, CLAUDE.md, project brief, and active brief.
2. Remove duplication.
3. Keep shared rules in one imported source where supported.
4. Verify every remaining command.

### Level 3 - Project regression

Symptoms: tests fail, user path breaks, or unrelated files changed.

Recovery:

1. Stop implementation.
2. Capture Git status and diff.
3. Reproduce the regression.
4. Restore through the project's approved Git or backup process.
5. Reapply one verified change at a time.

### Level 4 - Security or production incident

Symptoms: exposed secret, customer data risk, payment problem, destructive action, or live outage.

Recovery:

1. Stop agent activity.
2. Rotate or revoke affected credentials.
3. Preserve logs and evidence without spreading sensitive data.
4. Notify the human incident owner.
5. Follow the project's incident and rollback procedure.
6. Do not resume until the boundary is understood.

## Verification receipt

```markdown
# Operator System Verification Receipt

System version:
Project:
Date:
Agent versions:
Installed collections:
Instruction load verified:
Explicit skill tests:
Natural trigger tests:
Real task:
Builder:
Reviewer:
Checks:
User path:
Evidence:
Known limits:
Restore point:
Result: pass | partial | fail
```
