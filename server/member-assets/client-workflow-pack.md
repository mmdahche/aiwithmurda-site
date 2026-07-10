# Client Workflow Pack

Use this for paid or customer-facing work. Keep credentials and private customer data in approved systems, never in prompts or handoffs.

## 1. Discovery script

```text
Describe the workflow from the moment the user starts until the business receives the final result. What is manual now? Who owns each step? Which failure costs the most time or money? What data is sensitive? What result would make the first version useful within one week?
```

Capture:

- User and owner
- Trigger
- Current steps
- Bottleneck
- Inputs and source of truth
- Decisions
- Output
- Failure and retry behavior
- Sensitive data
- Required approval
- First measurable outcome

## 2. Scope confirmation

```markdown
# Scope Confirmation

Problem:
Primary user:
First useful outcome:
Included user path:
Explicit non-goals:
Client inputs required:
Access required:
Data handling boundary:
Acceptance checks:
Delivery format:
Revision boundary:
```

Ask the client to approve this before implementation.

## 3. Access request

Request the least access required.

- Use separate test or sandbox credentials where possible.
- Never ask the client to send passwords in chat or email.
- Name the account, permission level, purpose, and removal date.
- Keep production writes disabled until the sample path passes.
- Record who approved access.

## 4. Build update

```text
Status: [ON TRACK / AT RISK / BLOCKED]
What works now:
Evidence:
Decision needed:
Known limit:
Next milestone:
What I need from you:
```

Do not send raw technical narration when the client needs a decision.

## 5. Acceptance test

- [ ] Start from the agreed entry point.
- [ ] Use approved test data.
- [ ] Complete the primary action.
- [ ] Confirm the business output.
- [ ] Test one invalid or failure case.
- [ ] Confirm who receives or owns the result.
- [ ] Record anything outside scope.

## 6. Delivery handoff

```markdown
# Client Delivery Handoff

## Outcome delivered

## How to use it

## Accounts and ownership

## Data handled

## Verification completed

## Known limits

## Support boundary

## Rollback or disable path

## Recommended next phase
```

## 7. Revision filter

For each requested change, classify:

- Defect against approved acceptance criteria
- Clarification inside scope
- New feature
- New integration
- New data or security risk
- Optional polish

Do not hide new scope inside a defect fix.

## 8. Client-safe AI review prompt

```text
Review this delivery packet for clarity, missing acceptance evidence, access risk, sensitive-data exposure, hidden scope, ownership gaps, rollback gaps, and unsupported claims. Do not include or request secret values. Lead with decisions the client must make.
```
