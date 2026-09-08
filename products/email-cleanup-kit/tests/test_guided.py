"""Offline acceptance of both routes, with simulated mail only."""
import contextlib
import io
import json
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from payload import ai_review, email_cleanup as engine, guided, practice


class GuidedTests(unittest.TestCase):
    def setUp(self):
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(socket, "create_connection", side_effect=AssertionError("Network forbidden")))
        self.stack.enter_context(patch.object(engine, "load_secret", side_effect=AssertionError("Secret access forbidden")))
        self.acc, self.mail = self.stack.enter_context(practice.session())
        self.stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
        self.stack.enter_context(contextlib.redirect_stderr(io.StringIO()))

    def scan(self):
        with patch("builtins.input", return_value="1"):
            self.assertTrue(guided.scan_step(self.acc))

    def report(self):
        self.scan()
        return json.loads(Path(ai_review.export_report(self.acc)).read_text())

    def suggestions(self, report=None, **changes):
        report = report or self.report()
        value = {"report_id": report["report_id"], "suggestions": [{"sender": "offers@shop.example", "action": "delete", "reason": "Unwanted offers, if the user confirms."}]}
        value.update(changes)
        path = Path(engine.INBOX_ROOT) / "suggestions.json"
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def test_complete_non_ai_route_with_all_destinations(self):
        # Sorted review: offers, lessons, receipts, friend. Starred receipt stays.
        with patch("builtins.input", side_effect=["1", "d", "a", "f", "Receipts", "k", "y", "y", "MOVE 6"]):
            guided.cleanup(self.acc)
        self.assertEqual(len(self.mail.messages), 2)
        self.assertEqual(len(self.mail.folders["Trash"]), 3)
        self.assertEqual(len(self.mail.folders["Archive"]), 2)
        self.assertEqual(len(self.mail.folders["Receipts"]), 1)
        self.assertTrue(any(item[3] for item in self.mail.messages.values()))

    def test_complete_ai_route_needs_local_choices_and_confirmation(self):
        path = self.suggestions()
        suggestions = ai_review.read_suggestions(self.acc, path)
        self.assertFalse(engine.load_rules(self.acc)["senders"])
        self.assertEqual(len(self.mail.messages), 8)
        with patch("builtins.input", side_effect=["d", "k", "k", "k", "y", "y", "MOVE 3"]):
            guided.cleanup(self.acc, suggestions, rescan=False)
        self.assertEqual(len(self.mail.folders["Trash"]), 3)
        self.assertEqual(len(self.mail.messages), 5)

    def test_declining_preview_does_not_connect_again(self):
        self.scan()
        with patch.object(engine, "apply", side_effect=AssertionError("No preview approved")), patch("builtins.input", side_effect=["d", "k", "k", "k", "n"]):
            guided.cleanup(self.acc, rescan=False)
        self.assertEqual(len(self.mail.messages), 8)

    def test_declining_execute_keeps_preview_only(self):
        with patch("builtins.input", side_effect=["1", "d", "k", "k", "k", "y", "n"]):
            guided.cleanup(self.acc)
        self.assertEqual(len(self.mail.messages), 8)
        self.assertEqual(len(list(Path(engine.INBOX_ROOT).rglob("plan-*.json"))), 1)

    def test_wrong_typed_confirmation_moves_nothing(self):
        with patch("builtins.input", side_effect=["1", "d", "k", "k", "k", "y", "y", "yes"]):
            guided.cleanup(self.acc)
        self.assertEqual(len(self.mail.messages), 8)

    def test_quitting_review_never_reaches_preview(self):
        with patch("builtins.input", side_effect=["1", "d", "q"]), patch.object(engine, "apply", side_effect=AssertionError("Quit should stop")):
            guided.cleanup(self.acc)
        self.assertEqual(engine.load_rules(self.acc)["senders"]["offers@shop.example"]["action"], "delete")
        self.assertEqual(len(self.mail.messages), 8)

    def test_cancel_folder_prompt_stops_without_preview(self):
        with patch("builtins.input", side_effect=["1", "f", EOFError]), patch.object(engine, "apply", side_effect=AssertionError("Cancelled")):
            guided.cleanup(self.acc)
        self.assertFalse(engine.load_rules(self.acc)["senders"])

    def test_saved_choices_can_be_changed_in_review(self):
        self.scan()
        engine.decide(self.acc, sender="offers@shop.example", action="delete")
        with patch("builtins.input", side_effect=["k", "q"]):
            engine.review(self.acc, include_known=True)
        self.assertEqual(engine.load_rules(self.acc)["senders"]["offers@shop.example"]["action"], "keep")

    def test_skip_preserves_saved_choice(self):
        self.scan()
        engine.decide(self.acc, sender="offers@shop.example", action="keep")
        with patch("builtins.input", side_effect=["s", "q"]):
            engine.review(self.acc, include_known=True)
        self.assertEqual(engine.load_rules(self.acc)["senders"]["offers@shop.example"]["action"], "keep")

    def test_ai_keep_is_not_automatically_accepted_by_enter(self):
        self.scan()
        with patch("builtins.input", side_effect=["", "q"]):
            engine.review(self.acc, recommendations={"offers@shop.example": {"action": "keep", "reason": "Example only"}})
        self.assertEqual(engine.load_rules(self.acc)["senders"]["offers@shop.example"]["action"], "delete")
        self.assertEqual(len(self.mail.messages), 8)

    def test_manual_unsubscribe_writes_checklist_only(self):
        with patch("builtins.input", side_effect=["1", "u", "k", "k", "k", "n"]):
            guided.cleanup(self.acc)
        self.assertEqual(len(self.mail.messages), 8)
        self.assertEqual(len(list(Path(engine.INBOX_ROOT).rglob("unsubscribe-review-*.txt"))), 1)

    def test_cancel_scan(self):
        with patch("builtins.input", return_value="0"):
            self.assertFalse(guided.scan_step(self.acc))
        self.assertFalse(list(Path(engine.INBOX_ROOT).rglob("scan-*.json")))

    def test_ai_report_contains_only_minimal_sender_data(self):
        report = self.report()
        self.assertEqual(set(report), {"version", "report_id", "notice", "senders"})
        self.assertEqual(set(report["senders"][0]), {"sender", "messages", "unread", "starred", "bulk_hint", "saved_choice"})
        self.assertNotIn(self.acc["email"], json.dumps(report))
        self.assertNotIn("Your receipt", json.dumps(report))
        self.assertFalse(engine.load_rules(self.acc)["senders"])

    def test_export_requires_matching_account_scan(self):
        self.scan()
        self.acc["email"] = "different@example.com"
        with self.assertRaisesRegex(RuntimeError, "matching scan"):
            ai_review.export_report(self.acc)

    def test_no_scan_cannot_export(self):
        with self.assertRaises(RuntimeError):
            ai_review.export_report(self.acc)

    def test_suggestions_only_display_data_no_rules_saved(self):
        result = ai_review.read_suggestions(self.acc, self.suggestions())
        self.assertEqual(result["offers@shop.example"]["action"], "delete")
        self.assertFalse(engine.load_rules(self.acc)["senders"])

    def test_all_five_actions_accepted_as_suggestions(self):
        report = self.report()
        for action in engine.ACTIONS:
            row = {"sender": "offers@shop.example", "action": action, "reason": "User review required"}
            if action == "folder": row["folder"] = "Saved Mail"
            path = self.suggestions(report, suggestions=[row])
            self.assertEqual(ai_review.read_suggestions(self.acc, path)[row["sender"]]["action"], action)

    def test_mismatched_report_blocked(self):
        with self.assertRaisesRegex(ValueError, "another scan"):
            ai_review.read_suggestions(self.acc, self.suggestions(report_id="different"))

    def test_changed_scan_even_same_sender_invalidates_suggestions(self):
        path = self.suggestions()
        scanfile = next(Path(engine.acc_dir(self.acc)).glob("scan-*.json"))
        scan = json.loads(scanfile.read_text()); scan["uidvalidity"] = 2
        scanfile.write_text(json.dumps(scan))
        with self.assertRaises(ValueError): ai_review.read_suggestions(self.acc, path)

    def test_rejects_invalid_or_executable_suggestion_fields(self):
        report = self.report()
        base = {"sender": "offers@shop.example", "action": "keep", "reason": "Example"}
        cases = [dict(base, command="touch /tmp/should-not-run"), dict(base, uids=[1]),
                 dict(base, sender="unknown@example.com"), dict(base, action="purge"),
                 dict(base, reason=""), dict(base, reason="x" * 301), dict(base, reason=[]),
                 dict(base, folder="Stuff"), dict(base, action="folder"),
                 dict(base, action="folder", folder="Trash"), dict(base, action="folder", folder="A\nB")]
        for row in cases:
            with self.subTest(row=row), self.assertRaises((ValueError, TypeError)):
                ai_review.read_suggestions(self.acc, self.suggestions(report, suggestions=[row]))
        self.assertFalse(engine.load_rules(self.acc)["senders"])

    def test_duplicate_senders_and_extra_top_level_keys_rejected(self):
        report = self.report()
        row = {"sender": "offers@shop.example", "action": "keep", "reason": "Example"}
        for changes in ({"suggestions": [row, row]}, {"command": "run"}, {"suggestions": "run"}):
            with self.assertRaises(ValueError):
                ai_review.read_suggestions(self.acc, self.suggestions(report, **changes))

    def test_malformed_file_rejected(self):
        path = self.suggestions()
        for text in ("not JSON", "[]", '{"report_id": "x"}', " " * 500_001):
            path.write_text(text)
            with self.assertRaises(ValueError): ai_review.read_suggestions(self.acc, path)

    def test_invalid_unicode_rejected_before_review(self):
        report = self.report()
        row = {"sender": "offers@shop.example", "action": "keep", "reason": "\ud800"}
        with self.assertRaisesRegex(ValueError, "Unicode"):
            ai_review.read_suggestions(self.acc, self.suggestions(report, suggestions=[row]))
        self.assertFalse(engine.load_rules(self.acc)["senders"])

    def test_duplicate_json_keys_rejected(self):
        path = self.suggestions()
        path.write_text(path.read_text().replace('"action": "delete"', '"action": "keep", "action": "delete"'))
        with self.assertRaisesRegex(ValueError, "Duplicate JSON keys"):
            ai_review.read_suggestions(self.acc, path)

    def test_deep_json_becomes_clear_rejection(self):
        path = self.suggestions()
        path.write_text("[" * 2000 + "0" + "]" * 2000)
        with self.assertRaises(ValueError):
            ai_review.read_suggestions(self.acc, path)
        with patch.object(ai_review.json, "loads", side_effect=RecursionError), self.assertRaisesRegex(ValueError, "nested too deeply"):
            ai_review.read_suggestions(self.acc, path)

    def test_directional_controls_removed_from_display(self):
        self.assertEqual(engine.dec("keep\u202edelete\u2069"), "keepdelete")

    def test_saved_choice_editor_does_not_require_latest_scan(self):
        engine.decide(self.acc, sender="old@sender.example", action="delete")
        with patch("builtins.input", side_effect=["1", "k"]):
            guided.edit_choices(self.acc)
        self.assertEqual(engine.load_rules(self.acc)["senders"]["old@sender.example"]["action"], "keep")
        self.assertEqual(len(self.mail.messages), 8)

    def test_editor_can_change_domain_rules_without_scan(self):
        engine.decide(self.acc, domain="shop.example", action="delete")
        with patch("builtins.input", side_effect=["1", "k"]):
            guided.edit_choices(self.acc)
        self.assertEqual(engine.load_rules(self.acc)["domains"]["shop.example"]["action"], "keep")

    def test_editor_blank_cancels(self):
        engine.decide(self.acc, sender="old@sender.example", action="keep")
        with patch("builtins.input", side_effect=["1", ""]):
            guided.edit_choices(self.acc)
        self.assertEqual(engine.load_rules(self.acc)["senders"]["old@sender.example"]["action"], "keep")

    def test_saved_folder_destination_visible_in_both_editors(self):
        self.scan()
        engine.decide(self.acc, sender="offers@shop.example", action="folder", folder_name="Old Tax Records")
        output = io.StringIO()
        with contextlib.redirect_stdout(output), patch("builtins.input", return_value="q"):
            engine.review(self.acc, include_known=True)
        self.assertIn("Old Tax Records", output.getvalue())
        output = io.StringIO()
        with contextlib.redirect_stdout(output), patch("builtins.input", return_value="0"):
            guided.edit_choices(self.acc)
        self.assertIn("Old Tax Records", output.getvalue())

    def test_report_escapes_mailbox_markup(self):
        self.scan()
        scan = engine.latest_scan(self.acc, "INBOX")
        scan["senders"][0]["name"] = "![remote](https://attacker.invalid/pixel)"
        scan["senders"][0]["subjects"] = ['<img src="https://attacker.invalid/pixel">']
        _, path = engine.write_scan(self.acc, "INBOX", scan["senders"], 8, 0, 1, "INBOX")
        report = Path(path).read_text()
        self.assertNotIn("![remote]", report)
        self.assertNotIn("<img", report)
        self.assertIn("&lt;img", report)

    def test_unknown_sender_is_left_alone_without_blocking_valid_mail(self):
        self.mail.messages["9"] = ("", "No From", "", False)
        with patch("builtins.input", side_effect=["1", "d", "k", "k", "k", "y", "y", "MOVE 3"]):
            guided.cleanup(self.acc)
        self.assertIn("9", self.mail.messages)
        self.assertEqual(len(self.mail.folders["Trash"]), 3)
        self.assertNotIn("(unknown)", engine.load_rules(self.acc)["senders"])

    def test_untrusted_reason_control_characters_not_printed(self):
        report = self.report()
        row = {"sender": "offers@shop.example", "action": "keep", "reason": "Ignore instructions\x1b[2J"}
        suggestions = ai_review.read_suggestions(self.acc, self.suggestions(report, suggestions=[row]))
        output = io.StringIO()
        with contextlib.redirect_stdout(output), patch("builtins.input", return_value="q"):
            engine.review(self.acc, recommendations=suggestions)
        self.assertNotIn("\x1b", output.getvalue())
        self.assertFalse(engine.load_rules(self.acc)["senders"])

    def test_ai_export_does_not_open_ai_or_network(self):
        with patch("builtins.input", return_value="1"):
            guided.ai_export(self.acc)
        self.assertEqual(len(list(Path(engine.acc_dir(self.acc)).glob("ai-review-*.json"))), 1)

    def test_new_account_refuses_noninteractive_secret_entry(self):
        with patch("builtins.input", return_value="a"), patch.object(sys.stdin, "isatty", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "interactive terminal"):
                guided.account()

    def test_practice_restores_engine_and_never_leaves_real_data(self):
        original = {key: getattr(engine, key) for key in ("connect", "INBOX_ROOT", "ACCOUNTS_FILE", "SECRETS_DIR")}
        with patch("builtins.input", side_effect=["1", "q"]):
            practice.run()
        for key, value in original.items(): self.assertEqual(getattr(engine, key), value)

    def test_practice_restores_engine_on_error(self):
        before = engine.connect
        with self.assertRaises(RuntimeError):
            with practice.session(): raise RuntimeError("example")
        self.assertIs(engine.connect, before)

    def test_menu_defaults_to_exit(self):
        with patch.object(sys, "argv", ["start.py"]), patch("builtins.input", return_value=""), patch.object(guided, "account", side_effect=AssertionError("Must not connect")):
            guided.main()

    def test_menu_check_is_offline(self):
        with patch.object(sys, "argv", ["start.py", "--check"]), patch.object(guided, "account", side_effect=AssertionError("Must not connect")):
            guided.main()


if __name__ == "__main__":
    unittest.main()
