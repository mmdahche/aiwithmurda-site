# Safe-Autonomy Guardrails

Run AI agents overnight without leaking a secret, deleting prod, or being lied
to about the work being done. This pack is the safety layer the author runs
behind his own autonomous overnight loop — promoted into customer-safe form:
fail-closed guards enforced in code and hooks, not just written in a doc.

## Who this is for

Anyone running Claude Code / Codex semi-autonomously on real code or data:
long unattended sessions, agents with shell access, local/small models driving
tools, or teams that want "the agent can't do X" to be mechanical instead of
aspirational.

## Time to first value

~15 minutes: install + wire two hooks + watch the firewall scrub and the
destructive-command guard block. Follow `00-START-HERE.md`.

## What's inside

| Piece | What it kills |
|---|---|
| `payload/redaction-firewall/` | secrets/PII/PHI leaking through logs, notifications, memory writes, dashboards — fail-closed scrubber + `--check` gate, 3 profiles |
| `payload/local-agent-kit/` | the six classic local-agent pitfalls: stale clock, hallucinated IDs, read-token acting, irreversible actions, token leakage, hostile input |
| `payload/vault-index/` | doc rot and secret-bearing session notes — derived freshness (can't lie green), drift validation, scrubbed append-only log |
| `payload/set-secret/` | API keys transiting chat/logs/argv — clipboard-only injection, shape validation, atomic 600-perm writes, last-4 echo only |
| `install/hooks/destructive-command-guard.sh` | `rm -rf`, force-push to protected branches, dirty hard resets, `git clean`, `DROP TABLE` running without a warning |
| `install/hooks/freeze-path-guard.sh` | the agent "helpfully" editing files outside the directory you scoped |
| 8 skills (`install/claude-code/`, `install/codex/`) | usage guides for the engines + `/guard`, `/freeze`, `/unfreeze`, `/set-secret`, `/verify-before-claiming` |

Everything is pure Python stdlib + bash: no pip installs, no network calls, no
daemons, cross-platform (hooks are Claude Code-specific; engines run anywhere).

## Setup

**Requirements:** Python 3.10+; Claude Code for the two hooks (engines and
skills work in any agent).

```bash
bash install/setup.sh          # engines → ~/.guardrails, hooks staged → ~/.claude/hooks
# then merge install/hooks/settings.hooks.example.json into ~/.claude/settings.json
```

The settings merge is deliberately manual — a safety pack that silently edits
your agent's settings would be its own violation.

Skills: copy the files from `install/claude-code/` into your skills/commands
folder (Codex: `install/codex/<name>/SKILL.md` → `.agents/skills/`).

## Design posture (read this before trusting any guard)

- **Fail-closed everywhere it matters.** The firewall, the kit guards, and the
  vault scrub raise/exit-2 on any doubt — content is dropped, actions blocked.
  The one deliberate exception: the freeze hook fails OPEN on malformed input
  so a broken guard can't brick your session — it is an accident-prevention
  boundary, not a security boundary.
- **Nothing echoes a secret.** Failures name pattern classes and actions,
  never values.
- **No exec/eval anywhere.** Test-enforced in the kit.
- **Static patterns have limits.** The firewall matches literal text — it does
  not catch base64/encoded blobs. It's a strong filter, not a guarantee.
- **Verification is part of the pack.** `/verify-before-claiming` is the
  behavioral layer: no completion claims without fresh evidence, and never
  trust a sub-agent's success report without reading its artifact.

## What this is NOT

- Not a sandbox and not a network firewall — pair with OS-level isolation and
  deny-by-default egress rules for a full posture.
- Not a bypass-permissions autopilot kit. The opposite: every dangerous
  capability here is deny-by-default and operator-opt-in.
- No income/outcome promises. It reduces specific classes of catastrophic
  mistakes; your agents' output quality is still yours.

## Support boundary

Digital product. Setup questions: murad@aiwithmurda.com. No custom
implementation included. See LICENSE for use terms.

## Lineage (honesty note)

The engines (`redaction-firewall`, `local-agent-kit`, `vault-index`, the
bundled pattern library and fuzzy matcher) and both hooks are the author's
original work, sanitized for customer use. Four skills are clean-room
adaptations of MIT-licensed methods with attribution preserved in each file's
Origin section: `/guard`, `/freeze`, `/unfreeze` (garrytan/gstack) and
`/verify-before-claiming` (obra/superpowers). `/set-secret` and the three
engine guides are original.
