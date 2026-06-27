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
- `/admin` - private local control room for daily logging and exports
- `/?view=overlay` - OBS overlay route

## Launch Order

1. Push this project to a GitHub repo Render can read.
2. Create a Render Blueprint from that repo so Render reads `render.yaml`.
3. Add `aiwithmurda.com` as the custom domain in Render.
4. Put the domain on Cloudflare DNS if it is not there already.
5. Point Cloudflare DNS to the Render `onrender.com` service URL.
6. Replace preview/demo tracker data with Day 0 baseline before public promotion.
7. Wire `/start` to a real email capture tool.
8. Add stream embeds to `/live`.
9. Decide publishing workflow for daily dashboard updates:
   - v1: update data, rebuild, redeploy
   - v2: public JSON file updated by script
   - v3: Supabase-backed dashboard with admin write flow

## Render Static Site Settings

Use these same values if creating the Static Site manually instead of through the Blueprint flow.

- Service type: Static Site
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Custom domain: `aiwithmurda.com`
- Render blueprint: `render.yaml`
- Rewrite rule: `/*` -> `/index.html`

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
- Livestream embed live: pending
- Day 0 tracker baseline: pending
- OBS overlay tested in OBS: pending
- Daily publish workflow selected: pending
