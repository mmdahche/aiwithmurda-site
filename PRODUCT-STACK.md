# AI with Murda Product Stack

Last updated: 2026-06-28

## Locked Direction

Build the product funnel on `aiwithmurda.com` first.

This keeps the show, the scoreboard, checkout, and member delivery in one branded place. Kajabi and Skool stay in the parking lot until the first paid offer and first live-build event prove demand.

## Current Decisions

- Email provider: Resend.
- Checkout: Stripe on our own site, under the Backbone Solutions Stripe account.
- First paid floor price: $47.
- Product name: `The Future Proof Method`.
- Product subtitle: `New Wave Operator Kit`.
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
- Future workshop/live-build event tickets.
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

V2:

- Account settings page.
- Entitlement audit/history.
- Replay library and cohort access groups.

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

- `New Wave Operator Kit`

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
- `SITE_URL=https://aiwithmurda.com`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

API endpoints:

- `POST /api/subscribe`
- `POST /api/checkout/future-proof-method`
- `POST /api/stripe/webhook`
- `GET /api/me`
- `GET /api/access/session/:sessionId`

Access flow:

1. Visitor joins `/start`.
2. Visitor signs into `/members` with Supabase magic link.
3. Visitor buys from `/kit` or `/members`.
4. Stripe redirects to `/members?session_id={CHECKOUT_SESSION_ID}`.
5. Server verifies paid Checkout Session.
6. Server grants `future_proof_method` entitlement.
7. Webhook sends access email through Resend.
8. Member hub unlocks product assets for that profile.

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
- The endpoint requires a valid Supabase session and an active `future_proof_method` entitlement.
- Current assets: Quickstart Map, Daily Operator Checklist, Prompt Workflow Pack, and Proof Receipts Template.

Smoke test:

- Run `npm run smoke:funnel` after deploying checkout or member-delivery changes. It creates a temporary Supabase user, creates a Stripe Checkout Session, confirms unpaid sessions return the retryable recovery guard, verifies assets are blocked before entitlement, grants a temporary entitlement, downloads a gated asset, then expires the session and deletes the test user.
- Run `npm run smoke:tracker` after deploying dashboard/tracker changes. It verifies public logs are readable, admin writes are blocked without the admin token, and admin system status is readable with the token.
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
- Purchase email sends with access link.
- Live hub has stream embeds or direct watch links.
- Dashboard, overlay, and Day 0 baseline are ready.
- Every public CTA works on mobile.
