# VERIFY — The Operator Sampler

Yes, the free tier gets a verification checklist too — that's the house
standard. Re-run it; failures → murad@aiwithmurda.com.

## 1. Folder integrity

- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra).
- [ ] `LICENSE` (MIT), `CHANGELOG.md`, `README.md`, `00-START-HERE.md` present.

## 2. The skill installs and fires

- [ ] `install/claude-code/verify-before-claiming.md` copied into your skills
      or commands folder (Codex: `install/codex/verify-before-claiming/SKILL.md`
      → `.agents/skills/`).
- [ ] Ask the agent to fix any trivial bug. PASS = its completion message
      contains a fresh verification run (command + output) alongside the
      claim. FAIL = "should work now" with no evidence — recheck the install.

## 3. The script does its job

- [ ] Paste `payload/inspect-before-edit.md`'s script into a session on any
      real project, filled in. PASS = the agent produces the four numbered
      sections and does NOT edit anything before you say "go".

## 4. The checklist is usable offline

- [ ] `payload/daily-operator-checklist.md` opens clean and the session
      tracks read standalone (no links required to use it).

## Shipping record

- Verified by: the same build pipeline as the paid folders
  (`scripts/verify-product-folder.mjs` — manifest/count/secret-scan on every
  release build).
- Clean-machine pass: v1.0.0 verified on macOS (Apple Silicon), Claude Code
  layout; Codex layout mirrored.
