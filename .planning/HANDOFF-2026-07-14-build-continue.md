# HANDOFF — aiwithmurda.com Store Build (2026-07-14)

**Purpose:** Continue the audit + rebuild in a fresh session without re-reading the full transcript.  
**Repo:** `/Users/muhammad/ContentCreating/tools/60-day-command-center`  
**Remote:** `github.com/mmdahche/aiwithmurda-site` · branch `main`  
**Live:** `https://aiwithmurda.com` (Render `aiwithmurda-web`, Cloudflare DNS)  
**Launch target:** July 28, 2026 (prelaunch labeling stays until Murad removes it)

---

## One-line status

**Waves 0–3 + Wave 1 remainder + Wave 4 in progress.** 12 store SKUs through **`swarm-intake-protocol`**. **`founder-finance-pack`** — 13th store SKU (clean-room). Next: `proof-engine-kit` (needs live receipts), deferred studio packs, or standalone Payment Links when Murad adds Stripe fields.

---

## What Murad asked for (governing intent)

From `brands/aiwithmurda/CURSOR-REBUILD-PROMPT.md`:

1. **Audit** the existing aiwithmurda.com app (done → `AUDIT-REPORT.md`)
2. **Design** Murad's original multi-tier product ladder (done → `PRODUCT-LINE-SPEC.md`)
3. **Build incrementally** — value-ladder law: each tier stacks everything below + more; the $47 floor must over-deliver
4. **Never copy** Wassim/Sina content — form only; provenance checks on every SKU
5. **Do not break** money/auth/deploy paths; `npm run smoke:launch` is the launch gate

Murad directs wave order. When he says **"continue"**, keep building in the approved sequence — do not propose stopping unless blocked.

---

## Git state at handoff

```
HEAD: b58b82e — Rebuild the Operator Bundle page to the T.I.M.E.R. standard
Branch: main...origin/main (clean)
```

Recent commits (newest first):
- `b58b82e` — Bundle page T.I.M.E.R. rebuild
- `3f366c2` — Drop committed Python cache artifacts + `.gitignore`
- `5593f6f` — Wave 3: research engine + clean-room MCP pack
- `352eee2` — Fix operator toolkit smoke outcome count
- `b4483f2` — Protect the official follower baseline

---

## Waves completed

| Wave | What shipped | Sales page | Gate |
|------|--------------|------------|------|
| **0** | `council-decision-engine`, `skill-authoring-kit`, `daily-operator-checklist` → FPM assets | `/kit` → `src/pages/KitPage.jsx` (T.I.M.E.R.) | ✅ |
| **1** | `safe-autonomy-guardrails`, `verification-qa-pack`, free `operator-sampler` | `/store` → `src/pages/StorePage.jsx` | ✅ |
| **2** | `three-tier-llm-router`, `memory-os`, `autonomous-operator-kit` → Toolkit assets | (toolkit page not yet T.I.M.E.R.) | ✅ products only |
| **3** | `zero-dollar-research-engine`, `mcp-builder-pack` (clean-room) | `/store` shelf updated | ✅ committed, pushed, prod-smoked |

### Shipped product folders (`products/`)

```
autonomous-operator-kit
council-decision-engine
mcp-builder-pack
memory-os
operator-sampler          ← free, public zip
safe-autonomy-guardrails
skill-authoring-kit
three-tier-llm-router
verification-qa-pack
zero-dollar-research-engine
```

**Not built yet:** `claude-setup-audit-suite` (Wave 1 remainder), `browser-automation-studio`, `design-studio-pack`, `content-engine-pack`, `proof-engine-kit`, `retail-ops-ai-pack`, `founder-finance-pack`, `swarm-intake-protocol`, `operator-arsenal`.

**Dropped:** `operator-marketing-pack` (provenance — revisit as original playbook post-launch).

---

## Value ladder (current live mapping)

| Tier | Route | Price | Entitlement key | Standalone shelf value inside |
|------|-------|-------|-----------------|-------------------------------|
| Future Proof Method | `/kit` | $47 | `future_proof_method` | Council $29 + Skill Authoring $19 + course |
| Operator Bundle | `/live-builds` | $97 | `new_wave_live_builds` | + Guardrails $49 + QA Pack $29 (+ full FPM) |
| Operator Toolkit | `/operator-toolkit` | $297 + $30/mo | `operator_toolkit` + `operator_updates` | + Router $79 + Memory OS $99 + Operator Cycle $129 (+ all below) |
| Store shelf | `/store` | per-SKU | routed to parent tiers today | 9 sellable SKUs + free sampler |

Entitlement keys are **immutable** — never rename `future_proof_method`, `new_wave_live_builds`, `operator_toolkit`, `operator_updates`.

---

## NEXT TASK (start here in new session)

### 1. `/operator-toolkit` T.I.M.E.R. rebuild

**Why:** `/kit` and `/live-builds` are done. `/operator-toolkit` is still an inline ~160-line component inside `src/App.jsx` (~2620+) with the old layout pattern.

**Do:**
1. Read `src/pages/KitPage.jsx` and `src/pages/BundlePage.jsx` — these are the T.I.M.E.R. templates.
2. Extract `OperatorToolkitPage` + `OperatorToolkitCheckoutButton` from `App.jsx` into:
   - `src/pages/ToolkitPage.jsx`
   - `src/components/checkout/OperatorToolkitCheckoutButton.jsx`
3. Rebuild copy to T.I.M.E.R. sections:
   - **T** — Transformation (three flagship systems + 24 skills + dual-agent OS)
   - **I** — Investment ($327 today / $30/mo; honest arithmetic: Router $79 + Memory OS $99 + Cycle $129 = $307 standalone inside $297)
   - **M** — Mechanism (5-phase install path from `operatorToolkitPath`)
   - **E** — Evidence (71 router tests, prelaunch honesty, live site receipts)
   - **R** — Risk reversal (permanent ownership, cancel updates keep toolkit, billing FAQ)
4. **Preserve functional contracts exactly:**
   - Mixed checkout via `createOperatorToolkitCheckout`
   - Auth redirect to `/members?next=operator-toolkit`
   - Checkout cancel query param handling
   - All data from `src/data/operatorToolkit.js` — don't duplicate constants
5. Wire import in `App.jsx`, remove inline functions.
6. Update `scripts/smoke-tracker.mjs` if bundle strings change.
7. `npm run verify:products && npm run build && npm run smoke:launch`
8. Commit + push only when Murad asks.

**Do NOT change:** Stripe price IDs, entitlement keys, webhook logic, member panel (`OperatorToolkitMemberPanel` stays in App.jsx for now unless Murad asks to extract it).

---

## After toolkit page (approved order)

1. **Wave 1 remainder:** `claude-setup-audit-suite` → Bundle enrichment or shelf
2. **Wave 4 (provenance-gated):** `proof-engine-kit`, `retail-ops-ai-pack`, `swarm-intake-protocol`, `founder-finance-pack` — read sources first
3. **Deferred pending provenance reads:** `design-studio-pack`, `content-engine-pack`, `browser-automation-studio`
4. **Pre-launch honesty pass:** Mirror-style audit of entire store before marketing push

---

## Key files (read order for new session)

| File | Why |
|------|-----|
| `brands/aiwithmurda/CURSOR-REBUILD-PROMPT.md` | Master brief + hard rules |
| `PRODUCT-LINE-SPEC.md` | Full catalog, waves, flags, anti-copy protocol |
| `AUDIT-REPORT.md` | Phase 1 baseline |
| `src/pages/KitPage.jsx` | T.I.M.E.R. reference (entry tier) |
| `src/pages/BundlePage.jsx` | T.I.M.E.R. reference ($97 tier) |
| `src/data/operatorToolkit.js` | Toolkit copy/data source |
| `src/data/storeCatalog.js` | Store shelf cards |
| `src/App.jsx` | `OperatorToolkitPage` still inline ~L2620; routing ~L1679 |
| `scripts/verify-product-folder.mjs` | Product folder gate |
| `scripts/build-store-product-assets.mjs` | Zip builder |
| `scripts/smoke-launch.mjs` | Launch gate |

---

## Product folder standard (every new SKU)

```
<slug>/
  00-START-HERE.md  README.md  INDEX.md  LICENSE  CHANGELOG.md  VERIFY.md
  install/claude-code/  install/codex/
  payload/  examples/
```

Before any zip ships:
```bash
node scripts/verify-product-folder.mjs --write-index products/<slug>
npm run verify:products
npm run assets:store   # included in prebuild
```

Forbidden in shipped products: secrets, absolute user paths, `wassim`/`aiforsavages`/`gsd-` strings, GSD packages, Murad's personal SOUL/MEMORY/audit logs.

---

## Build / verify commands

```bash
cd /Users/muhammad/ContentCreating/tools/60-day-command-center

# Dev
npm run dev          # Vite on 127.0.0.1
npm run dev:api      # Express API on 8787

# Product pipeline
npm run verify:products
npm run assets:store
npm run build

# Gates
npm run smoke:launch          # full launch gate (prod by default)
SITE_URL=http://127.0.0.1:8787 npm run smoke:launch  # local

# Local server needs social encryption keys or Twitch smoke fails:
# SOCIAL_TOKEN_ENCRYPTION_KEY + SOCIAL_OAUTH_STATE_SECRET (openssl rand -hex 32)
```

---

## Componentization progress

**Extracted:**
- `src/pages/KitPage.jsx`
- `src/pages/BundlePage.jsx`
- `src/pages/StorePage.jsx`
- `src/components/checkout/CheckoutButton.jsx`
- `src/components/checkout/OperatorBundleCheckoutButton.jsx`

**Still in App.jsx monolith:**
- `OperatorToolkitPage` ← **next extract**
- `OperatorToolkitCheckoutButton` ← **next extract**
- `MembersPage`, `OperatorToolkitMemberPanel`, admin/control room, most route pages

`App.jsx` is still ~3K lines — continue extracting sales pages first, member panels later.

---

## Open flags (Murad decides — don't assume)

| Flag | Question | Default |
|------|----------|---------|
| F1 | FPM price | Keep $47 flat |
| F2 | Arsenal bundle $497 w/ toolkit entitlement | Recommended; not built |
| F3 | FPM includes skill-authoring-kit | Yes (shipped) |
| F4 | MIT vs commercial per SKU | Murad confirms before more Wave 4 |
| F5 | Free sampler skill | `verify-before-claiming` (shipped) |
| F6 | Standalone Payment Links on `/store` | Murad adds Stripe links per card — not wired yet |

---

## Human launch gates (Murad, not agent)

These block public sales push but not continued building:

1. **Real purchase test** — `/admin` → $2 test purchase with real Backbone Stripe card
2. **OBS overlay test** — `/overlay` inside actual OBS scene
3. **Stream URLs** — final embeds on `/live`
4. **Social OAuth** — production Render env for TikTok/Twitch/etc.
5. **Baseline reset** — `npm run baseline:launch:push` before July 28 promotion

---

## Known gotchas

1. **Mega-cycle firewall** — if commits block on "secret" filenames, check for stale `~/teamwork/.planning/mega-cycle/.cycle-active`
2. **Python cache** — never commit `__pycache__`/`*.pyc` (now in `.gitignore`)
3. **`verify-product-folder.mjs`** — has `isEntryModule` guard; safe to import from build script
4. **`~/courses` symlink** — points to external volume; may hang if drive asleep
5. **Prebuild runs all asset scripts** — product verify failures block deploy

---

## Paste this to start the new session

```
Read `.planning/HANDOFF-2026-07-14-build-continue.md` in the 60-day-command-center repo and continue the build.

Next task: rebuild `/operator-toolkit` to the T.I.M.E.R. standard — extract from App.jsx into ToolkitPage.jsx + OperatorToolkitCheckoutButton.jsx, following KitPage.jsx and BundlePage.jsx patterns. Preserve all checkout/auth/entitlement contracts. Run verify:products, build, smoke:launch. Do not commit until I say so.
```

---

## Transcript reference

Full prior session:  
`/Users/muhammad/.cursor/projects/Users-muhammad-ContentCreating/agent-transcripts/b7af2a86-c631-4678-9fe4-52529ec1ae08/b7af2a86-c631-4678-9fe4-52529ec1ae08.jsonl`

Search keywords: `wave 3`, `operator-toolkit`, `T.I.M.E.R.`, `verify-product-folder`, `mcp-builder`, `research-engine`, `provenance`.

---

*Handoff written 2026-07-14 · Wave 3 gate closed · Ready for toolkit page rebuild.*
