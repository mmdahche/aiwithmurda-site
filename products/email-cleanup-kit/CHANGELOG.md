# Changelog

## 1.2.0 — 2026-09-08

- Added Mac/Windows launchers and a numbered, local setup and cleanup menu.
- Added a disposable practice inbox using the same review/preview code with a simulated server.
- Added optional AI guidance, minimal sender reports, and data-only suggestion review.
- AI suggestions are bound to a scan and cannot execute themselves or supply commands.
- Added guided re-review of saved choices. Quit stops the current cleanup path.
- Preserved Delete-to-Trash default, all choices, manual unsubscribes and typed plan confirmation.
- No AI account or paid generation is bundled. Live-provider and native Windows acceptance remain outstanding.

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
