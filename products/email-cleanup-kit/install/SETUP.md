# Setup on Mac or Windows

## Python

Use Python 3.9 or newer, ideally a currently supported release from
https://www.python.org/downloads/. No pip packages are required.

- Mac: open Terminal and run python3 --version.
- Windows: open PowerShell and run py --version. If not found, install Python
  with its Windows launcher, then reopen PowerShell.

If a Mac Python installation cannot verify certificates, run its bundled
Install Certificates.command in Applications/Python 3.x. Never disable TLS checks.

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

Only enter it at the local script's hidden password prompt.
Keep the unpacked kit in a private, non-synced folder.
Make a backup of important mail, then follow the small-sample walkthrough in README.md.
