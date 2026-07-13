# The Three-Tier LLM Router

Stop burning precision-tier tokens on cheap-tier work. One function —
`ask({ prompt, purpose, flags })` — classifies every call and dispatches it
to the cheapest tier that can do the job correctly, cascades on failure,
scrubs egress fail-closed, enforces a rolling quota, and logs every decision
to a JSONL ledger you can audit. This is the actual router the author's
autonomous loop dispatches through — shipped as running code with its 71
tests, not as a markdown "system".

## Who this is for

Builders running agents at scale who feel the token bill: overnight loops,
subagent swarms, content pipelines, anything where 90% of calls are
summarize/classify/enrich work that a $0.0006/1k-token model handles fine —
and where the other 10% must never be cheaped out.

## The tier model

| Tier | Role | Provider (default) | When |
|---|---|---|---|
| 1 — chat | cheapest local | Ollama (opt-in via `LOCAL_OLLAMA_ENABLED`) | greetings, classify, label, reformat |
| 2 — cheap | the default worker | Groq | summarize, enrich, long-context analysis, codegen drafts |
| 2b — overflow | cheap overflow / deep reasoning | Fireworks | Groq quota overflow, or forced via `--deepseek` |
| 2c — fast lane | ultra-fast opt-in | Cerebras (`--flag cerebras`) | latency-critical cheap work |
| 3 — precision | the hard floor | Anthropic | architectural decisions, high-stakes review — never demoted |

Models per tier live in `model-roles.json` (your `$ROUTER_HOME` copy
overrides the bundled default; env vars override both). Change models by
editing a JSON file, not code.

## What's inside

| Piece | What it does |
|---|---|
| `lib/tiered-ask.cjs` | Classification (purpose taxonomy + flags), rolling-quota rerouting, tier cascade with downward fallback for non-hard-floor calls, fail-closed redaction before egress, JSONL decision log |
| `lib/*-client.cjs` | Groq / Fireworks / Cerebras / Ollama / Anthropic clients — env-keyed, timeout-guarded, reasoning-field quirks handled |
| `lib/redact.cjs` | The egress scrubber: secrets/PII patterns, fail-closed modes (`escalate` or `abort`) |
| `lib/confidence-gate.cjs` | Opt-in second check: hedged/low-confidence cheap-tier answers escalate instead of shipping |
| `lib/capacity-ledger.cjs` | Track spend/capacity across your subscription pools |
| `bin/ask.sh` | The CLI: `ask --purpose summarize "..."`, `--file`, `--json`, `--quiet`, force flags |
| `scripts/` | Usage + capacity reports over the ledger |
| `test/` | 71 tests (router, redactor, confidence gate) — offline, no installs, `node --test` |

Zero npm dependencies. Node 18+.

## Usage

```bash
ask --purpose summarize "Summarize: ..."          # → cheap tier
ask --purpose architectural_decision "Should..."  # → precision (hard floor)
ask --file notes.txt --purpose summarize          # file input
ask --deepseek "..."                              # force the overflow lane
```

```js
const { ask } = require(process.env.ROUTER_HOME + "/lib/tiered-ask.cjs");
const r = await ask({ prompt, purpose: "summarize" });
console.log(r.tier, r.model, r.text);
```

## The disciplines that ship with the code

- **Hard-floor purposes are never demoted** — quota pressure reroutes cheap
  work, never the calls that compound.
- **Fail-closed egress:** if the redactor can't scrub, the call escalates or
  aborts — it never sends un-scrubbed content to a cheap provider by accident.
- **Every decision is a ledger row:** purpose, classification, tier, model,
  latency, usage — your cost audit is a `scripts/tier-usage-report.cjs` away.
- **Sockets, not lock-in:** the Operator Cycle (this store's autonomous-loop
  product) dispatches through any CLI at `$ROUTER_CLI` — this router fits
  that socket exactly, but nothing here requires it.

## What this is NOT

- Not a proxy service and not a SaaS — it runs on your machine with your keys.
- Not a guarantee of model quality — it routes; the models are the providers'.
- No cost promises: savings depend on your mix. The ledger makes your actual
  mix measurable, which is the point.

## Support boundary

Digital product. Setup questions: murad@aiwithmurda.com. No custom routing
configuration included. See LICENSE for use terms.

## Lineage (honesty note)

Original work: the author's own production router, sanitized for customer
use (personal pools, machine paths, and stack integrations removed; behavior
and taxonomy preserved verbatim; the shipped tests are the originals).
