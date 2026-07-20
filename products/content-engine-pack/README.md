# Content Engine Pack

**Ship one short-form piece per weekday — as five agent skills plus a workflow.**

Five clean-room disciplines for a solo operator running a short-form channel:
hook engineering, voice-calibrated humanization, timestamped UGC scripts,
source-cited trending angles, and podcast-style audio overviews. Markdown-only —
no scripts, no cloud APIs.

| Skill | What it does |
|-------|--------------|
| **hooks-angles** | Shock-number, contradiction, and stakes hook frames — with an ethics screen that bans fake income claims |
| **content-humanizer** | Two-pass rewrite: extract a voice fingerprint, then match target text to it with a diff receipt |
| **ugc-scriptwriter** | Hook → Problem → Action → CTA beats with timestamps, shot list, overlays, and caption block |
| **trending-content** | Angle matrix per trend, but only after a citation and ethics gate |
| **audio-overview** | Chaptered read-aloud script from any doc — single-host or two-host, with pacing marks |

Plus `payload/templates/faceless-channel-workflow.md` — the operator's
research-to-post pipeline that chains all five skills across the week.

## Time to first value

~20 minutes: install all five, extract your voice fingerprint against ~800
words of your own writing, then run one real trend through the trend →
hook → script → caption chain in the walkthrough.

## Install

**Quick path:** `bash install/setup.sh`

**Manual:** copy each file from `install/claude-code/` or `install/codex/<name>/`.

## Provenance

Clean-room rewrite (2026-07-16). This pack originally intended to ship five
third-party-authored component skills; each was rewritten from scratch
against the same problem statements before ship. No wording was copied from
the source skills. Domain patterns (hook frames, chapter beats, voice
fingerprinting, source-citation discipline) are standard short-form content
practice.

## License

MIT — see `LICENSE`.
