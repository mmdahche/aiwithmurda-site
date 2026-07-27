---
name: AI with Murda July 27 launch unblocking
description: Verified Restream launch event, production live links, OBS privacy scene, and remaining microphone/public rehearsal gate.
type: architecture
source: rubyx
date_added: 2026-07-27
project: aiwithmurda
status: prelaunch
---

# July 27 Launch Unblocking

## Restream

- The existing Default RTMP event uses the launch title:
  `DAY 1: $100K + 100K Followers in 60 Days | Building with AI Live`.
- The description links the public scoreboard, build-log signup, and operator store.
- YouTube is Public and enabled.
- Twitch is enabled.
- Restream reports 2 of 2 destinations active.
- The event was verified offline after configuration.

## Production Live Hub

- Render environment variables now configure:
  - Main room: the AI with Murda YouTube live channel URL.
  - YouTube: the AI with Murda YouTube live channel URL.
  - Twitch: `https://www.twitch.tv/aiwithmurda`.
  - Status: `ready`.
  - Label: `Day 1 room ready`.
  - Message: July 28 launch message with YouTube, Twitch, and scoreboard direction.
- Render deploy `dep-d9jh1tvavr4c73cgvit0` completed live.
- `npm run smoke:stream` passed against production with status `ready`.

## OBS Privacy Scene

- Scene `Privacy / BRB` now exists in OBS.
- Source `AI with Murda Privacy Screen` loads the persistent local asset:
  `stream-assets/privacy.html`.
- The source renders at 1280x720 and 30 FPS.
- Scene switching passed between Main Scene, Command Center, and Privacy / BRB.
- OBS scene collection backup:
  `~/Library/Application Support/obs-studio/basic/scenes/Untitled.before-privacy-2026-07-27.json`.
- Privacy asset commit: `d4372a3`.
- OBS was left offline on `Privacy / BRB`.

## Local Rehearsal

- Main Scene renders desktop capture, the live follower overlay, and facecam.
- Command Center renders the prelaunch Day 1 scoreboard with the verified follower count.
- Privacy / BRB renders full-screen without relying on network access.
- A local 1280x720, 30 FPS recording contains H.264 video and a 48 kHz stereo AAC audio track.
- The recording was effectively silent because no spoken microphone test occurred.
- `Mic/Aux` is unmuted at 0 dB and currently targets the Scarlett 2i2 USB.

## Remaining Gate

1. Murad must speak into the Scarlett microphone during a short local recording so signal level and intelligibility can be verified.
2. Starting the final two-destination public rehearsal requires Murad's explicit approval because it will be visible on Public YouTube and Twitch.
3. The Main Scene captures the whole display. Use a clean stream workspace and Privacy / BRB before opening personal conversations, Render, Stripe, email, or secret screens.

## Boundaries

- Do not start OBS streaming without confirming the active scene and destination visibility.
- Do not expose or copy any Restream stream key into Git, memory, handoffs, or chat.
- Do not replace the working 720p30/4500 Kbps hardware-encoder profile before launch.
