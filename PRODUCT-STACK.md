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

## July 28 Definition Of Done

- `/start` captures emails into Resend.
- Welcome email sends.
- `/kit` sells The Future Proof Method through Stripe test and live mode.
- `/members` requires Supabase login and unlocks after payment.
- Purchase email sends with access link.
- Live hub has stream embeds or direct watch links.
- Dashboard, overlay, and Day 0 baseline are ready.
- Every public CTA works on mobile.
