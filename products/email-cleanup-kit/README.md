# Inbox Cleanup Kit

Version 1.2.0. Free from Murad Dahche / AI with Murda.

One tool, two ways to use it. Without AI, choose each sender's action yourself.
With AI, get suggestions from a limited sender report, then approve choices in
the same local menu. The kit itself never calls an AI service.

## What you still need

A Mac or Windows computer, Python 3.9 or newer, a Gmail or iCloud account, and
an app-specific password. No additional Python packages are needed. The AI route
also requires your own compatible assistant; its subscription or usage charges
are separate. Neither route is a phone app or hosted cleanup website.

This is easier setup, not zero setup. The launcher opens a text menu in a terminal.
It does not install Python, change your computer's security, or create an app password.

## Start with practice

1. Extract the ZIP fully. Keep the folder in a private place outside cloud sync.
2. Read install/SETUP.md. Install Python from its official site if needed.
3. Open Start on Mac.command or Start on Windows.cmd. If your system blocks it,
   use the manual opening instructions in the setup guide; do not disable security.
4. Choose 1, Practice. Try the whole process with eight made-up messages before
   giving the tool access to an inbox. No account, password, AI or network is used.

## Without AI

Choose 2, Clean my inbox without AI. Select or connect your account, scan up to
100 recent messages, and review the senders. You choose each action.

- Enter or d: Delete, meaning move to Trash. This is the default for every sender,
  including people and senders the AI might recommend keeping.
- k: Keep, leaving the sender alone.
- a: Archive, out of the inbox but not to Trash.
- f: Folder, then type a normal folder name such as Receipts.
- u: Manual unsubscribe checklist plus a proposed move to Trash.
- s: Skip; any previous saved choice for this sender stays in effect.
- q: Stop this review without continuing to cleanup. Earlier choices remain saved.

Saved choices are shown again in the guided menu. Option 5 lets you change them
without starting cleanup. Skipping a previously decided sender does NOT cancel
its choice; use Keep to leave its mail alone.

After review, the menu asks whether to preview. Then it asks whether to proceed
to final confirmation. Read every sender, count and destination before typing
the exact MOVE number. Blank input cancels. A preview alone moves nothing.

## With AI

Read ai/START-WITH-AI.md. Option 3 makes a read-only scan and a limited AI report.
It includes real sender addresses, counts, and saved choices. It excludes names,
subjects, bodies, passwords and unsubscribe links. It is NOT anonymous.

Inspect it before sharing that one file with your AI provider. Give your assistant
ai/SKILL.md, ai/SUGGESTIONS.md and the included starter prompt. Do not give it the
whole used folder or payload/data. Ask for advice, not unattended mailbox access.

Option 4 reads the resulting suggestions file and shows each recommendation
beside the normal choices. Nothing is automatically accepted or executed.
You still choose each sender's action and complete the same preview/confirmation.

## Important limits

- Gmail/iCloud INBOX only. It reads headers, not bodies or attachments. A sender
  can mix receipts and promotions: choose Keep when one action would be too broad.
- Unsubscribe is manual. The tool makes a checklist; finish each unsubscribe in
  your mail app. It never opens sender links or sends unsubscribe requests.
- Back up important mail first. Trash may be emptied automatically by your provider.
  No built-in backup, permanent-delete command, automatic undo, or background job.
- Starred/flagged and already-deleted messages are rechecked and skipped. Avoid
  simultaneous mailbox edits. Your primary sending address is skipped; mark
  your other sending aliases Keep because they are not automatically discovered.
- App passwords, full header scans and reports stay locally, unencrypted, under
  payload/data. Anyone who can read those files can see that data. Never publish
  them or share a ZIP made from a used kit. Share the original clean download.
- The kit itself uploads nothing to AI with Murda. Choosing to share a report
  with an AI assistant sends its contents to that provider under your account terms.
- Automated tests use fake servers. Live-provider acceptance and native Windows
  testing are still outstanding. Start with a small group and inspect the result.

## When finished or when something fails

Inspect your mail app. If cleanup failed, some moves may have completed; do not
blindly retry. Check your own local applied.log. See ADVANCED.md for details and
for removing the stored app password. Revoke the app password with Google or Apple
when finished. Account removal leaves reports and choices intact.

Offline tests: from this folder, run python3 -B -m unittest discover -s tests
(Windows: py -3 -B -m unittest discover -s tests). See VERIFY.md for coverage.

Contact: murad@aiwithmurda.com. MIT licensed; see LICENSE.
