# Verification + Handoff Checklist

Use this before calling a build complete.

## 1. Re-read the contract

- [ ] Original user and pain are still accurate.
- [ ] Promised action and success state are unchanged.
- [ ] Non-goals stayed out of the implementation.
- [ ] Definition of done is observable.

## 2. Inspect the working tree

```text
git status
git diff --check
git diff
```

- [ ] No unrelated file changed.
- [ ] No `.env`, credential, customer record, or private path is present.
- [ ] No temporary debug logging remains.
- [ ] Generated files are intentional.

## 3. Run project checks

Use only commands verified by the project.

- [ ] Narrow tests for the changed behavior pass.
- [ ] Required lint or type checks pass.
- [ ] Production build passes where applicable.
- [ ] Failed or skipped checks are recorded honestly.

## 4. Run the real user path

- [ ] Start from the documented project directory.
- [ ] Start the app or workflow using documented commands.
- [ ] Perform the primary action as the real user would.
- [ ] Confirm the visible success state.
- [ ] Confirm the handled empty or failure state.
- [ ] Test required desktop and mobile sizes for UI work.

## 5. Capture evidence

- Command output:
- Test output:
- Browser or app path:
- Screenshot or recording:
- Before state:
- After state:
- Anything not tested:
- Remaining risk:

## 6. Update the README

- [ ] Purpose matches the current project.
- [ ] Install and start commands are correct.
- [ ] Required environment variable names are listed without values.
- [ ] Current behavior and known limits are described.
- [ ] Verification instructions can be followed by another person.

## 7. Write the handoff

```markdown
# Build Handoff

## Goal

## What shipped

## User path verified

## Commands and checks run

## Evidence

## Known limits and untested areas

## Files changed

## Next smallest build

## Do not change without approval
```

## 8. Final review prompt

```text
Review this build against the original brief and verification receipt. Find regressions, missing evidence, scope drift, security risk, secret exposure, stale documentation, and claims that were not tested. Lead with findings. If the build is ready, state the remaining risk and exact next action.
```

Done means another person or agent can reproduce the result without relying on your memory.
