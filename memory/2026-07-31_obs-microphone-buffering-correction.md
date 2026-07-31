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

## Rendering-lag correction

The duplicate Scarlett capture also destabilized OBS timing beyond the microphone source. Before the correction, a 32-second private all-scene test reported:

- 963 attempted frames
- 450 rendering-lag frames
- 46.7% rendering loss

The meeting recording later reported 49.9% rendering loss. After removing `Broadcast Mic` and restarting OBS, the same test pattern passed without reducing canvas resolution, output resolution, frame rate, camera quality, or browser-source quality:

- Privacy-only recording: 452 drawn frames with no rendering-lag entry
- Full `Main Scene` recording: 457 drawn frames with no rendering-lag entry
- 31-second all-scene stress recording: 941 attempted frames, 1 rendering-lag frame, 0.1% loss
- No encoder skips, microphone-buffer errors, or public stream output

The active launch profile remains 2560x1440 canvas, 1280x720 output, 30 FPS, bicubic downscale, and Apple VideoToolbox H.264 hardware encoding. Do not lower quality unless a later controlled test proves a new bottleneck.
