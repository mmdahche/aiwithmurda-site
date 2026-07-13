# Operator Toolkit Product Roadmap

Date: 2026-07-10

## Three-tier ladder

1. The Future Proof Method - $47 one time
2. New Wave Operator Bundle - $97 one time
3. The Operator Toolkit - $297 setup plus $30/month Operator System Updates

The third checkout displays $327 due today: the permanent $297 launch-edition toolkit and the first $30 month. Renewals are $30/month until canceled.

## Access contract

- `operator_toolkit` is permanent after the initial mixed checkout is paid.
- `operator_updates` is active only while the Stripe subscription is active, trialing, or in the explicit past-due grace state.
- Canceling updates never revokes `operator_toolkit`, the lower tiers, or launch-edition downloads.
- Update access continues through the paid period when cancellation is scheduled for period end.
- Past-due status receives a grace state. Canceled, unpaid, incomplete-expired, or paused status revokes update access only.

## Product boundary

The toolkit contains Murad-authored or newly created customer-safe workflows. It does not redistribute installed system skills, plugin skills, GSD packages, licensed third-party material, private Backbone automation, credentials, customer data, or machine-specific secrets.

## Launch edition

- Three flagship store products included in full (store folders under `products/`): The Three-Tier LLM Router ($79 standalone), Memory OS ($99), The Operator Cycle ($129) — $307 of shelf value inside the $297 tier
- 24 original skills across foundation, build/quality, design/product, and operations/growth
- Dual-agent command center
- Project instruction pack
- Claude Code + Codex collaboration protocol
- Automation recipe library
- Design and QA system
- Research and launch system
- Client delivery system
- Weekly review
- Verification and recovery pack

## Monthly updates

Every update must have:

- Semantic version
- Release date
- Added, changed, and removed files
- Compatibility notes
- Migration steps
- Verification receipt
- Rollback instructions

The first update is version 1.1.0 and adds four update-channel skills plus the compatibility matrix and release workflow.

## Billing transparency

Sales and Checkout copy must state:

- `$327 due today`
- `$30/month after the first month`
- `Cancel future updates anytime`
- `The $297 launch edition remains yours`

Stripe Checkout uses subscription mode with one recurring line item and one one-time setup line item, as documented for mixed carts: https://docs.stripe.com/payments/checkout/how-checkout-works
