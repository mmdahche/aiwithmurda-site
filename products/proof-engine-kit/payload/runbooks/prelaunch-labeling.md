# Prelaunch labeling

Rehearsal data must never present as live totals. This is the honesty layer that
makes build-in-public credible.

## Three campaign phases

| Phase | When | `currentDay` | UI label |
|-------|------|--------------|----------|
| `rehearsal` | Before `startAt` | 0 | "Preview" / "Rehearsal" |
| `live` | `startAt` ≤ now < end | 1…N | "Day N" |
| `complete` | After end | N | "Complete" |

Use `payload/lib/campaign.js` → `getCampaignState(config)` for all phase math.

## UI rules

1. **Banner** — show `prelaunchCopy` on every public page while `isRehearsal`
2. **Receipt pages** — label "Preview Day" not "Day" in rehearsal
3. **Follower deltas** — zero or hide day-over-day gains in rehearsal (only show totals)
4. **Overlays** — badge "Prelaunch Preview" on OBS browser sources
5. **Stream automation** — tag sessions/clips `counts_toward_campaign: false` in rehearsal

## Server rules

- Rehearsal keeps **day 1 only** in the public log table (or local seed)
- At go-live: rebuild day 1 with official baseline, delete days > 1
- Stamp `followers._campaignStartedAt` at transition
- Follower sync uses `_baseline` for delta math after launch

## Copy template

```
{prelaunchLabel}: {prelaunchCopy}
Official scoreboard starts {startDate}. Rehearsal activity never counts toward sprint totals.
```

Replace placeholders from `sprint-config.example.json`.
