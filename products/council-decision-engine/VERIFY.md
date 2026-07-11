# VERIFY — The Council

This is the checklist we ran on a clean machine before shipping this folder.
Re-run it yourself; every step should pass on your machine too. If a step
fails, email murad@aiwithmurda.com with the step number and your OS.

## 1. Folder integrity

- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra):
      compare `INDEX.md` against your unzipped folder.
- [ ] `LICENSE`, `CHANGELOG.md`, `README.md`, `00-START-HERE.md` present.

## 2. Environment

- [ ] `python3 --version` prints 3.10 or newer.
- [ ] `bash install/setup.sh` completes and prints "Installed The Council".
- [ ] `~/.council/` now contains `runner.py`, `council.sh`, `advisors/` (5
      files), `reviewers/` (1 file), `.secrets/groq.env.example`.

## 3. Key setup

- [ ] Free key created at console.groq.com/keys.
- [ ] `~/.council/.secrets/groq.env` exists with your key; `chmod 600` applied.
- [ ] The real `groq.env` is NOT inside this product folder, NOT in any git
      repo, and never pasted into an AI chat.

## 4. Live fire

- [ ] Fast mode returns in ~2s:
      `~/.council/council.sh --mode fast "Reply with a one-line verdict: is this installation working?"`
- [ ] Full council returns in ~5-10s and prints a bundle with 5 advisor
      sections, an anonymization map, and 5 peer reviews:
      `~/.council/council.sh "Should a solo builder adopt a second code-review tool this month, given limited hours?"`
- [ ] An HTML report appeared in `~/.council/reports/` and opens in a browser.
- [ ] A run folder appeared in `~/.council/runs/<timestamp>/` with
      `question.txt`, `advisors.json`, `reviewers.json`, `mapping.json`.

## 5. Agent integration (optional but recommended)

- [ ] Claude Code: `install/claude-code/council.md` copied into your commands
      or skills folder; saying "run the council on <decision>" dispatches it.
- [ ] Codex: `install/codex/council/SKILL.md` copied into `.agents/skills/`.

## Shipping record

- Verified by: Murad's build pipeline (`scripts/verify-product-folder.mjs`)
  — manifest/count/secret-scan checks run on every release build.
- Clean-machine pass: v1.0.0 verified on macOS (Apple Silicon). If you verify
  on Linux/Windows and hit friction, the support email above wants to know.
