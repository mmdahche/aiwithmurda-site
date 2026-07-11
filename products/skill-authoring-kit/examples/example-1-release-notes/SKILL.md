---
name: release-notes
description: Draft a user-facing changelog entry from the commits merged since the last release tag. Use when the user says "write the release notes", "changelog for this release", "what shipped since v-last", or is preparing a version bump. Does NOT create the git tag or publish anywhere — output is a draft block for CHANGELOG.md.
---

# /release-notes — commits → human changelog

Turns `git log <last-tag>..HEAD` into a draft changelog entry grouped by
Added / Changed / Fixed, written for users, not for developers.

*(This is a worked EXAMPLE from the Skill Authoring Kit — a complete, real
skill you can install as-is, structured exactly the way `write-a-skill.md`
teaches. Study the shape: verbatim triggers in the description, an
anti-trigger section, deterministic steps, a "does NOT" boundary, and a
verify step separate from the produce step.)*

## When to use

- The user says "write the release notes", "changelog for this release", "what shipped since <tag>"
- A version bump PR is being prepared and CHANGELOG.md needs its new section

## When NOT to use

- No release tag exists yet (nothing to diff against) — say so and offer to summarize all history instead
- The user wants marketing copy for a launch post — that's a different register; offer to adapt AFTER the changelog is approved
- The user wants the tag created or the release published — out of scope, say which command they'd run themselves

## Steps

1. Find the last tag: `git describe --tags --abbrev=0`. None → stop, report the anti-trigger above.
2. Collect commits: `git log <tag>..HEAD --pretty=format:"%h %s" --no-merges`.
3. Classify each commit subject: user-visible feature → Added; behavior change → Changed; bugfix → Fixed; internal-only (refactor/test/chore) → omit from the draft but list at the bottom under "internal, omitted" so nothing silently disappears.
4. Rewrite each kept line for a USER: what they can now do / what stopped being broken — not what the code does. Drop ticket numbers into trailing parentheses.
5. PRODUCE: print the draft block in Keep-a-Changelog format with today's date and the proposed version.
6. VERIFY (separate step, never fused with 5): re-read the draft against the raw commit list and confirm every user-visible commit is represented; print "coverage: N of M commits represented, K omitted as internal".

## Output

The draft changelog block plus the one-line coverage report. Nothing is
written to CHANGELOG.md until the user approves — then edit the file.

## Notes

- Merge-commit noise is excluded via `--no-merges`; if the repo squash-merges, every commit matters — don't filter.
- If commit subjects are too cryptic to classify, ask for the worst 3 rather than guessing all of them.
