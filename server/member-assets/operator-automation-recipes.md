# Automation Recipe Library

These are implementation briefs, not blind imports. Map the real workflow, credentials, approval points, and failure handling before choosing n8n, scripts, APIs, or agents.

## Recipe 1 - Form intake to qualified queue

Trigger: A website or internal form is submitted.

Flow:

1. Validate required fields and reject unsafe payloads.
2. Normalize contact and source data.
3. Score deterministic qualification rules.
4. Route uncertain cases to human review.
5. Create the approved record and send confirmation.
6. Log source, decision, result, and failure.

Human gate: Any high-value rejection or ambiguous qualification.

Proof: Test fixtures cover valid, invalid, duplicate, and ambiguous submissions.

## Recipe 2 - Daily metrics snapshot

Trigger: Scheduled daily run plus manual replay endpoint.

Flow:

1. Read each authoritative source.
2. Record source timestamp and freshness.
3. Normalize metrics into one daily schema.
4. Compare against the previous record.
5. Write idempotently by date.
6. Alert when a source fails or changes unexpectedly.

Human gate: Replacing or correcting a published historical record.

Proof: Replaying the same date creates no duplicate and documents stale sources.

## Recipe 3 - Purchase to entitlement

Trigger: Verified payment-provider webhook.

Flow:

1. Verify webhook signature before parsing trust-sensitive fields.
2. Resolve authenticated user and product metadata.
3. Write purchase idempotently by checkout or invoice ID.
4. Grant the correct permanent or recurring entitlement.
5. Send access email after the entitlement exists.
6. Handle refund, dispute, cancellation, and renewal separately.

Human gate: Manual entitlement overrides and refund disputes.

Proof: Duplicate webhooks, unpaid sessions, mismatched users, cancellation, and recovery are tested.

## Recipe 4 - Content source to review queue

Trigger: New transcript, recording, document, or approved URL.

Flow:

1. Store source metadata and ownership.
2. Extract claims, moments, and candidate formats.
3. Generate drafts without publishing.
4. Route drafts to human review with source references.
5. Publish approved assets through platform-specific adapters.
6. Record URL, status, and performance identifiers.

Human gate: Every public claim, edit, and publish action.

Proof: Drafts retain source traceability and cannot auto-publish without approval.

## Recipe 5 - Client approval to delivery

Trigger: Client approves a scoped build brief.

Flow:

1. Freeze scope, non-goals, acceptance, owner, and due date.
2. Create project instructions and protected boundaries.
3. Build one milestone at a time with evidence.
4. Send review links and collect structured feedback.
5. Resolve accepted feedback and run final QA.
6. Deliver access, documentation, known limits, and support window.

Human gate: Scope, production deployment, customer data, and acceptance.

Proof: Delivery receipt maps every acceptance criterion to evidence.

## Recipe 6 - Support issue to verified fix

Trigger: Support message or monitored failure.

Flow:

1. Remove or redact sensitive customer information.
2. Reproduce in a safe environment.
3. Classify severity and ownership.
4. Run Debug Loop and regression checks.
5. Deploy through Safe Deploy when required.
6. Update support, evidence, and prevention note.

Human gate: Customer communication, production access, refund, and incident severity.

Proof: Reproduction and regression evidence are attached to the resolved issue.

## Automation brief template

```markdown
# Automation Brief

Trigger:
Inputs:
Actors:
Current steps:
Decisions:
Outputs:
Sensitive data:
Human approvals:
Failure states:
Retries and idempotency:
Observability:
Manual fallback:
Smallest automation slice:
Test fixtures:
Definition of done:
```
