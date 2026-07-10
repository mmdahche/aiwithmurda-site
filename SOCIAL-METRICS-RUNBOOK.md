# Social Metrics Runbook

## Public contract

- `/60` shows a separate card for Twitch, TikTok, Instagram, YouTube, and X.
- `/obs/followers` shows the combined total only.
- Disconnected accounts show `Not connected`, use a `null` count, and contribute nothing to the total.
- Every changed official count creates a `social_metric_snapshots` row and updates that platform on the latest daily log.
- The browser receives changes through `/api/followers/stream`; viewers do not poll platform APIs independently.

## Refresh behavior

| Provider | Source | Behavior |
| --- | --- | --- |
| Twitch | EventSub `channel.follow` plus Helix | Immediate event, then exact reconciliation |
| TikTok | Display API `user.info.stats` | Scheduled polling, normally within 60 seconds |
| Instagram | Instagram Graph API | Professional account polling, normally within 60 seconds |
| YouTube | YouTube Data API | Scheduled polling; public subscriber totals can be rounded |
| X | X API public metrics | Five-minute polling to control pay-per-use API cost |

## Server secrets

The token vault requires these before any account can connect:

- `SOCIAL_TOKEN_ENCRYPTION_KEY`
- `SOCIAL_OAUTH_STATE_SECRET`

They are generated directly in Render. OAuth access and refresh tokens are encrypted with AES-256-GCM before Supabase storage.

## Provider app settings

### Twitch

- Render: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_EVENTSUB_SECRET`
- OAuth callback: `https://aiwithmurda.com/api/integrations/twitch/callback`
- EventSub callback: `https://aiwithmurda.com/api/integrations/twitch/eventsub`
- Scope: `moderator:read:followers`

### TikTok

- Render: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`
- Redirect URI: `https://aiwithmurda.com/api/integrations/tiktok/callback`
- Scopes: `user.info.basic`, `user.info.profile`, `user.info.stats`

### Instagram

- Account must be a professional Business or Creator account linked to a Facebook Page.
- Render: `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION`
- Redirect URI: `https://aiwithmurda.com/api/integrations/instagram/callback`
- Permissions: `pages_show_list`, `instagram_basic`, `pages_read_engagement`

### YouTube

- Render: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`
- Redirect URI: `https://aiwithmurda.com/api/integrations/youtube/callback`
- Scope: `https://www.googleapis.com/auth/youtube.readonly`

### X

- Render: `X_BEARER_TOKEN`, `X_USERNAME`
- This connector uses app credentials rather than an account OAuth button.

## Admin flow

1. Open `/admin?view=settings` and unlock Admin.
2. Open **Social Accounts**.
3. Confirm metric storage and token encryption both say `ready`.
4. Add one provider app's credentials in Render.
5. Deploy, return to Social Accounts, and press **Connect**.
6. Approve the provider authorization.
7. Press **Sync now** and confirm the individual card plus combined total.
8. For Twitch, confirm **Enable instant** is no longer shown after EventSub subscribes.

## Automation endpoint

An n8n or cron heartbeat can call:

```text
POST https://aiwithmurda.com/api/admin/integrations/social/sync
Authorization: Bearer <ADMIN_API_TOKEN>
```

The server still enforces each provider's cadence and shares one result with every SSE viewer.

## Verification

```bash
npm run build
npm run smoke:tracker
npm run smoke:social-ui
```
