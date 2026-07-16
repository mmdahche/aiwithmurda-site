---
name: browser-automation
description: Browser automation studio — route scrape, form-fill, test, and multi-step web flows to the right backend (Playwright for deterministic DOM, agent-browser for NL intent, bulk extractors for site→Markdown). Use for "browse to X", "scrape this site", "fill this form", "test this page", "verify this URL renders", or any task requiring a real browser. Includes anti-rabbit-hole rules, screenshot discipline, blocker reporting, and reusable scraper-robot definitions.
---

# Browser Automation Studio

One conductor skill that picks the right browser backend for the task. You
install the backends you need; this skill defines routing, safety, and receipts.

## When to use

- Browse, scrape, crawl, fill forms, click through flows, log into sites
- JavaScript-rendered pages (static HTTP fetch is insufficient)
- Authenticated sessions (dashboards, carts, account pages)
- QA walks that need a real browser, not just unit tests
- Named, reusable scrapers you run on a schedule

## Backend routing

| Task shape | Backend | Why |
|------------|---------|-----|
| Deterministic DOM (click ref, fill field, assert text) | Playwright MCP or Playwright script | Stable selectors, test-grade |
| NL intent ("find the pricing table and export CSV") | agent-browser or Browser Use | Accessibility tree + recovery loop |
| Bulk site → Markdown / many URLs | crawl4ai or similar extractor | Throughput, structured output |
| Logged-in interactive session in your real browser | Browser extension MCP | Uses your existing cookies |
| One-off verification screenshot | Any — prefer smallest tool | Don't over-engineer |

**Rule:** pick the smallest backend that can complete the task. Escalate only
after one failed attempt with a logged reason.

## Workflow

1. **Scope** — single URL vs multi-page vs authenticated vs export format
2. **Pick backend** — table above; document the choice in your session notes
3. **Preflight** — domain allowlist, no secrets in prompts, telemetry off if applicable
4. **Execute** — snapshot before destructive actions; screenshot on ambiguity
5. **Receipt** — URL, backend used, files saved, blockers hit, next action

## Scraper robots (reusable definitions)

For repeat extractions, define a robot file instead of re-prompting:

```json
{
  "name": "pricing-table-weekly",
  "url": "https://example.com/pricing",
  "engine": "playwright",
  "fields": [
    { "label": "plan_name", "selector": "[data-plan]" },
    { "label": "price", "selector": "[data-price]" }
  ],
  "export": "csv",
  "schedule": "weekly"
}
```

- **define** — visit once, propose fields, save JSON on approval (no scrape yet)
- **run** — execute saved robot, write export, log row count
- **schedule** — cron or task runner; never run undefined robots

## Anti-rabbit-hole rules

- Max **3 navigation hops** without a checkpoint message to the operator
- If the same selector fails twice, stop and report — don't brute-force clicks
- Captchas, 2FA, payment confirmation → **blocker report**, not workarounds
- No credential storage in robot JSON — use env vars or vault tools

## Blocker report template

```
Blocker: [login wall | captcha | paywall | bot detection | missing element]
URL: ...
Backend: ...
Attempted: ...
Evidence: screenshot path or snapshot excerpt
Suggested next: [manual step | different backend | skip]
```

## Screenshot discipline

- Full page for layout audits; viewport for interactive flows
- Filename pattern: `{site}-{action}-{timestamp}.png`
- Never screenshot pages with visible secrets — blur or crop payment/PII regions

## Safety defaults

- Domain allowlist before authenticated flows
- Telemetry disabled on every installed backend (verify vendor docs on upgrade)
- No cloud browser SaaS unless the operator explicitly opts in
- SSRF: don't fetch internal IPs or metadata endpoints through browser proxies

## Output contract

End every session with:

1. Backend chosen and why
2. URLs touched
3. Artifacts saved (CSV, Markdown, screenshots)
4. Blockers or manual follow-ups
5. Whether the robot definition was updated
