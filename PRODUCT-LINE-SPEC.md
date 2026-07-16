# PRODUCT-LINE-SPEC.md — Murad's Original Product Line

Date: 2026-07-11 · Phase 2 deliverable (spec only — nothing built yet)
Companion: `AUDIT-REPORT.md` (Phase 1) · This run builds ONLY the Starter Kit (§11, Wave 0) after this spec is approved.

---

## 1. Laws (non-negotiable, enforced on every SKU)

1. **Value-ladder law:** the more they pay, the more they get — every tier strictly stacks everything below it PLUS more. The cheapest tier must over-deliver so hard the buyer thinks *"if I got THIS for $47, imagine the bigger tiers."*
2. **Reference = FORM only.** Wassim/Sina/courses informed folder shape, tier naming, pricing psychology, and failure modes to beat. **Zero lines of their content port into any SKU.**
3. **Real receipts only.** No invented testimonials, revenue, or student counts. Prelaunch = say prelaunch. Every evidence claim in this spec is verified or marked `verify-at-packaging`.
4. **Honest counting.** Every pack states its exact verified file/skill count; `INDEX.md` must match disk reality (this is the #1 structural failure in both reference bundles — Murad passes what they fail).
5. **Product boundary (from `OPERATOR-TOOLKIT-ROADMAP.md`, extended):** never ship GSD packages (67 dirs), plugin-cache skills, licensed third-party material, private Backbone/client automation, credentials, customer data, machine-specific paths, or Murad's actual `SOUL.md`/`MEMORY.md`/audit logs. Patterns and templates ship; the personal instance never does.
6. **Entitlement keys are immutable.** The four live keys (`future_proof_method`, `new_wave_live_builds`, `operator_toolkit`, `operator_updates`) are never renamed or repurposed. All new SKU keys use the `sku_` prefix.

---

## 2. Honest inventory (what "273 skills" really is)

`~/.claude/skills/` contains 273 entries: ~131 native skill folders + 67 GSD folders (third-party, excluded) + command files, backups, templates. Plus ~45 command-style skills in `~/.claude/commands/`, runner infrastructure in `~/.claude/bin/` + `~/.claude/council/`, and real codebases (`~/router/`, the 60-day-command-center itself).

**Marketing rule:** never claim "273 skills for sale." The honest flex is stronger: *"my working library is 270+ skills; every pack you buy is a curated, verified, counted subset of the ones I actually run."*

**Provenance classes** (tagged per SKU below):
- **N** = native (Murad/Noor-authored)
- **CR** = clean-room adaptation of a documented pattern (MIT or acquired) — ships with an honest lineage note in its README
- **V** = verify provenance at packaging time before shipping

---

## 3. Catalog shape + the folder standard

**Catalog:** flat shelf of **18 micro-product folders + 1 everything-bundle**, cross-linked with the three live site tiers. One product = one self-contained folder = one zip. Tier taxonomy (adopted FORM): **Kit** (entry, flat assets) → **Pack** (counted skill collections) → **Engine/Studio** (running tools with code) → **OS/System** (frameworks) → **Arsenal** (everything bundle).

**Identical skeleton every time (the consistency IS the trust signal):**

```
<sku-slug>/
  00-START-HERE.md      # 1 page: what you bought, 3-step first win, where everything is
  README.md             # what it is, who it's for, time-to-first-value, per-OS setup
  INDEX.md              # manifest: EVERY file listed + total count + generation date
  LICENSE               # explicit per SKU (§9) — never ship a folder without one
  CHANGELOG.md          # v1.0.0 + date; makes "lifetime updates" provable
  VERIFY.md             # the buyer-rerunnable clean-machine checklist we ran before shipping
  install/
    claude-code/        # skills/commands in Claude Code layout
    codex/              # mirrored Codex layout (dual-layout discipline the Toolkit ZIPs already use)
  payload/              # the actual assets (code, prompts, templates, docs)
  examples/             # ≥1 sanitized real run/receipt from Murad's own usage
```

**Mandatory pre-ship verification pass** — `scripts/verify-product-folder.mjs` (built in Phase 3, reusing the secret-scanner + count-drift logic already in `scripts/build-operator-toolkit-assets.mjs`). Asserts: INDEX matches disk exactly (names + count); README file-table matches; LICENSE + CHANGELOG present; CHANGELOG top version matches INDEX date; no secret patterns; no `[Your Business]`-style placeholders; no forbidden-source strings (`gsd-`, plugin cache paths, wassim/sina filenames); every command quoted in a quick-start exists in `payload/`; quick-start runs on a clean machine (manual step, logged in VERIFY.md).

**Failure modes we explicitly beat** (found in the reference bundles): manifest count ≠ disk count; same SKU different payloads in different locations; README steps referencing files in a different product; single-file SKUs with no README/LICENSE; INDEX stub entries; placeholder branding left in deliverables; triplicated bloat; hollow free tier; fabricated income defaults; no refund policy.

---

## 4. Content-sourcing map (his, not theirs)

| Murad source | Verified location | Feeds SKUs |
|---|---|---|
| The Council infra | `~/.claude/commands/council.md`, `~/.claude/bin/council.sh`, `~/.claude/council/` (runner.py, 5 advisor prompts, reviewer prompt, 9 archived runs, A/B debrief) | #1 |
| M07 safety suite | skills `redaction-firewall`, `local-agent-kit`, `vault-index`, `health-console`; commands `guard`, `freeze`, `unfreeze`, `set-secret`, `verify-before-claiming` | #2 |
| Setup-audit trio | skills `audit-setup`, `context-budget`, `eval`, `skill-security-auditor` | #3 |
| 3-tier router (real code) | `~/router/` — 13 lib modules incl. `tiered-ask.cjs`, `model-roles.cjs`, provider clients, `redact.cjs`, `confidence-gate.cjs`, `capacity-ledger.cjs`; `noor-ask` CLI; `tier-usage.jsonl` logs | #4 |
| $0 research stack | skills `research`, `web-fetch`, `to-markdown`, `last30days` | #5 |
| Browser studio | skill `browser` | #6 |
| Marketing conductor + components | skill `marketing` + ~40 native component skills (`ads`, `copywriting`, `cro`, `emails`, `launch`, `pricing`, …) | #7 |
| Design studio | skills `atelier`, `design-md`, `taste-design`, `impeccable`/`ui-ux-pro-max` patterns (sanitized) | #8 |
| Content engine | skills `hooks-angles`, `content-humanizer`, `seedance-ugc-scriptwriter`, `trending-news-content`, `audio-overview`; command `youtube-faceless.md` | #9 |
| QA discipline | skills `click-path-audit`, `ai-regression-testing`; commands `verify-before-claiming`, `qa.md`, `qa-only.md`, `test-gap-detector.md` | #10 |
| Skill authoring | commands `skillify.md`, `write-a-skill.md`; skills `_TEMPLATE.md`, create-skill discipline | #11 |
| Noor OS glue (patterns only) | `SOUL.md`/`CLAUDE.md` addon pattern, boot ritual, memory-index system, commands `noor-handoff`, `noor-resume`, `noor-dispatch` → de-personalized templates | #12 |
| Mega-cycle loop | commands `mega-cycle`, `depth-check`, `cycle-brief`, `goal`, `evolve`, `schedule-task`; `~/.planning/mega-cycle/` contract+pitfalls templates; receipts: global loop at cycle 20 (652-line inner log), SuperMaxAi per-project loop C85+ (verify-at-packaging) | #13 |
| Swarm intake | skill `swarm-intake` | #14 |
| The proof engine itself | this repo's patterns: scoreboard schema, daily-log/receipt templates, OBS overlay pattern, prelaunch-labeling discipline, launch-gate smoke pattern | #15 |
| Backbone domain expertise | skills `inventory-demand-planning`, `returns-reverse-logistics` | #16 |
| Founder finance | skills `cfo-advisor`, `financial-analyst`, `saas-metrics-coach`, `investor-materials`, `investor-outreach`, `board-deck-builder` | #17 |
| Tool-builder patterns | skills `mcp-server-builder`, `mcp-server-patterns`, `agent-harness-construction`, `regex-vs-llm-structured-text` | #18 |
| 60-day receipts | scoreboard, `/day/:day` pages, mega-cycle logs, council run archive | Evidence layer for ALL sales pages |

---

## 5. THE CATALOG — 18 SKUs + 1 bundle

### Flat shelf list

| # | SKU (slug) | Tier name | Price | Prov. | Wave |
|---|---|---|---|---|---|
| 1 | `council-decision-engine` | Engine | $29 | N (companions CR-MIT) | **0 (this run)** |
| 2 | `safe-autonomy-guardrails` | Pack | $49 | N | 1 |
| 3 | `claude-setup-audit-suite` | Pack | $39 | N | 1 |
| 4 | `three-tier-llm-router` | Engine | $79 | N | 2 |
| 5 | `zero-dollar-research-engine` | Engine | $29 | N | 3 |
| 6 | `browser-automation-studio` | Studio | $39 | N | 3 |
| 7 | ~~`operator-marketing-pack`~~ | — | — | **DROPPED 2026-07-13** | — |
| 8 | `design-studio-pack` | Pack | $49 | **V — deferred pending per-component provenance** | 4 |
| 9 | `content-engine-pack` | Pack | $39 | **V — deferred; 2 components failed provenance 2026-07-13** | 4 |
| 10 | `verification-qa-pack` | Pack | $29 | N | 1 |
| 11 | `skill-authoring-kit` | Kit | $19 | N | **0 (this run)** |
| 12 | `memory-os` | OS | $99 | N | 2 |
| 13 | `autonomous-operator-kit` | System | $129 | CR (honesty note) | 2 |
| 14 | `swarm-intake-protocol` | Kit | $49 | N | 4 |
| 15 | `proof-engine-kit` | System | $99 | N | 4 |
| 16 | `retail-ops-ai-pack` | Pack | $59 | N | 4 |
| 17 | `founder-finance-pack` | Pack | $49 | V | 4 |
| 18 | `mcp-builder-pack` | Pack | $39 | V | 4 |
| B | `operator-arsenal` | Arsenal | $497 (flagged) | — | 4 |

Sum of parts: **$972**. Arsenal at $497 ≈ 49% off AND includes the Operator Toolkit entitlement (§7) so the ladder's strictly-more law holds above $297.

### Per-SKU specs

**#1 `council-decision-engine` — The Council: 5-Advisor Decision Engine — $29 — key `sku_council`**
*"Never make a big call solo again."* Five orthogonal advisors (Contrarian / First Principles / Expansionist / Outsider / Executor) run on separate free Groq models, an anonymized peer-review pass, then a fixed 7-section chairman synthesis — breaks AI yes-bias on real decisions in ~5 seconds, ~$0.
Inside: `council.sh` + `runner.py` + 5 advisor prompts + reviewer prompt + chairman synthesis template + question-framing template + auto-fire trigger rules + adversarial "doubt" mode + `/office-hours` (6 forcing questions) + `/grill` (Socratic plan interrogation) as companions + 1 sanitized example run. Buyer brings a free Groq API key (setup guide included).
Buyer: solo operators who make impulsive bets. Delivery: DEFAULT + ships inside FPM $47. Evidence: 9 archived multi-model runs + the multi-model-vs-personas A/B debrief. Lineage notes: council pattern lineage karpathy/llm-council, clean-room native; office-hours/grill are clean-room MIT adaptations (attribution in README). Highest differentiation × ease — the Starter Kit anchor.

**#2 `safe-autonomy-guardrails` — $49 — key `sku_safe_autonomy`**
*"Run AI agents overnight without leaking a secret, deleting prod, or lying that the work is done."*
Inside: `redaction-firewall` (fail-closed egress scrub) + `local-agent-kit` (irreversible-action guard, read-token vs act-token, deny-by-default, fresh-date injection) + `vault-index` (navigable doc vault + append-only session log) + `guard`/`freeze`/`unfreeze`/`set-secret` + `verify-before-claiming` + `health-console` (bonus). Pure stdlib, $0 to run.
Buyer: anyone running Claude Code/Codex semi-autonomously on real code/data. Delivery: DEFAULT + ships inside Bundle $97. Evidence: these are the exact guards Murad's own overnight loop runs behind. A security frame almost no AI seller ships — direct counter to the reference bundles' bypass-permissions footgun (which this catalog will never include).

**#3 `claude-setup-audit-suite` — $39 — key `sku_audit_suite` — SHIPPED Wave 1 remainder (2026-07-16)**
*"Find out what your Claude setup actually costs you — then prove your fixes didn't break it."*
Inside: `audit-setup` (deterministic collector → maturity tier + risk flags) + `context-budget` (token-burn audit across agents/skills/MCP/rules) + `eval` (regression-test your own config) + `skill-security-auditor` (vet third-party skills before install).
Buyer: power users with bloated/franken setups. Delivery: DEFAULT.

**#4 `three-tier-llm-router` — $79 — key `sku_router`**
*"Stop burning $75/M-token model calls on $0.0006 work."* The actual working router Murad's autonomous loop dispatches through — not a prompt doc.
Inside: sanitized `~/router` codebase (`tiered-ask.cjs`, `model-roles.cjs` single-source-of-truth, Groq/Fireworks/Ollama/Anthropic clients, `redact.cjs`, `confidence-gate.cjs`, `capacity-ledger.cjs`), `noor-ask`-style CLI, purpose taxonomy, hard-floor purposes pattern (never demote identity/architecture calls), JSONL usage ledger, dispatch-discipline doc.
Buyer: builders running agents at scale who feel the token bill. Delivery: DEFAULT + ships inside Toolkit $297. Evidence: his own `tier-usage.jsonl` stats, sanitized (verify-at-packaging). Honesty edge: the reference bundle sells a 1-file markdown "router"; this is running code with logs.

**#5 `zero-dollar-research-engine` — $29 — key `sku_research` — SHIPPED Wave 3 (2026-07-14)**
*"Ask the open web one question, get structured results from many free sources."*
Inside: `research` skill (multi-source aggregator, security gates) + `web-fetch` (curl-impersonate fast path, SSRF-guarded) + `to-markdown` (fail-closed doc converter). 158 shipped tests. `last30days` EXCLUDED at packaging: it is third-party (mvanhorn/last30days-skill, MIT) AND requires paid API keys — both disqualifying (§1.5 + the $0 pitch). The Guardrails firewall dependency became an optional seam (cross-sells #2). Buyer: anyone paying for research SaaS. Delivery: DEFAULT.

**#6 `browser-automation-studio` — $39 — key `sku_browser`**
*"Point your agent at any site: scrape it, test it, drive it."*
Inside: the `browser` studio skill — navigation/scrape/form/test flows, screenshot discipline, anti-rabbit-hole rules, blocker-reporting protocol. Buyer: operators automating web chores. Delivery: DEFAULT.

**#7 `operator-marketing-pack` — DROPPED 2026-07-13 (provenance)**
The packaging-time provenance check (§13) found the `/marketing` conductor and its ~40 component skills are `coreyhaines31/marketingskills v2.3.0` — third-party material, not Murad's to resell (spec §1.5 boundary; the original class-N tag was wrong). Murad's call: drop from the catalog; revisit post-launch as an ORIGINAL "operator marketing playbook" authoring project (his launches, his receipts, zero ported content). Key `sku_marketing` stays reserved.

**#8 `design-studio-pack` — $49 — key `sku_design`**
*"Ship interfaces that don't look like AI slop."*
Inside: atelier-derived customer-safe system — DESIGN.md brand-contract pattern + synthesis workflow (`design-md`), anti-AI-slop detector checklist, motion framework, typography/color calibration rules (`taste-design`), UI critique protocol. Buyer: builders whose apps look generic. Delivery: DEFAULT.

**#9 `content-engine-pack` — $39 — key `sku_content`**
*"Hooks, scripts, and humanized copy — without the fake-guru stink."*
Inside: `hooks-angles` + `content-humanizer` + `seedance-ugc-scriptwriter` + `trending-news-content` + `audio-overview` + faceless-channel workflow. **Ethics posture baked in:** no fabricated income hooks, no fake-persona defaults — the explicit inverse of the reference material's failure. Buyer: creators/operators feeding social channels. Delivery: DEFAULT.

**#10 `verification-qa-pack` — $29 — key `sku_verification`**
*"Make 'it works' mean something."*
Inside: `click-path-audit` (full state-sequence tracing per touchpoint) + `verify-before-claiming` + `ai-regression-testing` (sandbox-mode patterns, AI blind-spot catches) + `test-gap-detector` + qa/qa-only run protocols. Buyer: anyone whose agent says "done" when it isn't. Delivery: DEFAULT + ships inside Bundle $97.

**#11 `skill-authoring-kit` — $19 — key `sku_skill_authoring`**
*"Stop copying other people's skills. Mint your own."*
Inside: `skillify` + `write-a-skill` workflows, SKILL.md `_TEMPLATE`, trigger-description discipline, evals pattern, personal-vs-project placement guide, 2 worked examples (one Claude Code, one Codex). Buyer: beginners graduating from consuming to authoring. Delivery: DEFAULT + ships inside FPM $47 (recommended — flag F3). The tripwire SKU: cheapest item on the shelf, teaches the meta-skill that makes every other pack more valuable.

**#12 `memory-os` — "Give Your Claude a Soul" — $99 — key `sku_memory_os`**
*"Your AI stops forgetting who you are every morning."*
Inside (templates, NEVER Murad's instance): SOUL.md/CLAUDE.md addon pattern + boot ritual + slim memory-index system (clusters, always-on load-bearing set, correctness-not-age rule) + daily-notes → curated MEMORY.md rhythm + handoff/resume/dispatch command templates (de-personalized from `noor-handoff`/`noor-resume`/`noor-dispatch`) + heartbeat/proactive-check pattern + multi-project workspace-map pattern.
Buyer: power users losing context every session. Delivery: DEFAULT + ships inside Toolkit $297. The heart of how Murad actually works; de-personalization is the main packaging labor (medium ease, highest differentiation).

**#13 `autonomous-operator-kit` — $129 — key `sku_autonomous`**
*"Turn Claude Code into a persistent operator that ships one substantive thing per cycle overnight and schedules its own next wake-up."*
Inside: `mega-cycle` loop (contract + pitfalls templates, state.json schema, inner-log format, firewall/`.cycle-active` pattern) + depth ladder L1–L6 + anti-decay/diminishing-returns gates + dead-work blocklist + `depth-check` + `cycle-brief` + `goal` + `evolve` + `schedule-task` + counter-action discipline + dispatch-to-cheap-tier protocol (pairs with #4) + null-result honesty rules.
Buyer: ambitious solo builders who want compounding overnight progress. Delivery: DEFAULT + ships inside Toolkit $297. **Honesty note (required in copy):** the loop mechanism is a clean-room port Murad adapted; the moat is the Noor-stack integration (council, guardrails, router dispatch, receipts) and the logged results — global loop at cycle 20, SuperMaxAi per-project loop C85+ (verify-at-packaging). Recommended cross-sell: #2 guardrails ("don't run an overnight agent without a firewall").

**#14 `swarm-intake-protocol` — $49 — key `sku_swarm_intake`**
*"Make any project swarm-ready so parallel agents build the RIGHT thing the first time."*
Inside: `swarm-intake` — idea/brief/repo → intake package with collision-free routing, role splits, context contracts. Buyer: teams/solos running multiple agents in parallel. Delivery: DEFAULT. Wave 4 (mature alongside the Teamwork system).

**#15 `proof-engine-kit` — $99 — key `sku_proof_engine`**
*"The build-in-public command center running aiwithmurda.com — as a template."*
Inside: sanitized patterns from this repo — scoreboard data model, daily-log + receipt-page templates, OBS overlay pattern (transparent browser-source discipline), prelaunch-labeling system, launch-gate smoke-test pattern, baseline-reset workflow. Buyer: builders starting their own public sprint. Delivery: DEFAULT. Wave 4 — sell it after the 60-day run makes the live site itself the sales page.

**#16 `retail-ops-ai-pack` — $59 — key `sku_retail_ops`**
*"15-years-experience playbooks for demand planning and returns — as agent skills."*
Inside: `inventory-demand-planning` (forecasting, safety stock, replenishment, promo lift) + `returns-reverse-logistics` (RMA, disposition, fraud detection, warranty). Born from Backbone IMS domain work. Buyer: retail/e-com operators. Delivery: DEFAULT.

**#17 `founder-finance-pack` — $49 — key `sku_founder_finance`**
*"CFO-grade analysis without the CFO."*
Inside: `cfo-advisor` + `financial-analyst` + `saas-metrics-coach` + `investor-materials` + `investor-outreach` + `board-deck-builder`. Buyer: founders raising or reporting. Delivery: DEFAULT. **Provenance class V — confirm each skill is native before packaging.**

**#18 `mcp-builder-pack` — $39 — key `sku_mcp_builder` — SHIPPED Wave 3 (2026-07-14, clean-room)**
*"Build the tools your agent is missing."*
Provenance check found all four source skills were `origin: ECC` (third-party collection) — the pack was **written clean-room from scratch** (the four source files were never read): MCP server building with the official TS SDK (worked example compiled against SDK 1.29 under strict TS), server design patterns, agent action-space discipline, and the regex-vs-LLM parsing framework. Buyer: technical operators extending their stack. Delivery: DEFAULT.

**#B `operator-arsenal` — $497 (FLAGGED — see F2) — key `sku_arsenal`**
*"Every tool on the shelf, plus the full Operator Toolkit."*
= all 18 shelf SKUs ($972 sum) + the `operator_toolkit` entitlement + first month of `operator_updates`. Sits strictly above the $297 tier so the more-money-more-value law holds at the top. Delivery: UPGRADE (needs entitlement grants → existing checkout/webhook infra). Ship only after ≥6 shelf SKUs are live.

---

## 6. Ladder mapping (existing tiers ← catalog folders; no entitlement changes)

| Site tier (unchanged keys) | Ships these catalog folders inside | Added shelf value | Stacking story |
|---|---|---|---|
| **The Future Proof Method $47** (`future_proof_method`, `/kit`) | #1 council-decision-engine ($29) + #11 skill-authoring-kit ($19) + existing 5-module course + 12 assets | **$48** | The floor over-delivers: more standalone shelf value inside than the tier's own price — before the course even counts. **This run's build target (§11 Wave 0).** |
| **New Wave Operator Bundle $97** (`new_wave_live_builds`, `/live-builds`) | everything above + #2 safe-autonomy-guardrails ($49) + #10 verification-qa-pack ($29) + existing 7-asset vault | **+$78** for a $50 step | "The tier that makes your agent safe to trust." |
| **The Operator Toolkit $297 + $30/mo** (`operator_toolkit` + `operator_updates`, `/operator-toolkit`) | everything above + #12 memory-os ($99) + #13 autonomous-operator-kit ($129) + #4 three-tier-llm-router ($79) + existing 24-skill system + 11 assets + update channel | **+$307** for a $200 step | "The full operating system, permanently yours; updates optional." |
| **Operator Arsenal $497** (flagged) | all 18 shelf SKUs + toolkit entitlement | $972 sum-of-parts | The ceiling that makes $297 look reasonable. |

Every tier's added shelf value exceeds its price delta — the §1 law holds at every boundary, with honest arithmetic.

Tier-included copies are delivered through the existing member hub (UPGRADE path) as new gated assets on the EXISTING entitlement keys — no key changes, purely additive to the asset catalogs in `src/data/memberAssets.js`.

---

## 7. Pricing ladder summary

```
$0      Free rung (§10): /start build log + free working sampler skill
$19–29  Tripwires: skill-authoring-kit, council, research-engine, verification-qa
$39–49  Core packs: audit-suite, browser, content, mcp-builder, marketing, design, safe-autonomy, swarm-intake, founder-finance
$47     ── SITE TIER: Future Proof Method (course + 2 SKUs inside) ──
$59–79  Engines: retail-ops, three-tier-router
$97     ── SITE TIER: Operator Bundle (+2 SKUs inside) ──
$99–129 Flagships: memory-os, proof-engine-kit, autonomous-operator-kit
$297+30 ── SITE TIER: Operator Toolkit (+3 SKUs inside, update channel) ──
$497    Operator Arsenal (everything + toolkit) [flagged F2]
```

Psychology: the shelf lives in the impulse band (reference market clears at ~$60 one-time); site tiers carry the guided experience + member hub; flagships price the "this is his actual machinery" premium. All one-time except the existing $30/mo update channel (untouched).

---

## 8. Delivery tiers (per §6.4 of the rebuild brief)

| Mode | What | Applies to |
|---|---|---|
| **DEFAULT — Stripe Payment Link + email auto-delivery zip** (Backbone account; near-zero ops; no new DB/auth) | Static sales page on `/store`, Payment Link checkout, zip delivered by email + hosted download link | All 18 standalone shelf SKUs at launch |
| **UPGRADE — existing Supabase + Stripe + member hub** (extend, don't rebuild) | Gated assets on existing entitlement keys; new `sku_*` keys only when a SKU needs accounts/updates/keys | Tier-included copies (FPM/Bundle/Toolkit additions), `operator-arsenal`, any SKU later promoted into hub delivery |

Reserved `sku_*` entitlement keys (listed per SKU above) cost nothing now and prevent a future rename — they're registered in this spec, not in Stripe, until needed.

---

## 9. Licensing strategy (per-SKU, never ship without a LICENSE)

| License | SKUs | Rationale |
|---|---|---|
| **Commercial — personal/team use, no redistribution/resale** (default) | #1, #2, #3, #4, #7, #8, #9, #12, #13, #14, #15, #16, #17 | Protects the machinery; buyers use it, don't resell it |
| **MIT** (virality lever) | #5, #6, #10, #11, #18 | Generic-scaffolding SKUs where forks/shares spread the brand; MIT is the trust flex |
| Attribution notes required | #1 (office-hours/grill upstream MIT), #13 (clean-room port lineage) | Honesty law §1.3 |

Flag F4: Murad confirms the MIT set before Wave 1.

---

## 10. Free rung (the marketing engine — Sina's shape, inverted)

The reference free tier is a hollow scaffold (~75% stubs). Murad inverts it: **small and fully working.**

`operator-sampler` (free, delivered via `/start` email after signup): 1 genuinely working skill (`verify-before-claiming` — the on-brand one: *"make your AI prove it"*) + 1 core prompt script + the daily operator checklist + a README pointing at the shelf. Reaction target: *"the FREE one works this well?"* Zero new infra — it's an email attachment/link through the existing Resend flow.

---

## 11. Build order (waves) — Murad directs; this run = Wave 0 only

| Wave | Builds | Why first |
|---|---|---|
| **0 — THIS RUN (§9 of the rebuild brief)** | `council-decision-engine` + `skill-authoring-kit` folders (verification-passed) → into FPM's gated assets; `/kit` sales page rebuilt to T.I.M.E.R.; existing `future_proof_method` checkout untouched. **STOP after.** | The floor must over-deliver before anything else matters |
| 1 | `safe-autonomy-guardrails` + `verification-qa-pack` (Bundle enrichment) + `claude-setup-audit-suite`; first `/store` shelf + first Payment Links; `verify-product-folder.mjs`; free `operator-sampler` | Fast wins, high differentiation, enriches the $97 tier |
| 2 | `three-tier-llm-router` + `memory-os` + `autonomous-operator-kit` (Toolkit enrichment + flagship standalones) | The $297 tier becomes untouchable |
| 3 | Packs: marketing, design, content, research-engine, browser-studio, mcp-builder | Shelf width for the launch-window audience |
| 4 | proof-engine-kit, retail-ops, founder-finance, swarm-intake, `operator-arsenal` | Needs live receipts (proof-engine) / provenance checks / maturity |

Every wave: folder verification pass → `npm run build` → `npm run smoke:launch` → STOP gate.

---

## 12. Open flags for Murad (recommend, not decide)

- **F1 — FPM price:** keep $47 flat (default) vs Ladder A's $27-first-100 → $49 launch ramp.
- **F2 — Arsenal price/timing:** $497 including toolkit entitlement (default), vs $397 downloads-only, vs skip entirely this season.
- **F3 — What ships inside FPM:** council + skill-authoring-kit (default), or council only (keep skill-authoring as pure tripwire).
- **F4 — MIT set:** confirm which SKUs get MIT (§9 default list) vs all-commercial.
- **F5 — Free sampler skill:** `verify-before-claiming` (default) vs a mini `project-map`.
- **F6 — SKU prices:** all prices above are recommendations inside the researched bands; adjust freely before Wave 1.

---

## 13. Anti-copy verification protocol (runs before ANY folder ships)

1. Every payload file traces to a §4 source path (native) or is newly written in Murad's voice.
2. `verify-product-folder.mjs` string-scan: no text traceable to `~/Downloads/wassim-system/`, `~/Sina/`, `~/courses/`, or GSD/plugin paths.
3. CR-class SKUs carry their lineage note in README (council pattern lineage, mega-cycle port, office-hours/grill MIT upstreams).
4. Receipts quoted in sales copy exist on disk (council runs, mega-cycle logs, tier-usage ledger) or the copy says "prelaunch — proof accumulating."
5. If in doubt: rewrite from Murad's own material. Zero lines ported.

— END OF SPEC —
