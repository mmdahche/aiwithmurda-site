# Inbox Cleanup Kit

Free, local inbox cleanup for Gmail and iCloud. Version 1.1.0.
Created by Murad Dahche / AI with Murda.

## In plain English

The Python script counts mail from each sender. You choose what stays, what goes
into a folder, what is archived, and what moves to Trash. It shows a preview before
moving anything. You do not need Claude, Codex, or any other AI to run it.

This is a desktop command-line download, not a website that takes your email password,
not a phone app, and not an installed Claude/Codex skill.

## What comes with it

- One Python script, using only Python's built-in libraries.
- A Mac and Windows setup guide, this walkthrough, and a short command reference.
- An offline test suite you can run without an email account.
- An MIT license allowing reuse and modification.

## Important limits

- Delete is the default for EVERY sender you review, including personal senders.
  Pressing Enter chooses move to Trash. Choose Keep for anything you want to leave alone.
- This release cleans INBOX only. Sent, Trash, Archive, and All Mail are not cleanup sources.
- Unsubscribe is guided, not automatic. The script creates a sender checklist.
  You complete unsubscribes in your mail app using its built-in controls.
- It does not empty Trash. Your provider can empty Trash automatically, so recovery
  is time-limited and not guaranteed. Back up important mail before starting.
- Stars/flags and previously deleted messages are checked before each batch and
  left alone. Avoid changing the same mailbox in another app while cleanup runs;
  a flag can change after a check. Mail is not backed up by this protection.
- Your primary sending address is skipped. Add other addresses you send from to
  the account's self list in payload/data/accounts.json, or explicitly Keep them.
  It cannot discover every alias for you.
- Google Workspace policies and account-security settings may prevent app passwords.
  Other providers and Outlook/Microsoft 365 are not supported for cleanup.
- No scheduled background cleanup runs. Future arrivals are not included until
  you scan, preview, and confirm another plan.
- The tests use simulated mail servers. This release has not been acceptance-tested
  against a live Gmail or iCloud mailbox or on a Windows machine.

## 1. Prepare

Read install/SETUP.md. Install Python if needed and create an app-specific password.
Keep the unpacked folder somewhere private, outside Dropbox, iCloud Drive, OneDrive,
shared Desktop folders, or a public code repository.

On Mac, open Terminal. Type cd followed by a space, drag the unpacked
email-cleanup-kit folder into Terminal, and press Return. Then type:

    cd payload

On Windows, open the unpacked folder in File Explorer, open payload, click the
address bar, type powershell, and press Enter.

The commands below are for Mac. On Windows replace python3 with py.

## 2. Connect one account

    python3 email_cleanup.py add-account

Choose a nickname such as personal. Enter your email, select Gmail or iCloud,
and paste the APP PASSWORD, not your normal password. Nothing appears while you
paste the password; that is intentional. The tool checks the login.

Use your own account only. No password should be sent to AI with Murda or pasted into an AI chat.

## 3. Scan a small sample

    python3 email_cleanup.py scan --account personal --limit 100

This reads headers from up to the most recent 100 inbox messages. It does not
download message bodies or attachments, move mail, or mark messages read.
It writes a sender report inside payload/data/personal/.

Headers still contain private information: email addresses, subjects, dates,
and unsubscribe-header URLs. Do not publish these reports.
To scan the whole inbox later, omit --limit 100.

## 4. Review each sender

    python3 email_cleanup.py review --account personal

- Enter or d: Delete, meaning move the scanned messages to Trash.
- k: Keep, leaving that sender's mail alone.
- f: Move to a named folder, such as Receipts.
- a: Archive, out of INBOX but not to Trash.
- u: Move to Trash and add the sender to a manual unsubscribe checklist.
- s: Skip for now, with no saved choice.
- q: Stop reviewing; earlier choices are saved.

Nothing moves during review. Sender choices are saved for later runs, so you are
not asked about already-decided senders again. They still require another preview
and confirmation before any later cleanup.

To change a previous choice:

    python3 email_cleanup.py decide --account personal --sender sender@example.com --action keep

Replace the example address with the real sender. Other action names are
delete, archive, folder, and unsub_delete. Folder also needs:

    --folder-name "Receipts"

Changing choices invalidates an earlier preview.

## 5. Finish unsubscribes in your mail app

    python3 email_cleanup.py unsub --account personal

This writes a plain-text checklist of senders marked u. It sends no requests or
emails and never opens sender-supplied links. Open a message from each recognized
sender in Gmail or your mail app and use its built-in Unsubscribe control when
available. For suspicious mail, use Report Spam instead.

Do this before moving the messages, or find them in Trash while still retained.
The kit does not verify whether an unsubscribe was accepted.

## 6. Preview the exact messages

    python3 email_cleanup.py apply --account personal

Read the destination and count for every sender. The script prints the path of a
saved plan JSON file and the exact command to use it. No mail has moved.
Only message IDs in your scan are eligible; new arrivals are not added silently.

To preview just one sender first, add --only sender@example.com.

## 7. Apply only after checking

Use the command printed by your own preview. Its shape is:

    python3 email_cleanup.py apply --account personal --from-plan "THE-PATH-PRINTED-BY-YOUR-PREVIEW" --execute

Do not run the placeholder above unchanged. The path must refer to YOUR saved plan.
You will see the plan again and must type the exact MOVE number confirmation,
such as MOVE 12. Blank input or a different answer cancels.

The script verifies the account, mailbox identity, current choices, current sender,
and flags. If the mailbox identity changed, scan and preview again. There is no
fast mode that skips checks, no permanent-delete fallback, and no global Trash emptying.

When complete, open your mail app and inspect Trash, Archive, or the chosen folder.
Only after this small run looks right should you scan a larger group.

## If something stops or looks wrong

Stop and inspect your mailbox and payload/data/personal/applied.log.
Some batches may already have moved. A failed copy-then-move can leave duplicates
or a deleted flag in the source. Do not assume an error means nothing happened.
There is no automatic retry, rollback, or guarantee that counts prove every copy.

Restore any still-retained mail through your provider's Trash/Archive/folder controls.
Do not empty Trash during testing. Provider retention is not controlled by this kit.
For login failures, create a new app password rather than disabling certificate checks.

## Passwords and local data

The app password is stored unencrypted in payload/data/secrets/. On Mac/Linux
the script requests owner-only file permissions. On Windows, permissions depend
on the folder's access controls; use a private Windows account and folder.
Anyone who can read the password file could access your mail account.

Sender reports, plans, and logs are local too. They are not encrypted.
There is no telemetry. Mail commands go to your configured provider over verified TLS.

To remove the saved password:

    python3 email_cleanup.py remove-account --account personal

Also revoke the app password at Google or Apple. Removing an account keeps its
reports and decisions; delete those local data files yourself if you no longer need them.
Never share a ZIP made from your used folder. Share the original clean download.

## Tests and help

From the outer email-cleanup-kit folder, run:

    python3 -B -m unittest discover -s tests -v

See VERIFY.md for scope and limitations. Contact: murad@aiwithmurda.com.
