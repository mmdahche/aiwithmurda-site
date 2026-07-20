# Changelog — The Three-Tier LLM Router

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably.

## 1.0.1 — 2026-07-20 — Audit follow-up

- Added `examples/dispatch-and-ledger-walkthrough.md`: one cheap-tier call
  (`summarize` → T2), one hard-floored call (`architectural_decision` → T3),
  the JSONL ledger row each one produces, and the last-N usage report — the
  peer-engine walkthrough the store audit flagged as missing.
- No code, test, or install-script changes; 71 shipped tests still pass
  offline against `node --test test/*.test.cjs`.

## 1.0.0 — 2026-07-13 — Launch edition

- The router (`lib/tiered-ask.cjs`): purpose-taxonomy classification, flag
  forcing (`cheap` / `deepseek` / `cerebras`), rolling-quota rerouting with
  hard-floor exemption, tier cascade (chat → cheap → overflow → precision)
  with guarded downward fallback, fail-closed egress redaction (`escalate` /
  `abort` modes), and the JSONL decision ledger.
- Five provider clients (Groq, Fireworks, Cerebras, Ollama opt-in,
  Anthropic) — env-keyed, timeout-guarded, reasoning-field quirks handled.
- `model-roles.json` two-level resolution: `$ROUTER_HOME` copy → bundled
  default; env overrides per tier.
- The egress redactor and the opt-in confidence gate (hedged cheap-tier
  answers escalate).
- Capacity ledger for subscription-pool tracking.
- `ask` CLI (`--purpose`, `--file`, `--json`, `--quiet`, force flags) +
  usage/capacity report scripts.
- 71 offline tests shipped (`node --test`), zero npm dependencies, Node 18+.
- `$ROUTER_HOME` relocation (default `~/.router`) with auto-created
  `memory/` ledger dir.
