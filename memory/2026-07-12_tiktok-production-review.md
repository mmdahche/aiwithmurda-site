---
name: tiktok_production_review
description: TikTok Production URL verification, review package, and submitted read-only Login Kit app state.
type: project
source: rubyx
date_added: 2026-07-12
project: aiwithmurda
status: in_review
---

# TikTok Production Review

## Locked integration

- App: `AI with Murda Live Metrics`
- Product: TikTok Login Kit
- Scopes: `user.info.basic`, `user.info.profile`, and `user.info.stats`
- Permissions are read-only. No publishing or write permissions are requested.
- Callback: `https://aiwithmurda.com/api/integrations/tiktok/callback`
- Website: `https://aiwithmurda.com/60/`

## Production verification

TikTok Production keeps URL ownership separate from Sandbox. These Production URL prefixes are verified:

- `https://aiwithmurda.com/terms/`
- `https://aiwithmurda.com/privacy/`
- `https://aiwithmurda.com/60/`

The matching signature files shipped in commits `ccaf9d9`, `339053e`, and `d2d4737`.

## Review package

- Demo: `/Users/muhammad/ContentCreating/review-assets/tiktok-app-review/aiwithmurda-tiktok-review-demo.mp4`
- Format: H.264 MP4, 1280x720, about 46.5 seconds, under 1 MB.
- Demonstrates OAuth consent, callback success, TikTok follower count `133`, combined dashboard total `133`, and the OBS overlay.
- Reviewer explanation documents encrypted token storage, roughly 60-second polling, and read-only use.

## Current state

- Submitted by Murad on July 12, 2026.
- TikTok shows the authoritative status `In review` and locks the submitted fields.
- History records the submission configuration at Jul 12, 2026 1:44 PM.
- Keep Render on sandbox TikTok credentials until Production approval arrives.
- After approval, move Render to Production credentials and rerun the live tracker smoke suite.
