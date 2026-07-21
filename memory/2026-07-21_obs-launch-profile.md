---
name: AI with Murda OBS launch profile
description: Verified 720p30 streaming profile, rehearsal findings, backup path, and launch safety boundaries.
type: architecture
source: rubyx
date_added: 2026-07-21
project: aiwithmurda
status: prelaunch
---

# OBS Launch Profile

## Verified Settings

- Output resolution: `1280x720`.
- Frame rate: `30 FPS`.
- Video bitrate: `4500 Kbps`.
- Video encoder: Apple H.264 hardware encoder.
- Audio bitrate: `160 Kbps`.
- Current program scene: `Command Center`.

## Why It Changed

- The first dual-platform rehearsal completed successfully on public Twitch and private YouTube.
- OBS logged `3.1%` dropped frames from connection stalls and `1.2%` skipped frames from encoding lag while using `720p60` at `6000 Kbps`.
- The current connection has ample capacity, but the Restream route showed substantial latency variation. Reducing to `720p30` lowers encoder pressure and adds delivery headroom without hurting coding or dashboard content.

## Rollback

- Active profile: `~/Library/Application Support/obs-studio/basic/profiles/Untitled/basic.ini`.
- Pre-change backup: `~/Library/Application Support/obs-studio/basic/profiles/Untitled/basic.before-720p30-2026-07-21.ini`.

## Safety Boundaries

- OBS was verified offline after the settings change.
- Twitch remains disabled in Restream after rehearsals and requires explicit activation before a public stream.
- YouTube remains Private for rehearsals unless Murad explicitly changes its visibility.
- Run another controlled rehearsal and inspect the OBS log before declaring the profile launch-ready.
