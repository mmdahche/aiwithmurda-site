# AI with Murda: Personal Brand and Digital Product Store

Date: 2026-09-04
Status: discovery complete; proposed experience and implementation roadmap. No production changes in this pass.

## Direction From Murad

Murad has not streamed since the second day. The website should become an ongoing sales funnel where people learn about him and buy useful scripts, skills, and setup folders. Sales must not depend on a livestream schedule or completing the original 60-day challenge.

The challenge can remain part of his history. It no longer defines the homepage, navigation, customer journey, or product assignments.

## What Was Verified Today

- The public homepage, store, starter product page, and signed-out member page load in a fresh browser.
- The homepage still says "LIVE NOW" and "DAY 1 TRANSMITTING"; its main actions are Watch live and Inspect the scoreboard. These labels are based on campaign state, not evidence that Murad is broadcasting.
- The navigation has nine destinations plus a View score call to action. The member login is not a primary navigation item.
- The live store lists 17 paid folder products and a free Operator Sampler. Individual prices are visible, but standalone checkout is still advertised as opening at launch. Some cards lead to bundles; others lead to the signup page.
- All 18 local product folders pass the existing structural verification: required files, manifests, executable script flags, and the configured content checks. This does not prove a fresh customer installation works or that every dependency remains current.
- The backend has checkout, payment processing, protected asset delivery, and account entitlement code. Today's inspection did not run a new payment or authenticated download test.
- The Toolkit checkout currently collects $297 plus $30 for the first month and enrolls the buyer in recurring updates. Some store copy calls the updates optional, but the current checkout always includes them. Resolve that mismatch before promoting the refreshed offer; do not silently change existing subscribers.
- Current packages include real starting instructions, worked examples, install layouts, licenses, and verification guides. The Memory OS and Skill Authoring Kit are tangible products, not just names on a page.

Read-only browser evidence: `/private/tmp/aiwithmurda-current-home-20260904.png`.

## Positioning

AI with Murda is Murad's personal storefront for the practical AI workflows he uses to build software and organize work.

Proposed homepage copy:

> AI with Murda
>
> The scripts, skills, and project setups I use to build with Claude Code and Codex.
>
> I'm Murad, a business owner building tools with AI. I package the workflows I use into downloads you can try on your own projects, with examples and setup steps included.

Primary action: Browse the tools.
Secondary action: Try the free starter pack.

Lead with a concrete outcome for each product. For example, describe Memory OS as keeping project instructions and handoffs organized between sessions, rather than promising that an AI never forgets anything.

## Visitor Journey

Social post, direct link, or search -> learn who Murad is -> see a tool solve a recognizable problem -> inspect what is included -> buy -> sign in -> download -> complete the first useful task.

A visitor who is not ready to buy can try the existing free sampler. Email updates are an optional invitation with a stated purpose. Do not promise daily posts or a recurring release cadence that Murad has not committed to.

## Homepage, In Order

1. **Murad and the offer.** The AI with Murda name, a real photo or short introduction, the plain description above, and the two main actions. A hint of the first featured product remains visible below the opening section.
2. **Three featured offers.** A beginner setup, a focused workflow product such as Memory OS, and the broader toolkit. Exact inclusion and individual prices must agree with working checkout and delivery; this is a proposed merchandising selection, not a new price commitment.
3. **See a tool work.** A real, sanitized example with a short before/after or interactive folder preview. Show the actual file types, a useful sample, and the result. File count is supporting detail.
4. **Meet Murad.** The story of building business tools with AI, including the inventory-to-POS progression. Use confirmed personal facts; keep family details optional and avoid invented business outcomes.
5. **Try the free starter pack.** Show exactly what the existing sampler contains and its first action. Invite visitors to receive product updates.
6. **Purchase questions and support.** Compatibility, additional tool subscriptions, installation, license, update terms, and the applicable support/refund policy in straightforward language.

## Navigation and Routes

Proposed main navigation: Tools, About Murad, Free Starter Pack, My Downloads.

| Surface | Role |
| --- | --- |
| `/` | Personal brand and featured products |
| `/store` | Searchable product catalog with a small set of useful categories |
| `/store/:slug` | Individual product detail, real preview, contents, requirements, and purchase |
| `/about` | Founder story, actual builds, and social links |
| `/start` | Free sampler and optional product-update subscription |
| `/members` | My Downloads: owned products and the first useful action |
| `/members/module/:key` | Existing learning material, reachable from the relevant purchased product |
| `/admin` | Owner-only administration, still protected |
| `/60`, `/day/:day`, `/live` | Preserve history and integrations; remove campaign pressure from the sales journey |

Existing product URLs must continue to work or receive deliberate redirects. Preserve account IDs, purchase records, entitlement keys, downloaded editions, and member progress.

## Product Shelf

Organize by what a buyer wants to do: Get Set Up, Build and Check Work, Remember Projects, Design and Create Content. Keep specialist products available without overwhelming the homepage.

Every product detail page must answer:

- What problem does this solve, and who is it for?
- What exactly is in the download: runnable script, instruction file, template, worked example, or guide?
- What accounts, operating system, tools, subscriptions, or API credentials does the buyer provide?
- What does the first useful result look like?
- What is included in the purchase, and what is an optional extra?
- What support and updates are included, and where can the buyer find help?

Use previews of actual customer-safe product files. Do not expose the protected paid asset endpoints or reuse private personal configuration as product demos.

## Pricing and Membership

Keep the existing $47 starter and $97 bundle as the baseline while refining their contents. Retain the $297 toolkit as the established full-setup price. The catalog currently also has lower proposed standalone prices; reconciling those with Murad's earlier $47 minimum belongs in the offer decision, not an automatic reprice.

Recommendation for a sustainable storefront: lead with one-time purchases. Treat the $30/month update service as a separate, explicit offer only when its scope and delivery cadence are ready. The implementation must clearly state the total due today and any renewal. Preserve existing customer terms and access.

Do not lead the homepage with the $497 all-products option. It can remain a later comparison choice if its complete delivery is verified.

## Member Experience

The default view is an uncluttered library of owned products. Each product has Download, Start Here, Requirements, and Version Notes. The first screen highlights one next action. Optional lessons, checklists, and deeper tools open within the product instead of filling the whole landing screen.

Retain email/password login and account-based purchases. Keep owner administration separate. Do not require a buyer to log follower counts, broadcast, or run a 60-day challenge to use a script.

## Visual Direction

Preserve the recognizable green accent and existing Archivo typography, but give the page more visual variety with neutral surfaces, strong text contrast, real photos, and actual product previews. The tone should feel personal, useful, and confident.

Prioritize a clear portrait, genuine software screenshots, and interactive previews of the downloadable folders. Use subtle motion for opening previews and inspecting examples. Preserve keyboard navigation, readable mobile type, visible content before animation, and reduced-motion behavior. Avoid an oversized animated scoreboard as the first impression.

## Build Sequence

1. **Choose the initial featured products and verify them.** Test a fresh installation and one meaningful result for each featured package. Recheck dated dependency instructions and any recurring service promises. Packaging checks already passed today.
2. **Rebuild the public experience.** Homepage, navigation, founder story, catalog, product detail template, free sampler page, page titles, social previews, and sitemap. Replace unsupported live labels and campaign promises on selling pages.
3. **Complete individual purchases.** Add explicit SKU-to-price-to-entitlement mappings in the existing Backbone Stripe integration, then deliver the exact purchased package. Product detail pages must never show a buy action for an unconfigured checkout.
4. **Simplify the member library.** Put owned downloads and setup instructions first; preserve existing learning and progress under the appropriate products.
5. **Rehearse the buyer journey and publish.** Check mobile discovery, sampler download, purchase, receipt, login, protected download, account recovery, duplicate payment events, and existing-customer access. Publish after the actual product and checkout experience is reviewable.

## Engineering Boundaries

- Hosting remains Render. Payments remain Backbone Solutions Stripe only, never Haas.
- Reuse Supabase profiles, login, entitlements, and the server delivery system.
- Do not wipe campaign records, disconnect social accounts, or alter OBS as part of this redesign.
- Preserve unrelated local changes. The checkout is three commits ahead of origin and the Day 2 run sheet has an uncommitted edit; inspect before any future push.
- Core edit locations: `src/App.jsx`, `src/pages/StorePage.jsx`, `src/data/storeCatalog.js`, public page components, `src/styles.css`, and metadata/postbuild files. Purchase work also touches `server/index.mjs` and its integration checks.

## Definition of Ready

A new visitor can understand Murad's work, inspect a real product, buy it at the stated price, and reach the correct download and start instructions. This must work when Murad is offline. The website must not imply that the original streaming challenge is currently running.
