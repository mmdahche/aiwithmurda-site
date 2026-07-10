# New Wave Operator Skill Vault

This vault adds eight customer-safe workflows beyond the three-skill starter pack.

Install only the skill tied to a repeated problem. Read every file before installation.

## 1. Requirement Brief

```markdown
---
name: requirement-brief
description: Turns a vague feature or workflow request into a bounded implementation brief. Use before medium or high-risk changes.
---

Inspect available project context, then return:
1. User and pain
2. Current behavior
3. Requested outcome
4. One primary user path
5. Non-goals
6. Functional requirements
7. Edge and failure cases
8. Security and data concerns
9. Verification plan
10. Stop condition

Do not implement. Mark facts, discoveries, assumptions, and unresolved decisions separately.
```

## 2. Debug Loop

```markdown
---
name: debug-loop
description: Diagnoses a reproducible failure one hypothesis at a time. Use for errors, regressions, failed tests, or repeated unsuccessful fixes.
---

1. Reproduce the exact failure.
2. Capture the first meaningful error and environment.
3. Trace the failing path and identify the layer.
4. Rank likely causes by evidence.
5. Test one hypothesis with the smallest reversible change.
6. Rerun the original reproduction.
7. Run one nearby regression check.

After two failed hypotheses, stop and produce a rescue receipt instead of guessing.
```

## 3. UI Critique

```markdown
---
name: ui-critique
description: Audits a frontend for hierarchy, clarity, responsive behavior, accessibility, interaction states, and visual credibility. Use before UI polish or release.
---

Inspect the live page and implementation at desktop and mobile sizes.

Lead with findings ordered by severity. Check:
- Primary task and information hierarchy
- Layout, alignment, spacing, and text fit
- Loading, empty, error, disabled, success, and focus states
- Keyboard navigation and semantic labels
- Color contrast and reduced motion
- Responsive overflow and overlap
- Content density and unnecessary decoration
- Consistency with existing design tokens and components

Recommend the smallest changes that materially improve the user path. Do not redesign unrelated pages.
```

## 4. User Path Test

```markdown
---
name: user-path-test
description: Runs and records an end-to-end user path through a browser, app, API, or terminal. Use after implementation or before release.
---

1. Read the promised user path and starting conditions.
2. Start from a clean enough state to expose hidden assumptions.
3. Exercise loading, primary action, success, and one failure state.
4. Capture console, network, command, or log evidence.
5. Repeat required desktop and mobile checks.
6. Report passes, failures, untested areas, and residual risk.

Never mark a step passed without running it.
```

## 5. Code Review

```markdown
---
name: code-review
description: Reviews a completed change for behavioral regressions, risk, security, scope drift, and missing tests. Use before commit, merge, or deployment.
---

Review the brief, diff, tests, and verification evidence.

Prioritize:
1. User-visible bugs and regressions
2. Security, privacy, auth, payment, and data risks
3. Broken contracts and edge cases
4. Missing or weak verification
5. Unrelated changes and maintainability concerns

Lead with findings ordered by severity and cite files. Do not rewrite the implementation unless asked. If no issue is found, state the remaining test gap.
```

## 6. Safe Deploy

```markdown
---
name: safe-deploy
description: Prepares and verifies a bounded application deployment. Use only when the user explicitly asks to deploy or publish.
disable-model-invocation: true
---

1. Confirm target environment, account, service, and branch.
2. Review working tree, secrets boundary, and required checks.
3. Record current production version and rollback path.
4. Build and deploy using the project's verified command.
5. Watch deployment status until complete.
6. Run production smoke tests on the promised user path.
7. Record release version, evidence, and rollback trigger.

Never create credentials, change DNS, run production migrations, or force-push without explicit approval.
```

## 7. Handoff Writer

```markdown
---
name: handoff-writer
description: Writes a reproducible handoff after a build, investigation, or release. Use when pausing work or changing agents.
---

Return a concise handoff with:
- Goal and current status
- What changed
- Decisions locked
- Verification run and evidence
- Known limits and untested areas
- Files touched
- Exact next action
- Commands to resume
- Protected areas or actions requiring approval

Do not include secrets, tokens, customer data, or unsupported claims.
```

## 8. Workflow Automation Brief

```markdown
---
name: workflow-automation-brief
description: Maps a manual business workflow into a safe automation brief before tools or credentials are chosen.
---

Map:
1. Trigger
2. Inputs and source of truth
3. Validation rules
4. Decisions and branches
5. Outputs and destination
6. Human approval points
7. Failure, retry, and duplicate behavior
8. Audit record
9. Secret and permission requirements
10. Sample-data proof

Start with sample data and reversible outputs. Do not connect production credentials or automatic sending until the sample path is verified and explicitly approved.
```

## Vault test receipt

- Skill installed:
- Scope: personal or project
- Trigger tested:
- Explicit invocation tested:
- Commands or tools inspected:
- Expected output:
- Actual output:
- Safety issue found:
- Customization made:
- Keep, revise, or remove:
