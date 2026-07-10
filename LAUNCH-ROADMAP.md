# aiwithmurda.com Launch Roadmap

## Brand Architecture

Parent brand: `AI with Murda`

Campaign: `60-Day AI Operator Sprint`

Signature artifact: `60-Day Command Center`

Company bridge: `Built with Codex, Claude Code, and Backbone Solutions`

## Public Routes

- `/` - campaign home
- `/60` - public dashboard and scoreboard
- `/live` - livestream hub shell and stream command center
- `/tools` - public tools/resources shelf
- `/start` - production email capture
- `/kit` - first paid drop sales page
- `/live-builds` - second product founding waitlist and paid-room offer surface
- `/members` - Supabase-gated member hub and asset delivery
- `/day/:day` - public daily receipt pages for clips and recaps
- `/admin` - private local control room for daily logging and exports
- `/overlay` - OBS browser-source overlay route
- `/obs` - short alias for the OBS overlay

## Funnel Stack Decision

V1 stack:

- Email: Resend for subscriber capture, transactional receipts, daily build-log sends, and automations.
- Checkout: Stripe Checkout Sessions created from our own API, returning to `aiwithmurda.com`, using Backbone Solutions Stripe only.
- Delivery: `aiwithmurda.com/members` as the branded member hub.
- Access: Supabase Auth login from day one, with Stripe-granted entitlements.
- Community/course platform: defer Kajabi/Skool until the offer proves demand.

Why:

- Resend is enough for the first email layer and keeps the stack developer-owned.
- Stripe on-site preserves the brand and mirrors the Haas direction without sending buyers to a marketplace.
- Stripe account ownership stays with Backbone Solutions; Haas Stripe is not used for AI with Murda products.
- Kajabi is too heavy before the first product proves conversion.
- Skool is stronger for community after the first cohort exists, not for the first $47 product.

## Launch Order

1. Push this project to a GitHub repo Render can read.
2. Create a Render Blueprint from that repo so Render reads `render.yaml`.
3. Add `aiwithmurda.com` as the custom domain in Render.
4. Put the domain on Cloudflare DNS if it is not there already.
5. Point Cloudflare DNS to the Render `onrender.com` service URL.
6. Replace preview/demo tracker data with Day 1 baseline before public promotion using `npm run baseline:launch:push`.
7. Add final stream URLs/embeds to `/live` once the channels are chosen.
8. Run a real purchase/access test under the intended Backbone Stripe mode before public sales push.
9. Test OBS overlay in the actual streaming scene.
10. Use the selected daily dashboard workflow:
   - current: Supabase-backed dashboard with admin token write flow
   - support scripts: `npm run smoke:tracker`, `npm run sync:seed-logs`, `npm run baseline:launch`

## Product Build Order Before July 28

1. Resend signup capture, durable Supabase subscriber list, branded welcome email.
2. Supabase Auth profiles and entitlements.
3. Stripe Checkout Session endpoint for the $47 first paid drop: The Future Proof Method.
4. Member build lab with Start, Build Path, Script Vault, Build Log, and Ship views.
5. Claude Code + Codex starter assets served through gated member downloads.
6. Live hub shell and stream command links.
7. Admin operator workflows for daily run sheets, clip packets, proof deck review, and manual launch gates.
8. Operator Bundle page for the advanced skill, script, review, debug, deployment, and blueprint vault.
9. Cohort and sprint pages after the first paid/drop path is testable end to end.

Current second product state:

- `New Wave Operator Bundle` uses the compatibility route `/live-builds`.
- Public chat command target is `!builds`.
- V1 capture uses the existing `/api/subscribe` endpoint with source `operator-bundle`.
- Checkout is wired through `POST /api/checkout/live-builds`.
- Entitlement grants keep compatibility key `new_wave_live_builds`; bundle access also unlocks the Future Proof Method starter course.
- Active buyers see a product switcher between the starter build path and advanced Operator Vault.
- The bundle page presents Plan + Review, Debug + Quality, and Ship + Handoff collections.
- `STRIPE_LIVE_BUILDS_PRICE_ID` is optional; fallback Checkout `price_data` is `$97`.

## Render Web Service Settings

Use these same values if creating the Web Service manually instead of through the Blueprint flow.

- Service type: Web Service
- Runtime: Node
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Custom domain: `aiwithmurda.com`
- Render blueprint: `render.yaml`
- Public assets: served from `dist` by the Express server
- SPA fallback: handled by the Express server

## Cloudflare DNS Target For Render

After the Render service exists, copy its `*.onrender.com` URL and create these Cloudflare records:

- `CNAME` `@` -> `<render-service>.onrender.com`, DNS only during verification
- `CNAME` `www` -> `<render-service>.onrender.com`, DNS only during verification

Cloudflare SSL/TLS:

- Mode: `Full`
- Remove any `AAAA` records for the domain
- After Render verifies the certificate, Cloudflare proxying can be turned on if desired

## Pre-Launch Checklist

- Domain purchased: done
- Site routes generated: done
- `render.yaml` created: done
- Public-safe pages separated from `/admin`: done
- Render service live: done
- Cloudflare DNS pointed at Render: done
- Email capture live: done
- Supabase durable subscriber list: done
- Admin audience summary: done
- Starter Kit checkout endpoint: done; real purchase/access test still required before public sales push
- New Wave Operator Bundle update list + paid checkout: done; live Stripe display name needs final confirmation
- New Wave Operator Bundle member delivery: done; starter-course inclusion and seven advanced downloads are wired
- Operator Bundle collections: done; Plan + Review, Debug + Quality, and Ship + Handoff are visible
- Member area delivery live: done
- Member module lessons, generated roadmap/field guide assets, module run kits, build log, and first-build handoff: done
- Admin Offer Ops multi-product breakdown: done; Future Proof and Operator Bundle sales/member counts are separated
- Social share metadata and OG card: done
- Livestream hub shell: done
- Stream config endpoint and admin stream-link visibility: done
- One-command launch smoke runner: done; run `npm run smoke:launch` before public kickoff
- Fake stream rehearsal runbook: done; Settings has a copyable 35-45 minute dry run for `/live`, `/obs`, command clicks, dashboard sync, and test checkout
- Stream platform setup deck: done; Settings shows Twitch, YouTube, Kick, and main-room env steps with proof targets
- Stream privacy guard: done; Settings has a copyable preflight for OBS scene discipline, secret screens, clean browser profile, payment blackout, and family boundaries
- First-week public content run sheet: retained in admin stream operations, separated from paid member assets
- Admin daily run sheets: done; each selected day has stream beat, proof target, CTA, shutdown checklist, and copy/manual-copy output
- Admin daily clip packets: done; each selected day generates three hooks, recap caption, follow-up line, and copy/manual-copy output
- Manual gate runbook: done; Settings distills live links, OBS rehearsal, and real purchase test into copyable launch steps
- Final livestream embeds/URLs: pending channel decision
- Day 1 tracker baseline command: done; run `npm run baseline:launch:push` on launch day only
- OBS overlay tested in OBS: pending
- Daily publish workflow selected: done; Supabase admin write flow

## Stream Link Environment Contract

Set these public URL values on Render after the final stream destinations are chosen:

- `STREAM_PRIMARY_URL` - main room button on `/live`
- `STREAM_PRIMARY_EMBED_URL` - future embed source if the selected platform supports it
- `STREAM_CHAT_URL` - future chat/pinned command reference if needed
- `STREAM_TWITCH_URL` - Twitch room URL
- `STREAM_KICK_URL` - Kick room URL
- `STREAM_YOUTUBE_URL` - YouTube live or channel URL
- `STREAM_STATUS` - short machine status, default `prelaunch`
- `STREAM_STATUS_LABEL` - visible room status, default `Prelaunch room`
- `STREAM_MESSAGE` - visible live-room note on `/live`

Verify with:

```bash
npm run smoke:stream
```

`/api/stream/config` also returns the Fake Stream Rehearsal plan used by the admin Settings runbook.
It also returns the Stream Platform Setup deck that maps Twitch, YouTube, Kick, and the primary room to their Render env vars.
The same endpoint returns the Stream Privacy Guard used by the admin preflight card.
