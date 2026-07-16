# Baseline reset workflow

Day 1 is the contract with the audience — follower counts and zeros must be honest
at the moment the sprint goes live.

## When to run

- **Once** at official launch (replace rehearsal seed with live baseline)
- After a major counting bug (document why in day 1 `lessonLearned`)
- Never silently mid-sprint without public explanation

## Manual CLI pattern

See `payload/scripts/sync-launch-baseline.template.mjs`:

1. **Dry run** (default): prints day-1 log JSON, no writes
2. **`--push`**: captures live follower counts from your ticker API, `PUT` admin logs with `{ replace: true }`

Required env: `SITE_URL`, `ADMIN_API_TOKEN`

## Day 1 log shape

```json
{
  "day": 1,
  "date": "<sprint startDate>",
  "mainGoal": "Launch the sprint and set the public baseline",
  "followers": {
    "youtube": 1234,
    "_baseline": { "youtube": 1234, ... }
  }
}
```

`_baseline` must mirror platform counts at launch — all future follower **gains**
compute against this.

## Automatic go-live hook

On transition `rehearsal → live`:

1. Fetch authoritative follower ledger
2. Build day 1 with `_baseline`
3. Delete or archive days > 1 from rehearsal
4. Set `_campaignStartedAt` ISO timestamp

## Client local reset

`resetLogs(storageKey)` in `tracker-core.mjs` clears browser cache — use only
for dev; production truth is server-side.

## Checklist

- [ ] Rehearsal banner removed (phase flips automatically at `startAt`)
- [ ] Baseline push succeeded (`replaced: true` in API response)
- [ ] Receipt page `/day/1` shows baseline totals, zero gains
- [ ] OBS ticker matches day 1 ledger
