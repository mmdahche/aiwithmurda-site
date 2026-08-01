---
name: August 1 official launch reset
description: Production campaign-clock move, protected Day 1 baseline, deployed verification, and the remaining licensed-music launch gate.
type: project
source: rubyx
date_added: 2026-08-01
---

# August 1 Official Launch Reset

## Official window

- Day 1: August 1, 2026
- Day 60: September 29, 2026
- Complete: September 30, 2026 at 12:00 AM Central
- Day 1 goal: `Launch the first official AI with Murda stream and establish the Day 1 baseline`

The previous July 31 row and automatically created August 1 Day 2 row were rehearsal data. They were replaced with one clean Day 1 production row.

## Protected baseline

The reset captured these connected social counts:

- Twitch: 0
- TikTok: 135
- Instagram: 102
- YouTube: 1
- Combined: 238

Revenue, email growth, streamed hours, clips, products sold, builds, and lessons all began at zero. One previously counted rehearsal stream session was retained for audit history but changed to non-campaign status with zero counted seconds. No clip events required resetting.

`scripts/sync-launch-baseline.mjs` now:

- Refuses to reset while the production stream is live or campaign status is unavailable.
- Stamps the Day 1 follower ledger with `_campaignStartedAt` so the worker cannot rebuild the row.
- Resets previously counted stream and clip telemetry without deleting the source records.
- Preserves the first-official-stream Day 1 goal through later automation cycles.

## Production verification

- Render commit `51d3ae6`: August 1 campaign clock and public copy.
- Render commit `586e373`: protected launch baseline and telemetry reset.
- Campaign smoke: live Day 1, August 1 start, September 29 Day 60, one daily row, JSON/CSV/HTML exports available.
- Tracker smoke: all public/admin protections and social/dashboard routes passed; Stripe remained live.
- Stream smoke: status ready, configured destinations present, command deck and privacy guard present.
- Deck smoke: one Day 1 daily slide and one Week 1 summary.
- Playwright: `/60/` and `/day/1` returned 200, rendered Day 1 and August 1, and displayed the official first-stream goal.
- Automation-cycle recheck: one Day 1 row remained, streamed hours stayed zero, and the goal did not drift.

## Music launch gate

Apple Music subscription catalog tracks are not approved for the live stream. The zero-cost launch recommendation is StreamBeats, whose published license covers synchronized use on Twitch and YouTube.

Use downloaded StreamBeats files, not ordinary Apple Music subscription tracks. Import the downloaded files into a local playlist and play them through the verified OBS desktop-live-only route. Run a final private meter/recording check before starting the first official broadcast.

Resolved on August 1: the `Low-key` MP3 320 album was installed as 30 local tracks in the `AI with Murda - Stream Safe` Music playlist. The final offline OBS check confirmed music on live Track 1, silence on recording Tracks 2-4, a working FaceCam, restored mixer state, and `Privacy / BRB` as the parked scene. See [`2026-08-01_streambeats-launch-music.md`](2026-08-01_streambeats-launch-music.md).
