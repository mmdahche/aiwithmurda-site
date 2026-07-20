# Changelog — MCP Builder Pack

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably.

## 1.0.1 — 2026-07-20 — Audit follow-up

- Added `install/setup.sh`: one-shot install of all four skills
  (`agent-action-space`, `mcp-server-build`, `mcp-server-patterns`,
  `regex-vs-llm`) into `$CLAUDE_CONFIG_DIR/skills/<name>/SKILL.md` with
  `--force` overwrite guard and Codex mirror into `.agents/skills/` when
  that root exists.
- README + store card clarified: the `changelog-query` worked example is a
  copy-build-run TypeScript walkthrough (source lives in
  `examples/changelog-mcp-walkthrough.md`, buyer compiles against
  `@modelcontextprotocol/sdk`); no pre-compiled artifact ships in the
  payload.

## 1.0.0 — 2026-07-14 — Launch edition

- `mcp-server-build` (original write-up): end-to-end build of an MCP server
  with the official TypeScript SDK — scaffold, Zod-schema tool definitions
  with load-bearing descriptions, resources vs tools, stdio vs Streamable
  HTTP, structured error surfaces, wiring into Claude Code
  (`claude mcp add` / `.mcp.json`) and generic clients, plus the
  iterate-with-the-agent loop that tunes descriptions until the picker
  fires. Ships a complete two-tool `changelog-query` worked example.
- `mcp-server-patterns` (original write-up): eight design rules —
  description-writing (the picker reads only descriptions), coarse tools
  beat chatty ones, pagination/truncation contracts, deterministic scripts
  behind tools, secrets via env not args, read-only vs mutating separation,
  versioning/deprecation etiquette, testing (Inspector + scripted stdio) —
  and the six failure modes to watch for.
- `agent-action-space` (original write-up): action-space design — fewer
  better tools, observation formatting as first-class, tool/skill/subagent
  decision, irreversible-action guarding, call-rate + success-rate
  measurement, and the quarterly action-space audit.
- `regex-vs-llm` (original write-up): the three-tier parsing framework —
  deterministic first, LLM only for genuine ambiguity, hybrid with a
  confidence gate; cost/latency/auditability tradeoffs; three worked
  examples (log parsing → pure regex; invoice extraction → hybrid;
  sentiment/intent → LLM with fixed labels).
- Both agent layouts (Claude Code + Codex) for all four skills.
- Worked example: the `changelog-query` server built end to end, including
  a description-tuning iteration where the agent initially picks
  `list_releases` for a version-specific question and one description edit
  moves the pick to `get_release_notes`.
