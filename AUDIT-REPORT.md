# AUDIT-REPORT.md — aiwithmurda.com / 60-day-command-center

Date: 2026-07-10 · Phase 1 deliverable (read-only audit; nothing was edited, executed, or deployed)
Auditor: Fable 5 (Cursor) · Repo: `mmdahche/aiwithmurda-site` @ `main` (`ee56824`, working tree clean)

---

## 1. State of the app

`aiwithmurda.com` is a live, deployed, revenue-plumbed Vite 7 + React 19 SPA served by a single Express 5 server on Render (`aiwithmurda-web`, Node 22) behind Cloudflare DNS, in **prelaunch** toward a **July 28, 2026** launch. It is one app wearing two hats: (a) a public entertainment-first "proof engine" for Murad's 60-day AI-operator sprint (home with a Three.js 60-day route scene, `/60` scoreboard, `/live` hub, `/tools`, `/start` capture, `/day/:day` receipts, transparent OBS overlays), and (b) a paid funnel with a Supabase-gated member hub delivering a fully shipped three-tier product ladder ($47 / $97 / $297+$30-mo) through Backbone Solutions Stripe, Resend email, and 33 gated member assets. All public surfaces carry "Prelaunch preview" labeling over rehearsal seed data; the verified social-metrics system deliberately never falls back to that seed data. The launch gate `npm run smoke:launch` (tracker → deck → stream → subscribe → funnel) plus four deeper Playwright/webhook smokes exist and were green at the last verified commits per `memory/`.

---

## 2. Offer-ladder reconciliation (Ladder A docs vs Ladder B code)

Two non-matching offer definitions exist. **Recommendation (not a decision — Murad calls it): Ladder B (code) is the source of truth for everything sellable today; Ladder A survives as (1) the funnel/upgrade-trigger logic, (2) the T.I.M.E.R. sales-page standard, and (3) the Workshop/Cohort/Sprint rungs kept as future high-ticket roadmap rows. Do not delete Ladder A docs; re-label them as roadmap + funnel playbook.**

| # | Ladder A rung (docs, 2026-06-28) | Ladder B / code reality (2026-07-10) | Status | Recommended disposition |
|---|--------------------------------|--------------------------------------|--------|------------------------|
| 0 | Free Build Log ($0) | `/start` email capture → Supabase `subscribers` + Resend welcome; daily receipts at `/day/:day` | **LIVE** (same job, evolved) | Ladder A doc `01` stays as the email-content spec |
| 1 | AI Operator Starter Kit ($27–$49) | **The Future Proof Method** — $47, route `/kit`, entitlement `future_proof_method` | **LIVE** (renamed + upgraded into a 5-module course with 12 gated assets) | Code wins. Ladder A's launch ramp ($27 first-100 → $49) is a live pricing question — flagged in §9 note below, default keep $47 |
| 2 | Vibe-Coding Workshop ($97–$197) | Not in code. The $97 slot is occupied by a different product: **New Wave Operator Bundle** (`/live-builds`, `new_wave_live_builds`) | **DOC-ONLY** | Keep as future live-event rung ("coming soon" row, no dead link) |
| 3 | Build-With-Me Cohort ($497–$997) | Not in code. An `offerStack` card "Implementation Sprint $2.5K+" exists with **no href** (`src/App.jsx` ~L217–221) | **DOC-ONLY** | Keep as roadmap row; wire the dead card to a waitlist or remove the card |
| 4 | AI Automation Sprint ($2k–$5k) | Not in code | **DOC-ONLY** | Keep as roadmap row (service tier) |
| — | *(no Ladder A equivalent)* | **The Operator Toolkit** $297 one-time + **Operator System Updates** $30/mo (`/operator-toolkit`, keys `operator_toolkit` + `operator_updates`, $327 mixed checkout) | **LIVE** | Ladder B's flagship; Ladder A never had this rung — it partially fills the Workshop/Cohort price gap |

Cosmetic inconsistency: the prelaunch rehearsal `seedLogs` narrative still tells the Ladder A story ("$49 offer", "workshop waitlist/checkout", days 5–12). Harmless — it is replaced wholesale by `baseline:launch:push` on launch day — but worth knowing it doesn't describe the shipped ladder.

---

## 3. Product-by-product status

| Product | Route | Entitlement key | Price | Status | Sales page state | Delivery state | Notes |
|---|---|---|---|---|---|---|---|
| Free Build Log | `/start` | — | $0 | **LIVE** | Capture page with prelaunch labeling | Supabase `subscribers` (durable) + Resend contact + branded welcome; reserved test domains skip sends | Admin aggregate summary endpoint; no private emails exposed |
| The Future Proof Method | `/kit` | `future_proof_method` | $47 | **LIVE** | Rebuilt 2026-07-10; module/outcome-structured; FAQ honestly disclaims outcomes | 12 gated assets, 20-task progress tracking, completion kit/certificate, 5-email onboarding sequence defined in `product.js` | `STRIPE_FUTURE_METHOD_PRICE_ID` with `price_data` $47 fallback. **Real live purchase test still pending (manual gate)** |
| New Wave Operator Bundle | `/live-builds` | `new_wave_live_builds` | $97 | **LIVE** | Rebuilt; positions as starter-course superset | 7 gated assets; entitlement also unlocks the starter course; product switcher in `/members` | Live Backbone Stripe product + $97 price provisioned 2026-07-10 (`stripe:operator-bundle` audits idempotently). Legacy key name kept deliberately for webhook/DB compatibility |
| The Operator Toolkit | `/operator-toolkit` | `operator_toolkit` (permanent) | $297 one-time | **LIVE** | Three-tier comparison page; billing transparency copy ($327 due today) | 11 permanent assets incl. 24-skill dual-layout ZIP (exists, git-tracked, regenerated on prebuild); Setup/System Files/Updates/Billing member views | Mixed subscription-mode checkout ($297 one-time line + $30/mo line). `memory/2026-07-10_operator-toolkit…md` says live Stripe products/prices/portal/6 webhook events configured + production-verified at $327; `LAUNCH-ROADMAP.md` still says "pending final production provisioning" — **stale doc vs memory; verify Render env IDs before launch** |
| Operator System Updates | (member Billing view) | `operator_updates` (recurring) | $30/mo | **LIVE** | N/A (sold inside toolkit checkout; standalone reactivation endpoint for owners) | 3 update-channel assets (v1.1.0 ZIP, compatibility matrix, changelog) | Lifecycle synced by 6 webhook event types; cancel revokes updates only — **never collapses into `operator_toolkit`** (standing rule) |
| Vibe-Coding Workshop | — | — | $97–197 | **MISSING** (doc-only) | None | None | Ladder A rung 3; future roadmap |
| Build-With-Me Cohort | — | — | $497–997 | **MISSING** (doc-only) | None (dead `offerStack` card, no href) | None | Ladder A rung 4; future roadmap |
| AI Automation Sprint | — | — | $2k–5k | **MISSING** (doc-only) | None | None | Ladder A rung 5; service tier |
| `/store` catalog + micro-product SKUs | — | — | — | **MISSING** | No `/store` route exists anywhere | None | Phase 3 build target per rebuild prompt |

---

## 4. Feature inventory

| Surface | Status | Evidence / notes |
|---|---|---|
| Public show (`/`, `/60`, `/live`, `/tools`, `/day/:day`) | **LIVE** | Redesigned (commit `1e9f9c9`); Three.js route scene lazy-loaded on `/` only; Playwright-verified desktop+mobile |
| Email capture + welcome (`/start`, `POST /api/subscribe`) | **LIVE** | Supabase durable list + Resend; smoke-covered |
| Member hub + auth (`/members`, `/members/module/:key`) | **LIVE** | Password + signup + magic-link recovery; checkout-recovery card; product switcher; 20-task progress; certificate |
| Checkout + webhooks (4 products + $2 test purchase) | **LIVE** | Checkout Sessions (Backbone Stripe only); raw-body signed webhook; 6 event types; `/api/access/session/:id` fallback grant |
| Gated asset delivery (4 endpoints) | **LIVE** | 33 files present (31 md + 2 ZIP, all git-tracked); allowlist catalog lookup — no user-supplied paths |
| Admin control room (`/admin`) | **LIVE** (one bug) | Dual auth: `ADMIN_API_TOKEN` for APIs + Supabase email allowlist for UI session. Bug: see Risk 2 |
| OBS overlays (`/overlay`, `/obs`, `/overlay/followers`, `/obs/followers`) | **LIVE in code / test PENDING** | Transparent body, 920px frames; SSE-fed; "OBS overlay tested in OBS" is an open manual gate |
| Verified social metrics + OAuth (5 platforms) | **HALF-BUILT (operationally)** | Full server infrastructure live (AES-256-GCM token vault, EventSub, SSE, snapshots); **zero accounts connected in production** — provider app credentials are deliberate human gates. X is server-creds-only (no OAuth flow) |
| SSE follower ticker | **LIVE** | `/api/followers/stream`, 15s refresh, single shared poll loop |
| Stream destinations/embeds on `/live` | **PLANNED** | Env contract documented (`STREAM_*`); URLs pending channel decision |
| Real live purchase test (Backbone live mode) | **PENDING** | Manual gate in admin runbook; `checkout/test-purchase` ($2) exists to support it |
| Toolkit production Stripe provisioning | **DONE per memory / stale-pending in roadmap** | Verify Render `STRIPE_OPERATOR_*` + portal config IDs before launch |
| Premium redesign of offer/member pages | **PLANNED** | Public `/`, `/60`, `/live` redesigned; offer pages + member hub still the older, denser system (`CLAUDE-DESIGN-REDESIGN-BRIEF.md` is the interim contract) |
| Legal + platform verification (`/terms`, `/privacy`, TikTok verification txt files) | **LIVE** | Not in the original must-keep route list — **add them to it** |
| Asset generation pipeline (`prebuild`) | **LIVE** | `src/data/*` → 4 generated md + 2 ZIPs; count-drift/secret-pattern/duplicate-slug validation built into the toolkit builder |
| Launch tooling | **LIVE** | `smoke:launch` gate + 4 deeper smokes; `baseline:launch` (dry) / `baseline:launch:push` (destructive, launch-day only) |

---

## 5. On-brand vs off-brand audit

Brand contract (`PRODUCT.md`): entertainment-first build-in-public proof engine; NOT generic AI-SaaS, NOT classroom; no income promises; real receipts only.

**Flags (ordered by severity):**

1. **Income promise on the homepage hero** — `src/components/public/ExperienceHero.jsx` L63: *"60 days to turn AI into real online income."* This is the one direct income-outcome promise found. The scoreboard framing ("$100K or 100K followers" as *Murad's own public goal*) is fine; "turn AI into real online income" addressed at the visitor is not. Recommend rewording to goal/witness framing (e.g. "watch me try to turn AI into $100K in 60 days — live, with receipts"). `/terms` already disclaims income guarantees — the hero shouldn't contradict its spirit.
2. **Rehearsal data reads as proof if labels are missed** — `seedLogs` (days 1–12) contains invented revenue/sales/buyer narratives ("First three paid buyers came from the email list", `productsSold: 147`). Mitigations are genuinely good: "Prelaunch preview" appears on 8+ surfaces (home, `/60` board + banner, `/live`, `/start`, overlay badge, seed config copy), social metrics never fall back to seed, and `baseline:launch:push` wipes it on launch day. Keep the labeling untouchable until launch; treat any surface that renders seed numbers without the label as a bug.
3. **"Course/classroom" vocabulary leaking onto public surfaces** — the 2026-07-10 rebuild deliberately made the *paid member experience* a curriculum (that's locked in `COURSE-REBUILD.md` — not a defect). But public copy like `/kit`'s *"Claude Code + Codex starter course · $47"* (App.jsx ~L2637) pulls the show's storefront toward classroom framing. Recommend public-facing nouns stay "system / method / kit / drop" and "course" stays inside the member hub. Counter-evidence that the voice is mostly right: `/start` says *"Daily receipts, no classroom fluff"*; `/kit` says *"A first-build path, not a pile of AI tutorials."*
4. **Stale trust-eroding fallback copy** — `CheckoutButton` fallback *"Checkout is not wired yet"* (App.jsx ~L4048). Checkout IS wired; if this ever renders (API hiccup) it reads as a broken store. Replace with an honest retry message in Phase 3.
5. **No fabricated testimonials, student counts, or revenue claims found.** FAQ answers actively refuse over-promising ("Will this build a full business for me? No."). This is the moat working — preserve it.

---

## 6. Componentization opportunity (plan only — NOT executed)

The monolith: `src/App.jsx` 8,004 lines (~70% of UI inline), `src/styles.css` 11,365 lines (single global sheet, organized by selector-prefix clusters: `.experience-*`, `.scoreboard-*`, `.member-*`, `.live-builds-*`, `.overlay-*`), `server/index.mjs` 4,718 lines. Routing is hand-rolled (`getRoute()` + a `knownRoute` switch; no router lib; links are full page loads). Four components are already extracted (`ExperienceHero`, `ProofRouteScene`, `Proofline`, `ControlRoom`) — but 4 of `ControlRoom`'s 5 exports are unused.

**Proposed extraction order (route-by-route, green `build` + `smoke:launch` between each step):**

| Step | Extract | From (approx App.jsx lines) | To | Why this order |
|---|---|---|---|---|
| 1 | Checkout buttons (4 variants) + `AuthPanel` | 3920–4092 | `src/components/checkout/`, `src/components/auth/` | Shared by every sales page; smallest blast radius |
| 2 | `StarterKitPage` (`/kit`) | 2630–2769 | `src/pages/KitPage.jsx` + `styles/kit.css` | **This run's §9 build target — extract it as part of the rebuild** |
| 3 | `OperatorBundlePage`, `OperatorToolkitPage` | 2771–2986, 3022–3179 | `src/pages/` | Sibling sales pages, same pattern |
| 4 | `CommandOverlay`, `FollowerOverlay` | 7413–7496 | `src/overlays/` | Small, self-contained, OBS-critical (dimensions/transparency locked) |
| 5 | `MembersPage` + member panels | 3212–3894 | `src/pages/members/` | Big but coherent |
| 6 | `MemberModules` (~1,075 LOC) + completion panel | 4175–5466 | `src/pages/members/workspace/` (per-tab subcomponents) | Largest single view |
| 7 | Public show pages (`PublicHome`, `PublicDashboard`, `DayReceiptPage`, `LiveHub`, `ToolsPage`, `StartPage`, `LegalPage`) | 1772–2628 | `src/pages/` | Recently redesigned; lower churn value |
| 8 | Admin (`Dashboard`, `DailyLog`, `DeckView`, `OverlayView`, `SettingsView` ~1,373 LOC) | 5477–7393 | `src/admin/` | Private surface; do last |
| 9 | Finish `ControlRoom` adoption or delete unused exports (`RouteHero`, `StatusRail`, `ProofStrip`, `MetricBoard`) + dead `PublicProofCard` (5468–5475) | — | — | Dead-code hygiene |

Shared state to lift into `src/lib/`: `getRoute`/route constants, entitlement helpers, checkout fns (already mostly in `lib/api.js`), formatters (7498–8004). CSS splits cleanly along the existing prefix clusters into per-page imports. **Server:** money/auth/deploy are reviewed-not-rewritten — recommend NOT decomposing `server/index.mjs` in Phase 3; if ever done, the webhook raw-body-before-`express.json()` ordering and the static→catch-all ordering are the two contracts that must survive.

A `/store` route (Phase 3) must also be added to `scripts/postbuild.mjs` (it copies `index.html` into a per-route dir for every known route + module path — a new route without a postbuild entry 404s on direct load).

---

## 7. Risk list (money / auth / deploy — what a rebuild could break)

1. **$2 test purchase grants a real entitlement.** `POST /api/checkout/test-purchase` tags `checkout_kind: live_test_purchase` but the webhook ignores that field — a paid $2 session grants `future_proof_method` (server ~L3610–3632). Acceptable for Murad's own launch-gate test; do not expose the button outside `/admin`, and consider a webhook guard later.
2. **Confirmed frontend bug:** `setTwitchIntegrationStatus/State/Message` are called in `updateAdminToken` (App.jsx L1091–1093) but declared nowhere → `ReferenceError` when the admin token is changed in Settings. Pre-existing; surfaced for Murad — fix belongs in Phase 3 scope (one-line state additions or removal of the three calls).
3. **Webhook route ordering is load-bearing.** Stripe + Twitch EventSub raw-body routes are registered before `express.json()` (~L3591, ~L3684 vs ~L3749). Any server edit that reorders middleware silently breaks signature verification.
4. **Destructive scripts point at production by default.** `baseline:launch:push` replaces ALL production daily logs; `sync:seed-logs` overwrites logs with seed data; `stripe:*  --apply` mutates the live Backbone Stripe catalog; `smoke:funnel` creates/deletes real Stripe sessions and Supabase users against `https://aiwithmurda.com`. None of these run in this audit; `baseline:launch:push` stays launch-day-only per standing rule.
5. **Entitlement keys are immutable contracts:** `future_proof_method`, `new_wave_live_builds`, `operator_toolkit`, `operator_updates`. Rename nothing; add only. The permanent/recurring split for the toolkit is a standing rule (cancellation must never remove $297 files).
6. **Env-doc drift on toolkit provisioning.** `LAUNCH-ROADMAP.md` says live toolkit Stripe provisioning is pending; `memory/2026-07-10_operator-toolkit…md` says it was completed and production-verified the same day. Verify `STRIPE_OPERATOR_TOOLKIT_PRICE_ID`, `STRIPE_OPERATOR_UPDATES_PRICE_ID`, `STRIPE_PORTAL_CONFIGURATION_ID` on Render before launch; also note `STRIPE_FUTURE_METHOD_PRICE_ID` silently falls back to inline `price_data` if unset.
7. **Generated files will eat hand edits.** `prebuild` regenerates `module-roadmap.md`, `module-field-guide.md`, `premium-course-workbook.md`, `course-completion-kit.md` + both ZIPs from `src/data/`. Content changes go in `src/data/*`, never in `server/member-assets/` directly.
8. **No 404s: unknown paths silently render the homepage** (App.jsx ~L1678). Any route moved in Phase 3 needs a real redirect, and the must-keep route list should now include `/operator-toolkit`, `/terms`, `/privacy`, and the four OAuth callback paths (`/api/integrations/{twitch,tiktok,instagram,youtube}/callback` are registered in provider apps — breaking them breaks reconnection).
9. **Single-instance assumptions.** SSE clients, follower cache, and poll timestamps are in-memory; Render scale-out or a server split would duplicate polling and drop tickers. Fine today; constraint to remember.
10. **`.secrets/` holds 21 live credential files** (Render env, Supabase keys, live Stripe, TikTok, Twitch). Gitignored; never print, commit, or copy into product folders. The toolkit ZIP builder already scans for secret patterns — keep that check green.
11. **No rate limiting or CORS config on the API.** Public endpoints (`/api/subscribe`, SSE) are open; acceptable prelaunch, revisit before heavy traffic.
12. **Minor UX debts:** `/members` missing from top nav (reachable only via CTAs); `offerStack` "Implementation Sprint" card and Tools "Live Build Events" card are dead ends; `?view=overlay` admin mode is undocumented.

---

## 8. Phase-2 readiness (reference paths verified)

| Source | Path | State |
|---|---|---|
| Wassim bundle | `~/Downloads/wassim-system/_extracted/` | ✅ 17 product folders present |
| Sina raw + analysis | `~/Sina/` + `~/.planning/research/attentionagent-analysis-2026-06-20/` | ✅ both present (6 skill zips, screenshots, INTEL-BRIEF/PAID-PACKAGE-ANALYSIS/OVERALL-SETUP-LEARNINGS) |
| Purchased courses | `~/courses` → `/Volumes/Storage/courses` | ⚠️ symlink resolves but the external volume responds very slowly (drive asleep). Wake/verify mount before Phase 2 study |
| Skill library | `~/.claude/skills/` | ✅ exactly 273 skills |
| Brand design contract | `~/.planning/ui-design/brands/aiwithmurda.md` | ❌ does not exist — `CLAUDE-DESIGN-REDESIGN-BRIEF.md` is the interim contract; run `/design-md` before heavy visual work in Phase 3 |
| Repo reference/memory dirs | `reference/` (1 concept PNG), `memory/` (5 internal architecture docs) | ✅ clean — no purchased/copied course material inside the repo |

**Pricing question queued for §9 (flag, not decision):** keep `/kit` at $47 flat, or adopt Ladder A's launch ramp ($27 first-100 → $49)? Default recommendation: keep $47 (it's live, Stripe-provisioned, and mid-band); the ramp is a launch-week marketing lever if Murad wants scarcity mechanics.

— END OF AUDIT —
