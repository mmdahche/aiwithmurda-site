---
date_added: 2026-07-10
source: rubyx
project: aiwithmurda
status: production
---

# Verified Social Metrics

## Decision

Follower counts are an independent verified system. They never fall back to preview daily-log seed values.

- Public dashboard: separate Twitch, TikTok, Instagram, YouTube, and X cards.
- OBS follower overlay: combined connected-account total only.
- Disconnected account: `count: null`, `Not connected`, excluded from total.
- Twitch: EventSub `channel.follow` plus exact Helix reconciliation.
- TikTok and Instagram: official API polling, normally within 60 seconds.
- YouTube: official API polling with `rounded` precision disclosed.
- X: five-minute public-metric polling because its API is pay-per-use.

## Data and security

- Supabase migration `008_social_metrics.sql` created `social_accounts` and `social_metric_snapshots` with service-role-only RLS.
- Every changed count creates a timestamped snapshot and updates that platform on the latest daily log.
- OAuth access and refresh tokens are encrypted before storage with AES-256-GCM.
- Production Render has generated `SOCIAL_TOKEN_ENCRYPTION_KEY`, `SOCIAL_OAUTH_STATE_SECRET`, and `TWITCH_EVENTSUB_SECRET`; no values are stored in Git or memory.
- Signed OAuth state expires after ten minutes.
- One shared server refresh loop feeds all browser clients over SSE; viewer count does not multiply platform API calls.

## Production state

- Release commit: `cf655cc`
- Render service: `aiwithmurda-web`
- Production API mode: `verified-social-metrics`
- Production at release: total `0`, five disconnected accounts, no seed fallback, storage ready, encryption ready.
- Runbook: `SOCIAL-METRICS-RUNBOOK.md`

## Verification

- `npm run build`
- `npm run smoke:launch` against local production-shaped server
- `npm run smoke:tracker` against production
- `npm run smoke:social-ui` against production at desktop and mobile viewports
- Production SSE, dashboard, OBS alias, admin guards, storage, encryption, Stripe, member, and checkout regressions passed.

## Human connection gates

Provider app credentials are intentionally not invented or copied from unrelated projects. Connect one provider at a time through Admin Social Accounts:

1. Twitch developer app credentials and callback registration.
2. YouTube Google Cloud OAuth client.
3. Meta app plus linked Instagram professional account and Facebook Page.
4. TikTok developer app with `user.info.stats` approval.
5. Optional X bearer token and username.
