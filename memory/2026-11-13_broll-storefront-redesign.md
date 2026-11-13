---
source: claude-code
date_added: 2026-11-13
project: aiwithmurda
type: decision
---

# B-roll Storefront Redesign

On November 13, 2026 Murad asked for a completely new look for aiwithmurda.com as the place he sells digital products, and chose the look of his Instagram reels and b-roll (@aiwithmurda) as the colour lead over the Backbone teal. He supplied four reel screenshots and one finished reel; the palette and vocabulary below were sampled from them.

## What changed

- Visual system only. Routes, products, prices, billing terms, safety notes, checkout, Supabase login, entitlements, downloads and server logic are unchanged. Backbone Stripe remains the payment account; never Haas.
- Colours: reel navy `#040923` canvas, panels `#09122b` to `#131d43`, action blue `#4f95ff` with navy text, ticker-label blue `#2563eb` with white text, light blue `#9cc2ff`, cream `#f7f6f2` announcement card. The old green and amber are gone from every public page.
- Type: Anton for condensed caps headlines, Geist for body, Geist Mono for labels and counters, Montserrat 800/900 for ticker labels. All self-hosted through `@fontsource`.
- Vocabulary: numbered panel headers (`01 / 06` plus a mono descriptor and corner dots), two-line caps headlines ending in full stops, mono pill chips, ticker labels (blue tag joined to a bar), flat illustrated previews drawn in DOM, one loud blue button per decision.
- Material carries meaning: free things sit in a dashed navy outline, paid things sit on the cream card, everything else stays on navy. Prices are tickers (`ONE TIME | $47`, `TODAY | $327` with a `THEN $30/MONTH` chip) and the billing sentences stay beside them.

## How it is built

- `src/site/tokens.css` holds the tokens, scoped to `.public-site`, with a bridge so older token-based rules in `styles.css` resolve to the new palette on public pages.
- `src/site/site.css` is the shared system (class prefix `mx-`). A redesigned page root is `<main className="mx mx-page" id="main-content">`. Page files: `catalog.css`, `product.css`, `free.css`, `members.css`, `pages.css`, `legacy.css`; `carryover.css` keeps the member-area rules that survived the retired `storefront.css`.
- `src/site/SiteShell.jsx` is the header and footer for every public route.
- The public-only ranges of `src/styles.css` were recoloured in place by script; the admin and OBS overlay ranges were not touched.
- `sf-*` class names that remain in JSX are test hooks for the Playwright suites and carry no styling.

## Boundaries that held

- `/admin`, `/overlay`, `/obs`, `/overlay/followers`, `/obs/followers` and `/?view=overlay` render outside `.public-site` and were verified pixel-identical to the previous release at 1440 and 390 wide.
- The build-log archive (`/60`, `/day/:day`, `/live`, `/tools`) keeps its content and behaviour; it was recoloured and finished in CSS only and is labelled as an archive.
- Legal text on `/terms` and `/privacy`, including the TikTok and social-authorization sentences, is word for word.

## Design record

- The direction was chosen by a three-judge panel from three full homepage mockups: "Broadcast desk" (chosen), "Launch card" and "Day edition". The dashed-free and cream-paid surfaces and the price tickers were taken from the two runners-up.
- A Claude Design canvas with the homepage (desktop and phone) and the design system was published to Murad's account the same night.

## Left for Murad

- Instagram itself could not be opened from the build environment (login wall); the palette comes from the files he uploaded.
- `/operator-arsenal` still shows the older "$923+ value" comparison and per-tool prices that the September storefront rules say to avoid; wording was not changed.
- `/60` and `/live` still describe the sprint as live ("Live board", "The stream is the show."); only archive labels were added around them.
- UI tests mock auth and checkout and do not prove a real card purchase. Read the latest handoff for the published commit and production verification; do not treat this note alone as proof a deployment completed.
