# Changelog — Safe-Autonomy Guardrails

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably.

## 1.0.0 — 2026-07-11 — Launch edition

- `redaction-firewall`: fail-closed egress scrubber over one canonical
  pattern library — `scrub`/`guard`/`find_secrets`/`is_clean` API, CLI filter
  + `--check` gate, three profiles (default / phi / secrets-only), exit-code
  contract (0/1/2), never echoes values.
- `local-agent-kit`: six fail-closed guards — date-per-call, resolve-IDs-
  before-execute (bundled fuzzy matcher), read-vs-act scope separation,
  irreversible-action lock (deny-by-default, operator allow-list), token
  hygiene (env-only load, masking, file-mode check), untrusted-input
  validation + deny-by-default allowlist. Library + CLI, no exec/eval.
- `vault-index`: master-index generator with derived freshness (FRESH /
  RECENT / STALE / UNDATED), drift validator (MISSING / ORPHANED / STALE /
  UNDATED, exit 1 on drift), scrubbed append-only session log, advisory
  Stop-hook snippet.
- `set-secret`: clipboard-only secret injection worker — vendor shape
  catalog, atomic write, chmod 600, single rolling .bak, last-4-chars echo.
- Claude Code hooks: `destructive-command-guard.sh` (warn-before rm -rf /
  force-push to protected branches / dirty hard reset / git clean / DROP
  TABLE) and `freeze-path-guard.sh` (session-scoped edit boundary), plus a
  copy-pasteable settings example.
- Eight skills in Claude Code + Codex layouts: three engine guides,
  `/guard`, `/freeze`, `/unfreeze`, `/set-secret`, `/verify-before-claiming`.
- Full test suites for all three engines, shipped and runnable (100 total:
  redaction-firewall 27 + local-agent-kit 50 + vault-index 23).
- Worked example: hardening an overnight agent run end-to-end.
