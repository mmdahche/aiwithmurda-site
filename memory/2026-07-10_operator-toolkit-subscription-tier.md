---
name: Operator Toolkit subscription tier
description: Locked $297 permanent toolkit plus $30 monthly update-channel architecture, delivery, billing, and production verification.
type: architecture
source: rubyx
date_added: 2026-07-10
---

# Operator Toolkit Subscription Tier

## Product ladder

- The Future Proof Method remains `$47` one time.
- New Wave Operator Bundle remains `$97` one time.
- The Operator Toolkit is `$297` one time plus Operator System Updates at `$30/month`.
- Mixed Checkout collects `$327` initially: the permanent launch edition and first update month. Only the `$30` line renews.

## Access boundary

- `operator_toolkit` is permanent after paid Checkout.
- `operator_updates` follows the Stripe subscription lifecycle.
- Canceling updates revokes only the recurring update entitlement; permanent toolkit and included lower tiers remain available.
- Existing permanent owners can restart the update subscription without repurchasing the toolkit.
- The billing portal supports invoices, payment-method updates, and period-end cancellation.

## Customer delivery

- Public offer route: `/operator-toolkit`.
- Member workspace has Setup, System Files, Updates, and Billing views.
- Launch edition contains 24 original customer-safe skills in matching Claude Code and Codex project layouts.
- Permanent library includes command-center, project-instruction, dual-agent, automation, design/QA, research/launch, client-delivery, weekly-review, and recovery systems.
- Recurring release 1.1.0 contains four maintenance skills, compatibility notes, migration guidance, verification, and rollback.
- Build generation rejects count drift, duplicate slugs, incomplete skill contracts, common secret patterns, and private machine paths.

## Billing and revenue

- Backbone Solutions owns all live Stripe objects; Haas Stripe is not used.
- Live product, one-time price, recurring price, billing portal, and six webhook events were configured on 2026-07-10.
- True `subscription_cycle` invoices create idempotent `$30` purchase rows so dashboard revenue includes renewals without double-counting initial Checkout.
- The initial Checkout purchase is recorded once at `$327` under the permanent toolkit product.

## Verification

- Supabase migrations 006 and 007 were applied before deployment.
- Release commit: `40d5e0a`; canonical-route smoke follow-up: `1d48f94`.
- Production funnel verified exact `$327` total, one `$297` non-recurring line, one `$30/month` line, billing portal, asset gates, downloads, and cleanup.
- Signed sandbox lifecycle verified grant, recurring revenue, cancellation, permanent ownership, and update revocation.
- Production Playwright verified all three products, password login, toolkit setup persistence, permanent files, updates, billing, mobile/desktop overflow, and zero browser errors.

## Standing rule

Never collapse permanent toolkit ownership and recurring update access into one entitlement. Cancellation must never remove files purchased for `$297`.
