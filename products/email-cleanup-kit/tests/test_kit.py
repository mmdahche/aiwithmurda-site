"""Offline tests: fake mailboxes only. No real credentials or network access."""
import contextlib
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "payload" / "email_cleanup.py"
spec = importlib.util.spec_from_file_location("cleanup", MODULE)
kit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kit)


class Mailbox:
    def __init__(self):
        self.messages = {"7": ("newsletter@example.com", set()), "99": ("other@example.com", {"\\Deleted"})}
        self.uv = 100
        self.commands = []
        self.copies = {}
        self.fail = None
        self.partial = False
        self.readonly = True

    def select(self, name, readonly=True):
        self.readonly = readonly
        self.commands.append(("SELECT", name, readonly))
        return "OK", [str(len(self.messages)).encode()]

    def response(self, name):
        return name, [str(self.uv if name == "UIDVALIDITY" else 101).encode()]

    def create(self, name):
        self.commands.append(("CREATE", name))
        return ("NO" if self.fail == "CREATE" else "OK"), []

    def logout(self):
        self.commands.append(("LOGOUT",))

    def fetch(self, ids, fields):
        self.commands.append(("SCAN", ids, fields))
        if self.fail == "SCAN": return "NO", []
        result = []
        ordered = list(self.messages.items())
        for sequence in self.ids(ids):
            uid, (sender, flags) = ordered[int(sequence) - 1]
            meta = f'{sequence} (UID {uid} FLAGS ({" ".join(flags)}) INTERNALDATE "08-Sep-2026 12:00:00 +0000")'.encode()
            result.append((meta, f"From: {sender}\r\nSubject: Example only\r\n\r\n".encode()))
        return "OK", result

    def ids(self, text):
        result = []
        for bit in text.split(","):
            if ":" in bit:
                lo, hi = map(int, bit.split(":"))
                result.extend(str(i) for i in range(lo, hi + 1))
            else: result.append(bit)
        return result

    def uid(self, command, *args):
        self.commands.append((command, *args))
        if self.fail == command: return "NO", [b"failed"]
        if command == "SEARCH":
            return "OK", [" ".join(u for u in self.ids(args[-1]) if u in self.messages).encode()]
        ids = self.ids(args[0])
        if command == "FETCH":
            result = []
            for uid in ids:
                if uid not in self.messages: continue
                sender, flags = self.messages[uid]
                flagtext = " ".join(flags)
                meta = f"1 (UID {uid} FLAGS ({flagtext}) BODY[HEADER.FIELDS (FROM)] {{80}}".encode()
                result.append((meta, f"From: {sender}\r\n\r\n".encode()))
            return "OK", result[:-1] if self.partial else result
        if command in ("MOVE", "COPY", "STORE", "EXPUNGE"):
            if self.readonly: raise AssertionError("A write happened in a read-only mailbox")
        if command in ("MOVE", "COPY"):
            self.copies.setdefault(args[1], []).extend(u for u in ids if u in self.messages)
        if command == "STORE":
            for uid in ids:
                if uid in self.messages: self.messages[uid][1].add("\\Deleted")
        if command in ("MOVE", "EXPUNGE"):
            for uid in ids: self.messages.pop(uid, None)
        return "OK", []

    def expunge(self):
        raise AssertionError("Global EXPUNGE must never be used")


class KitTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        for name, value in (
            ("INBOX_ROOT", self.tmp.name),
            ("SECRETS_DIR", os.path.join(self.tmp.name, "secrets")),
            ("ACCOUNTS_FILE", os.path.join(self.tmp.name, "accounts.json")),
        ):
            p = patch.object(kit, name, value); p.start(); self.addCleanup(p.stop)
        p = patch.object(socket, "create_connection", side_effect=AssertionError("Network access prohibited"))
        p.start(); self.addCleanup(p.stop)
        self.acc = {"name": "personal", "email": "owner@example.com", "provider": "gmail",
                    "host": "imap.gmail.com", "port": 993, "self": ["owner@example.com"],
                    "trash_folder": "Trash", "all_mail_folder": "Archive",
                    "_folders": {"INBOX", "Trash", "Archive"}, "_caps": {"MOVE", "UIDPLUS"},
                    "_sent_folders": ["Sent"], "_junk_folders": ["Junk"]}
        self.mail = Mailbox()
        self.rules = {"version": 1, "account": self.acc["email"], "senders": {
            "newsletter@example.com": {"action": "delete"}}, "domains": {}}
        kit.save_rules(self.acc, self.rules)
        self.sender = {"email": "newsletter@example.com", "name": "Newsletter", "count": 1,
                       "unread": 1, "starred": 0, "last": "2026-09-08", "bulk": True,
                       "uids": [7], "subjects": ["A sample message"], "one_click": True,
                       "dkim_pass": False, "unsub_mailto": None, "unsub_https": "https://example.com/"}
        self.write_scan()

    def write_scan(self, uv=100, sender=None, email=None):
        self.scanpath = Path(kit.acc_dir(self.acc)) / "scan-INBOX-2026-09-08_000000.json"
        self.scanpath.write_text(json.dumps({"email": email or self.acc["email"], "folder": "INBOX",
            "folder_real": "INBOX", "uidvalidity": uv, "senders": [sender or self.sender]}))

    def run_apply(self, **kwargs):
        with patch.object(kit, "connect", return_value=self.mail), contextlib.redirect_stdout(io.StringIO()):
            return kit.apply(self.acc, **kwargs)

    def plan(self):
        self.run_apply()
        return str(sorted(Path(kit.acc_dir(self.acc)).glob("plan-*.json"))[-1])

    def execute(self, path, answer="MOVE 1"):
        with patch("builtins.input", return_value=answer):
            self.run_apply(execute=True, from_plan=path)

    def writes(self):
        return [c for c in self.mail.commands if c[0] in ("MOVE", "COPY", "STORE", "EXPUNGE", "CREATE")]

    def test_delete_is_default_for_every_sender(self):
        for bulk in (True, False):
            self.assertEqual(kit.suggest({"bulk": bulk}), "d")

    def test_all_review_actions_remain(self):
        self.assertEqual(set(kit.CHOICES.values()), set(kit.ACTIONS))

    def test_review_enter_is_delete_not_execution(self):
        kit.save_rules(self.acc, dict(self.rules, senders={}))
        with patch("builtins.input", return_value=""), contextlib.redirect_stdout(io.StringIO()):
            kit.review(self.acc)
        self.assertEqual(kit.load_rules(self.acc)["senders"][self.sender["email"]]["action"], "delete")
        self.assertFalse(self.writes())

    def test_review_keep(self):
        kit.save_rules(self.acc, dict(self.rules, senders={}))
        with patch("builtins.input", return_value="k"), contextlib.redirect_stdout(io.StringIO()):
            kit.review(self.acc)
        self.assertEqual(kit.load_rules(self.acc)["senders"][self.sender["email"]]["action"], "keep")

    def test_review_skip(self):
        kit.save_rules(self.acc, dict(self.rules, senders={}))
        with patch("builtins.input", return_value="s"), contextlib.redirect_stdout(io.StringIO()):
            kit.review(self.acc)
        self.assertFalse(kit.load_rules(self.acc)["senders"])

    def test_review_quit_and_eof(self):
        kit.save_rules(self.acc, dict(self.rules, senders={}))
        with patch("builtins.input", side_effect=EOFError), contextlib.redirect_stdout(io.StringIO()):
            kit.review(self.acc)
        self.assertFalse(kit.load_rules(self.acc)["senders"])

    def test_review_folder(self):
        kit.save_rules(self.acc, dict(self.rules, senders={}))
        with patch("builtins.input", side_effect=["f", "Receipts"]), contextlib.redirect_stdout(io.StringIO()):
            kit.review(self.acc)
        self.assertEqual(kit.load_rules(self.acc)["senders"][self.sender["email"]]["folder"], "Receipts")

    def test_dry_run_is_readonly_and_bound(self):
        path = self.plan()
        saved = json.loads(Path(path).read_text())
        self.assertFalse(self.writes())
        self.assertEqual(saved["binding"]["email"], self.acc["email"])
        self.assertEqual(saved["uidvalidity"], 100)
        self.assertEqual(saved["plan"][0]["uids"], ["7"])

    def test_execute_without_preview_blocked(self):
        with self.assertRaisesRegex(RuntimeError, "requires"):
            self.run_apply(execute=True)
        self.assertFalse(self.writes())

    def test_confirmation_is_required(self):
        self.execute(self.plan(), answer="")
        self.assertFalse(self.writes())

    def test_confirmed_delete_moves_to_trash(self):
        self.execute(self.plan())
        self.assertNotIn("7", self.mail.messages)
        self.assertIn("99", self.mail.messages)
        self.assertEqual(self.mail.copies['"Trash"'], ["7"])

    def test_copy_fallback_uses_scoped_expunge(self):
        self.acc["_caps"] = {"UIDPLUS"}
        self.execute(self.plan())
        self.assertIn("99", self.mail.messages)
        self.assertIn(("EXPUNGE", "7"), self.mail.commands)

    def test_old_server_is_untouched(self):
        self.acc["_caps"] = set()
        with self.assertRaisesRegex(RuntimeError, "MOVE or UIDPLUS"): self.execute(self.plan())
        self.assertFalse(self.writes())

    def test_failed_copy_never_marks_deleted(self):
        self.acc["_caps"] = {"UIDPLUS"}
        path = self.plan(); self.mail.fail = "COPY"
        with self.assertRaises(RuntimeError): self.execute(path)
        self.assertFalse(any(c[0] in ("STORE", "EXPUNGE") for c in self.mail.commands))

    def test_failed_store_never_expunges(self):
        self.acc["_caps"] = {"UIDPLUS"}
        path = self.plan(); self.mail.fail = "STORE"
        with self.assertRaises(RuntimeError): self.execute(path)
        self.assertFalse(any(c[0] == "EXPUNGE" for c in self.mail.commands))

    def test_failed_expunge_is_reported(self):
        self.acc["_caps"] = {"UIDPLUS"}
        path = self.plan(); self.mail.fail = "EXPUNGE"
        with self.assertRaises(RuntimeError): self.execute(path)
        self.assertIn("7", self.mail.messages)

    def test_failed_move_has_no_delete_fallback_even_with_all_attribute(self):
        self.acc["_gmail_all"] = True
        self.rules["senders"][self.sender["email"]]["action"] = "archive"
        kit.save_rules(self.acc, self.rules)
        path = self.plan(); self.mail.fail = "MOVE"
        with self.assertRaises(RuntimeError): self.execute(path)
        self.assertFalse(any(c[0] in ("STORE", "EXPUNGE") for c in self.mail.commands))

    def test_failed_flag_lookup_aborts_preview(self):
        self.mail.fail = "FETCH"
        with self.assertRaises(RuntimeError): self.plan()
        self.assertFalse(list(Path(kit.acc_dir(self.acc)).glob("plan-*.json")))

    def test_incomplete_flags_abort(self):
        self.mail.partial = True
        with self.assertRaisesRegex(RuntimeError, "could not be checked"): self.plan()

    def test_failed_presence_lookup_aborts(self):
        self.mail.fail = "SEARCH"
        with self.assertRaises(RuntimeError): self.plan()

    def test_starred_mail_not_planned(self):
        self.mail.messages["7"][1].add("\\Flagged")
        self.assertEqual(json.loads(Path(self.plan()).read_text())["plan"], [])

    def test_stars_added_after_preview_are_kept(self):
        path = self.plan()
        self.mail.messages["7"][1].add("\\Flagged")
        self.execute(path)
        self.assertFalse(self.writes())

    def test_stars_added_during_confirmation_are_kept(self):
        path = self.plan()
        def confirm(_):
            self.mail.messages["7"][1].add("\\Flagged")
            return "MOVE 1"
        with patch("builtins.input", side_effect=confirm):
            self.run_apply(execute=True, from_plan=path)
        self.assertFalse(self.writes())

    def test_already_deleted_mail_not_planned(self):
        self.mail.messages["7"][1].add("\\Deleted")
        self.assertEqual(json.loads(Path(self.plan()).read_text())["plan"], [])

    def test_changed_scan_uidvalidity_never_creates_plan(self):
        self.write_scan(uv=99)
        with self.assertRaisesRegex(RuntimeError, "UIDVALIDITY"): self.plan()
        self.assertFalse(list(Path(kit.acc_dir(self.acc)).glob("plan-*.json")))

    def test_missing_scan_uidvalidity_blocked(self):
        self.write_scan(uv=None)
        with self.assertRaisesRegex(RuntimeError, "UIDVALIDITY"): self.plan()

    def test_changed_plan_uidvalidity_blocked(self):
        path = self.plan(); self.mail.uv = 101
        with self.assertRaisesRegex(RuntimeError, "UIDVALIDITY"): self.execute(path)
        self.assertFalse(self.writes())

    def test_sender_mismatch_blocked(self):
        path = self.plan(); self.mail.messages["7"] = ("someoneelse@example.com", set())
        with self.assertRaisesRegex(RuntimeError, "sender"): self.execute(path)
        self.assertFalse(self.writes())

    def test_mail_arriving_after_scan_not_included(self):
        self.mail.messages["8"] = (self.sender["email"], set())
        self.execute(self.plan())
        self.assertIn("8", self.mail.messages)

    def test_removed_mail_is_skipped(self):
        path = self.plan(); self.mail.messages.pop("7")
        self.execute(path)
        self.assertFalse(self.writes())

    def test_changed_keep_rule_invalidates_plan(self):
        path = self.plan()
        self.rules["senders"][self.sender["email"]]["action"] = "keep"
        kit.save_rules(self.acc, self.rules)
        with self.assertRaisesRegex(RuntimeError, "choices changed"): self.execute(path)
        self.assertFalse(self.writes())

    def test_changed_account_binding_blocked(self):
        for field, value in (("email", "another@example.com"), ("host", "another.example.com"), ("trash_folder", "Bin")):
            with self.subTest(field=field):
                original = self.acc[field]; path = self.plan(); self.acc[field] = value
                with self.assertRaises((RuntimeError, SystemExit)): self.execute(path)
                self.acc[field] = original
        self.assertFalse(self.writes())

    def test_protected_sources_blocked(self):
        for folder in ("Trash", "Sent", "all", "[Gmail]/All Mail"):
            with self.assertRaisesRegex(RuntimeError, "INBOX"): self.run_apply(folder=folder)
        self.assertFalse(self.writes())

    def test_protected_destinations_blocked(self):
        for action, folder in (("folder", "INBOX"), ("folder", "Trash"), ("folder", "Sent"), ("folder", "Junk")):
            with self.assertRaises(RuntimeError): kit.safe_destination(self.acc, action, folder)

    def test_unknown_action_blocked(self):
        with self.assertRaises(RuntimeError): kit.safe_destination(self.acc, "purge")

    def test_control_characters_in_folder_blocked(self):
        with self.assertRaises(RuntimeError): kit.safe_destination(self.acc, "folder", "Receipts\nSent")

    def test_other_provider_cannot_execute(self):
        self.acc["provider"] = "other"
        with self.assertRaisesRegex(RuntimeError, "Gmail and iCloud"): self.run_apply()

    def test_icloud_uses_same_safe_path(self):
        self.acc.update(provider="icloud", host="imap.mail.me.com")
        self.execute(self.plan())
        self.assertIn("99", self.mail.messages)

    def test_folder_creation_failure_aborts(self):
        self.rules["senders"][self.sender["email"]].update(action="folder", folder="Receipts")
        kit.save_rules(self.acc, self.rules)
        path = self.plan(); self.mail.fail = "CREATE"
        with self.assertRaises(RuntimeError): self.execute(path)
        self.assertIn("7", self.mail.messages)

    def test_archive_moves_to_archive(self):
        self.rules["senders"][self.sender["email"]]["action"] = "archive"
        kit.save_rules(self.acc, self.rules)
        self.execute(self.plan())
        self.assertEqual(self.mail.copies['"Archive"'], ["7"])

    def test_own_sender_is_excluded(self):
        self.sender["email"] = self.acc["email"]
        self.mail.messages["7"] = (self.acc["email"], set())
        self.rules["senders"][self.acc["email"]] = {"action": "delete"}
        kit.save_rules(self.acc, self.rules); self.write_scan()
        self.assertEqual(json.loads(Path(self.plan()).read_text())["plan"], [])

    def test_duplicate_uids_in_plan_blocked(self):
        path = self.plan()
        saved = json.loads(Path(path).read_text()); saved["plan"][0]["uids"].append("7")
        Path(path).write_text(json.dumps(saved))
        with self.assertRaisesRegex(RuntimeError, "Duplicate"): self.execute(path)

    def test_old_plan_format_blocked(self):
        path = self.plan()
        saved = json.loads(Path(path).read_text()); saved["version"] = 1
        Path(path).write_text(json.dumps(saved))
        with self.assertRaisesRegex(RuntimeError, "older kit"): self.execute(path)

    def test_unsub_sends_nothing_and_includes_no_untrusted_links(self):
        self.rules["senders"][self.sender["email"]]["action"] = "unsub_delete"
        kit.save_rules(self.acc, self.rules)
        with patch.object(kit, "connect", side_effect=AssertionError("No mail connection allowed")), contextlib.redirect_stdout(io.StringIO()):
            kit.unsub(self.acc)
        text = next(Path(kit.acc_dir(self.acc)).glob("unsubscribe-review-*.txt")).read_text()
        self.assertIn(self.sender["email"], text)
        self.assertNotIn(self.sender["unsub_https"], text)
        self.assertIn("No requests or emails have been sent", text)

    def test_terminal_escape_stripped(self):
        self.assertNotIn("\x1b", kit.dec("Hello\x1b[2J"))

    def test_folded_headers_unfold(self):
        self.assertEqual(kit.parse_unsub("<https://example.com/a\r\n b>")[1], "https://example.com/ab")

    def test_rules_belong_to_account(self):
        self.rules["account"] = "another@example.com"; kit.save_rules(self.acc, self.rules)
        with self.assertRaises(SystemExit): kit.load_rules(self.acc)

    def test_domain_rule_with_exact_keep_override(self):
        rules = {"senders": {self.sender["email"]: {"action": "keep"}}, "domains": {"example.com": {"action": "delete"}}}
        self.assertEqual(kit.rule_for(rules, self.sender["email"])["action"], "keep")

    def test_setup_uses_verified_tls(self):
        mail = unittest.mock.Mock()
        mail.capability.return_value = ("OK", [b"IMAP4rev1 MOVE UIDPLUS"])
        mail.list.return_value = ("OK", [b'(\\Trash) "/" "Trash"', b'(\\All) "/" "All Mail"'])
        with patch.object(kit, "load_secret", return_value="FAKE-APP-PASSWORD"), patch.object(kit.imaplib, "IMAP4_SSL", return_value=mail) as connect:
            kit.connect(self.acc)
        self.assertTrue(connect.call_args.kwargs["ssl_context"].check_hostname)
        self.assertNotIn("_gmail_all", self.acc)

    def test_scan_is_readonly_and_limited(self):
        with patch.object(kit, "connect", return_value=self.mail), contextlib.redirect_stderr(io.StringIO()):
            ranked, total, skipped, uv, folder = kit.scan(self.acc, "INBOX", limit=1)
        self.assertEqual(sum(s["count"] for s in ranked), 1)
        self.assertEqual(total, 2)
        self.assertEqual(uv, 100)
        self.assertTrue(self.mail.readonly)
        self.assertIn("BODY.PEEK", next(c[2] for c in self.mail.commands if c[0] == "SCAN"))
        self.assertFalse(self.writes())

    def test_scan_failure_does_not_report_success(self):
        self.mail.fail = "SCAN"
        with patch.object(kit, "connect", return_value=self.mail), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError, "No new scan saved"): kit.scan(self.acc, "INBOX")

    def test_missing_trash_folder_blocks_preview(self):
        self.acc["_folders"].remove("Trash")
        with self.assertRaisesRegex(RuntimeError, "Trash folder"): self.plan()

    def test_setup_password_private_and_not_printed(self):
        self.mail = unittest.mock.Mock()
        self.mail.select.return_value = ("OK", [b"0"])
        output = io.StringIO()
        with patch("builtins.input", side_effect=["setup", "me@gmail.com", "gmail"]), patch.object(kit.getpass, "getpass", return_value="FAKE-PASSWORD-ONLY"), patch.object(kit, "connect", return_value=self.mail), contextlib.redirect_stdout(output):
            kit.add_account()
        password = Path(kit.SECRETS_DIR) / "setup.env"
        self.assertIn("FAKE-PASSWORD-ONLY", password.read_text())
        self.assertNotIn("FAKE-PASSWORD-ONLY", output.getvalue())
        if os.name != "nt": self.assertEqual(password.stat().st_mode & 0o777, 0o600)

    def test_remove_account_removes_password_but_preserves_reports(self):
        kit.save_accounts({"personal": {"email": "owner@example.com", "secret_var": "PERSONAL_PASSWORD"}})
        Path(kit.SECRETS_DIR).mkdir()
        secret = Path(kit.SECRETS_DIR) / "personal.env"
        secret.write_text("PERSONAL_PASSWORD=FAKE-PASSWORD-ONLY")
        with contextlib.redirect_stdout(io.StringIO()): kit.remove_account("personal")
        self.assertFalse(secret.exists())
        self.assertTrue(self.scanpath.exists())


if __name__ == "__main__":
    unittest.main()
