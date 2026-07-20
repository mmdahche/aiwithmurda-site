# Verification & QA Pack

Make "it works" mean something. Six verification disciplines for AI-assisted
development, packaged as drop-in agent skills: the no-claims-without-evidence
gate, a state-sequence audit that catches dead buttons function-level
debugging misses, blind-spot testing patterns for code the reviewer also
wrote, browser QA with a health-scored fix loop, its report-only sibling, and
a ranked test-gap detector.

## Who this is for

Anyone whose AI agent has said "done — everything works" and been wrong.
Builders shipping AI-written code who want mechanical proof instead of model
confidence, and teams that need a shared definition of "verified."

## Time to first value

~15 minutes: install one file (the claim gate) and watch your agent's behavior
change on the next fix. Follow `00-START-HERE.md`.

## What's inside

| Skill | The failure it kills |
|---|---|
| `verify-before-claiming` | "tests should pass now" — claims without fresh evidence, and trusting sub-agent success reports |
| `state-sequence-audit` | the button whose handler calls all work individually and still does nothing — sequential undo, async races, stale closures, watcher interference |
| `ai-blind-spot-testing` | the same model writing AND reviewing code — known-answer tables, sandbox-mode API tests with no database, regression tripwires, second-agent review |
| `qa` | shipping unwalked pages — systematic browser QA, health rubric, severity tiers, atomic fix-commit loop |
| `qa-only` | needing the bug surface before authorizing fixes |
| `test-gap-detector` | 5,000-file "no coverage" dumps — a ranked top-10 by risk × recency × API surface instead |

All plain markdown. Works with Claude Code and Codex (`/qa` assumes browser
automation such as Playwright MCP is available to the agent).

## Setup

No dependencies.

**Quick path:** `bash install/setup.sh` (add `--force` to overwrite existing
installs). Copies the six skills into `$CLAUDE_CONFIG_DIR/skills/<name>/SKILL.md`
(defaults to `$HOME/.claude/skills/`) and mirrors each into `.agents/skills/`
when that Codex root exists.

**Manual:** copy the six files from `install/claude-code/` into your
skills/commands folder — or per-skill `install/codex/<name>/SKILL.md` into
`.agents/skills/`.

## Cross-reference note (honest packaging)

`verify-before-claiming.md` also ships inside Safe-Autonomy Guardrails — the
same canonical file, not a variant. It lives in both because each pack is
incomplete without it; if you own both packs, install it once. Nothing else
overlaps.

## What this is NOT

- Not a test framework — it's the discipline layer that tells you WHAT to
  test and WHEN a claim counts, using whatever runner your project has.
- Not a substitute for reading diffs. Tests catch behavior; reading catches
  wrong approaches.
- No outcome promises. It raises the floor on verification; your judgment
  still decides what ships.

## Support boundary

Digital product. Setup questions: murad@aiwithmurda.com. No custom QA
implementation included. MIT licensed — reuse freely, attribution appreciated.

## Lineage (honesty note)

`qa` and `qa-only` are clean-room adaptations of garrytan/gstack's QA
methodology (MIT); `verify-before-claiming` clean-room adapts
obra/superpowers' verification-before-completion (MIT); `test-gap-detector`
derives concept-only from ruvnet/ruflo (MIT). Attribution preserved in each
file's Origin section. `state-sequence-audit` and `ai-blind-spot-testing` are
original write-ups for this pack — the techniques are community wisdom; the
words, taxonomy, and examples are ours.
