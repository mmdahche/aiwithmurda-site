# Reusable Project Blueprints

Each blueprint is a bounded first version. Add infrastructure only after the core path is verified.

## Blueprint 1 - Waitlist form

- User: interested visitor
- Action: submit name and email
- Success: confirmation state and stored test record
- Failure: invalid email or unavailable endpoint
- First version: local or test database, no marketing automation
- Verify: valid submit, invalid submit, refresh behavior

## Blueprint 2 - Contact request

- User: prospective customer
- Action: submit contact details and message
- Success: confirmation and auditable test record
- Failure: missing required field or server error
- First version: no CRM, no automatic SMS, no production email secrets
- Verify: validation, success, duplicate behavior, mobile layout

## Blueprint 3 - Member resource library

- User: authenticated member
- Action: find and download one entitled resource
- Success: correct file downloads
- Failure: unauthenticated and unentitled access are blocked
- First version: one product, small resource list, basic search
- Verify: login, entitlement gate, download, refresh, mobile

## Blueprint 4 - Internal status dashboard

- User: operator or small team
- Action: view current metrics and open one next action
- Success: data loads with freshness state
- Failure: loading, empty, stale, and unavailable states are visible
- First version: read-only sample or test data
- Verify: desktop/mobile, stale data, error state, refresh

## Blueprint 5 - Quote calculator

- User: buyer or sales operator
- Action: enter bounded inputs and calculate estimate
- Success: transparent result and assumptions
- Failure: impossible values and missing input are handled
- First version: no payment, account, or saved history
- Verify: normal, minimum, maximum, invalid, reset

## Blueprint 6 - File intake organizer

- User: operator receiving repeated files
- Action: validate and classify sample files
- Success: proposed destination and summary
- Failure: unsupported type, duplicate, or missing metadata
- First version: copy sample files; no destructive move or delete
- Verify: supported, unsupported, duplicate, dry run

## Blueprint 7 - Daily report generator

- User: manager or creator
- Action: turn sample rows into a formatted summary
- Success: repeatable report with source timestamp
- Failure: empty, malformed, or stale input is disclosed
- First version: local CSV or JSON; no automatic sending
- Verify: normal input, empty input, malformed row, repeat run

## Universal blueprint brief

```markdown
# Build Brief

## User

## Current pain

## Trigger or entry point

## One primary action

## Visible success state

## Empty or failure state

## Data and source of truth

## Human approval point

## Non-goals

## Verification path

## Stop condition
```

## Blueprint selection prompt

```text
Compare my problem with the seven project blueprints. Recommend the closest starting point based on user clarity, proof speed, data risk, and implementation size. Adapt only the user, action, success state, and verification path. Keep all deferred infrastructure as explicit non-goals.
```
