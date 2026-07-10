---
name: AI with Murda Claude Code and Codex product ladder
description: Locked paid-course outcomes, compatibility contracts, Stripe setup, member delivery, and QA standard.
type: product-architecture
source: rubyx
date_added: 2026-07-10
---

# Claude Code and Codex Product Rebuild

## Boundary

Murad's public 60-day challenge is proof and entertainment. It is not the paid curriculum. The paid products teach beginners to use Claude Code and Codex safely, install reusable skills and scripts, and ship verified software or workflow outcomes.

Do not reintroduce streaming assignments, follower tracking, clip production, or public-sprint operations into paid modules or member downloads.

## Product Ladder

### The Future Proof Method - $47

- Compatibility product key: `future_proof_method`
- Five modules and 20 implementation steps
- Modules: tool setup, AI-ready project, operator loop, starter skills, first useful build
- Twelve gated assets, including three starter skills, core scripts, project starter, Build Lab, troubleshooting, workbook, and completion kit
- Outcome: one safe, reproducible, verified first build

### New Wave Operator Bundle - $97

- Compatibility product key and route remain `new_wave_live_builds` and `/live-builds`
- Bundle entitlement includes the complete starter course
- Seven advanced gated assets: eight-skill vault, advanced scripts, dual-agent review, debug rescue, deployment, blueprints, and client workflow pack
- Outcome: repeat the method on larger projects and client work

## Commercial State

- Payments belong to the Backbone Solutions live Stripe account only.
- Persistent live product name: `New Wave Operator Bundle`
- One-time live amount: `$97`
- Render environment key: `STRIPE_LIVE_BUILDS_PRICE_ID`
- The legacy environment and entitlement names remain for webhook and database compatibility.
- `npm run stripe:operator-bundle` is read-only and idempotently audits the catalog. Add `-- --apply` only if the product or matching price is absent.

## Member Experience

- Default view shows one next action, not the whole library.
- Navigation: Start, Build path, Script vault, Build log, Ship.
- Buyers select one of three first-build directions; the choice persists in local storage.
- Lesson detail prioritizes the run kit, copy-ready prompt, four tasks, and required assets.
- Deeper frameworks and workshops use progressive disclosure.
- Historical task rows are filtered against current module/task keys so the old course cannot inflate progress.

## Verification

- Code rebuild commit: `4e3bca3`
- Render service: `aiwithmurda-web`
- Production: `https://aiwithmurda.com`
- `npm run smoke:funnel` verifies checkout display, both entitlement gates, all major downloads, 20-step progress, and stale-row filtering.
- `npm run smoke:member-ui` creates a disposable buyer and verifies password login, both products, personalization persistence, lesson disclosure, search, bundle access, mobile navigation, overflow, and browser errors.
- `npm run smoke:tracker` protects public dashboard, admin, overlay, and automation contracts.
