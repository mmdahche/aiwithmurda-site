# START HERE — The Three-Tier LLM Router

You bought working code, not a prompt doc: the classify-and-dispatch router
the author's own autonomous loop sends its heavy generation through. Every
call lands on the cheapest tier that can do the job correctly — chat-class
work on a local model (opt-in), the bulk on cheap cloud inference, and a
hard floor that routes the calls that MATTER to the precision tier no matter
what the quota says.

## Your first routed call in 4 steps (~15 minutes)

1. **Install:** `bash install/setup.sh` — copies the router to `~/.router`
   (or `$ROUTER_HOME`) and puts `ask` on your PATH guidance. Node 18+ is the
   only requirement; there are zero npm dependencies.
2. **Add one key:** copy `~/.router/.env.example` → `~/.router/.env` and
   fill in ONE provider to start (a free Groq key covers the cheap tier —
   the router degrades gracefully when other tiers have no key).
3. **Prove the routing without spending anything:** the shipped tests run
   offline — `cd ~/.router && node --test test/*.test.cjs` → 71 tests, all
   pass, no network.
4. **Fire a real call:**
   `ask --purpose summarize "Summarize: the Apollo program, one paragraph."`
   Watch the tier banner: it went to the cheap tier, and the call was logged
   to `~/.router/memory/tier-usage.jsonl` — your cost ledger from call one.

## Where everything is

- `payload/lib/tiered-ask.cjs` — the router: classification, quota, cascade, redaction, logging
- `payload/lib/` — provider clients (Groq, Fireworks, Cerebras, Ollama, Anthropic), the fail-closed egress redactor, the confidence gate, the capacity ledger
- `payload/model-roles.json` — the tier→model map (bundled default; your copy at `$ROUTER_HOME/model-roles.json` wins)
- `payload/bin/ask.sh` — the CLI
- `payload/scripts/` — usage + capacity reports over the JSONL ledger
- `payload/test/` — 71 tests, runnable offline, shipped on purpose
- `payload/.env.example` — every key and knob, placeholders only
- `examples/dispatch-and-ledger-walkthrough.md` — one cheap-tier call, one hard-floored call, and the JSONL ledger row each produces
- `VERIFY.md` — the checklist we ran; re-run it

## The one rule

The hard floor is sacred. Purposes like `architectural_decision` and
`high_stakes_review` always route to the precision tier — the router saves
money on the 90% so you never feel tempted to cheap out on the 10% that
compounds. Add your own hard-floor purposes before you tune anything else.
