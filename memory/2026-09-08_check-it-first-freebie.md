---
source: rubyx
date_added: 2026-09-08
type: project
---

# Check It First

Murad approved adding the Desktop CHECK-IT-FIRST.md guide as the first recommended
free download. Claude will handle tutorial video production separately.

- Dedicated route: `/free/check-it-first`, with a readable human guide, section
  navigation, full AI review prompt, copy feedback, manual selection, and load retry.
- Public source and direct download: `public/downloads/CHECK-IT-FIRST.md`.
  The copied AI portion is loaded from this same file. Original Desktop file untouched.
- First free entry on home/shop; optional before-use notice on Starter Pack,
  Inbox Cleanup Kit and the purchased download library. No mandatory gate added.
- Three free downloads now; the other two freebies, 17 paid tools, prices, billing,
  account rules, admin dashboard and both OBS overlays are unchanged.
- Public contact uses the existing `murad@aiwithmurda.com` address.
- Publication edits qualify safety claims, warn against uploading private files,
  use "No obvious issues found" instead of certification, and distinguish legitimate
  AI skills from review manipulation. No claimed benchmark results published.
- The page does not scan or upload user files. AI use happens in the visitor's own
  assistant with whatever access and costs that provider requires.

Verification: production build passed. Local Playwright guide checks passed at
360, 390, 768, 1440 and 1920 pixels: full copied text and download equality,
keyboard access, clipboard-denied fallback, missing/HTML response retry, loading
state, metadata, first placement and no uploads. Existing storefront suite passed
60 responsive layouts plus mocked purchase, library, admin and OBS contracts.
These tests are not a security certification of this prompt or a real buyer checkout.
See latest shared handoff for commit and production deployment verification.

Local preview: original port 5173 server had a stopped esbuild service. A fresh
preview was started on 5174 without touching that older process. Do not confuse a
stale local preview failure with a production failure.
