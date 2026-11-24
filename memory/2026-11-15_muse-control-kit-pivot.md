---
source: claude-code
date_added: 2026-11-15
project: aiwithmurda
type: decision
---

# One Product: Facebook Marketplace Muse Control Kit

On November 15, 2026 Murad changed what aiwithmurda.com sells. The site sells one product only: the Facebook Marketplace Muse Control Kit, a setup kit for Meta's Muse assistant for people who sell used and collectible items on Facebook Marketplace. $27, one time, one offer, checkout on Whop (not Stripe). The brief was written by Noor and pasted by Murad; it follows the Monetise program's guidance for a single digital-product sales page.

## Verified before removal

Stripe (Backbone account, read-only restricted key) showed one paid checkout ever (a $2.00 test on June 30 from Murad's own email), 333 abandoned unpaid checkouts and zero subscriptions ever. No real customer, nobody paying the $30/month. Nothing in Stripe or Supabase was changed.

## What the public site is now

Same day, Murad changed course: he likes the live look and sees the kit as the first of many products, so the site was NOT reshaped around it.

- `/` is the live home page again (`src/pages/StorefrontHome.jsx`, live look from the Nov 13 redesign) with the old products removed: hero (photo, "Download it. Make it yours."), a one-group Tools shelf, a Featured tool panel for the kit, and Murad's story section.
- `/tools` lists every tool (`src/pages/ToolsPage.jsx`). Tools come from `src/data/tools.js`; adding a product = one object there plus its page. The first entry is featured on the home page.
- `/tools/musekit` is the kit sales page (`src/pages/SalesPage.jsx`, `src/site/sales.css`), Instagram bio link. It keeps a focused header (logo and buy button, no menu) per Noor's brief. Case variants and aliases (`/tools/Musekit`, `/tools/muse-kit`, `/tools/muse`, `/musekit`, `/muse-kit`) 301 to it, keeping the query string.
- `/about` (live About page, product leftovers removed), `/terms`, `/privacy` stay. Header nav: Tools, About Murad. Free Starter Pack and My Downloads are gone.
- Retired paths: `/store` and `/store/*` 301 to `/tools`; other old product, free, member, 60-day and `/downloads` paths 301 to `/` (`server/index.mjs`). Prerendered pages are served from a fixed map at the plain path. The TikTok verification files under `/60/` are still served; retired free downloads stay in `public/downloads` but are not deployed.
- All kit copy, the price, the checkout link and its placeholders live in `src/data/museKit.js`. Share images: `public/og-card.png` (site), `public/og-muse-kit.png` (kit), set per page by postbuild.

## Copy rules (Murad's, they outrank design)

No income or sales promises; never "guaranteed", "proven", "battle-tested", "verified", "fully automated", "hands-free", "on autopilot", "set it and forget it", "draft-only" or "you hit send yourself". Never say or hint that buyers won't know it's AI. The honest line: Muse writes it, and you approve listings, prices and pickup times. No countdowns, scarcity, "Most Popular", value totals or invented bonuses. No em dashes. Short plain sentences. Never write Murad's story or facts about him; leave a marked placeholder.

## The message (Noor's updated brief, Nov 15)

Lead with posting. Headline exactly "This kit makes it a few photos and a yes." (never reworded), with "Posting is the hard part of selling on Marketplace." right under it. Then name the automation word for word ("It automates the busywork. On the automatic setup, once Muse knows an item, it answers the questions buyers ask most by itself. Offers and pickup times come to you ready to answer.") with what stays with the seller beside it: every listing, every agreed price, every pickup time. Only the Automatic setup answers buyers by itself; never write that Ask me first does. What you get has five pieces: the two setup prompts, the "which setup is for you" guide, the setup steps, the buyer reply guide, the stop and safety sheet. The updated brief still says "one product only", but Murad's direct instruction (keep the site, kit at /tools/musekit) governs the site structure.

## Kept on purpose

The admin workspace and OBS overlays (private, unchanged); old product data, product folders, member assets and server checkout, webhook and download endpoints (unreachable from the public site); old member, product and sprint components inside `src/App.jsx` (unrouted; the admin shares helpers with them). Deleted public page and component files remain in git history.

## Go-live (Nov 16)

Murad approved going live directly in this session (Noor relayed the Whop details). Every kit buy button goes to the Whop checkout `https://whop.com/checkout/plan_u1TnTYybKdPk7/` ($27, one time); the Whop product page is `https://whop.com/aiwithmurda/facebook-marketplace-muse-control-kit/`. What you get: the kit ebook (one PDF, about 34 pages) plus two plain-text prompts, "Prompt 1 - Ask me first" and "Prompt 2 - Automatic". Delivery: after paying on Whop, the files are in the buyer's Whop account. No placeholders on the live page: the hero shows the kit image until a sales video exists (`salesVideoYouTubeId`), and My story and Refunds appear only once `story` / `refundTerms` are set in `src/data/museKit.js`. Terms and Privacy got a minimal update naming Whop (effective Nov 16); the rest of the legal text is still the old site's and Murad may want a fuller rewrite. Stripe was re-checked read-only before launch: still no real customers, no subscriptions.

## Free since Nov 24, 2026

Murad made the kit free on Whop ("Free access"); Noor relayed it and he confirmed the site change. The Whop checkout link is unchanged. On the site: price "Free" (`museKit.priceCents` 0, `billing` null), buttons "Get the free kit" (header keeps "Get the kit"), under the hero "Free. You get it through Whop.", tickers "Free | Ebook + 2 prompts", FAQ "How do I get the kit?" (sign in to Whop; files in the Whop account right after), Terms "is free. Access and delivery run through Whop." (effective Nov 24). The kit share image moved to `public/og-muse-kit-free.png` so link previews refresh; old previews may still show "$27" until Facebook re-scrapes the page. The "$27, one time" notes above are history.

## Open

Murad's story, refund terms (also set them on the Whop product), the sales video, and a fuller Terms/Privacy rewrite. Old Stripe checkout endpoints and the prebuild step that rebuilds retired product zips are still in place (unreachable from the site); switch them off only with Murad's OK. The Render service is on the free plan and sleeps after 15 minutes idle; Murad plans to move it to a paid instance.
