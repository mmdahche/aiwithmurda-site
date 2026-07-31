---
name: Shared OBS audio and Restream chat gate
description: Verified scene-wide microphone and computer-audio routing, private validation recording, and the launch-time Restream connection check.
type: project
source: rubyx
date_added: 2026-07-31
---

# Shared OBS Audio And Restream Chat Gate

## OBS routing

The `Untitled` scene collection now uses the same two audio sources in all four scenes:

- `Broadcast Mic`
- `Desktop Audio`

Verified scenes:

- `Main Scene`
- `Command Center`
- `Privacy / BRB`
- `Just Camera`

`Broadcast Mic` uses the Scarlett 2i2 and preserves the processed microphone filter chain. `Desktop Audio` is set to approximately `-12.1 dB`.

The old global `Mic/Aux` and the audio component of `Desktop Screen` remain muted. This prevents the microphone or computer sound from being captured twice and creating echo.

## Validation

- OBS was offline and not recording before the routing change.
- A local-only recording switched through all four scenes and retained an AAC audio track.
- Private test file: `/Volumes/Storage/AI with Murda/OBS Recordings/2026-07-31 02-26-16.mp4`
- The test file must not be uploaded.
- OBS was returned to `Privacy / BRB`, offline and idle.

## Restream chat finding

The rehearsal archive contains seven timeline entries, including six viewer messages and one host message. Restream analytics reports four counted messages from two chatters, so the analytics total is not a complete transcript.

Restream filtering is off:

- `Hide common chat bots`: off
- `Hide commands starting with "!"`: off
- No muted users or filtered words were present.

Both YouTube and Twitch are connected on the Restream Channels page. When offline, the dedicated chat page showed Twitch connected and YouTube pending. This can delay opening YouTube messages even though they later appear in the archive.

## Launch rule

1. Start OBS on `Privacy / BRB`.
2. Open `https://chat.restream.io/chat`.
3. Wait until Restream reports `2/2 channels` connected.
4. Confirm one YouTube message and one Twitch message arrive.
5. Switch to `Main Scene` and begin the show.

Use Restream unified chat as the primary view. Keep native YouTube Live Chat, set to unfiltered `Live chat`, available as the fallback because YouTube's `Top chat` view can filter messages.
