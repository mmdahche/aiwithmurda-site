# VERIFY — Browser Automation Studio

Pre-ship checklist (2026-07-16):

- [x] `node scripts/verify-product-folder.mjs products/browser-automation-studio` passes
- [x] Skill installs via `bash install/setup.sh` without errors
- [x] No absolute user paths, secrets, or reference-source strings in payload
- [x] INDEX.md matches disk after `--write-index`
- [x] Example walkthrough is self-contained (no external URLs that require login)
