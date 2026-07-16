# Day receipt page pattern

Public `/day/:day` route — the shareable proof artifact for each sprint day.

## Data flow

```
GET /api/daily-logs → logs[]
  → find record where day === :day
  → getDayGains(logs, record) for deltas
  → render receipt + shareCopy
```

## Page sections

1. **Hero** — day label + mainGoal + date + nav (scoreboard, next day)
2. **Metrics grid** — revenue, followers, email, hours, clips, builds (value + delta)
3. **Shipped items** — `shippedItems[]` or honest empty state
4. **Proof assets** — links/screenshots/evidence trail
5. **Narrative quad** — bestMoment, biggestFailure, lessonLearned, tomorrowPromise
6. **Share copy** — pre-built caption for clips/posts (`buildShareCopy()`)

## Prelaunch behavior

When `getCampaignState(config).isRehearsal`:

- Title uses **"Preview Day"** not "Day"
- Deltas may be hidden or zeroed on follower metrics
- Share copy should include rehearsal disclaimer if posting publicly

## Empty state

Day not in logs → honest message + links to dashboard and signup — never 404 silently.

## Share copy template

```
Day {n} of {title}: {mainGoal}
Shipped: {first shipped item}
Lesson: {lessonLearned}
Receipt: {origin}/day/{n}
```

## CSS hooks

Namespace classes: `.day-receipt-page`, `.day-receipt-hero`, `.day-receipt-metrics`,
`.day-receipt-grid`, `.day-share-copy` — keeps overlay styles separate from receipt.

## Stream commands

Wire chat commands to receipts:

- `!day1` → `/day/1`
- `!today` → `/day/{currentDay}`

Document in stream config JSON for moderators.
