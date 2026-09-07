# Personal Storefront Preview

Date: 2026-09-07
Status: implemented and locally verified; not pushed or deployed.

## Experience Delivered

- Homepage leads with AI with Murda, Murad's real portrait, a plain product description, and three existing purchase packages.
- Tools shop has searchable, filterable detail pages for the 17 existing paid product folders. Individual folders currently link to their containing packages; no unconfigured standalone checkout is advertised.
- About page uses the confirmed inventory-to-POS story. Streaming is optional history, not a customer requirement.
- Free Starter Pack has an interactive preview of the actual sampler files, a working public ZIP download, and an optional email signup.
- My Downloads is the default paid-member view, with a first guide, owned collections, search, pagination, and protected download actions. Existing course workspaces, module URLs, progress, and account access remain available.
- Public navigation is Tools, About Murad, Free Starter Pack, and My Downloads. The build log remains in the footer and at its existing URLs.
- Public sales pages no longer load campaign/follower feeds. Archive, admin, day pages, and overlays retain their existing data paths.
- Page titles, descriptions, social previews, canonical URLs, sitemap, and private-page indexing rules match the new routes. Build output includes per-route HTML head metadata, not server-rendered page bodies.

## Purchase Boundaries

The Future Proof Method remains $47 once. The New Wave Operator Bundle remains $97 once.

The current Operator Toolkit checkout remains $297 setup plus $30 for the first update month: $327 today, then $30/month until canceled. Cards, details, and FAQ disclose those terms. Making updates optional is not implemented or approved by this release.

Existing Backbone Solutions Stripe checkout functions, immutable entitlement keys, Supabase ownership, and protected asset delivery are reused. No payment provider, price ID, subscription, credential, or production account was changed. Haas is not involved.

The only server edit changes new bundle checkout returns from `/live-builds` to `/members`. Already-issued returns to `/live-builds?session_id=...` retain the old verification page. New selected-product links survive password login, signup confirmation, and email sign-in without accepting arbitrary return URLs.

Owned-product checks prevent an existing buyer from seeing a purchase action for a package they already have. Only server-approved entitlements enable downloads; public asset descriptions are not treated as proof of ownership.

## Verification

Passed on September 7:

- `./node_modules/.bin/vite build`
- `node scripts/postbuild.mjs`
- `node --check server/index.mjs`
- `npm run verify:products`: all 18 folders passed manifest, structure, executable flags, and configured content checks.
- `unzip -t public/downloads/operator-sampler.zip`: archive valid.
- Generated HTML title/canonical checks for every public route; member HTML is noindex.
- `node scripts/smoke-storefront.mjs`: 45 page/viewport layout checks at 360, 390, 768, 1440, and 1920 pixels; no horizontal or tested text overflow, missing images, or browser runtime errors.
- Browser interactions: real local free ZIP download, previews, FAQ, search/filter empty states, newsletter retry, safe login continuation, correct checkout endpoints, checkout retry, owned-product protection, entitled-only library, pagination, download retry, existing course access, mobile menu, and reduced motion.
- Payment-return UI contracts: unpaid payment and wrong-account responses retain a retryable session and never report a successful payment; a verified response opens the purchased library, and a page refresh does not replay the checkout callback.

Browser report and screenshots: `/private/tmp/aiwm-storefront-tests/`. These are temporary local artifacts, not repository deliverables.

Auth, member API, email submission, checkout, payment verification, and protected downloads were mocked in the new UI test. External requests are blocked. No real customer, card charge, email, entitlement, or production mutation was created. This verifies UI contracts, not live integration behavior.

Existing real-account smoke scripts were adjusted for the new member default and Toolkit page but were not executed. Product structure checks are not a substitute for installing each featured product in a fresh customer environment.

The production build still reports the existing large Three.js chunk warning; it is not a failed build.

## Preview

Local preview: `http://127.0.0.1:5173`.

To restart: `./node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort`.

The preview is frontend-only. Live member, email, and purchase actions require the configured backend and approved account setup. Do not expose credentials or connect a production-mutating backend just to make the local preview appear complete.

## Before Publishing

1. Murad reviews the homepage, About copy, offer presentation, and simplified downloads experience.
2. Fresh-install the featured packages and verify one meaningful customer result for each. Review dated provider requirements and included licenses.
3. Rehearse real account creation, confirmation/login/recovery, checkout cancellation, a deliberately approved purchase, receipt email, ownership, protected download, and existing-customer access. Verify webhook retry/idempotency and recurring cancellation through the existing integration tests.
4. Review the newsletter's existing welcome email against the new optional product-update positioning.
5. Decide separately whether to add standalone SKU purchases or an optional update subscription. Neither is silently included here.
6. Inspect all local commits before pushing. This branch was four commits ahead of origin before this implementation, with unrelated local changes in the Day 2 run sheet. Do not overwrite or stage that run-sheet work.
7. Deploy through Render only after approval and perform a production smoke check.

Streaming records, social connectors, OBS, and campaign dates are outside this release.
