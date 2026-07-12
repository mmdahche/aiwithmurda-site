# START HERE — Safe-Autonomy Guardrails

You bought the safety layer for running AI agents on real code and real data:
a fail-closed egress scrubber, six in-process guards against the classic
local-agent pitfalls, a doc-vault index that can't lie fresh, two Claude Code
enforcement hooks, clipboard-only secret injection, and the verification
discipline that makes "done" mean done.

Everything is pure Python standard library + bash. $0 to run, nothing phones
home, no daemons.

## Your first win in 3 steps (~15 minutes)

1. **Install the engines:** `bash install/setup.sh` — copies the guard engines
   to `~/.guardrails/` and stages the two hooks into `~/.claude/hooks/`.
2. **Wire the hooks (one manual step, on purpose):** merge the two PreToolUse
   entries from `install/hooks/settings.hooks.example.json` into your
   `~/.claude/settings.json`. From then on, destructive commands warn before
   they run, and `/freeze` boundaries actually block.
3. **Fire the firewall once:**
   `printf 'my email is test@example.com and my key is FAKE' | ~/.guardrails/redaction-firewall/firewall.sh`
   — watch the PII come back scrubbed. Then skim `VERIFY.md` and run the rest
   of the checklist.

## What's inside (the one-line map)

- `payload/redaction-firewall/` — scrub secrets/PII/PHI from anything before it leaves a trust boundary; fail-closed
- `payload/local-agent-kit/` — six guards: fresh-date-per-call, resolve-IDs-before-execute, read-vs-act scope, irreversible-action lock, token hygiene, untrusted-input validation
- `payload/vault-index/` — thin master index + drift validator + scrubbed append-only session log for your doc vault
- `payload/set-secret/` — clipboard-only secret injection: the value never touches chat, logs, or argv
- `payload/lib/` + `payload/blueprints/` — the shared pattern library and fuzzy matcher the engines import (bundled, never forked)
- `install/hooks/` — `destructive-command-guard.sh` (warns before rm -rf / force-push / hard reset / DROP TABLE) + `freeze-path-guard.sh` (enforces `/freeze` edit boundaries) + the settings example
- `install/claude-code/` + `install/codex/` — eight skills: the three engine guides plus `/guard`, `/freeze`, `/unfreeze`, `/set-secret`, `/verify-before-claiming`
- `examples/` — a worked overnight-run hardening walkthrough

## The one rule

Guards you didn't verify are decoration. Run `VERIFY.md` end to end once —
including watching the destructive-command hook actually block something —
before you trust an agent alone with your machine.
