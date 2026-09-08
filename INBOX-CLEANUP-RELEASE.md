# Inbox Cleanup Release - September 8, 2026

## Version 1.2: guided routes

Murad approved simplifying setup, adding an AI-assisted route, testing both,
then producing two accurate tutorials. One ZIP now offers two ways to use the
same engine; no new paid product or account connection is introduced.

- Numbered menu, Mac/Windows launchers, offline practice with eight fictional messages.
- Minimal AI report, explicit sharing consent, portable guide and starter prompt.
- Scan-bound suggestions are data only, checked before local review. No auto-accept.
- Saved-choice editing includes earlier senders/domain rules and folder destinations.
- Invalid Unicode, duplicate keys and deeply nested suggestions rejected. Terminal
  controls removed; mailbox-derived Markdown escaped; unknown senders left alone.
- 93 offline tests pass in source. Mac launcher rehearsed without credentials.
- Independent security findings reproduced and covered by regression tests.
- Independent AI skill trial preserved protected/uncertain mail and prepared only
  suggestions, ignoring instruction-like sender data, with no mailbox access.
- Public page has two route views, shared download and clipboard fallback.
- Tutorial scripts: content/inbox-cleanup-tutorials/PRODUCTION.md. No finished
  recordings, Higgsfield generation or public videos yet.

Live-provider and native Windows acceptance remain outstanding. Latest shared
handoff records final fresh-download tests and production deployment verification.

## Approved scope

Publish the new kit for free. Default Delete to move-to-Trash, retain all review
choices, and do not operate on Murad's mailbox. Preserve the existing storefront,
paid catalog, member access, owner dashboard, and both broadcast overlays.

## Safety corrections

The initial source was supplied on Desktop and independently reviewed. The reviewed
release is maintained in products/email-cleanup-kit; the Desktop copy is untouched.

- Generic IMAP All attribute no longer enables an archive deletion shortcut.
- Failed moves never fall back to source-only deletion.
- COPY fallback requires UIDPLUS, checks COPY and STORE, and only uses UID EXPUNGE.
- Stars and deleted flags are checked per batch; missing flags/headers abort.
- UIDVALIDITY is checked before creating a preview and again before executing it.
- Saved plans are account-bound and invalidated when sender choices change.
- Exact scanned IDs are used, not an expanding live sender search.
- A saved preview plus typed confirmation is required; fast/probe bypasses removed.
- Non-INBOX cleanup sources and unsafe destinations are refused.
- Unsubscribe is a manual checklist, not a sender-controlled HTTP/SMTP action.
- Error output acknowledges partial moves and does not claim that nothing can be lost.
- Public archive permits exactly the 24 documented files; private notes/data cannot ship.

## Verification

- Initial version 1.1: 54 offline Python tests passed in source and after extraction.
- No real credentials, mailbox sessions, unsubscribe requests, or mail mutations were used.
- Build and product-folder verification passed. The download verifier compares
  each packed file with source, extracts the ZIP and tests the shipped copy.
- Existing generated ZIP payloads were compared entry-by-entry with HEAD and preserved.
- Local Playwright storefront suite passed: 55 existing responsive layouts, all paid
  product pages, member login/library mocks, all five admin views and broadcast routes.
- New page tested at 360, 390, 768, 1440, and 1920 pixels, including all five choices,
  quickstart disclosure, and the real public ZIP download. Screenshots visually checked.
- Live Gmail/iCloud interoperability and native Windows execution are NOT certified.
  These limits are disclosed in the download and public product page.
- Existing large Three.js bundle warning remains; no dependency change was made.
- Unrelated pre-existing stream-assets/day-2-pos-build-run-sheet.md changes were untouched.

The latest shared handoff records final commit and Render production verification.

## Follow-up

Test a backed-up disposable mailbox with explicit owner authorization before claiming
live-provider acceptance. Only restore automated unsubscribe after a reviewed design
validates trustworthy per-message authentication and unsubscribe-header coverage.
