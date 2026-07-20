# Worked Example — One Question, One Ledger Entry

A single pass through the router that shows what the CLI prints, where the
JSONL ledger row lands, and how the usage report renders it. Everything
below assumes you ran `bash install/setup.sh` and dropped one provider key
into `~/.router/.env` (a free Groq key is enough — the router degrades
gracefully when other tiers are unkeyed).

## The question

> "Summarize the Apollo program in one paragraph."

`summarize` is a Tier 2 purpose — the cheap-tier default. It is NOT a
hard-floor purpose, so the router will happily send it to the cheapest
tier that has a live key.

## Step 0 — Verify the install and prove the tests pass offline

```bash
export ROUTER_HOME="${ROUTER_HOME:-$HOME/.router}"
cd "$ROUTER_HOME"
node --test test/*.test.cjs
```

What you should see:

- Node's built-in test runner prints per-file results and a final `# pass
  71 # fail 0` line. All 71 tests are offline — no network calls, no
  provider keys required. If the count differs from 71 in your build, the
  ledger row below still applies; the point is that the harness passes.

## Step 1 — Look at the tier map before dispatching

```bash
cat "$ROUTER_HOME/model-roles.json" | node -e "
  let d=''; process.stdin.on('data', c=>d+=c); process.stdin.on('end', ()=>{
    const m = JSON.parse(d);
    for (const [tier, cfg] of Object.entries(m.tiers || m)) {
      console.log(tier, '→', cfg.provider || cfg.default_provider, cfg.model || cfg.default_model);
    }
  });"
```

What you should see:

- One line per tier: `T1 → ollama <chat model>`, `T2 → groq <cheap model>`,
  `T2b → fireworks <overflow model>`, `T3 → anthropic <precision model>`.
  The exact model names depend on your `model-roles.json` — the router
  reads yours first (`$ROUTER_HOME/model-roles.json`), then falls back to
  the bundled default under `payload/model-roles.json`.
- The tier the router picks below depends on which providers have keys
  in `~/.router/.env`. The walkthrough uses Groq (T2) as the assumed
  cheap tier.

## Step 2 — Dispatch a real cheap-tier call

```bash
ask --purpose summarize "Summarize the Apollo program in one paragraph."
```

What you should see:

- One tier banner on the first line: `[tier 2 | <groq-model-id> | NNNms]`,
  followed by `---`, followed by the paragraph the model returned.
- If Groq is rate-limited today, the router reroutes to Fireworks (T2b)
  and the banner reads `[tier 2b | <fireworks-model-id> | NNNms]`. Either
  way, the call finished — cheap-tier rerouting is silent by design.
- The call cost is bounded by the provider's cheap-tier pricing; no
  precision-tier tokens were burned on this paragraph. That is the entire
  point of the router.

## Step 3 — Dispatch a hard-floor call and watch it refuse the cheap tier

```bash
ask --purpose architectural_decision "Should our new agent stack use MCP tools or bespoke shell wrappers? Compare and recommend."
```

What you should see:

- Banner reads `[tier 3 | <anthropic-model-id> | NNNms]`. Even if T2 has
  headroom, the hard-floor purpose refuses demotion. If no Anthropic key
  is present, the router fails loudly rather than silently downgrading —
  that refusal is the guarantee you paid for.

## Step 4 — Inspect the ledger row that just landed

```bash
tail -n 1 "$ROUTER_HOME/memory/tier-usage.jsonl" | node -e "
  let d=''; process.stdin.on('data', c=>d+=c); process.stdin.on('end', ()=>{
    const r = JSON.parse(d);
    for (const k of ['ts','purpose','classified','tier','model','quota_routed_to','latency_ms','usage']) {
      console.log(k+':', JSON.stringify(r[k]));
    }
  });"
```

What you should see (fields that always appear):

- `ts`: ISO timestamp of the call.
- `purpose`: what you sent in (e.g. `"summarize"`).
- `classified`: what the router classified the call as after taxonomy
  matching (equal to `purpose` for explicit calls; auto-classified when
  you omit `--purpose`).
- `tier`: the tier the call actually hit (`"2"` for the summarize,
  `"3"` for the architectural decision, `"2b"` if quota-rerouted).
- `model`: the provider-specific model id served.
- `quota_routed_to`: usually `null`; populated if the rolling quota
  bumped the call to an overflow tier.
- `latency_ms`: end-to-end call latency including client construction.
- `usage`: provider-reported token accounting (prompt / completion /
  total). Present when the provider returned it; absent if the provider
  returned no usage block (e.g. some Ollama builds).

## Step 5 — Render the last-N distribution report

```bash
node "$ROUTER_HOME/scripts/tier-usage-report.cjs" 20
```

What you should see:

- A per-tier distribution table over the last N ledger rows: count, share,
  average latency, average tokens. After only two calls it will show one
  row for T2 (or T2b) and one row for T3 — that's your evidence the
  precision floor holds while the bulk of your traffic stays cheap.
- If a tier appears in the distribution that you didn't intend to use
  (e.g. `t3` share > 10%), that's the ledger telling you your purpose
  taxonomy needs a tune. Editing which purposes hard-floor is a
  `model-roles.json` change, not a code change.

## What the pipeline just gave you

- Two real calls: one cheap-tier (`summarize` → T2), one hard-floored
  (`architectural_decision` → T3). Neither call could accidentally end up
  on the wrong tier.
- One JSONL ledger row per call, with the tier, model, latency, and
  token usage attached — your cost audit trail from call one, not later.
- One distribution report over the last N rows — the honest answer to
  "am I actually saving money?" is one command away.
- Zero paid research SaaS, zero proxy layer, zero lock-in: your keys,
  your machine, your ledger.

## Two follow-ons worth trying

1. **Force the overflow lane.** `ask --deepseek "…"` sends the call
   straight to Fireworks regardless of Groq quota — useful when you want
   the deep-reasoning model on a cheap-tier task. The ledger row records
   `tier: "2b"` and `quota_routed_to: null` (forced, not rerouted).
2. **Add your own hard-floor purpose.** Edit
   `$ROUTER_HOME/model-roles.json` — add a purpose name to the tier 3
   allow-list, save, rerun `ask --purpose <yours> "…"`. No restart
   needed; the router re-reads the map per call.
