# Deployment Runbook

Deploy only when the user explicitly requests it and the target account and environment are confirmed.

## 1. Target confirmation

- Service:
- Environment:
- Account or organization:
- Branch:
- Current live version:
- Expected new version:
- Owner approving release:

## 2. Preflight

- [ ] Working tree is understood.
- [ ] Required tests, lint, types, and production build pass.
- [ ] Environment variable names are documented.
- [ ] No secret values are printed or committed.
- [ ] Data migrations are reviewed separately.
- [ ] Current production behavior is captured.
- [ ] Rollback command or provider action is known.
- [ ] Smoke-test path is written before deployment.

## 3. Risk gate

Stop for explicit approval if the release includes:

- Production database migration
- Auth or permission model change
- Payment behavior
- DNS or domain change
- Secret rotation
- Destructive cleanup
- Force push or history rewrite
- Provider account or billing change

## 4. Deploy

Use the project's verified deploy command or provider workflow. Record:

- Start time
- Command or action
- Build or release ID
- Commit SHA
- Deployment URL
- Status source

Watch until the provider reports a terminal state. Do not leave an active deployment session unobserved.

## 5. Production smoke test

- [ ] Home or entry path returns successfully.
- [ ] Primary user path completes.
- [ ] Auth behavior works if changed.
- [ ] Payment test uses the approved mode and product if changed.
- [ ] API or database path returns expected data.
- [ ] Mobile and desktop UI are checked when relevant.
- [ ] Error logs show no new high-severity issue.

## 6. Rollback triggers

Rollback or pause when:

- Primary path is unavailable
- Auth or payment access is wrong
- Data is being lost or exposed
- Error rate rises materially
- A required secret or environment variable is missing
- The deployed version cannot be identified

## 7. Release receipt

```markdown
# Release Receipt

Environment:
Commit:
Release ID:
Deployment URL:
Checks run before deploy:
Production smoke path:
Evidence:
Known limits:
Rollback path:
Rollback trigger:
Next monitoring check:
```

## 8. Post-release handoff

Update the project README or operations notes when the deploy process, environment contract, or smoke-test path changed.
