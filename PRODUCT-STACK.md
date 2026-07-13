# AI with Murda Product Stack

Last updated: 2026-07-10

## Locked Direction

Build the product funnel on `aiwithmurda.com` first.

This keeps the show, the scoreboard, checkout, and member delivery in one branded place. The public 60-day show remains separate from the paid Claude Code and Codex curriculum.

## Current Decisions

- Email provider: Resend.
- Checkout: Stripe on our own site, under the Backbone Solutions Stripe account.
- First paid floor price: $47.
- Product name: `The Future Proof Method`.
- Product subtitle: `Claude Code + Codex Starter System`.
- Second product: `New Wave Operator Bundle`.
- Second product route: `/live-builds`.
- Second product CTA command: `!builds`.
- Second product price: `$97` one-time bundle.
- Second product V1 state: checkout-enabled advanced skill, script, review, debug, deployment, and blueprint vault.
- Third product: `The Operator Toolkit` at `$297` one time plus `Operator System Updates` at `$30/month`.
- Third product initial Checkout total: `$327` for the permanent launch edition plus the first update month; then `$30/month` until canceled.
- Ownership rule: canceling updates revokes only future update files. The purchased launch-edition toolkit remains active.
- Delivery feel: premium Supabase-gated member hub, not a loose Google Drive folder.
- Stream angle: entertainment-first, streamer-style show; education happens through live proof, not classroom framing.
- Deadline: all core funnel pieces live before July 28, 2026.

## Platform Recommendation

### Resend

Use for:

- Build-log signup confirmation.
- Welcome email.
- Daily recap sends.
- Purchase receipts and access emails.
- Broadcasts and simple automations.

Reason:

- It already fits the developer-owned stack.
- It avoids bolting on a creator platform too early.
- It can support the first email list, transactional emails, and automation layer.

### Stripe

Use Stripe Checkout Sessions for:

- $47 first paid drop.
- $97 New Wave Operator Bundle.
- $297 Operator Toolkit launch edition plus its $30/month update channel in one transparent mixed cart.
- Later cohort applications or deposits.

Reason:

- Checkout Sessions are the cleanest fit for one-time digital products.
- Webhooks can grant access after payment.
- Buyers stay in the `aiwithmurda.com` flow.

Account boundary:

- AI with Murda payment objects must live under Backbone Solutions Stripe.
- Do not use Haas Badges & Emblems Stripe keys, products, prices, or webhooks for this funnel.
- If only Haas live keys are available, stop and get Backbone live credentials before production checkout.

### Member Hub

V1:

- `aiwithmurda.com/members`.
- Full Supabase Auth login from day one.
- Stripe checkout requires an active Supabase profile.
- Successful checkout grants a product entitlement to the authenticated profile.
- Modules and downloadable assets served from the site.
- Module run kits give each module a timebox, next move, commands or script, verification checkpoint, and stop rule.
- The build log turns finished module work into downloadable implementation receipts without adding another database dependency.
- Operator Toolkit members receive a focused Setup, System Files, Updates, and Billing workspace.
- Permanent toolkit and recurring update access use separate entitlements so cancellation cannot remove owned files.

V2:

- Account settings page.
- Entitlement audit/history.
- Cohort access groups.

### Kajabi

Defer.

Use only if:

- We need a full course player fast.
- The first product is already selling.
- The monthly cost is justified by conversion and reduced build time.

### Skool

Defer.

Use only if:

- The cohort/community becomes the main product.
- We want built-in community, calls, courses, and affiliate flow.

## First Product Name Board

Locked working name:

- `The Future Proof Method`

Subtitle:

- `Claude Code + Codex Starter System`

Other names to keep as alternates:

- New Wave Operator
- Internet Boom OS
- The Next Internet Kit
- Future Internet Method
- Wave One Operator

## Backend Build Requirements

Environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM=AI with Murda <murad@aiwithmurda.com>`
- `RESEND_SEGMENT_ID` preferred for subscriber capture
- `RESEND_AUDIENCE_ID` legacy fallback if the account still uses audiences
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_FUTURE_METHOD_PRICE_ID`
- `STRIPE_LIVE_BUILDS_PRICE_ID` configured to the persistent Backbone live `$97` Operator Bundle price; inline Checkout `price_data` remains a development fallback
- `STRIPE_OPERATOR_TOOLKIT_PRICE_ID` for the persistent Backbone `$297` one-time launch-edition price
- `STRIPE_OPERATOR_UPDATES_PRICE_ID` for the persistent Backbone `$30/month` recurring update price
- `STRIPE_PORTAL_CONFIGURATION_ID` for the update-subscription billing portal
- `SITE_URL=https://aiwithmurda.com`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

API endpoints:

- `POST /api/subscribe`
- `POST /api/checkout/future-proof-method`
- `POST /api/checkout/live-builds`
- `POST /api/checkout/operator-toolkit`
- `POST /api/checkout/operator-updates`
- `POST /api/billing/portal`
- `POST /api/stripe/webhook`
- `GET /api/me`
- `GET /api/access/session/:sessionId`

Access flow:

1. Visitor joins `/start`.
2. Visitor signs into `/members` with Supabase email and password; magic link remains a backup.
3. Visitor buys from `/kit` or `/members`.
4. Stripe redirects to `/members?session_id={CHECKOUT_SESSION_ID}`.
5. Server verifies paid Checkout Session.
6. Server grants `future_proof_method` entitlement.
7. Webhook sends access email through Resend.
8. Member hub unlocks product assets for that profile.

Second product flow:

1. Viewer lands on `/live-builds` from nav, `/kit`, `/tools`, or chat command `!builds`.
2. The compatibility route presents the New Wave Operator Bundle and can capture update-list interest through `/api/subscribe` with source `operator-bundle`.
3. Page explains the bundle: complete starter course, eight advanced skills, scripts, dual-agent review, debugging, deployment, blueprints, and client workflows.
4. Logged-in viewer can open Backbone Stripe checkout through `POST /api/checkout/live-builds`.
5. Stripe metadata keeps compatibility product key `new_wave_live_builds`; that entitlement also grants effective access to the starter course.
6. `STRIPE_LIVE_BUILDS_PRICE_ID` remains the compatibility environment variable; without it the server uses Stripe Checkout `price_data` at 9700 cents.
7. Active bundle buyers can switch between the guided starter course and the advanced Operator Vault inside `/members`.

Third product flow:

1. Viewer compares all three tiers at `/operator-toolkit`.
2. An authenticated profile opens a subscription-mode Checkout containing a `$297` one-time line and a `$30/month` recurring line.
3. Checkout states `$327 due today`; only the update line renews monthly.
4. Paid completion grants permanent `operator_toolkit` and recurring `operator_updates` entitlements.
5. Subscription webhooks keep the update entitlement synchronized for active, past-due, canceled, unpaid, and deleted states.
6. Cancellation or failed termination revokes `operator_updates` while preserving `operator_toolkit`.
7. The billing portal lets members update payment details, inspect invoices, and cancel future updates at period end.
8. Existing toolkit owners can restart only the `$30/month` update channel without repurchasing the toolkit.
9. Paid `subscription_cycle` invoices create idempotent `$30` purchase rows so recurring revenue reaches the dashboard without duplicating the initial `$327` Checkout.

Subscriber capture:

- `/api/subscribe` must persist every valid email to Supabase `subscribers` before attempting optional Resend email/contact work.
- Resend is a delivery layer; Supabase is the durable list of record.
- Reserved smoke-test domains such as `example.com` should not trigger outbound email sends.
- Admin audience visibility lives at `GET /api/admin/subscribers/summary`, guarded by `ADMIN_API_TOKEN`; it returns aggregate counts and source timestamps, not private email addresses.
- Subscriber welcome and purchase access emails should use branded HTML plus plain-text fallback from server-side templates.

Recovery rule:

- If Stripe redirects back before the entitlement is visible, `/members` must show a retryable access recovery state, not a dead-end error. The buyer can refresh the Stripe session check or reload the profile without leaving the member hub.

Gated assets:

- Future Proof Method assets are served through `GET /api/member-assets/future-proof-method/:assetKey`.
- The endpoint requires a valid Supabase session and either an active `future_proof_method` or bundle entitlement.
- Current assets: The Council — 5-Advisor Decision Engine (ZIP), Skill Authoring Kit (ZIP), Daily Operator Checklist, 60-Minute Quickstart, Install + Verify Pack, Dual-Agent Project Starter, Core Prompt Scripts, Starter Skill Pack, First Build Lab, Verification + Handoff Checklist, Troubleshooting Guide, Module Roadmap, Module Field Guide, Course Workbook, and Completion Kit.
- The Council and Skill Authoring Kit are store product folders under `products/`, zipped by `npm run assets:store` during prebuild after passing `npm run verify:products` (manifest-vs-disk, secret scan, forbidden-source scan). Product content changes go in `products/<slug>/`, never directly in `server/member-assets/`.
- `/store` is the public shelf: folder-per-product cards for every verified SKU (catalog data in `src/data/storeCatalog.js`), tier cross-links, and the free Operator Sampler. The sampler is a PUBLIC product folder zipped to `public/downloads/operator-sampler.zip` (no entitlement) and linked from the `/start` welcome email and signup confirmation. Standalone shelf Payment Links open at launch; until then cards route to the tier that includes each SKU.
- New Wave Operator Bundle assets use the compatibility endpoint `GET /api/member-assets/new-wave-live-builds/:assetKey`.
- The bundle endpoint requires a valid Supabase session and an active `new_wave_live_builds` entitlement.
- Current bundle assets: Safe-Autonomy Guardrails (ZIP, store product folder under `products/`), Verification & QA Pack (ZIP, store product folder), Operator Skill Vault, Advanced Prompt Scripts, Dual-Agent Review Loop, Debug Rescue System, Deployment Runbook, Reusable Project Blueprints, and Client Workflow Pack.
- Operator Toolkit permanent assets use `GET /api/member-assets/operator-toolkit/:assetKey` and require `operator_toolkit` access.
- The permanent library includes the three flagship store products as full ZIPs — The Three-Tier LLM Router (running code, 71 shipped tests), Memory OS, and The Operator Cycle (autonomous-operator-kit) — plus the 24-skill dual-layout ZIP, installation guide, command center, project instructions, dual-agent protocol, automation, design/QA, research/launch, client delivery, weekly review, and recovery systems.
- Recurring release assets use `GET /api/member-assets/operator-updates/:assetKey` and require an active `operator_updates` entitlement.
- The first update release includes four maintenance skills, a compatibility matrix, changelog, migration notes, verification receipt, and rollback guidance.
- `npm run assets:member` regenerates the Module Roadmap and Module Field Guide from `src/data/product.js` so module deliverables, proof questions, traps, action kits, and task lists do not drift.
- Member checklist progress is stored in Supabase `member_task_progress` and updated through `/api/member-progress/future-proof-method`.
- The member hub includes a local build-log receipt builder. It follows the active module route, includes progress and completed steps, previews the markdown, and downloads the receipt without adding another database dependency.

Admin operator workflows:

- Daily Log includes a Daily Run Sheet for the selected day: stream beat, proof target, chat CTA, and shutdown checklist.
- Daily Log includes a Daily Clip Packet for the selected day: three clip hooks, recap caption, follow-up line, and copy/manual-copy output.
- Settings includes a Manual Gate Runbook for the human-dependent launch gates: final stream links, OBS rehearsal, and real Backbone purchase test.
- Settings includes a Fake Stream Rehearsal runbook from `/api/stream/config`: live hub check, OBS overlays, command clicks, one proof-loop metric sync, and the money-path test.
- Settings includes a Stream Platform Setup deck from `/api/stream/config`: Twitch, YouTube, Kick, and the main room mapped to their Render env vars and proof checks.
- Settings includes a Stream Privacy Guard from `/api/stream/config`: OBS scene discipline, secret-screen blackout, clean browser profile, payment/admin blackout, and family boundary rules.
- Copy actions use clipboard when available and reveal manual-copy textareas when embedded browser permissions block clipboard writes.

Smoke test:

- Run `npm run smoke:launch` for the full prelaunch verification pass. It runs tracker, stream config, signup, and paid funnel checks in order.
- Run `npm run smoke:member-ui` against a local or deployed URL for password login, all three products, the 20-step curriculum, personalization, toolkit setup persistence, permanent files, updates, billing, desktop, and mobile journeys.
- Run `npm run smoke:operator-toolkit-ui` for public pricing disclosure, tier comparison, installation path, ownership language, checkout handoff, and responsive QA.
- Run `npm run smoke:operator-subscription` locally with the test webhook secret to prove grant, subscription storage, cancellation, permanent ownership, and update revocation.
- `npm run smoke:tracker` verifies `/live-builds` loads and the client bundle includes the second-product offer copy.
- `npm run smoke:stream` verifies the stream config includes `!builds` and the `/live-builds` destination.
- `npm run smoke:stream` also verifies the Fake Stream Rehearsal plan is exposed with OBS steps.
- `npm run smoke:stream` verifies the platform setup deck includes Twitch, YouTube, and main-room env mappings.
- `npm run smoke:stream` verifies the privacy guard includes secret-screen and payment-blackout rules.
- `npm run smoke:funnel` verifies `/api/checkout/live-builds` creates a `$97` Checkout Session with product key `new_wave_live_builds`.
- Run `npm run smoke:funnel` after deploying checkout or member-delivery changes. It creates a temporary Supabase user, verifies the `$47`, `$97`, and mixed `$327` Checkout objects, checks permanent and recurring asset gates, downloads entitled files, then expires sessions and deletes the test user.
- Run `npm run smoke:tracker` after deploying dashboard/tracker changes. It verifies public logs are readable, admin writes are blocked without the admin token, admin system status is readable with the token, and the deployed client bundle contains the admin run sheet, clip packet, and manual gate runbook.
- Run `npm run smoke:subscribe` after deploying signup changes. It posts a reserved test email to `/api/subscribe`, verifies the Supabase subscriber row, verifies the admin subscriber summary, then deletes the test row.
- Run `npm run sync:seed-logs` only for prelaunch/demo data. It pushes the bundled preview daily logs through the production admin endpoint.

Dashboard phase:

- Until launch, the public scoreboard must be visibly labeled as `Prelaunch preview`.
- Preview records can be useful for stress-testing the system, but public UI must not imply those numbers are live Day 1 results.
- Run `npm run baseline:launch` any time to inspect the clean Day 1 launch payload without changing production.
- Run `npm run baseline:launch:push` on launch day only. It uses admin replace mode to remove preview rows and leave the production dashboard at one clean Day 1 baseline row.

## July 28 Definition Of Done

- `/start` captures emails into Resend.
- Welcome email sends.
- `/kit` sells The Future Proof Method through Stripe test and live mode.
- `/members` requires Supabase login and unlocks after payment.
- `/operator-toolkit` sells the `$297` permanent system and `$30/month` updates with transparent mixed billing.
- Subscription cancellation preserves owned toolkit access and pauses only future update releases.
- Member modules include checklists, outputs, verification questions, traps, run kits, gated downloads, a build log, and first-build handoff export.
- Purchase email sends with access link.
- Live hub has stream embeds or direct watch links.
- Dashboard, overlay, admin daily run sheets, admin clip packets, manual gate runbook, and Day 0 baseline are ready.
- Every public CTA works on mobile.
