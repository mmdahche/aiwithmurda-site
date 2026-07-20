# Store Built-Out Audit — 2026-07-20

## Executive summary

The store is **substantially real**, not a marketing shell: all 18 `products/*` folders pass `npm run verify:products`, all 17 paid shelf SKUs zip to `server/member-assets/*.zip`, tier checkout routes exist, and Arsenal shelf downloads are wired in `server/index.mjs`. The main honesty gaps are **overstated test counts** on three engine SKUs (119 vs claimed 158, 100 vs 118, 16 vs 21), **“compiled worked example”** on MCP Builder (source-in-markdown, buyer compiles), and **six products missing `install/setup.sh`** despite the folder standard calling for it. No SKU audited qualifies as a pure SHELL; the worst cases are PARTIAL or FALSE-CLAIM on specific copy, not empty folders.

---

## Verdict table

| SKU | Verdict | Evidence | Gaps |
|-----|---------|----------|------|
| `council-decision-engine` | **BUILT** | 21 files; `runner.py` + `council.sh` + 5 advisors; verify PASS; zip built | Advisor prompts are short (14–17 lines) but orchestration is real |
| `skill-authoring-kit` | **BUILT** | 14 files; 5 payload docs + 2 worked examples; verify PASS | No `install/setup.sh` |
| `safe-autonomy-guardrails` | **PARTIAL** | 35 files; 3 Python modules + hooks; **100** `def test_` cases; verify PASS | Store/Bundle copy claims **118** tests; CHANGELOG arithmetic also off |
| `verification-qa-pack` | **BUILT** | 24 files; 6 skills (55–125 lines each); verify PASS | No `install/setup.sh` |
| `three-tier-llm-router` | **BUILT** | 27 files; `tiered-ask.cjs` (666 lines) + clients; **71** tests match claim; verify PASS | No `examples/` folder |
| `memory-os` | **BUILT** | 23 files; SOUL/MEMORY templates, boot ritual, handoff/resume/dispatch; verify PASS | No `install/setup.sh` |
| `autonomous-operator-kit` | **BUILT** | 31 files; `CYCLE-CONTRACT.md` (450 lines), bootstrap, 6 cycle commands; verify PASS | No `install/setup.sh` |
| `zero-dollar-research-engine` | **FALSE-CLAIM** | 38 files; 3 Python packages with real SSRF/security logic; verify PASS | **119** tests on disk vs **158** in store card + CHANGELOG (39+50+30, not 39+89+30) |
| `mcp-builder-pack` | **PARTIAL** | 18 files; 4 skills (219–408 lines); walkthrough example; verify PASS | Card says “compiled worked example” — TS lives in markdown blocks, buyer builds; no `setup.sh` |
| `claude-setup-audit-suite` | **BUILT** | 26 files; `audit-collect.py`, `run-evals.sh`, `skill_security_auditor.py`; 4 skills; verify PASS | “2 runnable scripts” undersells (3 runnable artifacts) |
| `retail-ops-ai-pack` | **BUILT** | 13 files; 2 domain skills; verify PASS | Small pack by design (2 skills only) |
| `swarm-intake-protocol` | **PARTIAL** | 45 files; 201-line skill + readiness gate + fixtures; verify PASS | **16** tests vs card/spec **21** |
| `founder-finance-pack` | **BUILT** | 25 files; 6 clean-room skills (60–75 lines); verify PASS | README provenance matches clean-room rewrite |
| `proof-engine-kit` | **BUILT** | 24 files; schemas, SQL, `lib/` (tracker + campaign), 4 runbooks, script templates; verify PASS | Script templates are `.template.mjs`, not drop-in runnable |
| `browser-automation-studio` | **BUILT** | 10 files; 101-line conductor skill; example walkthrough; verify PASS | Smallest shelf SKU (single skill) — thin but not hollow |
| `design-studio-pack` | **BUILT** | 19 files; 4 skills (80–110 lines); clean-room README; verify PASS | Spec had deferred provenance (Wave 4); now shipped |
| `content-engine-pack` | **BUILT** | 23 files; 5 skills (141–178 lines) + workflow template; verify PASS | Spec had deferred provenance; now shipped clean-room |
| `operator-sampler` (free) | **BUILT** | 10 files; 3 working payload files; public zip at `/downloads/operator-sampler.zip`; verify PASS | No `examples/` dir (acceptable for free tier) |

---

## Tier audit

### The Future Proof Method — $47 (`/kit`)

| Check | Result |
|-------|--------|
| Route in `App.jsx` knownRoute | ✅ `/kit` → `KitPage` |
| Checkout | ✅ `CheckoutButton` on KitPage |
| Member assets | ✅ `coreMemberAssets` = **15** items: 2 shelf zips (`council-decision-engine`, `skill-authoring-kit`) + 13 course/setup markdown assets |
| Shelf SKUs included | ✅ Both FPM shelf products on disk, verified, zipped |
| Download route | ✅ `/api/member-assets/future-proof-method/:assetKey` |

**Verdict: BUILT** — tier delivers real course vault + two verified shelf zips.

### New Wave Operator Bundle — $97 (`/live-builds`)

| Check | Result |
|-------|--------|
| Route | ✅ `/live-builds` → `BundlePage` |
| Checkout | ✅ `OperatorBundleCheckoutButton` |
| Member assets | ✅ `operatorBundleAssets` = **9** items: 2 shelf zips + 7 vault markdown assets |
| Shelf SKUs | ✅ `safe-autonomy-guardrails`, `verification-qa-pack` verified + zipped |
| Download route | ✅ `/api/member-assets/new-wave-live-builds/:assetKey` |

**Verdict: BUILT** — bundle enrichment SKUs are real; safe-autonomy test count in BundlePage copy (**118**) is overstated.

### The Operator Toolkit — $297 + $30/mo (`/operator-toolkit`)

| Check | Result |
|-------|--------|
| Route | ✅ `/operator-toolkit` → `ToolkitPage` |
| Checkout | ✅ `OperatorToolkitCheckoutButton` (mixed billing) |
| Member assets | ✅ `operatorToolkitAssets` = **14** items: 3 flagship zips + `operator-toolkit-skill-pack.zip` + 10 system markdown guides |
| 24 skills claim | ✅ Zip contains **24** unique Claude skills (48 `SKILL.md` with Codex mirror); build script validates exactly 24 with ≥4 steps each |
| Skill depth | ⚠️ Each generated toolkit skill ≈ **30 lines** — structured workflows, not stubs, but compact vs shelf SKUs |
| Download route | ✅ `/api/member-assets/operator-toolkit/:assetKey` |

**Verdict: BUILT** — “24 skills, 11+ assets” holds; toolkit skills are thinner than shelf pack skills by design.

### Operator Arsenal — $497 + $30/mo (`/operator-arsenal`)

| Check | Result |
|-------|--------|
| Route | ✅ `/operator-arsenal` → `ArsenalPage` |
| Checkout | ✅ `OperatorArsenalCheckoutButton`; smoke-funnel validates $497 session shape |
| Shelf asset map | ✅ `operatorArsenalShelfAssets` = `storeProducts.map(...)` → **17** entries, keys match product folders |
| Zips on disk | ✅ All 17 `{slug}.zip` present in `server/member-assets/` (dated 2026-07-16) |
| Download route | ✅ `/api/member-assets/operator-arsenal/:assetKey` gated on `sku_arsenal` |
| Includes toolkit | ✅ Copy + webhook grants toolkit entitlement (per smoke-funnel / server checkout) |

**Verdict: BUILT** — ceiling tier is wired end-to-end.

---

## Shelf SKU audit

### Catalog ↔ disk integrity

| Metric | Value |
|--------|-------|
| `storeProducts` entries | **17** |
| `products/` folders (paid + free) | **18** (+ `operator-sampler` free, not in `storeProducts`) |
| `STORE_PRODUCTS` in build script | **17** (matches paid shelf) |
| `operatorArsenalShelfAssets` count | **17** (1:1 with `storeProducts`) |
| `npm run verify:products` | **18/18 PASS**, zero failures |

### File-count claims vs `INDEX.md`

| SKU | Card `kind` | INDEX files | Match? |
|-----|-------------|-------------|--------|
| council-decision-engine | 21 files | 21 | ✅ |
| skill-authoring-kit | 14 files | 14 | ✅ |
| safe-autonomy-guardrails | 35 files | 35 | ✅ |
| verification-qa-pack | 24 files | 24 | ✅ |
| three-tier-llm-router | 27 files | 27 | ✅ |
| memory-os | 23 files | 23 | ✅ |
| autonomous-operator-kit | 31 files | 31 | ✅ |
| claude-setup-audit-suite | 26 files | 26 | ✅ |
| mcp-builder-pack | 4 skills + compiled example | 18 files | ⚠️ skills yes; “compiled” overstated |
| retail-ops-ai-pack | 2 skills | 13 files (2 skills + install) | ✅ |
| swarm-intake-protocol | skill + 21 tests | 45 files | ⚠️ tests overstated |
| founder-finance-pack | 6 skills | 25 files | ✅ |
| proof-engine-kit | schemas + runbooks + skill | 24 files | ✅ |
| browser-automation-studio | conductor skill | 10 files | ✅ |
| design-studio-pack | 4 skills | 19 files | ✅ |
| content-engine-pack | 5 skills | 23 files | ✅ |
| zero-dollar-research-engine | 158 tests (no file count) | 38 files | ⚠️ tests overstated |

### Skeleton compliance (manual audit beyond verify script)

| Requirement | Pass | Fail |
|-------------|------|------|
| 00-START-HERE, README, INDEX, LICENSE, CHANGELOG, VERIFY | 18/18 | — |
| `install/`, `payload/` | 18/18 | — |
| `install/setup.sh` present | 12/18 | **6 missing**: autonomous-operator-kit, mcp-builder-pack, memory-os, operator-sampler, skill-authoring-kit, verification-qa-pack |
| `examples/` non-trivial (≥1) | 16/18 | **2 missing**: operator-sampler (free), three-tier-llm-router |
| Executable `.sh` where present | All listed `.sh` in INDEX pass verify | — |

### Payload substance (skill sampling)

- **Not stubs:** content-engine (141–178 lines/skill), founder-finance (60–75), mcp-builder (219–408), autonomous-operator CYCLE-CONTRACT (450), proof-engine lib + runbooks, router running code.
- **Thin but real:** browser-automation (101 lines, single skill), council advisor prompts (14–17 lines each — prompts, not workflows).
- **Code + tests:** safe-autonomy, research engine, router, swarm readiness tests — real Python/JS, not placeholder test files.

---

## Pipeline integrity

| Component | Status |
|-----------|--------|
| `npm run verify:products` | ✅ All 18 folders PASS (2026-07-20 run) |
| `scripts/build-store-product-assets.mjs` | ✅ Builds 17 paid zips + refuses build on verify failure |
| `server/member-assets/*.zip` | ✅ 17 shelf zips present; sizes non-trivial (11KB–111KB) |
| `public/downloads/operator-sampler.zip` | ✅ Free tier zip built |
| `operatorArsenalShelfAssets` auto-map | ✅ 17 entries = `storeProducts.length` |
| Member download routes | ✅ FPM, Bundle, Toolkit, Updates, **Arsenal** routes in `server/index.mjs` |
| Prebuild hook | ✅ `prebuild` runs `assets:member`, `assets:toolkit`, `assets:store` |
| Smoke references | ✅ `smoke-funnel.mjs` checks Arsenal checkout + `shelfAssets.length >= 17` + `proof-engine-kit` key |

---

## False or overstated claims found

1. **`zero-dollar-research-engine` — “158 shipped tests”** (`storeCatalog.js`, CHANGELOG): **119** `def test_` on disk (research 39 + web-fetch 50 + to-markdown 30). CHANGELOG incorrectly splits web-fetch as 89.
2. **`safe-autonomy-guardrails` — “118 shipped tests”** (`storeCatalog.js`, `BundlePage.jsx`): **100** tests (firewall 27 + kit 50 + vault 23).
3. **`swarm-intake-protocol` — “21 tests”** (`storeCatalog.js`): **16** tests in `payload/tests/test_readiness_check.py`.
4. **`mcp-builder-pack` — “compiled worked example”** (`storeCatalog.js`): TypeScript for `changelog-query` is embedded in markdown; VERIFY instructs buyer to paste and compile — not pre-compiled in payload.
5. **`three-tier-llm-router` — “running code with logs”** (spec/marketing): BUILT as code, but **no `examples/`** walkthrough unlike peer engine SKUs.
6. **Standalone shelf checkout**: Store cards honestly say “standalone checkout at launch” and route to tiers or `/start` — **not a false claim** (correctly deferred).
7. **PRODUCT-LINE-SPEC vs disk**: `operator-marketing-pack` correctly **DROPPED** (not on disk). `design-studio-pack` and `content-engine-pack` were spec-**deferred** but are now **shipped** — spec status stale, product real.

---

## PRODUCT-LINE-SPEC.md vs reality

| Spec SKU | Spec status | On disk today | Notes |
|----------|-------------|---------------|-------|
| #1 council-decision-engine | Wave 0 | ✅ SHIPPED | Matches |
| #2 safe-autonomy-guardrails | Wave 1 | ✅ SHIPPED | Test count copy drift |
| #3 claude-setup-audit-suite | SHIPPED Wave 1 | ✅ SHIPPED | Matches |
| #4 three-tier-llm-router | Wave 2 | ✅ SHIPPED | Matches |
| #5 zero-dollar-research-engine | SHIPPED Wave 3 | ✅ SHIPPED | Test count drift |
| #6 browser-automation-studio | Wave 3 | ✅ SHIPPED | Matches |
| #7 operator-marketing-pack | **DROPPED** | ❌ Absent | Correct |
| #8 design-studio-pack | **Deferred** provenance | ✅ SHIPPED | Spec stale; clean-room README |
| #9 content-engine-pack | **Deferred** provenance | ✅ SHIPPED | Spec stale; clean-room README |
| #10 verification-qa-pack | Wave 1 | ✅ SHIPPED | Matches |
| #11 skill-authoring-kit | Wave 0 | ✅ SHIPPED | Matches |
| #12 memory-os | Wave 2 | ✅ SHIPPED | Matches |
| #13 autonomous-operator-kit | Wave 2 | ✅ SHIPPED | Matches |
| #14 swarm-intake-protocol | SHIPPED Wave 4 | ✅ SHIPPED | Test count drift |
| #15 proof-engine-kit | SHIPPED Wave 4 | ✅ SHIPPED | Matches |
| #16 retail-ops-ai-pack | SHIPPED Wave 4 | ✅ SHIPPED | Matches |
| #17 founder-finance-pack | SHIPPED Wave 4 | ✅ SHIPPED | Matches |
| #18 mcp-builder-pack | SHIPPED Wave 3 | ✅ SHIPPED | “Compiled” wording drift |
| #B operator-arsenal | Wave 4 flagged | ✅ LIVE | Checkout + downloads wired |
| Free `operator-sampler` | §10 | ✅ SHIPPED | Public zip |

**No spec item marked SHIPPED is missing from disk.** Two spec-**deferred** items (#8, #9) shipped anyway. One spec item (#7) correctly dropped.

---

## Recommended fixes (priority order)

1. **Fix test-count copy** — Re-run `pytest --collect-only` (or count `def test_`) and update `storeCatalog.js`, `BundlePage.jsx`, and affected CHANGELOGs for research (119), safe-autonomy (100), swarm (16). Highest trust impact.
2. **MCP Builder card copy** — Change “compiled worked example” → “complete TypeScript worked example (copy-build-run)” or add a pre-built `examples/changelog-mcp/` tree compiled in CI.
3. **Add missing `install/setup.sh`** to the six SKUs without it (memory-os, skill-authoring-kit, verification-qa-pack, autonomous-operator-kit, mcp-builder-pack; operator-sampler optional).
4. **Add `examples/` to `three-tier-llm-router`** — one sanitized dispatch + ledger walkthrough to match engine tier expectations.
5. **Refresh PRODUCT-LINE-SPEC.md** — Mark #8/#9 as shipped; note test-count verification discipline; confirm #7 dropped.
6. **Extend `verify-product-folder.mjs`** (optional) — Warn when `examples/` or `install/setup.sh` missing for paid SKUs to prevent skeleton drift.
7. **Proof-engine script templates** — Rename or document that `.template.mjs` files need adaptation (avoid “drop-in runnable” implication in sales copy if present).

---

*Audit method: `npm run verify:products`, INDEX vs `storeCatalog.js` grep, payload line-count sampling, `def test_` ripgrep counts, zip inventory, route/checkout/member-asset trace in `App.jsx`, `memberAssets.js`, `operatorArsenal.js`, `server/index.mjs`. No standalone Payment Links expected prelaunch — correctly absent.*
