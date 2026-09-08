# Changelog

## 1.1.0 — 2026-09-08

- Public AI with Murda release.
- Delete (move to Trash) is the default review choice; all review options retained.
- Require saved previews and typed execution approval; only scanned message IDs are eligible.
- Bind previews to account, mailbox identity, destinations, and current choices.
- Recheck sender and flags before each batch. Fail closed on incomplete server responses.
- Remove deletion-only archive fallback, global EXPUNGE, and unsafe fast/probe paths.
- Restrict cleanup to Gmail/iCloud INBOX; preserve unsupported folders.
- Replace unauthenticated automatic unsubscribe with a manual sender checklist.
- Add offline regression tests and plain-English privacy and recovery limits.
