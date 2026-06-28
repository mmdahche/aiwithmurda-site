# aiwithmurda.com Launch Roadmap

## Brand Architecture

Parent brand: `AI with Murda`

Campaign: `60-Day AI Operator Sprint`

Signature artifact: `60-Day Command Center`

Company bridge: `Built with Codex, Claude Code, and Backbone Solutions`

## Public Routes

- `/` - campaign home
- `/60` - public dashboard and scoreboard
- `/live` - livestream hub
- `/tools` - public tools/resources shelf
- `/start` - email capture placeholder
- `/kit` - first paid drop sales page
- `/members` - gated delivery preview
- `/admin` - private local control room for daily logging and exports
- `/?view=overlay` - OBS overlay route

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
6. Replace preview/demo tracker data with Day 0 baseline before public promotion.
7. Wire `/start` to a real email capture tool.
8. Add stream embeds to `/live`.
9. Build `/kit` checkout page and `/members` delivery shell.
10. Decide publishing workflow for daily dashboard updates:
   - v1: update data, rebuild, redeploy
   - v2: public JSON file updated by script
   - v3: Supabase-backed dashboard with admin write flow

## Product Build Order Before July 28

1. Resend domain, audience, daily build-log signup, welcome email.
2. Supabase Auth profiles and entitlements.
3. Stripe product and Checkout Session endpoint for the $47 first paid drop: The Future Proof Method.
4. Member hub shell with Start Here, Operator Workspace, Prompt Workflows, and Build Receipts.
5. Starter Kit content assets uploaded into the member hub.
6. Live hub embeds and stream command links.
7. Workshop/live-build event page after the starter kit checkout works.
8. Cohort and sprint pages after the first paid/drop path is testable end to end.

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
- Render service live: pending
- Cloudflare DNS pointed at Render: pending
- Email capture live: pending
- Starter Kit checkout live: pending
- Member area delivery live: pending
- Livestream embed live: pending
- Day 0 tracker baseline: pending
- OBS overlay tested in OBS: pending
- Daily publish workflow selected: pending
