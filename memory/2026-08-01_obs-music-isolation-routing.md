---
name: OBS music isolation routing
description: Verified macOS OBS routing for live music, clean local recordings, isolated edit tracks, and the current Restream Twitch VOD limitation.
type: project
source: rubyx
date_added: 2026-08-01
---

# OBS Music Isolation Routing

## Goal

Background music should be audible on the live broadcast while remaining absent from local OBS recordings and clips. Program audio and the operator microphone must remain available in both outputs.

## macOS capture model

OBS 32.2.1 uses native macOS application audio capture rather than the Windows-only `Application Audio Capture (BETA)` source. Native application sources were added to all four production scenes:

- `Program Audio - Chrome`: `com.google.Chrome`
- `Program Audio - Codex`: `com.openai.codex`
- `Program Audio - Cursor`: `com.todesktop.230313mzl4w4u92`
- `Music - Apple Music`: `com.apple.Music`

Scenes covered:

- `Main Scene`
- `Command Center`
- `Privacy / BRB`
- `Just Camera`

The privacy scene therefore keeps both microphone and music available. Either source can still be muted from the mixer when privacy requires it.

## Track matrix

| Source | Track 1 live | Track 2 clean mix | Track 3 mic stem | Track 4 program stem |
| --- | --- | --- | --- | --- |
| `Mic/Aux` | Yes | Yes | Yes | No |
| Chrome, Codex, Cursor | Yes | Yes | No | Yes |
| Apple Music | Yes | No | No | No |
| Browser-source audio | Yes | Yes | No | Yes |
| Broad `Desktop Audio` | No | No | No | No |
| `Desktop Screen` audio | No | No | No | No |

Local recordings use tracks 2, 3, and 4 (`SimpleOutput/RecTracks=14`). This yields a ready-to-watch clean mix plus isolated microphone and program tracks for editing. Track 1 is the live mix and is not written to local recordings.

The single global `Mic/Aux` remains the only Scarlett 2i2 capture. Do not add a second microphone input; that previously caused severe audio buffering and rendering lag.

## Verification

After restarting OBS, a private 7.7-second recording was written to the external SSD with:

- One H.264 video stream
- Three stereo AAC streams
- OBS encoders `simple_aac_recording1`, `simple_aac_recording2`, and `simple_aac_recording3`, confirming Tracks 2, 3, and 4 only
- No `Max audio buffering`, `audio is lagging`, encoding-lag, or rendering-lag error
- Streaming stopped before, during, and after the test

The final physical-signal check still requires playing a song in Apple Music and confirming its OBS meter moves while a short local recording remains music-free.

## Twitch VOD boundary

OBS is currently sending one custom RTMP program feed to Restream. OBS's native Twitch VOD Track requires a direct Twitch account connection, so a separate music-free Twitch VOD track cannot travel through the current Restream path.

Current supported result:

- Live Restream broadcast: microphone, program audio, and music
- Local OBS recording and clips: microphone and program audio, no music
- Twitch VOD through Restream: same mixed audio as the live broadcast

To make Twitch VODs music-free, switch the Twitch path to a direct OBS Twitch connection with Track 2 selected as the VOD Track, then handle YouTube simulcasting separately. Until that architecture changes, use music licensed for live broadcasts and archived VODs.

## Rollback

The pre-change OBS profile and scene collection are backed up under:

`/Users/muhammad/ContentCreating/tools/60-day-command-center/.secrets/obs-backups/2026-08-01_pre-music-routing/`

Do not publish that backup or copy its contents into a handoff.
