# Debug Rescue System

The goal is not to try more fixes. The goal is to increase evidence until one small fix is justified.

## Phase 1 - Freeze the facts

Record:

- Expected behavior
- Actual behavior
- Exact reproduction steps
- First meaningful error
- Environment, version, and branch
- Last known working version
- Recent relevant change

Do not paraphrase the error until the exact text is saved.

## Phase 2 - Locate the failing layer

Choose the first layer where expected behavior diverges:

- Installation or PATH
- Authentication or permission
- Configuration or environment
- Compile or build
- Test setup
- Server or API
- Database or data shape
- Browser or UI state
- External provider
- Deployment or DNS

## Phase 3 - Rank hypotheses

For each hypothesis:

| Hypothesis | Evidence for | Evidence against | Smallest test | Reversible? |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

Test the strongest hypothesis first. Do not change multiple layers at once.

## Phase 4 - Two-attempt rule

After two failed fixes on the same theory:

1. Revert only the failed experimental changes if safe.
2. Update the rescue receipt.
3. Ask a reviewer agent to challenge the diagnosis.
4. Move up one layer and re-check assumptions.
5. Stop if the next action requires production access, secret rotation, destructive data changes, or a product decision.

## Debug prompt

```text
Reproduce the exact failure before editing. Identify the first layer where expected and actual behavior diverge. Rank three likely causes by evidence and test one hypothesis with the smallest reversible change. After the fix, rerun the original reproduction and one nearby regression check. After two failed hypotheses, stop and write a rescue receipt.
```

## Reviewer prompt

```text
Challenge this diagnosis. Read the reproduction, errors, recent diff, failed attempts, and current hypothesis. Find unsupported assumptions, missing evidence, changes that affected multiple variables, and the smallest test that could falsify the leading theory. Do not implement.
```

## Rescue receipt

```markdown
# Debug Rescue Receipt

## Expected behavior

## Actual behavior

## Reproduction

## Exact error

## Failing layer

## Evidence

## Attempt 1

## Attempt 2

## Current hypothesis

## Smallest next test

## Escalation needed

## What must not be changed
```

## Completion standard

- Original reproduction now passes.
- One nearby regression check passes.
- The root cause is explained in project language.
- Failed experiments are not left in the diff.
- A test, rule, or documentation update reduces recurrence.
