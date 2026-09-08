# Inbox Cleanup Kit

A free tool from AI with Murda. Sort inbox clutter by sender, review your choices,
then move only the messages in your saved preview.

**Delete is the default review choice. It means move to Trash, not empty Trash.**
Pressing Enter during review records that choice, including for personal senders.
Read each sender carefully. Nothing moves until you preview, choose that saved
plan, and type the final confirmation.

Keep, Folder, Archive, Delete, and Unsubscribe + Trash are available.
Skip and Quit leave undecided senders alone.
Unsubscribe + Trash creates a manual unsubscribe checklist; it does not unsubscribe
automatically. Complete that part in your mail app.

## Start here

1. Read README.md for the full walkthrough and risks.
2. Follow install/SETUP.md for Python and an app password.
3. Open a terminal in this folder, then type: cd payload
4. On Mac: python3 email_cleanup.py add-account
5. On Windows: py email_cleanup.py add-account
6. Start with just 100 recent messages, as shown in QUICKSTART.txt.

Gmail or iCloud, a desktop computer, Python 3.9+, and an app password are required.
No AI subscription, Python packages, or paid AI with Murda product is required.
If your account does not offer app passwords, do not weaken its security to use this kit.

Back up important mail first. Trash retention varies, and your provider may empty it
automatically. This kit does not make a backup or offer an automatic undo.
Do not put this folder in a shared or cloud-synced location once you connect an account.
