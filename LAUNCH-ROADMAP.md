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

1. Deploy static site to GitHub Pages.
2. Point `aiwithmurda.com` DNS to GitHub Pages.
3. Replace preview/demo tracker data with Day 0 baseline before public promotion.
4. Wire `/start` to a real email capture tool.
5. Add stream embeds to `/live`.
6. Decide publishing workflow for daily dashboard updates:
   - v1: update data, rebuild, redeploy
   - v2: public JSON file updated by script
   - v3: Supabase-backed dashboard with admin write flow

## GoDaddy DNS Target For GitHub Pages

A records for apex domain:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

CNAME:

- `www` -> `mmdahche.github.io`

GitHub Pages custom domain:

- `aiwithmurda.com`

## Pre-Launch Checklist

- Domain purchased: done
- Site routes generated: done
- `CNAME` generated into `dist/`: done
- Public-safe pages separated from `/admin`: done
- Email capture live: pending
- Livestream embed live: pending
- Day 0 tracker baseline: pending
- OBS overlay tested in OBS: pending
- Daily publish workflow selected: pending
