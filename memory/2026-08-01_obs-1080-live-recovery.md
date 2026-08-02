---
name: OBS 1080p live recovery
description: Verified repair for blurry desktop capture, camera reconnects, overlapping overlays, and delayed microphone remuting during the August 1 live launch.
type: project
source: rubyx
date_added: 2026-08-01
---

# OBS 1080p Live Recovery

## Locked Quality Profile

- Base canvas: 2560x1440.
- Stream and recording output: 1920x1080 at 30 fps.
- Stream bitrate: 6000 Kbps.
- Downscale filter: Lanczos.
- Recording quality: HQ.
- Recording tracks: 2, 3, and 4 (`RecTracks=14`), preserving the music-free recording arrangement.

The previous 1280x720 output and small-file recording setting caused the visibly blurry desktop text and camera image.

## Camera Recovery

- The Elgato Facecam MK.2 was rebound to the device identity currently reported by macOS.
- The obsolete hidden `Video Capture Device` scene item was removed from `Just Camera`, then its unused input was deleted.
- `FaceCam` remains the single shared camera source for `Main Scene` and `Just Camera`.
- A private screenshot verified a real 1920x1080 camera frame after the repair.

If the camera is replugged again, detect its new macOS unique ID and rebind the existing `FaceCam`; do not create another capture source.

## Main Scene Defaults

- Desktop capture fills the 2560x1440 canvas without cropping or enlargement.
- FaceCam is framed at the bottom-right.
- The full scoreboard is enabled and locked at the top-right.
- The separate `Live Followers` source is disabled on `Main Scene` by default to prevent it from overlapping the scoreboard. It remains available for manual use and on the camera-only scene.

## Microphone Ordering

Changing the OBS monitoring mode restarts the Scarlett microphone source asynchronously. Setting mute first can therefore appear successful and then revert a few seconds later.

The reliable order is:

1. Set `Mic/Aux` monitoring to `OBS_MONITORING_TYPE_NONE`.
2. Wait for the source to settle.
3. Unmute `Mic/Aux`.
4. Verify again after at least 15 seconds.

This keeps the microphone live for stream and recording while removing the distracting voice feedback from the headphones.

## Verification

- Restream reported YouTube and Twitch as 2 of 2 active.
- Restream received 1920x1080 RTMP video.
- OBS held 30 fps with zero output-skipped frames and zero network congestion.
- The microphone remained unmuted after the post-switch settling check.
- Local test recordings contained 1920x1080 H.264 video and three AAC audio tracks.

