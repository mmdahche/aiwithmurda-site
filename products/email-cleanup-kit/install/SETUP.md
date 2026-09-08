# Setup on Mac or Windows

## Python

Use Python 3.9 or newer, ideally a currently supported release from
https://www.python.org/downloads/. No pip packages are required.

- Mac: open Terminal and run python3 --version.
- Windows: open PowerShell and run py --version. If not found, install Python
  with its Windows launcher, then reopen PowerShell.

If a Mac Python installation cannot verify certificates, run its bundled
Install Certificates.command in Applications/Python 3.x. Never disable TLS checks.

## Open the guided menu

Extract the ZIP fully first. Do not run files inside a ZIP preview. Keep the
folder in a private, non-synced location before connecting an email account.

On Mac, open Start on Mac.command. On Windows, open Start on Windows.cmd.
The launcher opens a terminal menu; it is not a signed desktop app. Your system
may warn about downloaded scripts. Do not disable Gatekeeper, SmartScreen,
antivirus, or change global execution policy to run this kit. Inspect the source
and use the manual route below if you choose to run it.

Manual on Mac:

1. Open Terminal. Type cd followed by a space.
2. Drag the extracted email-cleanup-kit folder into Terminal and press Return.
3. Type: python3 -B start.py

Manual on Windows:

1. Open the extracted email-cleanup-kit folder in File Explorer.
2. Click its address bar, type powershell, and press Enter.
3. Type: py -3 -B start.py

If Python is not recognized, install it from the official site and reopen the
terminal. Nothing in this download installs Python automatically. The --check
option checks Python readiness without reading passwords or connecting:

    python3 -B start.py --check

Choose 1, Practice, before connecting an account. Practice needs no app password.

## Gmail

Your account needs 2-Step Verification and access to app passwords.
Create one at https://myaccount.google.com/apppasswords.
Name it for this local cleanup tool so you can recognize and revoke it later.

Some organization accounts, Advanced Protection, or security-key-only setups
do not offer app passwords. Do not turn off stronger protections to use this kit.
Ask your administrator or use Gmail's built-in cleanup controls instead.

Official help: https://support.google.com/accounts/answer/185833

## iCloud

Use your Apple Account's app-specific password flow at https://account.apple.com.
Open Sign-In and Security, then App-Specific Passwords.
Two-factor authentication is required.

Official help: https://support.apple.com/102654

## Before entering a password

Only enter it yourself at the local script's hidden password prompt. Do not let
an AI assistant capture the setup session or read its password file. No letters
or dots appear while entering the password; this is normal. The guided menu
refuses account setup through a noninteractive pipe.
Keep the unpacked kit in a private, non-synced folder.
Make a backup of important mail, then follow the small-sample walkthrough in README.md.
