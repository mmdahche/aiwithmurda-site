"""Disposable, in-memory mailbox for practice. Never connects to a mail provider."""
from contextlib import contextmanager
from email.message import EmailMessage
import tempfile

from . import email_cleanup as engine


SAMPLE = [
    ("offers@shop.example", "Weekend deals", "bulk", False),
    ("offers@shop.example", "Sale ends Friday", "bulk", False),
    ("offers@shop.example", "New arrivals", "bulk", False),
    ("notes@learning.example", "Lesson one", "bulk", False),
    ("notes@learning.example", "Lesson two", "bulk", False),
    ("alex@friends.example", "Lunch on Tuesday?", "", False),
    ("receipts@store.example", "Your receipt", "", False),
    ("receipts@store.example", "Important saved receipt", "", True),
]


class PracticeMailbox:
    def __init__(self):
        self.messages = {str(i): item for i, item in enumerate(SAMPLE, 1)}
        self.folders = {"Trash": [], "Archive": []}
        self.readonly = True

    def select(self, _name, readonly=True):
        self.readonly = readonly
        return "OK", [str(len(self.messages)).encode()]

    def response(self, name):
        return name, [b"1" if name == "UIDVALIDITY" else b"9"]

    def logout(self):
        pass

    def create(self, name):
        self.folders.setdefault(name.strip('"'), [])
        return "OK", []

    @staticmethod
    def ids(text):
        out = []
        for piece in text.split(","):
            lo, _, hi = piece.partition(":")
            out.extend(str(n) for n in range(int(lo), int(hi or lo) + 1))
        return out

    def header(self, uid, sequence):
        sender, subject, bulk, starred = self.messages[uid]
        msg = EmailMessage()
        msg["From"] = sender
        msg["Subject"] = subject
        if bulk:
            msg["Precedence"] = bulk
        flags = "\\Flagged" if starred else ""
        meta = f'{sequence} (UID {uid} FLAGS ({flags}) INTERNALDATE "08-Sep-2026 12:00:00 +0000")'
        return meta.encode(), msg.as_bytes()

    def fetch(self, sequence, _fields):
        keys = list(self.messages)
        return "OK", [self.header(keys[int(i) - 1], i) for i in self.ids(sequence)]

    def uid(self, command, *args):
        keys = self.ids(args[-1] if command == "SEARCH" else args[0])
        keys = [key for key in keys if key in self.messages]
        if command == "SEARCH":
            return "OK", [" ".join(keys).encode()]
        if command == "FETCH":
            return "OK", [self.header(key, key) for key in keys]
        if command == "MOVE" and not self.readonly:
            dest = args[1].strip('"').replace('\\"', '"').replace("\\\\", "\\")
            self.folders.setdefault(dest, []).extend(self.messages.pop(key) for key in keys)
            return "OK", []
        raise RuntimeError("Unsupported practice operation; no real mailbox exists here.")


@contextmanager
def session():
    fields = ("INBOX_ROOT", "ACCOUNTS_FILE", "SECRETS_DIR", "connect")
    original = {key: getattr(engine, key) for key in fields}
    with tempfile.TemporaryDirectory(prefix="inbox-practice-") as folder:
        mailbox = PracticeMailbox()
        acc = {"name": "practice", "email": "learner@example.com", "provider": "gmail",
               "host": "sample.invalid", "port": 993, "self": ["learner@example.com"],
               "all_mail_folder": "Archive", "trash_folder": "Trash", "_folders": {"INBOX", "Archive", "Trash"},
               "_sent_folders": ["Sent"], "_junk_folders": ["Junk"], "_caps": {"MOVE"}}
        engine.INBOX_ROOT = folder
        engine.ACCOUNTS_FILE = folder + "/accounts.json"
        engine.SECRETS_DIR = folder + "/secrets"
        engine.connect = lambda _acc: mailbox
        try:
            yield acc, mailbox
        finally:
            for key, value in original.items():
                setattr(engine, key, value)


def run():
    from .guided import cleanup
    print("\nPRACTICE ONLY - eight made-up messages. No account, password, AI or internet needed.")
    print("This uses the real review and preview code with a simulated mailbox, not a live provider test.")
    print("Try Delete for offers, Archive for lessons, Keep for Alex and Folder for receipts.")
    print("All changes below affect sample mail only. Practice choices disappear when you exit.\n")
    with session() as (acc, mailbox):
        cleanup(acc)
        print(f"\nPRACTICE RESULT: {len(mailbox.messages)} sample messages left in the inbox.")
        for name, items in mailbox.folders.items():
            print(f"  {engine.dec(name)}: {len(items)} sample messages")
        print("Your real email was never connected or changed.")
