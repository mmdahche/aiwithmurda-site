---
name: StreamBeats launch music library
description: Licensed local music library, Music playlist, and final OBS isolation verification for the first official broadcast.
type: project
source: rubyx
date_added: 2026-08-01
---

# StreamBeats Launch Music Library

## Rights boundary

Ordinary Apple Music subscription catalog tracks are not approved for the broadcast. A consumer streaming subscription does not grant the synchronization and public-performance rights needed for a Twitch or YouTube livestream.

Use only tracks covered by a creator/broadcast license. The launch library uses StreamBeats under its published synchronization and master-use license:

- License: `https://streambeats.com/licensing/`
- Authorized surfaces include Twitch and YouTube video content.
- Monetization is allowed and attribution is not required.
- The tracks must not be redistributed standalone, remixed, or used as a music-only radio stream.

## Installed library

- Album: `Low-key` by StreamBeats by Harris Heller
- Format: MP3 320
- Tracks: 30
- Source folder: `/Volumes/Storage/AI with Murda/Stream Music/StreamBeats/Low-key`
- Music playlist: `AI with Murda - Stream Safe`

The playlist contains downloaded local files. Do not replace them with similarly named subscription-catalog tracks.

## Final OBS verification

The offline rehearsal used one local StreamBeats track and the existing hybrid OBS routing:

- OBS remained offline throughout the check.
- Broad `Desktop Audio` received the music at peak `0.4375` and feeds live Track 1.
- The private recording contained one H.264 video stream and three AAC audio streams for Tracks 2, 3, and 4.
- All three local recording tracks measured `-91.0 dB` maximum, confirming the music was excluded.
- The FaceCam returned a live frame before the test.
- The mic and desktop mute states were restored.
- OBS was left offline, not recording, on `Privacy / BRB`.

Private verification recording:

`/Volumes/Storage/AI with Murda/OBS Recordings/2026-08-01 18-52-41.mp4`

## Restream boundary

Restream receives the Track 1 live mix, so Twitch VODs created through Restream also contain the music. That is acceptable for this StreamBeats library because its license covers Twitch and YouTube synchronization. It is not permission to use ordinary commercial music.

For every future music source, verify the license covers live broadcasts and archived VODs before adding it to the playlist.
