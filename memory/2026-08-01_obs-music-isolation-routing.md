---
name: OBS music isolation routing
description: Verified hybrid macOS OBS routing for live Apple Music, clean local recordings, isolated edit tracks, and the current Restream Twitch VOD limitation.
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
- `Music - Apple Music`: `com.apple.Music` (inactive placeholder)

Scenes covered:

- `Main Scene`
- `Command Center`
- `Privacy / BRB`
- `Just Camera`

Apple Music played normally but its application-only ScreenCaptureKit source produced a zero meter, while the broad native `Desktop Audio` source received the song at full level. The production setup therefore uses a hybrid split:

- Broad `Desktop Audio` feeds Track 1 only, carrying Apple Music and all computer sound to the live audience once.
- Per-application Chrome, Codex, and Cursor sources feed Tracks 2 and 4 only, preserving clean program audio in local recordings.
- The ineffective `Music - Apple Music` source is muted and assigned to no tracks.

The privacy scene keeps the live desktop/music feed and microphone available. Either source can still be muted from the mixer when privacy requires it.

## Track matrix

| Source | Track 1 live | Track 2 clean mix | Track 3 mic stem | Track 4 program stem |
| --- | --- | --- | --- | --- |
| `Mic/Aux` | Yes | Yes | Yes | No |
| Broad `Desktop Audio` | Yes | No | No | No |
| Chrome, Codex, Cursor | No | Yes | No | Yes |
| `Music - Apple Music` placeholder | No | No | No | No |
| Browser-source audio | Yes | Yes | No | Yes |
| `Desktop Screen` audio | No | No | No | No |

Local recordings use tracks 2, 3, and 4 (`SimpleOutput/RecTracks=14`). This yields a ready-to-watch clean mix plus isolated microphone and program tracks for editing. Track 1 is the live mix and is not written to local recordings.

The single global `Mic/Aux` remains the only Scarlett 2i2 capture. Do not add a second microphone input; that previously caused severe audio buffering and rendering lag.

## Verification

After restarting OBS, private recordings were written to the external SSD with:

- One H.264 video stream
- Three stereo AAC streams
- OBS encoders `simple_aac_recording1`, `simple_aac_recording2`, and `simple_aac_recording3`, confirming Tracks 2, 3, and 4 only
- No `Max audio buffering`, `audio is lagging`, encoding-lag, or rendering-lag error
- Streaming stopped before, during, and after the test

The final physical-signal test played a real song in Apple Music while all recording-track sources were temporarily muted:

- Live-only `Desktop Audio` peak: `0.4396`, proving the playing song reached the live source
- Track 2 clean mix maximum: `-91.0 dB`
- Track 3 microphone stem maximum: `-91.0 dB`
- Track 4 program stem maximum: `-91.0 dB`
- All temporary mute states were restored
- OBS remained offline and returned to `Privacy / BRB`

This proves Apple Music is present on the live-track source and absent from every local recording track. Any new program that must appear in clean recordings needs its own native application-audio source assigned to Tracks 2 and 4.

## Twitch VOD boundary

OBS is currently sending one custom RTMP program feed to Restream. OBS's native Twitch VOD Track requires a direct Twitch account connection, so a separate music-free Twitch VOD track cannot travel through the current Restream path.

Current supported result:

- Live Restream broadcast: microphone, program audio, and music
- Local OBS recording and clips: microphone and program audio, no music
- Twitch VOD through Restream: same mixed audio as the live broadcast

To make Twitch VODs music-free, switch the Twitch path to a direct OBS Twitch connection with Track 2 selected as the VOD Track, then handle YouTube simulcasting separately. Until that architecture changes, use music licensed for live broadcasts and archived VODs.

## Rollback

Pre-change OBS profiles and scene collections are backed up under:

`/Users/muhammad/ContentCreating/tools/60-day-command-center/.secrets/obs-backups/2026-08-01_pre-music-routing/`

`/Users/muhammad/ContentCreating/tools/60-day-command-center/.secrets/obs-backups/2026-08-01_pre-desktop-live-routing/`

Do not publish that backup or copy its contents into a handoff.

## Durable crash recovery

An OBS crash later restored the July 31 scene collection and removed all four per-application audio inputs from the running configuration. WebSocket repairs worked in memory but did not mark the scene collection for persistence, and even a normal application exit left the old file unchanged.

The durable correction was applied with OBS fully closed by parsing and updating the saved scene collection as structured JSON. The repair preserved the latest camera binding, 1080p layout, scoreboard, and follower-overlay defaults while restoring:

- `Desktop Audio` plus all four application sources on Main Scene, Command Center, Privacy / BRB, and Just Camera.
- The exact Track 1 live, Tracks 2-4 recording, mute, volume, and monitoring assignments documented above.
- The single Scarlett microphone on Tracks 1, 2, and 3 with monitoring disabled.
- Privacy / BRB as the saved startup scene.

Pre-repair rollback files are stored under:

`/Users/muhammad/ContentCreating/tools/60-day-command-center/.secrets/obs-backups/2026-08-01_pre-durable-recovery/`

The verified post-repair scene collection and profile are stored under:

`/Users/muhammad/ContentCreating/tools/60-day-command-center/.secrets/obs-backups/2026-08-01_verified-durable-audio-routing/`

Post-restart verification proved the restored sources loaded from disk. A private eight-second test at `/Volumes/Storage/AI with Murda/OBS Recordings/2026-08-01 23-54-31.mp4` received the licensed playlist on live-only Desktop Audio, wrote 1920x1080 video plus three AAC recording tracks, and measured `-91.0 dB` on all three recording tracks. OBS was left offline, not recording, on Privacy / BRB with Music paused.
