# Walkthrough — day 1 launch

End-to-end rehearsal → baseline → live for a 90-day sprint.

## T-7 days (rehearsal)

- Deploy with `startAt` one week out
- `getCampaignState()` returns `phase: "rehearsal"`, `currentDay: 0`
- Seed day 1 preview log locally; banner shows `prelaunchCopy`
- Run test stream → clip → receipt flow; confirm **counts_toward_campaign: false**
- OBS: add browser sources `/overlay` and `/overlay/followers`, verify transparency

## T-1 hour

```bash
node scripts/sync-launch-baseline.mjs          # dry run — inspect day 1 JSON
node scripts/sync-launch-baseline.mjs --push   # capture live followers, replace logs
```

Verify `/day/1` shows baseline totals, zero day-over-day gains.

## T-0 (startAt)

- Phase flips to `live` automatically — no manual flag
- Server hook: ensure only day 1+ from launch forward; stamp `_campaignStartedAt`
- Remove rehearsal-only UI badges (phase-driven, not manual)
- Post receipt share copy from `buildShareCopy()`

## T+1 day

- Log day 2 with shipped items + proof assets
- `getDayGains()` computes follower delta vs day 1 baseline
- Run `npm run smoke:launch` before any deploy that touches public routes

## Launch gate minimum

After deploy, smoke must confirm:

- `GET /api/daily-logs` returns array
- `GET /day/1/` renders receipt shell
- `GET /overlay/` transparent overlay shell
- Admin `PUT /api/admin/daily-logs` without token → 401

## Receipt

One honest baseline, one launch gate, one shareable URL per day — the proof engine.
