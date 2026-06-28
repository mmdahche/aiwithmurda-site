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
- `/members` - Supabase-gated member hub and asset delivery
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
4. Member hub shell with Start Here, Operator Workspace, Prompt Workflows, and Build Receipts.
5. Starter Kit content assets served through gated member downloads.
6. Live hub shell and stream command links.
7. Workshop/live-build event page after the starter kit checkout proves conversion.
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
- Render service live: done
- Cloudflare DNS pointed at Render: done
- Email capture live: done
- Supabase durable subscriber list: done
- Admin audience summary: done
- Starter Kit checkout endpoint: done; real purchase/access test still required before public sales push
- Member area delivery live: done
- Social share metadata and OG card: done
- Livestream hub shell: done
- Final livestream embeds/URLs: pending channel decision
- Day 1 tracker baseline command: done; run `npm run baseline:launch:push` on launch day only
- OBS overlay tested in OBS: pending
- Daily publish workflow selected: done; Supabase admin write flow
