---
source: rubyx
date_added: 2026-09-08
type: project
---

# Inbox Cleanup Kit

Murad explicitly approved publishing the email-cleanup freebie and making Delete
the default review choice while retaining the other options.

- Maintained release: products/email-cleanup-kit. Desktop original was not changed.
- Public page: /free/inbox-cleanup. ZIP: /downloads/email-cleanup-kit.zip.
- Separate from the existing free Operator Sampler. No sign-in/email gate.
- Delete = move to Trash, never a command to empty Trash. Provider retention still applies.
- Keep, Archive, Folder, Unsubscribe + Trash, Skip, Quit retained.
- Preview is read-only. Execution requires the exact saved plan and typed MOVE confirmation.
- Plans bind email, host, mailbox, UIDVALIDITY, destinations, and current choices.
- Per-batch sender/flag checks; new arrivals excluded until another scan.
- No global EXPUNGE or deletion-only archive fallback. Failures stop, not silently retry.
- Only Gmail/iCloud INBOX cleanup. Live mailbox and Windows acceptance tests not performed.
- Unsubscribe now writes a manual sender checklist. Original automation trusted unsafe,
  mismatched headers. It is deliberately not shipped as automatic unsubscribe.
- Password files and reports remain local and unencrypted, disclosed publicly and in docs.
- Public archive allowlist excludes runtime data, credentials, and internal review notes.
- 54 offline regression tests pass in source and a fresh ZIP extraction. Browser tests
  cover 55 existing layouts plus five inbox-page sizes, choices, download, member/admin gates.

No user mailbox was accessed or modified. No paid package, billing, admin permission,
campaign record, OBS setting, or existing download payload changed.
See the latest shared handoff for committed revision and production verification.
