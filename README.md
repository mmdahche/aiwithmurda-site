# 60-Day Command Center

Local-first dashboard for Murad's 60-day AI operator sprint.

The app keeps one daily tracker dataset and turns it into:

- a public-safe dashboard
- an OBS overlay preview
- daily log editor
- daily slide and weekly recap deck preview
- JSON/CSV exports for future automation

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Deploy

The production target is a Render Node Web Service with Cloudflare DNS. The clean path is to create a Render Blueprint from this repo so Render reads `render.yaml`.

If creating the Web Service manually instead, use:

- Runtime: Node
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Custom domain: `aiwithmurda.com`

The Express server serves the Vite build from:

```text
dist
```

The `render.yaml` blueprint defines the web service, custom domain, required environment variables, and backend support for `/api/*`, Stripe webhooks, Supabase-gated member access, and direct visits to `/60`, `/live`, `/tools`, `/start`, `/kit`, `/members`, and `/admin`.

## Workflow

1. Open `Daily Log` every morning and set the day's goal.
2. Update metrics at night.
3. Use `Dashboard` on stream for the public command-center segment.
4. Use `Overlay` as the reference for the OBS browser source.
5. Use `Deck` to review the growing Day 1-60 proof deck.

The dashboard data still uses browser localStorage for the operator tracker. The product funnel now expects Supabase, Stripe, and Resend environment variables in production.
