# START HERE — Browser Automation Studio

One skill that routes browser work to the right tool — scrape, test, forms,
and reusable scraper robots.

## First win in 3 steps (~10 minutes)

1. **Install:** `bash install/setup.sh`
2. **Pick a public page** — pricing or docs site with no login
3. **Run the workflow** — ask your agent to use `browser-automation`, pick
   Playwright for a deterministic snapshot, save a screenshot receipt

## Where everything is

- `payload/browser-automation.md` — source skill
- `install/claude-code/` + `install/codex/` — dual layouts
- `examples/form-automation-walkthrough.md` — multi-step form pattern
- `VERIFY.md` — pre-ship checklist

## The one rule

**Smallest backend that works.** Don't spin up Browser Use for a single
screenshot — and don't hand-code Playwright for a 40-page crawl.
