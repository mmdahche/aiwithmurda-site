# VERIFY — The Three-Tier LLM Router

The checklist we ran before shipping. Re-run it yourself — steps 1-4 need no
API key and no network. Failures → murad@aiwithmurda.com with the step
number and your Node version.

## 1. Folder integrity

- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra).
- [ ] `LICENSE`, `CHANGELOG.md`, `README.md`, `00-START-HERE.md` present.
- [ ] `payload/memory/` contains only `.gitkeep` — the ledger starts EMPTY
      (shipping anyone's usage data would be a defect).

## 2. Environment + install

- [ ] `node --version` prints 18 or newer.
- [ ] `bash install/setup.sh` completes; `~/.router/` (or `$ROUTER_HOME`)
      contains `lib/`, `bin/`, `scripts/`, `test/`, `model-roles.json`,
      `.env.example`, and an empty `memory/`.

## 3. The shipped tests (offline, no keys)

```bash
cd ~/.router && node --test test/*.test.cjs
```

- [ ] 71 tests, 0 failures (router 21, redactor 25, confidence gate 25).

## 4. Routing logic without network

- [ ] With a temp `ROUTER_HOME` and no `.env`, a Node one-liner over
      `classifyTask` routes: `summarize` → cheap; `architectural_decision`
      → precision (the hard floor); `classify` → chat, normalized to cheap
      while local inference is disabled. (Exact commands in
      `00-START-HERE.md` step 3 and the test files.)
- [ ] `ask --help` exits 0 without any key present.

## 5. First live call (one free key)

- [ ] Groq key in `~/.router/.env` →
      `ask --purpose summarize "Summarize: water boils at 100C at sea level."`
      returns text with a tier banner showing the cheap tier.
- [ ] `~/.router/memory/tier-usage.jsonl` gained one row with purpose,
      tier, model, and latency.
- [ ] `node scripts/tier-usage-report.cjs` renders the ledger.

## 6. The floor holds

- [ ] With ONLY a Groq key configured,
      `ask --purpose architectural_decision "test"` refuses to demote: it
      attempts the precision tier and fails loudly about the missing
      Anthropic key rather than silently answering from the cheap tier.

## Shipping record

- Verified by: the build pipeline's manifest/count/secret-scan checks on
  every release build; 71/71 tests run at packaging time; the 3-purpose
  routing smoke run with no network and no personal config present.
- Clean-machine pass: v1.0.0 on macOS (Apple Silicon), Node 26. The same
  code routes the author's own overnight dispatch traffic.
