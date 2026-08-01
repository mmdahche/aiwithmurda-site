---
name: OBS Facecam device rebind
description: Elgato Facecam recovery after a USB reconnect changed the macOS device ID, including duplicate-source cleanup and restart verification.
type: project
source: rubyx
date_added: 2026-08-01
---

# OBS Facecam Device Rebind

## Incident

Replugging the Elgato Facecam MK.2 changed its macOS capture-device identifier. OBS still referenced the previous unavailable ID, leaving both camera scenes blank even though the camera was physically connected.

The scene collection also contained an obsolete disabled `Video Capture Device` source bound to the same dead ID.

## Correction

- Rebound the existing `FaceCam` source to the currently detected Elgato Facecam MK.2.
- Preserved the existing scene transforms, color-correction filter, sharpness filter, and 1920x1080 source format.
- Removed the disabled `Video Capture Device` scene item and input.
- Kept one physical camera capture shared by `Main Scene` and `Just Camera`.

Do not create another Facecam input when the camera disappears after a reconnect. Rebind the existing `FaceCam` source to the newly detected device instead.

## Verification

- Private source screenshot returned a real 640px preview from the camera.
- OBS reported a 1920x1080 source frame.
- After a full OBS restart, the log recorded `FaceCam: Selected device 'Elgato Facecam MK.2'`.
- No `Video Capture Device` input remained.
- No camera initialization, audio-buffering, or rendering-lag error recurred.
- OBS was left offline and not recording on `Privacy / BRB`.

## Rollback

The scene collection before the rebind is stored under:

`/Users/muhammad/ContentCreating/tools/60-day-command-center/.secrets/obs-backups/2026-08-01_pre-camera-rebind/`

Do not publish that backup or copy its contents into a handoff.
