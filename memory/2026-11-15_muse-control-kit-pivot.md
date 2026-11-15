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

- `/` is the sales page (`src/pages/SalesPage.jsx`, `src/site/sales.css`), in the brief's order: headline, 16:9 video spot and buy button; problem; who it's for and not for; what you get; how it works; which setup (Murad's wording, word for word); story; price; refunds; questions; footer. No proof section until there are real results.
- `/terms` and `/privacy` stay. Every other old path (products, shop, free downloads, member area, about, 60-day sprint pages, `/downloads/*`) answers with a 301 to `/` (`retiredPagePaths` in `server/index.mjs`). The TikTok verification files under `/60/`, `/terms/`, `/privacy/` are still served.
- All copy, the price, the checkout link and every placeholder live in `src/data/museKit.js`. Setting `checkoutUrl` and `salesVideoYouTubeId` there finishes those two placeholders.
- The look keeps the reel brand (navy, Anton, Geist) but plainer: one reading column, hairlines, and one strong colour used only for the buy button.

## Copy rules (Murad's, they outrank design)

No income or sales promises; never "guaranteed", "proven", "battle-tested", "verified", "fully automated", "draft-only" or "you hit send yourself". The honest line: Muse writes it, and you approve listings, prices and pickup times. No countdowns, scarcity, "Most Popular", value totals or invented bonuses. No em dashes. Short plain sentences. Never write Murad's story or facts about him; leave a marked placeholder.

## Kept on purpose

The admin workspace and OBS overlays (private, unchanged); old product data, product folders, member assets and server checkout, webhook and download endpoints (unreachable from the public site); old member, product and sprint components inside `src/App.jsx` (unrouted; the admin shares helpers with them). Deleted public page and component files remain in git history.

## Open

Placeholders waiting on Murad: Whop checkout link, sales video, confirmed what-you-get list, his story, refund terms, several FAQ answers marked "Check". Terms and Privacy still describe the old site. The Render service is on the free plan and sleeps after 15 minutes idle; Murad plans to move it to a paid instance. Do not deploy until Murad says yes.
