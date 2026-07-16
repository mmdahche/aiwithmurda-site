# OBS overlay setup

Transparent browser sources for scoreboard and follower ticker — no green screen.

## Routes (adapt to your app)

| Purpose | URL pattern | Body class |
|---------|-------------|------------|
| Command/scoreboard overlay | `/overlay` or `/obs` | `overlay-body` |
| Follower ticker | `/overlay/followers` or `/obs/followers` | `overlay-body` |

Alias `/obs/*` → `/overlay/*` so streamers remember one word.

## CSS discipline

```css
body.overlay-body {
  margin: 0;
  background: transparent;
  overflow: hidden;
}
```

- No full-page backgrounds on overlay routes
- Test in OBS: right-click source → **Interact** → confirm transparency
- Use `width`/`height` in OBS source properties to match stream canvas safe zone

## Follower ticker

- Poll `GET /api/followers/live` or subscribe to `GET /api/followers/stream` (SSE)
- Show **combined total** + optional per-platform breakdown
- Animate `lastChangeDelta` briefly when a platform ticks up
- In rehearsal: show totals but suppress delta badges (see prelaunch runbook)

## Privacy guard (stream command deck)

Document for operators:

- Never show secret screens (admin tokens, `.env`, customer PII)
- Rehearsal streams labeled in title/thumbnail
- Browser source zoom locked — no accidental URL bar

## Smoke check

Your launch gate should fetch overlay routes and confirm:

- HTTP 200 + SPA shell
- Client bundle references stream API routes
- `/obs` aliases resolve identically to `/overlay`
