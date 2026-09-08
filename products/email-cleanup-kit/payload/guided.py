"""Numbered local setup and cleanup menu, using the same guarded cleanup engine."""
import argparse
import getpass
import imaplib
import os
from pathlib import Path
import sys
import warnings

from . import email_cleanup as engine
from .ai_review import export_report, read_suggestions


def choose(prompt, options, default="0"):
    while True:
        answer = input(f"{prompt} [{default}]: ").strip().lower() or default
        if answer in options:
            return answer
        print("Choose one of: " + ", ".join(options))


def yes(prompt):
    return choose(prompt + " (y/n)", ("y", "n"), "n") == "y"


def account():
    accounts = engine.load_accounts() if os.path.exists(engine.ACCOUNTS_FILE) else {}
    names = sorted(accounts)
    print("\nChoose your account:")
    for i, name in enumerate(names, 1):
        print(f"  {i}. {engine.dec(name)} - {engine.dec(accounts[name]['email'])}")
    print("  a. Connect an account or replace an app password\n  0. Back")
    answer = choose("Account", [str(i) for i in range(1, len(names) + 1)] + ["a", "0"])
    if answer == "0":
        return None
    if answer == "a":
        if not sys.stdin.isatty():
            raise RuntimeError("Enter the app password yourself in an interactive terminal, never an AI chat or piped command.")
        print("\nUse a private, non-synced folder. App passwords and reports are stored unencrypted locally.")
        print("Read install/SETUP.md first. Do not enter your normal email password.")
        if not yes("Ready to enter an app password locally?"):
            return None
        # Never let getpass fall back to echoing a secret into a pipe or transcript.
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            engine.add_account()
        print("Choose the connected account to continue.")
        return account()
    return engine.get_account(names[int(answer) - 1])


def scan_step(acc):
    print("\nSCAN - read-only, inbox headers only. No mail will move.")
    print("  1. Up to 100 recent messages (first-run size)\n  2. Up to 500 recent messages\n  0. Back")
    size = choose("Sample size", ("1", "2", "0"), "1")
    if size == "0":
        return False
    ranked, total, skipped, uv, box = engine.scan(acc, "INBOX", 100 if size == "1" else 500)
    engine.write_scan(acc, "INBOX", ranked, total, skipped, uv, box)
    print(f"\nScanned {sum(s['count'] for s in ranked)} messages from {len(ranked)} senders. Nothing moved.")
    return True


def finish(acc):
    rules = engine.load_rules(acc)
    if any(r["action"] == "unsub_delete" for r in rules["senders"].values()):
        engine.unsub(acc)
        print("Complete unsubscribes through your mail app before moving the messages. This tool sends none.")
    if not yes("Show a fresh preview of the exact messages and destinations?"):
        print("Choices saved. No cleanup started.")
        return
    path = engine.apply(acc)
    print("\nRead every sender, destination and count above. Trash can be emptied by your provider.")
    if not yes("Proceed to the final confirmation for THIS preview?"):
        print("Preview saved. Nothing moved. The next run will create a fresh preview.")
        return
    engine.apply(acc, from_plan=path, execute=True)


def cleanup(acc, recommendations=None, rescan=True):
    print("\nBack up important mail first. This kit has no backup or automatic undo.")
    if rescan and not scan_step(acc):
        return
    print("\nREVIEW - saved choices are shown again. Delete is the default, even for personal senders.")
    print("Skip preserves an existing choice; Quit stops this run without starting cleanup.")
    if not engine.review(acc, include_known=True, recommendations=recommendations):
        print("Review stopped. Earlier choices are saved. No cleanup started.")
        return
    finish(acc)


def ai_export(acc):
    if not scan_step(acc):
        return
    path = export_report(acc)
    print(f"\nAI report saved locally:\n{path}")
    print("It contains sender EMAIL ADDRESSES and counts. It is not anonymous.")
    print("No subjects, display names, bodies, passwords or unsubscribe links are included.")
    print("Nothing has been uploaded. Inspect this file before choosing to share it with your AI provider.")
    print("Read ai/START-WITH-AI.md. Share only this report, not the whole data folder.")
    print("Ask for a suggestions JSON file, then use menu option 4 to review it yourself.")


def edit_choices(acc):
    rules = engine.load_rules(acc)
    entries = [(bucket, key) for bucket in ("senders", "domains") for key in sorted(rules[bucket])]
    if not entries:
        print("No saved choices yet. Run a small scan and review first.")
        return
    print("\nSaved choices for this account, including senders outside the latest scan:")
    for i, (bucket, key) in enumerate(entries, 1):
        rule = rules[bucket][key]
        destination = f" -> {engine.dec(rule['folder'])}" if rule.get("folder") else ""
        kind = "Domain (all matching senders)" if bucket == "domains" else "Sender"
        print(f"  {i}. {kind}: {engine.dec(key)} = {engine.dec(rule['action'])}{destination}")
    print("  0. Back")
    selection = choose("Choice to edit", [str(i) for i in range(1, len(entries) + 1)] + ["0"])
    if selection == "0":
        return
    bucket, key = entries[int(selection) - 1]
    print("d = Trash, k = Keep, a = Archive, f = Folder, u = manual unsubscribe + Trash, 0 = cancel")
    action = choose("New choice (blank cancels)", [*engine.CHOICES, "0"])
    if action == "0":
        return
    folder = None
    if action == "f":
        folder = input("New folder name (blank cancels): ").strip()
        if not folder:
            return
        if len(folder) > 200:
            raise ValueError("Folder names must be at most 200 characters.")
    engine.decide(acc, sender=key if bucket == "senders" else None,
                  domain=key if bucket == "domains" else None,
                  action=engine.CHOICES[action], folder_name=folder)
    print("Choice saved. Nothing moved. Any older preview is invalid; create a new preview before cleanup.")


def main():
    parser = argparse.ArgumentParser(description="Inbox Cleanup Kit: guided local menu")
    parser.add_argument("--demo", action="store_true", help="practice with sample mail; no account or network")
    parser.add_argument("--check", action="store_true", help="check Python and entry files without connecting or reading credentials")
    args = parser.parse_args()
    try:
        if args.check:
            print(f"Python {sys.version.split()[0]} is ready. No extra Python packages needed.")
            print("Next: run start.py or open your platform launcher. Choose Practice first.")
            return
        if args.demo:
            from .practice import run
            run()
            return
        while True:
            print("\nINBOX CLEANUP KIT\n"
                  "  1. Practice with sample mail (no account needed)\n"
                  "  2. Clean my inbox without AI\n"
                  "  3. Prepare a sender report for my AI\n"
                  "  4. Review my AI's suggestions\n"
                  "  5. Change saved sender choices\n"
                  "  0. Exit\n"
                  "Both routes use the same preview and final confirmation. Nothing runs in the background.")
            action = choose("Next step", ("1", "2", "3", "4", "5", "0"))
            if action == "0":
                return
            if action == "1":
                from .practice import run
                run()
                continue
            acc = account()
            if not acc:
                continue
            if action == "2":
                cleanup(acc)
            elif action == "3":
                ai_export(acc)
            elif action == "4":
                path = input("Path to the suggestions JSON file (blank cancels): ").strip()
                if not path:
                    continue
                # Path is opened as a file only. Never evaluate a shell command or AI text.
                path = Path(path.strip('"\'')).expanduser()
                suggestions = read_suggestions(acc, path)
                print(f"Loaded {len(suggestions)} suggestions. None have been applied.")
                cleanup(acc, recommendations=suggestions, rescan=False)
            elif action == "5":
                edit_choices(acc)
    except (EOFError, KeyboardInterrupt):
        print("\nStopped. Earlier choices are saved. If cleanup started, inspect your mailbox before retrying.")
    except (RuntimeError, OSError, ValueError, KeyError, TypeError, imaplib.IMAP4.error, getpass.GetPassWarning) as error:
        sys.exit(f"Stopped: {engine.dec(str(error))}\nNo automatic retry. If cleanup started, some moves may have completed; inspect the mailbox and log.")
