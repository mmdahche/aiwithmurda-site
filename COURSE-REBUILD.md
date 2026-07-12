# AI with Murda Course Rebuild

Date: 2026-07-10

## Audit finding

The previous paid curriculum was a buyer-facing copy of Murad's public 60-day content system. Streaming was not an optional example; it appeared in module goals, action kits, worksheets, downloads, onboarding emails, completion receipts, sales copy, and the second product.

That created the wrong buyer outcome:

- Previous outcome: run a public sprint, track audience movement, package proof as content, and connect it to an offer.
- Intended outcome: get productive with Claude Code and Codex, use reusable scripts and skills, and ship a verified first build.

## What stayed separate

The public 60-day dashboard, livestream hub, OBS overlays, stream metrics, and admin launch tools remain part of Murad's content series. They are not assignments in the paid course.

## Product ladder

### The Future Proof Method - $47

Entitlement key: `future_proof_method`

Outcome: set up Claude Code and Codex, prepare one AI-ready project, run the verified operator loop, install three starter skills, and ship one useful first build.

Includes:

- Five guided implementation modules
- Ten core prompt scripts
- Three starter skills
- Dual-agent project starter
- First Build Lab
- Verification and handoff checklist
- Troubleshooting guide
- Progress tracking and completion exports
- The Council — 5-Advisor Decision Engine (full standalone product folder, ZIP)
- Skill Authoring Kit (full standalone product folder, ZIP)
- Daily Operator Checklist

The two bundled product folders live under `products/` with their own README, INDEX, LICENSE, CHANGELOG, and VERIFY files, are validated by `scripts/verify-product-folder.mjs`, and are zipped into gated member assets by `scripts/build-store-product-assets.mjs` (see `PRODUCT-LINE-SPEC.md` for the full catalog plan).

### New Wave Operator Bundle - $97

Compatibility entitlement key: `new_wave_live_builds`

Outcome: repeat the core result across larger projects and client workflows with a curated advanced vault.

Includes everything in the $47 course plus:

- Safe-Autonomy Guardrails (full standalone product folder, ZIP): egress redaction firewall, six local-agent guards, vault index, clipboard-only secret injection, destructive-command + freeze enforcement hooks, shipped test suites
- Verification & QA Pack (full standalone product folder, ZIP): claim gating, state-sequence dead-button audits, AI blind-spot testing, browser QA with fix loop, ranked test-gap detection
- Eight additional operator skills
- Advanced prompt scripts
- Dual-agent review loop
- Debug Rescue System
- Deployment runbook
- Seven reusable project blueprints
- Client workflow pack

The existing key and checkout route remain unchanged so Stripe history, webhooks, and prior entitlements continue to work. Bundle entitlement also grants effective access to the starter course.

## New curriculum

1. Set Up Both AI Builders
2. Make the Project AI-Ready
3. Run the Operator Loop
4. Install Your Starter Skills
5. Ship Your First Useful Build

Every module has four implementation steps, one observable output, a verification checkpoint, and a stop rule.

## Member information architecture

- Start: one next action, first-session setup, and first-build track selector
- Build path: five modules with progress
- Script vault: searchable downloads kept away from the default view
- Build log: reusable implementation receipt
- Ship: first-build handoff, certificate, and share pack

Full lesson frameworks, workshops, examples, and traps stay collapsed until the member opens them. The default lesson view prioritizes the run kit, copy-ready script, four steps, and only the resources required for that module.

## Curriculum source rules

The rebuild uses principles from the locally archived app-development course, especially planning before prompting, bounded MVP scope, iteration, and verification. It does not copy or resell that course.

Customer assets are original, sanitized versions of Murad's daily workflows. They exclude:

- Secrets and credentials
- Company-only infrastructure
- Private file paths
- Customer data
- Broad permission bypasses
- Destructive or production actions without approval

## Current official references

- Claude Code quickstart: https://code.claude.com/docs/en/quickstart
- Claude Code project memory: https://code.claude.com/docs/en/memory
- Claude Code skills: https://code.claude.com/docs/en/skills
- Claude Code security: https://code.claude.com/docs/en/security
- Codex CLI: https://developers.openai.com/codex/cli/
- Codex customization: https://developers.openai.com/codex/concepts/customization/

Installation details should be reviewed against these pages before each recorded lesson or major curriculum release.

## Commercial setup verified

On 2026-07-10, the verified Backbone Solutions live Stripe account received a persistent `New Wave Operator Bundle` product and one-time `$97` price. Render now has `STRIPE_LIVE_BUILDS_PRICE_ID` configured through the single-key environment endpoint. The compatibility entitlement key remains `new_wave_live_builds` so prior webhook and database contracts continue to work.

The setup is idempotent and can be audited without mutation using `npm run stripe:operator-bundle`. Use `npm run stripe:operator-bundle -- --apply` only when the product or matching price is missing.
