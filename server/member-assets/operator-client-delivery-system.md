# Client Delivery System

Use this for paid implementation work where scope, customer data, approval, and handoff must remain explicit.

## 1. Discovery

Ask:

- Who performs the workflow today?
- What triggers it?
- What is slow, manual, broken, risky, or invisible?
- What result has business value?
- Which systems, accounts, and data are involved?
- Which decisions require human approval?
- What happens when the workflow fails?
- What would make the client say the project worked?

## 2. Scope record

```markdown
# Client Build Brief

Client:
Primary user:
Current workflow:
Pain and impact:
First useful outcome:
In scope:
Non-goals:
Systems and integrations:
Customer-data classification:
Approvals:
Acceptance criteria:
Review milestones:
Deployment owner:
Support window:
Change-request process:
```

## 3. Access discipline

- Use client-owned accounts when appropriate.
- Request the smallest permissions needed.
- Keep secrets in an approved manager or server environment.
- Never paste credentials into prompts, code, screenshots, or handoffs.
- Document who can rotate and revoke access.
- Remove temporary access after delivery.

## 4. Build milestones

For each milestone:

1. Confirm one user-visible outcome.
2. Capture the before state.
3. Implement one bounded slice.
4. Run focused and user-path checks.
5. Share a review link or evidence packet.
6. Record accepted feedback and defer new scope.

## 5. Change requests

Classify feedback:

- Bug against accepted criteria
- Clarification inside scope
- Risk or compliance requirement
- New feature
- New integration
- Preference or polish

Only the first three automatically remain in the milestone. New features and integrations require explicit scope, time, and price decisions.

## 6. Acceptance packet

```markdown
# Acceptance Packet

## Agreed outcomes
- [criterion] -> [evidence]

## User path

## Checks run

## Client review notes

## Known limits

## Deferred requests

## Access transferred

## Support window

## Client acceptance
Name:
Date:
```

## 7. Handoff

Deliver:

- Repository or asset ownership
- Deployment and environment map without secret values
- User and admin instructions
- Verified commands
- Integration owners
- Backup and rollback notes
- Monitoring or health checks
- Known limits
- Support and change-request boundary

## 8. Post-delivery review

After the support window:

- Confirm access cleanup.
- Review incidents and repeated questions.
- Turn reusable customer-safe work into an internal template.
- Do not reuse client data, branding, private logic, or proprietary material.
- Record the next service opportunity separately from completed delivery.
