---
source: rubyx
date_added: 2026-09-07
project: aiwithmurda
type: decision
---

# Storefront Publication and Admin Continuity

Murad approved making the new storefront official on September 7. The public website should focus on his products, while his admin login must retain the full dashboard and stream overlay workspace.

Keep `/admin/` behind existing Supabase email/password login and server allowlist. Production Render configuration still specifies `mmdahche@icloud.com` as the approved owner email. A normal paid-member login is not an admin login.

All five admin views remain: Dashboard, Daily Log/Today's Command, Overlay, Deck, and Settings. The Overlay view includes scoreboard and follower previews. Existing OBS source URLs remain read-only and public so OBS does not need to sign in.

The release fixes `/admin?view=overlay` routing to the protected workspace and preserves the legacy public `/?view=overlay` data feed. Browser tests cover customer denial, owner navigation, overlay sources, and the storefront default.

Publish through existing Render auto-deployment from GitHub main. No payment provider, price, subscription, credential, daily record, stream configuration, or product payload changes are authorized or needed. Backbone Stripe remains the payment account; never Haas.

Full production build and isolated local UI tests passed. UI tests mock auth and checkout and do not prove a new real card purchase. Fresh-buyer installs and a future explicitly approved purchase rehearsal remain separate work.

Read the latest shared handoff for the actual published commit and production verification. Do not treat this decision note alone as proof a deployment completed.
