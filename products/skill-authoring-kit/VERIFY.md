# VERIFY — Skill Authoring Kit

The checklist we ran before shipping this folder. Re-run it yourself; every
step should pass. Failures → murad@aiwithmurda.com with the step number.

## 1. Folder integrity

- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra).
- [ ] `LICENSE` (MIT), `CHANGELOG.md`, `README.md`, `00-START-HERE.md` present.

## 2. Install

- [ ] Claude Code: `install/claude-code/write-a-skill.md` copied into your
      skills/commands folder; the agent lists it when asked "what skills do
      you have for authoring skills?" or fires on "write a skill for X".
- [ ] Codex: `install/codex/write-a-skill/SKILL.md` copied into
      `.agents/skills/`; same discovery check.

## 3. The authoring loop works

- [ ] Say "write a skill for <a workflow you repeat>". The agent interviews
      you ONE question at a time (not a batch of five).
- [ ] The draft it produces has: frontmatter with a trigger-explicit
      description, a "When NOT to use" section, and at least one concrete
      example.
- [ ] The pre-ship audit runs: try planting `api_key = "sk_live_fake123"` in
      a draft — the audit must block it and name the line.

## 4. Worked examples install and fire

- [ ] `examples/example-1-release-notes/SKILL.md` installed into a git repo
      with at least one tag → "write the release notes" produces a grouped
      draft + a coverage line, and does NOT write CHANGELOG.md unprompted.
- [ ] `examples/example-2-csv-import-check/SKILL.md` installed → "check this
      CSV" on a sample file produces a written report AND a separate verify
      line confirming report totals match.

## 5. The description drill sticks

- [ ] Take your first authored skill's description through the 60-second
      test in `payload/description-writing.md` (three questions). All three
      yes → shipped right.

## Shipping record

- Verified by: the build pipeline's manifest/count/secret-scan checks
  (`scripts/verify-product-folder.mjs`) on every release build.
- Clean-machine pass: v1.0.0 verified on macOS (Apple Silicon), Claude Code
  layout. Codex layout structurally mirrored and spot-checked.
