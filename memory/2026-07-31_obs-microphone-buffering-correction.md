---
name: OBS microphone buffering correction
description: Root cause, recovery limits, and verified single-source Scarlett routing after the Plaid meeting recording lost the operator microphone.
type: project
source: rubyx
date_added: 2026-07-31
---

# OBS Microphone Buffering Correction

## Incident

Recording inspected:

`/Volumes/Storage/AI with Murda/OBS Recordings/Meetings/Plaid/Early Onboarding.mp4`

- Duration: 35:49
- Created by OBS 32.2.1 at 09:59:16 America/Chicago
- Tracks: one H.264 video track and one mixed stereo AAC audio track

The call/computer audio was written to the mixed track, but the operator microphone was not captured reliably.

## Root cause

OBS had two `coreaudio_input_capture` sources opening the same physical device ID for the Scarlett 2i2:

- Global `Mic/Aux`, muted in the mixer
- Scene-specific `Broadcast Mic`, unmuted

Muting `Mic/Aux` did not release the hardware capture. The OBS log recorded `Broadcast Mic` reaching the maximum audio buffer, falling roughly 14 seconds behind, and restarting about every 30 seconds before, throughout, and after the meeting recording.

Because the recording contains only one mixed audio track, microphone audio that never reached that mix cannot be isolated or reconstructed from the OBS file. Any surviving microphone fragments may be delayed or intermittent.

## Corrected routing

The scene-specific `Broadcast Mic` items and input were removed. OBS now uses one Scarlett capture only:

- Global `Mic/Aux`: Scarlett 2i2, unmuted, 0 dB
- `Desktop Audio`: shared computer audio, approximately -12.1 dB
- `Desktop Screen` audio component: muted to avoid duplicate computer audio

Global `Mic/Aux` remains available in every scene, including `Privacy / BRB`, and can be muted or unmuted from the mixer without creating another hardware capture.

The original microphone processing chain remains enabled:

- Noise Suppression
- Gain
- 3-Band Equalizer
- Compressor
- Limiter

## Verification

After restarting OBS:

- `Broadcast Mic` did not return.
- Exactly one Scarlett input remained.
- OBS was offline and not recording.
- The fresh log initialized `Mic/Aux` at 48 kHz with 21 ms of audio buffering.
- No `Max audio buffering` or `audio is lagging` errors recurred during the verification interval.

Before the next important call or stream, make a private 20-30 second local recording while speaking and play it back. Never create a second CoreAudio input for the Scarlett; use the global `Mic/Aux` mute control across scenes.

## Separate video issue

The incident session also reported heavy rendering lag during the meeting recording. That does not explain the missing voice and should be diagnosed separately before a long broadcast.
