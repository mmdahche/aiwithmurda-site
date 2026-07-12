# VERIFY — Verification & QA Pack

The checklist we ran before shipping this folder. Re-run it yourself — this
pack's whole thesis is that unverified claims don't count, including ours.
Failures → murad@aiwithmurda.com with the step number.

## 1. Folder integrity

- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra).
- [ ] `LICENSE` (MIT), `CHANGELOG.md`, `README.md`, `00-START-HERE.md` present.
- [ ] The six payload skills match their `install/` copies (same content,
      two layouts): spot-check one with `diff payload/qa.md install/claude-code/qa.md`.

## 2. Install + discovery

- [ ] Claude Code: the six files copied into your skills/commands folder; the
      agent lists them when asked "what QA skills do you have?"
- [ ] Codex: `install/codex/<name>/SKILL.md` copied into `.agents/skills/`;
      same discovery check.

## 3. The claim gate changes behavior (the load-bearing test)

- [ ] With `verify-before-claiming` installed, ask the agent to fix a trivial
      bug in any project. PASS = its completion message contains a fresh
      verification run (command + output) in the same message as the claim.
      FAIL = "this should work now" with no evidence — re-check installation.

## 4. The audit method produces the right verdict

- [ ] Read `examples/dead-button-walkthrough.md`, then hand your agent
      `state-sequence-audit` plus any page with shared state and ask for a
      Step 1 store map. PASS = a side-effect map naming which actions RESET
      state they don't own (even if the answer is "none — no dangerous
      resets").

## 5. Browser QA runs end to end

- [ ] With browser automation available (e.g. Playwright MCP), run `/qa-only`
      against any running local app. PASS = a report with a health score,
      severity counts, at least one screenshot, and a baseline.json — and
      ZERO source-file edits (report-only contract held).

## 6. Gap detection ranks, not dumps

- [ ] Run `/test-gap-detector` on a repo with tests. PASS = a ranked report
      (high/medium/low + likely-dead-code), not a flat file list, plus the
      5-line chat summary.

## Shipping record

- Verified by: the build pipeline's manifest/count/secret-scan checks
  (`scripts/verify-product-folder.mjs`) on every release build.
- Clean-machine pass: v1.0.0 verified on macOS (Apple Silicon), Claude Code
  layout; Codex layout structurally mirrored and spot-checked.
