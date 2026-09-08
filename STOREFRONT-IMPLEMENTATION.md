# Personal Storefront Preview

Date: 2026-09-07
Status: implemented and locally verified; not pushed or deployed.

## Experience Delivered

- Homepage leads with a short AI with Murda introduction and Murad's real portrait, followed by Free Tools / Paid Packages / All Tools browsing. The free pack and three useful paid-tool examples precede the package comparison.
- Tools shop has searchable, task-filtered cards and detail pages for the 17 existing paid product folders. Each uses a plain-English job title, existing product name, three concrete inclusions, format, prerequisites, containing package, and billing. Individual folders are not sold separately.
- Free Starter Pack is counted as one free pack with three parts, never four separate giveaways. Each part has a literal excerpt and a deep link into the actual free-file preview. Search does not count the free pack when it is not a match.
- Access filters update the URL and support reload/back/forward. Paid mode shows three featured packages; free mode does not show paid catalog cards. Task filters and search apply to the paid-tool shelf, not the package prices.
- Featured Skill Authoring Kit, Verification & QA Pack, and Memory OS previews are short excerpts verified against local product files. The QA example is explicitly fictional. Other cards show three real filenames, not invented screenshots or fabricated results. No full paid payload is imported publicly.
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
- `node scripts/smoke-storefront.mjs`: 55 page/viewport layout checks at 360, 390, 768, 1440, and 1920 pixels; no horizontal or tested text overflow, missing images, or browser runtime errors. Also checks all 17 detail routes, package links, source-preview correspondence, real file paths, honest counts, and free/paid filter history.
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

## Reference-Based Iteration

Murad approved the recommendations from `STOREFRONT-REFERENCE-STUDY.md`. The September 7 follow-up changes presentation, not commerce: clearer names, smaller founder intro, literal previews, clear free/paid choices, and packages explained after individual jobs.

Public catalog metadata now lives in `src/data/storefrontCatalog.js`; it deliberately drops the old unconfigured standalone prices and marketing promises. Established product keys, payloads, backend routes, library, entitlements, and commercial terms are unchanged by this follow-up. Display headings are not formal Stripe product renames.

The earlier source-sanitization and fresh-install gates still apply. Limited preview verification establishes that the snippets and filenames exist, not that every shipped tool has passed a fresh buyer installation.
