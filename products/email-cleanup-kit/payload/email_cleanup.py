#!/usr/bin/env python3
"""Inbox Cleanup Kit - local, reviewed inbox cleanup for Gmail and iCloud.

  add-account                          setup with an app password
  scan --account NAME --limit 100       read-only scan of up to 100 recent emails
  review --account NAME                 Enter chooses Delete (move to Trash)
  unsub --account NAME                  write a MANUAL unsubscribe checklist
  apply --account NAME                  preview and save an exact plan
  apply --account NAME --from-plan PATH --execute
                                       recheck and ask for typed confirmation

Keep, Folder, Archive, Delete, Unsubscribe + Trash, Skip, and Quit are available.
Nothing moves during scan or review. Execution requires a saved plan AND confirmation.
No unsubscribe links are opened, no unsubscribe emails are sent, and no AI is required.
Only INBOX is a cleanup source. Stars/flags and already deleted messages are rechecked.
Trash may be automatically emptied by your provider. This is not a backup or undo tool.
App passwords and mail-header reports stay in this folder; keep it private.
"""

import argparse, email, getpass, glob, hashlib, html, imaplib, json, os, re, shutil, ssl, sys, time, warnings
from collections import defaultdict
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.utils import parseaddr

imaplib.Commands.setdefault("MOVE", ("SELECTED",))
imaplib._MAXLINE = max(getattr(imaplib, "_MAXLINE", 0), 10_000_000)
KIT_DIR = os.path.dirname(os.path.abspath(__file__))
INBOX_ROOT = os.path.expanduser(os.environ.get("EMAIL_CLEANUP_ROOT", os.path.join(KIT_DIR, "data")))
SECRETS_DIR = os.path.join(INBOX_ROOT, "secrets")
PY = "py" if os.name == "nt" else "python3"   # how the user types "python" on their platform, for the hints
ACCOUNTS_FILE = os.path.join(INBOX_ROOT, "accounts.json")
HDR_FIELDS = "FROM DATE SUBJECT LIST-UNSUBSCRIBE LIST-UNSUBSCRIBE-POST LIST-ID PRECEDENCE AUTHENTICATION-RESULTS"
READ_CHUNK, WRITE_CHUNK = 500, 200
ACTIONS = ("keep", "folder", "archive", "delete", "unsub_delete")
PROVIDER_DEFAULTS = {
    "gmail":  {"host": "imap.gmail.com",   "all": "[Gmail]/All Mail", "trash": "[Gmail]/Trash",    "smtp": "smtp.gmail.com",   "smtp_port": 465},
    "icloud": {"host": "imap.mail.me.com", "all": "Archive",          "trash": "Deleted Messages", "smtp": "smtp.mail.me.com", "smtp_port": 587},
}

# ---------- small helpers ----------
def now_stamp(): return datetime.now().strftime("%Y-%m-%d_%H%M%S")
def now_iso(): return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
def today(): return datetime.now().date().isoformat()
def acc_dir(acc): d = os.path.join(INBOX_ROOT, acc["name"]); os.makedirs(d, mode=0o700, exist_ok=True); return d
def rules_path(acc): return os.path.join(acc_dir(acc), "rules.json")
def q(name): return '"' + name.replace("\\", "\\\\").replace('"', '\\"') + '"'
def log_line(acc, text):
    with open(os.path.join(acc_dir(acc), "applied.log"), "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {text}\n")
def compress(uids):
    nums = sorted({int(u) for u in uids}); out = []; i = 0
    while i < len(nums):
        j = i
        while j + 1 < len(nums) and nums[j + 1] == nums[j] + 1: j += 1
        out.append(str(nums[i]) if i == j else f"{nums[i]}:{nums[j]}"); i = j + 1
    return ",".join(out)
def batches(seq, n):
    for i in range(0, len(seq), n): yield seq[i:i + n]
def dec(s):
    if not s: return ""
    try: out = str(make_header(decode_header(s)))
    except Exception: out = str(s)
    out = re.sub(r"\s+", " ", out).strip()
    return re.sub(r"[\x00-\x1f\x7f-\x9f\ud800-\udfff\u200e\u200f\u202a-\u202e\u2066-\u2069]", "", out)

def md_cell(value):
    text = html.escape(dec(str(value)), quote=False)
    return re.sub(r"([\\`*_{}\[\]()#+.!|>\-])", r"\\\1", text)

def actionable_sender(addr):
    return isinstance(addr, str) and "@" in addr and parseaddr(addr)[1] == addr
def disk_ok():
    free = shutil.disk_usage(os.path.expanduser("~")).free
    if free < 500 * 1024 * 1024:
        print(f"[warn] only {free // (1024 * 1024)} MB free on the home volume — clear space before large scans", file=sys.stderr)

# ---------- accounts / secrets ----------
def load_accounts():
    if not os.path.exists(ACCOUNTS_FILE): sys.exit(f"no accounts set up yet — run:  {PY} email_cleanup.py add-account")
    with open(ACCOUNTS_FILE, encoding="utf-8") as f: return json.load(f)

def get_account(name):
    accts = load_accounts()
    if name not in accts: sys.exit(f"unknown account '{name}'; known: {sorted(accts)}")
    acc = dict(accts[name]); acc["name"] = name
    prov = PROVIDER_DEFAULTS.get(acc.get("provider", "gmail"), PROVIDER_DEFAULTS["gmail"])
    for k, v in (("host", prov["host"]), ("port", 993), ("all_mail_folder", prov["all"]), ("trash_folder", prov["trash"]),
                 ("smtp_host", prov["smtp"]), ("smtp_port", prov["smtp_port"]), ("self", [acc["email"]])):
        acc.setdefault(k, v)
    return acc

def secret_path(acc):
    """data/secrets/<nickname>.env, found relative to wherever the kit folder is now. An older registry entry with
    an absolute path is honoured only if that file still exists."""
    p = os.path.join(SECRETS_DIR, f"{acc['name']}.env")
    if os.path.exists(p): return p
    stored = os.path.expanduser(acc.get("secret_file") or "")
    return stored if stored and os.path.isabs(stored) and os.path.exists(stored) else p

def load_secret(acc):
    path, var = secret_path(acc), acc["secret_var"]
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith(var + "="):
                    return line.strip().split("=", 1)[1].strip().strip('"').strip("'")
    except FileNotFoundError: pass
    sys.exit(f"no stored app password for {acc['email']} — run:  {PY} email_cleanup.py add-account")

def connect(acc):
    if not acc.get("host"): sys.exit(f"no mail server recorded for {acc['email']} — run:  {PY} email_cleanup.py add-account")
    pw = load_secret(acc)
    try: M = imaplib.IMAP4_SSL(acc["host"], int(acc["port"]), ssl_context=ssl.create_default_context(), timeout=120)
    except ssl.SSLCertVerificationError as e:
        sys.exit(f"could not verify {acc['host']}'s security certificate ({e.reason}).\n"
                 "  -> On a Mac with Python from python.org, open Applications/Python 3.x and double-click 'Install Certificates.command', then try again.\n"
                 "  -> If you are on a hotel/office/school network that intercepts connections, try from a different network. Never disable this check.")
    except OSError as e:
        sys.exit(f"could not reach {acc['host']} ({e}).\n  -> Check your internet connection and try again. Some office and school networks block mail ports.")
    try: M.login(acc["email"], pw)
    except imaplib.IMAP4.error as e:
        sys.exit(f"login failed for {acc['email']}: {e}\n  -> your mail provider rejected the app password. Make a new one (Gmail: myaccount.google.com/apppasswords · iCloud: account.apple.com) and run:  {PY} email_cleanup.py add-account")
    typ, caps = M.capability()
    acc["_caps"] = set(caps[0].decode().upper().split()) if typ == "OK" and caps and caps[0] else set()
    # discover folders + SPECIAL-USE (\All, \Trash) so English folder names are never assumed
    typ, boxes = M.list()
    if typ != "OK":
        M.logout()
        raise RuntimeError("Folder discovery failed. No cleanup can proceed.")
    folders, special = set(), {}
    acc["_delim"] = "/"
    for b in boxes or []:
        s = b.decode(errors="replace") if isinstance(b, bytes) else str(b)
        m = re.match(r'\((?P<attrs>[^)]*)\) "?(?P<delim>[^" ]*)"? (?P<name>.+)$', s)
        if not m: continue
        if m.group("delim"): acc["_delim"] = m.group("delim")
        name = m.group("name").strip()
        if len(name) >= 2 and name[0] == '"' and name[-1] == '"': name = name[1:-1].replace('\\"', '"').replace("\\\\", "\\")
        folders.add(name)
        for tag in ("\\All", "\\Archive", "\\Trash", "\\Junk", "\\Sent"):
            if tag.lower() in m.group("attrs").lower().split(): special[tag] = name
    acc["_folders"] = folders
    acc["_sent_folders"] = [special["\\Sent"]] if "\\Sent" in special else ["Sent", "[Gmail]/Sent Mail"]
    acc["_junk_folders"] = [special["\\Junk"]] if "\\Junk" in special else ["Junk", "[Gmail]/Spam"]
    if "\\All" in special: acc["all_mail_folder"] = special["\\All"]
    elif "\\Archive" in special: acc["all_mail_folder"] = special["\\Archive"]
    if "\\Trash" in special: acc["trash_folder"] = special["\\Trash"]
    elif acc["trash_folder"] not in folders:
        for cand in ("Trash", "Deleted Messages", "[Gmail]/Trash"):
            if cand in folders: acc["trash_folder"] = cand; break
    return M

def select(M, folder, readonly=True):
    typ, data = M.select(q(folder), readonly=readonly)
    if typ != "OK": sys.exit(f"cannot open folder {folder}: {data}")
    uv = M.response("UIDVALIDITY")[1]
    return int(data[0]), (int(uv[0]) if uv and uv[0] else None)

def count_in(M, folder):
    typ, data = M.select(q(folder), readonly=True)
    return int(data[0]) if typ == "OK" else -1

def uidnext(M):
    """UIDNEXT of the currently selected folder (call right after select). Lets verify ignore mail that arrives mid-run."""
    v = M.response("UIDNEXT")[1]
    return int(v[0]) if v and v[0] else None

def count_below(M, folder, uid_limit):
    """Messages in folder with UID < uid_limit, i.e. only those that existed when the run started."""
    if uid_limit is None: return count_in(M, folder)
    M.select(q(folder), readonly=True)
    typ, data = M.uid("SEARCH", None, "UID", f"1:{uid_limit - 1}")
    return len(data[0].split()) if typ == "OK" and data and data[0] else 0

# ---------- rules ----------
def load_rules(acc):
    p = rules_path(acc)
    if not os.path.exists(p): return {"version": 1, "account": acc["email"], "senders": {}, "domains": {}}
    with open(p, encoding="utf-8") as f: rules = json.load(f)
    owner = (rules.get("account") or "").lower()
    if owner and owner != acc["email"].lower():
        sys.exit(f"the decisions saved under '{acc['name']}' belong to {rules['account']}, not {acc['email']}.\n"
                 f"  -> Pick a different nickname, or delete the folder {acc_dir(acc)} to start that one fresh.")
    return rules

def save_rules(acc, rules):
    tmp = rules_path(acc) + ".tmp"   # write-then-rename so a crash mid-write can never leave a half file
    with open(tmp, "w", encoding="utf-8") as f: json.dump(rules, f, indent=1, sort_keys=True)
    os.replace(tmp, rules_path(acc))

def rule_for(rules, addr):
    r = rules["senders"].get(addr)
    if r: return r
    dom = addr.split("@")[-1]
    for d, r in rules["domains"].items():
        if dom == d or dom.endswith("." + d): return r
    return None

def scan_slug(which): return re.sub(r"[^A-Za-z0-9_.-]", "_", which)   # folder names like [Gmail]/Spam are not file names

def latest_scan(acc, folder):
    files = sorted(glob.glob(os.path.join(glob.escape(acc_dir(acc)), f"scan-{glob.escape(scan_slug(folder))}-*.json")))
    if not files: return None
    with open(files[-1], encoding="utf-8") as f: return json.load(f)

def newest_scan_folder(acc):
    """The --folder word of the most recent scan, so review/apply follow whatever the user last scanned."""
    files = sorted(glob.glob(os.path.join(glob.escape(acc_dir(acc)), "scan-*.json")), key=os.path.getmtime)
    if not files: return "INBOX"
    with open(files[-1], encoding="utf-8") as f: return json.load(f).get("folder", "INBOX")

def all_scan_senders(acc):
    """Every sender from every scan, newest first, one record per address — so unsubscribe data survives a
    re-scan that ran after their mail was already moved out of the inbox."""
    files = sorted(glob.glob(os.path.join(glob.escape(acc_dir(acc)), "scan-*.json")), key=os.path.getmtime, reverse=True)
    seen, out = set(), []
    for p in files:
        with open(p, encoding="utf-8") as f: sc = json.load(f)
        for s in sc.get("senders", []):
            if s["email"] not in seen: seen.add(s["email"]); out.append(s)
    return out

def parse_unsub(h):
    if not h: return (None, None)
    # a long header gets folded onto a second line by the sender; unfolding leaves a space inside the URL
    urls = [re.sub(r"\s+", "", u) for u in (re.findall(r"<([^>]+)>", h) or [h.strip()])]
    return (next((u for u in urls if u.lower().startswith("mailto:")), None),
            next((u for u in urls if u.lower().startswith("https://")), None))

# ---------- scan ----------
def scan(acc, which, limit=None):
    disk_ok()
    M = connect(acc)
    box = acc["all_mail_folder"] if which == "all" else which
    total, uidvalidity = select(M, box, readonly=True)
    print(f"[scan] {acc['email']} folder={box} messages={total} uidvalidity={uidvalidity}", file=sys.stderr)
    S = defaultdict(lambda: {"count": 0, "unread": 0, "first": None, "last": None, "names": defaultdict(int), "subjects": [],
                             "unsub_mailto": None, "unsub_https": None, "one_click": False, "list_id": None, "bulk": False,
                             "dkim_pass": 0, "dkim_seen": 0, "starred": 0, "uids": []})
    self_addrs = {a.lower() for a in acc["self"]}
    lo0 = max(1, total - limit + 1) if limit else 1
    t0 = time.time(); seen = 0; skipped_self = 0; unreadable = 0
    for lo in range(lo0, total + 1, READ_CHUNK):
        up = min(lo + READ_CHUNK - 1, total)
        typ, resp = M.fetch(f"{lo}:{up}", f"(UID FLAGS INTERNALDATE BODY.PEEK[HEADER.FIELDS ({HDR_FIELDS})])")
        if typ != "OK":
            M.logout()
            raise RuntimeError("The scan could not read a message batch. No new scan saved; retry later.")
        for part in resp:
            if not isinstance(part, tuple): continue
            try:
                meta, raw = part[0].decode(errors="replace"), part[1]
                m = re.search(r"UID (\d+)", meta); uid = int(m.group(1)) if m else None
                fl = re.search(r"FLAGS \(([^)]*)\)", meta); flags = fl.group(1) if fl else ""
                idate = None
                m = re.search(r'INTERNALDATE "([^"]+)"', meta)
                if m:
                    try: idate = datetime.strptime(m.group(1), "%d-%b-%Y %H:%M:%S %z").astimezone(timezone.utc)
                    except Exception: pass
                msg = email.message_from_bytes(raw)
                name, addr = parseaddr(dec(msg.get("From", "")))
                addr = (addr or "").lower().strip() or "(unknown)"
                seen += 1
                if addr in self_addrs: skipped_self += 1; continue
                s = S[addr]
                s["count"] += 1; s["unread"] += int("\\Seen" not in flags); s["starred"] += int("\\Flagged" in flags)
                if name: s["names"][name.strip()] += 1
                if idate:
                    s["first"] = idate if not s["first"] or idate < s["first"] else s["first"]
                    s["last"] = idate if not s["last"] or idate > s["last"] else s["last"]
                subj = dec(msg.get("Subject", ""))
                if subj and len(s["subjects"]) < 3 and subj not in s["subjects"]: s["subjects"].append(subj[:90])
                lu = msg.get("List-Unsubscribe")
                if lu:
                    mt, ht = parse_unsub(dec(lu))
                    s["unsub_mailto"] = s["unsub_mailto"] or mt; s["unsub_https"] = s["unsub_https"] or ht
                    if "list-unsubscribe=one-click" in dec(msg.get("List-Unsubscribe-Post")).lower().replace(" ", ""): s["one_click"] = True
                lid = msg.get("List-Id")
                if lid and not s["list_id"]: s["list_id"] = dec(lid)[:80]
                if lu or lid or dec(msg.get("Precedence")).lower() in ("bulk", "list"): s["bulk"] = True
                if uid: s["uids"].append(uid)
            except Exception as e:
                unreadable += 1
                if unreadable <= 3: print(f"[scan] skipped one message it could not read ({type(e).__name__})", file=sys.stderr)
        print(f"[scan] {seen}/{total - lo0 + 1} headers in {time.time() - t0:.1f}s", file=sys.stderr)
    if unreadable:
        M.logout()
        raise RuntimeError("Some messages could not be read. No new scan saved.")
    M.logout()
    rules = load_rules(acc); out = []
    for addr, s in S.items():
        r = rule_for(rules, addr)
        out.append({"email": addr, "name": max(s["names"].items(), key=lambda kv: kv[1])[0] if s["names"] else "",
                    "domain": addr.split("@")[-1] if "@" in addr else "", "count": s["count"], "unread": s["unread"], "starred": s["starred"],
                    "first": s["first"].date().isoformat() if s["first"] else None, "last": s["last"].date().isoformat() if s["last"] else None,
                    "subjects": s["subjects"], "bulk": s["bulk"], "one_click": s["one_click"],
                    "dkim_pass": False,  # Headers alone are not an authentication guarantee.
                    "unsub_mailto": s["unsub_mailto"], "unsub_https": s["unsub_https"], "list_id": s["list_id"],
                    "known_action": (r or {}).get("action"), "known_folder": (r or {}).get("folder"), "uids": s["uids"]})
    out.sort(key=lambda s: (-s["count"], s["email"]))
    return out, total, skipped_self, uidvalidity, box

def write_scan(acc, which, ranked, total, skipped_self, uidvalidity, box):
    stamp = now_stamp(); d = acc_dir(acc)
    jpath = os.path.join(d, f"scan-{scan_slug(which)}-{stamp}.json"); mpath = os.path.join(d, f"scan-{scan_slug(which)}-{stamp}.md")
    with open(jpath, "w", encoding="utf-8") as f:
        json.dump({"account": acc["name"], "email": acc["email"], "folder": which, "folder_real": box, "uidvalidity": uidvalidity,
                   "total": total, "skipped_self": skipped_self, "scanned_at": stamp, "senders": ranked}, f, indent=1)
    known = [s for s in ranked if s["known_action"]]; new = [s for s in ranked if not s["known_action"]]
    with open(mpath, "w", encoding="utf-8") as f:
        f.write(f"# Sender scan — {md_cell(acc['email'])} — {md_cell(box)} — {stamp}\n\n")
        f.write(f"Messages: {total} (own sent skipped: {skipped_self}) · Senders: {len(ranked)} · Already decided: {len(known)} · New: {len(new)}\n\n")
        for title, rows in (("New senders (need a decision)", new), ("Known senders (rule auto-applies)", known)):
            f.write(f"## {title}\n\n| # | Sender | Count | Unread | Starred | Last | Bulk | Unsub | Rule | Sample subject |\n|---|---|---|---|---|---|---|---|---|---|\n")
            for i, s in enumerate(rows, 1):
                who = f"{s['name']} <{s['email']}>" if s["name"] else s["email"]
                unsub = "1-click" if s["one_click"] else ("mailto" if s["unsub_mailto"] else ("link" if s["unsub_https"] else ""))
                rule = (s["known_action"] or "") + (f":{s['known_folder']}" if s.get("known_folder") else "")
                subj = (s["subjects"][0] if s["subjects"] else "").replace("|", "/")
                f.write(f"| {i} | {md_cell(who)} | {s['count']} | {s['unread']} | {s['starred']} | {md_cell(s['last'] or '')} | {'Y' if s['bulk'] else ''} | {unsub} | {md_cell(rule)} | {md_cell(subj)} |\n")
            f.write("\n")
    return jpath, mpath

def card(s):
    unsub = "unsubscribe requires review in your mail app"
    kind = "bulk/newsletter" if s["bulk"] else "looks like a person or a transactional sender"
    who = f"{s['name']} <{s['email']}>" if s["name"] else s["email"]
    star = f", {s['starred']} starred" if s.get("starred") else ""
    return f"{who} — {s['count']} emails ({s['unread']} unread{star}), last {s['last']}, {kind}, {unsub}. e.g. {'; '.join(s['subjects'][:2])}"

# ---------- verified plans and mailbox writes ----------
def checked(typ, operation):
    if typ != "OK":
        raise RuntimeError(f"{operation} failed. Stopped; inspect your mailbox before retrying.")

def mailbox_identity(M):
    data = M.response("UIDVALIDITY")[1]
    if not data or not data[0]:
        raise RuntimeError("The server did not provide UIDVALIDITY. No cleanup can proceed.")
    return int(data[0])

def still_present(M, uids):
    out = set()
    wanted = {str(int(u)) for u in uids}
    for chunk in batches(sorted(wanted, key=int), READ_CHUNK):
        typ, data = M.uid("SEARCH", None, "UID", compress(chunk))
        checked(typ, "Checking message presence")
        if not data or data[0] is None:
            raise RuntimeError("Incomplete message-presence response.")
        found = set(data[0].decode().split())
        if not found <= wanted:
            raise RuntimeError("Unexpected UIDs returned by the server.")
        out.update(found)
    return sorted(out, key=int)

def message_facts(M, uids):
    """Every present UID must have both flags and its own From header."""
    wanted = still_present(M, uids)
    facts = {}
    for part in batches(wanted, WRITE_CHUNK):
        typ, response = M.uid("FETCH", compress(part), "(UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM)])")
        checked(typ, "Rechecking message senders and flags")
        for item in response or []:
            if not isinstance(item, tuple): continue
            meta, raw = item
            uid = re.search(rb"\bUID (\d+)\b", meta)
            flags = re.search(rb"\bFLAGS \(([^)]*)\)", meta)
            if not uid or not flags: continue
            key = uid.group(1).decode()
            if key not in part or key in facts:
                raise RuntimeError("Unexpected or duplicate message identity.")
            msg = email.message_from_bytes(raw)
            headers = msg.get_all("From") or []
            addr = parseaddr(dec(headers[0]))[1].lower().strip() if len(headers) == 1 else ""
            facts[key] = (addr, {f.lower() for f in flags.group(1).decode().split()})
    if set(facts) != set(wanted):
        raise RuntimeError("Some message flags or headers could not be checked. Nothing in this batch moved.")
    return facts

def eligible(M, acc, uids, sender):
    facts = message_facts(M, uids)
    own = {acc["email"].lower(), *(a.lower() for a in acc.get("self", []))}
    kept = []
    for uid, (addr, flags) in facts.items():
        if addr != sender:
            raise RuntimeError("A planned message no longer matches its sender. Scan and preview again.")
        if addr in own or flags & {"\\flagged", "\\deleted"}:
            continue
        kept.append(uid)
    return sorted(kept, key=int)

def safe_destination(acc, action, target=None):
    if action == "archive": target = acc["all_mail_folder"]
    elif action in ("delete", "unsub_delete"): target = acc["trash_folder"]
    elif action != "folder": raise RuntimeError("Unknown action in the saved plan.")
    if not target or len(target) > 200 or "&" in target or any(ord(c) < 32 or ord(c) > 126 for c in target):
        raise RuntimeError("Unsupported destination name. Use a plain ASCII folder name.")
    forbidden = {"inbox", *(s.casefold() for s in acc.get("_sent_folders", []))}
    if action in ("folder", "archive"):
        forbidden.update(s.casefold() for s in (acc["trash_folder"], *acc.get("_junk_folders", [])))
    if target.casefold() in forbidden:
        raise RuntimeError("This destination is not allowed for that action.")
    if action in ("delete", "unsub_delete") and target not in acc["_folders"]:
        raise RuntimeError("The provider's Trash folder was not found. Nothing will move.")
    return target

def ensure_folder(M, acc, name):
    if name in acc["_folders"]: return
    typ, _ = M.create(q(name))
    checked(typ, "Creating destination folder")
    acc["_folders"].add(name)

def move_uids(M, acc, uids, dest):
    """No unscoped EXPUNGE, deletion-only fallback, or guessed success."""
    if not uids: return 0, []
    caps = acc["_caps"]
    if not ({"MOVE", "UIDPLUS"} & caps):
        raise RuntimeError("This server cannot move mail safely: MOVE or UIDPLUS is required.")
    for part in batches(list(uids), WRITE_CHUNK):
        ids = compress(part)
        if "MOVE" in caps:
            typ, _ = M.uid("MOVE", ids, q(dest))
            checked(typ, "Moving messages; a partial move is possible")
        else:
            typ, _ = M.uid("COPY", ids, q(dest))
            checked(typ, "Copying messages to their destination")
            typ, _ = M.uid("STORE", ids, "+FLAGS", "(\\Deleted)")
            checked(typ, "Marking the copied messages; check for duplicates before retrying")
            typ, _ = M.uid("EXPUNGE", ids)
            checked(typ, "Finishing the scoped move; copies may already exist")
        if still_present(M, part):
            raise RuntimeError("The server reported a move but some source messages remain. Stopped.")
    return len(uids), []

def binding(acc, folder):
    return {"email": acc["email"].lower(), "host": acc["host"].lower(), "port": int(acc["port"]),
            "folder": folder, "trash": acc["trash_folder"], "archive": acc["all_mail_folder"]}

def rules_digest(rules):
    # Unsubscribe notes and decision timestamps do not affect message routing.
    routes = {bucket: {k: {"action": v["action"], "folder": v.get("folder")}
                       for k, v in rules[bucket].items()} for bucket in ("senders", "domains")}
    return hashlib.sha256(json.dumps(routes, sort_keys=True).encode()).hexdigest()

def validate_scan(acc, folder, uidvalidity):
    sc = latest_scan(acc, folder)
    if not sc or sc.get("email", "").lower() != acc["email"].lower() or sc.get("folder_real") != folder:
        raise RuntimeError("A matching inbox scan is required. Run scan first.")
    if not uidvalidity or sc.get("uidvalidity") != uidvalidity:
        raise RuntimeError("UIDVALIDITY changed or is missing. Run scan again; old UIDs cannot be reused.")
    return sc

def build_plan(M, acc, folder, rules, only=None):
    uv = mailbox_identity(M)
    sc = validate_scan(acc, folder, uv)
    plan = []
    own = {acc["email"].lower(), *(a.lower() for a in acc.get("self", []))}
    for sender in sc["senders"]:
        addr = sender["email"]
        if not actionable_sender(addr):
            print("Leaving messages with missing or malformed senders untouched. Review those in your mail app.")
            continue
        rule = rule_for(rules, addr)
        if not rule or rule["action"] == "keep" or addr in own or (only and addr not in only): continue
        target = safe_destination(acc, rule["action"], rule.get("folder"))
        ids = eligible(M, acc, sender["uids"], addr)
        if ids:
            plan.append({"sender": addr, "action": rule["action"], "folder": target, "uids": ids, "n": len(ids)})
    return plan, uv

def read_plan(M, acc, folder, path, rules):
    with open(path, encoding="utf-8") as f: saved = json.load(f)
    if saved.get("version") != 2 or saved.get("binding") != binding(acc, folder):
        raise RuntimeError("This plan belongs to another account or folder, or an older kit. Preview again.")
    if saved.get("uidvalidity") != mailbox_identity(M):
        raise RuntimeError("UIDVALIDITY changed. Scan and preview again.")
    if saved.get("rules_digest") != rules_digest(rules):
        raise RuntimeError("Your choices changed since the preview. Preview again.")
    seen = set()
    for item in saved["plan"]:
        if not actionable_sender(item["sender"]):
            raise RuntimeError("Malformed sender in the plan. Create a fresh preview; those messages will be left alone.")
        rule = rule_for(rules, item["sender"])
        if not rule or rule["action"] != item["action"] or item["folder"] != safe_destination(acc, rule["action"], rule.get("folder")):
            raise RuntimeError("Saved plan no longer matches your choices.")
        ids = item["uids"]
        if any(not isinstance(u, str) or not re.fullmatch(r"[1-9][0-9]*", u) for u in ids):
            raise RuntimeError("Invalid message IDs in plan.")
        if len(set(ids)) != len(ids) or seen.intersection(ids):
            raise RuntimeError("Duplicate message IDs in plan.")
        seen.update(ids)
    return saved

def apply(acc, folder="INBOX", only=None, execute=False, from_plan=None):
    if folder.upper() != "INBOX":
        raise RuntimeError("This release only cleans INBOX. Sent, Trash, and All Mail cannot be cleanup sources.")
    folder = "INBOX"
    if acc.get("provider") not in ("gmail", "icloud"):
        raise RuntimeError("This release supports cleanup of Gmail and iCloud only.")
    if execute and not from_plan:
        raise RuntimeError("--execute requires --from-plan with the exact JSON file from your dry run.")
    if from_plan and only:
        raise RuntimeError("Choose --only when creating a preview, not when executing an approved plan.")
    rules = load_rules(acc)
    M = connect(acc)
    try:
        _, uv = select(M, folder, readonly=True)
        if not uv: raise RuntimeError("UIDVALIDITY is missing; no cleanup can proceed.")
        if from_plan:
            saved = read_plan(M, acc, folder, from_plan, rules)
            plan = saved["plan"]
        else:
            plan, uv = build_plan(M, acc, folder, rules, only)
        total = sum(len(p["uids"]) for p in plan)
        print(f"[{'EXECUTE' if execute else 'DRY RUN'}] {acc['email']} / INBOX: up to {total} messages")
        for p in plan: print(f"  {len(p['uids']):5}  {p['sender']} -> {p['folder']} ({p['action']})")
        if not execute:
            if not from_plan:
                path = os.path.join(acc_dir(acc), f"plan-{now_stamp()}-{time.time_ns()}.json")
                with open(path, "x", encoding="utf-8") as f:
                    json.dump({"version": 2, "binding": binding(acc, folder), "uidvalidity": uv,
                               "rules_digest": rules_digest(rules), "plan": plan}, f, indent=2)
                print(f"\nPreview saved: {path}\nRead this plan before running:\n"
                      f'{PY} email_cleanup.py apply --account {acc["name"]} --from-plan "{path}" --execute')
            print("Nothing moved. New arrivals need another scan and preview.")
            return from_plan if from_plan else path
        if not total: print("Nothing to move."); return
        if not ({"MOVE", "UIDPLUS"} & acc["_caps"]):
            raise RuntimeError("The server does not advertise MOVE or UIDPLUS. No messages changed.")
        # Check all planned identities before prompting, then recheck each write batch.
        for p in plan: eligible(M, acc, p["uids"], p["sender"])
        approval = f"MOVE {total}"
        answer = input(f"Move up to {total} messages as shown above? Type {approval} to confirm: ").strip()
        if answer != approval: print("Cancelled. Nothing moved."); return
        if rules_digest(load_rules(acc)) != saved["rules_digest"]:
            raise RuntimeError("Choices changed during confirmation. Preview again.")
        moved = 0
        for p in plan:
            ensure_folder(M, acc, p["folder"])
            for chunk in batches(p["uids"], WRITE_CHUNK):
                if rules_digest(load_rules(acc)) != saved["rules_digest"]:
                    raise RuntimeError("Choices changed during cleanup. Stopped before the next batch.")
                _, current_uv = select(M, folder, readonly=False)
                if current_uv != uv: raise RuntimeError("Mailbox identity changed during cleanup. Stopped.")
                current = eligible(M, acc, chunk, p["sender"])
                if not current: continue
                log_line(acc, f"ATTEMPT sender={p['sender']} destination={p['folder']} uids={compress(current)}")
                n, _ = move_uids(M, acc, current, p["folder"])
                moved += n
                log_line(acc, f"CONFIRMED source removal: {n} messages; destination={p['folder']}")
        print(f"Finished: {moved} moves confirmed by the server and source check. "
              "Newly starred, already removed, and previously deleted messages were left alone. "
              "Inspect the destination in your mail app. Trash retention is set by your provider.")
    finally:
        try: M.logout()
        except Exception: pass

# ---------- guided unsubscribe (no outbound requests) ----------
def unsub(acc, only=None):
    rules = load_rules(acc)
    targets = [s for s in all_scan_senders(acc)
               if rule_for(rules, s["email"]) and rule_for(rules, s["email"])["action"] == "unsub_delete"
               and (not only or s["email"] in only)]
    path = os.path.join(acc_dir(acc), f"unsubscribe-review-{now_stamp()}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("UNSUBSCRIBE REVIEW\n\nNo requests or emails have been sent.\n"
                "Before cleanup, open each sender's message in your mail app. Use your provider's "
                "built-in Unsubscribe button for senders you recognize. For an unfamiliar or suspicious "
                "message, use Report Spam instead. Do not blindly open links in the email.\n"
                "If already moved, look in Trash while it is still retained. No automatic unsubscribe "
                "verification is included. Cleanup rules only run when you scan, preview, and execute again.\n\n")
        for s in targets: f.write(f"- {dec(s['email'])}: {s['count']} messages in saved scan\n")
    print(f"Saved {len(targets)} senders for manual unsubscribe review: {path}\n"
          "Open your mail app to complete each unsubscribe. This command sends nothing.")

# ---------- decide / queue ----------
def decide(acc, sender=None, domain=None, action=None, folder_name=None, note=None):
    if action not in ACTIONS: sys.exit(f"action must be one of {ACTIONS}")
    if action == "folder" and not folder_name: sys.exit("--folder-name required for action=folder")
    if folder_name and ("&" in folder_name or any(ord(ch) < 32 or ord(ch) > 126 for ch in folder_name)):
        sys.exit("folder names must be ASCII without '&' (IMAP modified-UTF-7 gotcha) — use 'and'")
    rules = load_rules(acc)
    key = (sender or domain).lower().strip()
    bucket = rules["senders"] if sender else rules["domains"]
    r = dict(bucket.get(key, {})); r.update({"action": action, "decided": today()})
    if folder_name: r["folder"] = folder_name
    elif "folder" in r and action != "folder": r.pop("folder")
    if note: r["note"] = note
    bucket[key] = r; save_rules(acc, rules)
    print(f"recorded: {'sender' if sender else 'domain'} {key} -> {action}" + (f" ({folder_name})" if folder_name else ""))

def queue(acc, n, folder):
    sc = latest_scan(acc, folder)
    if not sc: sys.exit(f"no scan found — run:  {PY} email_cleanup.py scan --account {acc['name']}")
    rules = load_rules(acc)
    pending = [s for s in sc["senders"] if not rule_for(rules, s["email"])]
    pending.sort(key=lambda s: (0 if s["bulk"] else 1, -s["count"], s["email"]))  # newsletters first, people last
    print(f"{len(pending)} senders still need a decision ({len(sc['senders']) - len(pending)} already decided). Next {min(n, len(pending))}:")
    for i, s in enumerate(pending[:n], 1): print(f"{i}. {card(s)}")


# ---------- setup wizard / account management ----------
def save_accounts(accts):
    os.makedirs(INBOX_ROOT, mode=0o700, exist_ok=True)
    with open(ACCOUNTS_FILE, "w", encoding="utf-8") as f: json.dump(accts, f, indent=2, sort_keys=True)

def ask(prompt, default=None, valid=None, lower=True):
    while True:
        try: raw = input(f"{prompt}" + (f" [{default}]" if default else "") + ": ").strip()
        except (EOFError, KeyboardInterrupt): print(); sys.exit("Cancelled — nothing was saved.")
        if not raw and default is not None: raw = default
        if lower: raw = raw.lower()
        if raw and (valid is None or valid(raw)): return raw
        print("  Please try again.")

def add_account():
    print("\n=== Add an email account ===\n"
          "You need an APP PASSWORD, not your normal password. If you don't have one yet, see README step 2.\n"
          "Nothing you type here is sent anywhere except to your own mail provider to log in.\n")
    accts = {}
    if os.path.exists(ACCOUNTS_FILE): accts = load_accounts()
    name = ask("Short nickname for this account (letters/numbers only, e.g. work or personal)",
               valid=lambda x: re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,30}", x) is not None)
    addr = ask("Email address", valid=lambda x: "@" in x and "." in x.split("@")[-1])
    if name in accts and accts[name]["email"].lower() != addr:
        sys.exit(f"the nickname '{name}' already belongs to {accts[name]['email']} and its sender decisions.\n"
                 f"  -> Pick a different nickname, or delete the folder {os.path.join(INBOX_ROOT, name)} to start that one fresh.")
    rp = os.path.join(INBOX_ROOT, name, "rules.json")
    if os.path.exists(rp):
        with open(rp, encoding="utf-8") as f: owner = (json.load(f).get("account") or "").lower()
        if owner and owner != addr:
            sys.exit(f"the nickname '{name}' has saved decisions for {owner}, not {addr}.\n"
                     f"  -> Pick a different nickname, or delete the folder {os.path.join(INBOX_ROOT, name)} to start that one fresh.")
    if name in accts: print(f"  (this account is already set up — the stored password will be replaced)")
    dom = addr.split("@")[-1]
    guess = "gmail" if dom in ("gmail.com", "googlemail.com") else ("icloud" if dom in ("icloud.com", "me.com", "mac.com") else None)
    if not guess: print("  Choose gmail for Google/Workspace, or icloud for Apple. Other providers are not supported in this release.")
    prov = ask("Provider: gmail or icloud", default=guess, valid=lambda x: x in ("gmail", "icloud"))
    while True:
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            pw = getpass.getpass("Paste the app password (nothing will appear as you paste — that's normal): ").replace(" ", "").strip()
        if len(pw) >= 8: break
        print("  That looks too short for an app password. Try again.")
    os.makedirs(SECRETS_DIR, mode=0o700, exist_ok=True)
    var = re.sub(r"[^A-Z0-9]", "_", name.upper()) + "_IMAP_PASSWORD"
    path = os.path.join(SECRETS_DIR, f"{name}.env")
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f: f.write(f'{var}="{pw}"\n')
    try: os.chmod(path, 0o600)
    except Exception: pass
    entry = {"email": addr, "provider": prov, "port": 993, "secret_file": f"secrets/{name}.env", "secret_var": var}
    accts[name] = entry; save_accounts(accts)
    print(f"\nSaved. Testing the login to {addr} ...")
    acc = get_account(name)
    M = connect(acc)
    n = count_in(M, "INBOX"); M.logout()
    print(f"Connected. Your inbox has {n} messages.\n"
          f"Next step:  {PY} email_cleanup.py scan --account {name}\n")

def remove_account(name):
    accts = load_accounts()
    if name not in accts: sys.exit(f"unknown account '{name}'; known: {sorted(accts)}")
    acc = dict(accts[name]); acc["name"] = name
    path = secret_path(acc); addr = acc["email"]
    if os.path.exists(path): os.remove(path)
    del accts[name]; save_accounts(accts)
    print(f"Removed the stored app password for {addr}.\n"
          f"Your sender decisions are kept in {os.path.join(INBOX_ROOT, name)} in case you set the account up again.\n"
          f"IMPORTANT — also delete the app password on the provider's side so it stops working entirely:\n"
          f"  Gmail:  myaccount.google.com/apppasswords\n"
          f"  iCloud: account.apple.com  ->  Sign-In and Security  ->  App-Specific Passwords\n")

def list_accounts():
    if not os.path.exists(ACCOUNTS_FILE): print(f"No accounts yet. Run:  {PY} email_cleanup.py add-account"); return
    accts = load_accounts()
    for name, a in sorted(accts.items()):
        has_pw = os.path.exists(secret_path(dict(a, name=name)))
        rules = os.path.exists(os.path.join(INBOX_ROOT, name, "rules.json"))
        scans = len(glob.glob(os.path.join(INBOX_ROOT, name, "scan-*.json")))
        print(f"  {name:14} {a['email']:36} {a.get('provider','gmail'):7} password:{'yes' if has_pw else 'NO '}  scans:{scans}  decisions:{'yes' if rules else 'no'}")

# ---------- interactive review ----------
CHOICES = {"u": "unsub_delete", "d": "delete", "f": "folder", "a": "archive", "k": "keep"}

def suggest(s):
    return "d"  # Product default: an explicit review choice, never automatic execution.

def review(acc, folder="INBOX", include_known=False, recommendations=None):
    sc = latest_scan(acc, folder)
    if not sc: sys.exit(f"no scan found — run:  {PY} email_cleanup.py scan --account {acc['name']}")
    rules = load_rules(acc)
    pending = [s for s in sc["senders"] if actionable_sender(s["email"]) and (include_known or not rule_for(rules, s["email"]))]
    if any(not actionable_sender(s["email"]) for s in sc["senders"]):
        print("Messages with missing or malformed senders are left alone. Review those in your mail app.")
    pending.sort(key=lambda s: (0 if s["bulk"] else 1, -s["count"], s["email"]))
    if not pending:
        print(f"Every sender already has a decision. Next step:  {PY} email_cleanup.py apply --account {acc['name']}"); return True
    print(f"\n{len(pending)} senders need a decision. Newsletters and bulk mail come first, people last.\n"
          "For each one, type a letter and press Enter. Just pressing Enter chooses Delete (move to Trash), including personal senders.\n"
          "  u = manual unsubscribe checklist + move mail to Trash     d = move their mail to Trash\n"
          "  f = move their mail into a folder you name       a = archive (out of inbox, not trash)\n"
          "  k = keep, leave it alone                         s = skip for now       q = stop\n"
          "Nothing moves yet. This only records your choices; 'apply' shows a dry run before anything happens.\n")
    done = 0
    for i, s in enumerate(pending, 1):
        who = f"{s['name']} <{s['email']}>" if s["name"] else s["email"]
        kind = "newsletter / bulk" if s["bulk"] else "looks like a person or a receipt"
        un = "unsubscribe is completed manually in your mail app"
        star = f", {s['starred']} starred (rechecked and skipped)" if s.get("starred") else ""
        print(f"[{i}/{len(pending)}] {dec(who)}")
        print(f"      {s['count']} emails ({s['unread']} unread{star}) · last {s['last']} · {kind} · {un}")
        for subj in s["subjects"][:2]: print(f"      e.g. \"{dec(subj)}\"")
        previous = rule_for(rules, s["email"])
        if previous:
            destination = f" -> {dec(previous['folder'])}" if previous.get("folder") else ""
            print(f"      Saved choice: {dec(previous['action'])}{destination}. Choose again to change it; s leaves it unchanged.")
        proposed = (recommendations or {}).get(s["email"])
        if proposed:
            print(f"      AI suggestion (not applied): {dec(proposed['action'])}" +
                  (f" -> {dec(proposed['folder'])}" if proposed.get("folder") else ""))
            print(f"      Reason (untrusted suggestion text): {dec(proposed['reason'])}")
            print("      Choose its letter to accept it. Enter still means Delete, NOT accept the AI suggestion.")
        sug = suggest(s)
        while True:
            try: ans = input(f"      choice [{sug}]: ").strip().lower() or sug
            except (EOFError, KeyboardInterrupt): print(); ans = "q"
            if ans in ("u", "d", "f", "a", "k", "s", "q"): break
            print("      type one of: u d f a k s q")
        if ans == "q": return False
        if ans == "s": print(); continue
        if ans == "f":
            while True:
                try: fname = input("      folder name (plain letters/numbers/spaces, e.g. Receipts): ").strip()
                except (EOFError, KeyboardInterrupt): print(); fname = None; break
                if fname and "&" not in fname and all(32 <= ord(ch) < 127 for ch in fname): break
                print("      use plain letters, numbers and spaces; no '&' or accents")
            if fname is None: return False
            decide(acc, sender=s["email"], action="folder", folder_name=fname)
        else:
            decide(acc, sender=s["email"], action=CHOICES[ans])
        done += 1; print()
    left = len(pending) - done
    print(f"Recorded {done} decision(s)." + (f" {left} sender(s) still undecided — run review again any time." if left else ""))
    print(f"Next step (dry run, changes nothing):  {PY} email_cleanup.py apply --account {acc['name']}")
    return True

# ---------- main ----------
def main():
    if sys.version_info < (3, 9):
        sys.exit(f"This tool needs Python 3.9 or newer (you have {sys.version.split()[0]}). Install the current version from https://www.python.org/downloads/")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("add-account", help="one-time setup wizard")
    sub.add_parser("list-accounts", help="show accounts you've set up")
    p = sub.add_parser("remove-account", help="delete the stored app password for an account"); p.add_argument("--account", required=True)
    p = sub.add_parser("scan", help="read-only census of who emails you"); p.add_argument("--account", required=True); p.add_argument("--folder", default="INBOX"); p.add_argument("--limit", type=int); p.add_argument("--top", type=int, default=20)
    p = sub.add_parser("review", help="decide what to do with each sender, interactively"); p.add_argument("--account", required=True); p.add_argument("--folder", help="defaults to whatever you scanned last")
    p = sub.add_parser("queue", help="peek at the next undecided senders"); p.add_argument("--account", required=True); p.add_argument("--n", type=int, default=5); p.add_argument("--folder", help="defaults to whatever you scanned last")
    p = sub.add_parser("decide", help="record one decision from the command line"); p.add_argument("--account", required=True); p.add_argument("--sender"); p.add_argument("--domain"); p.add_argument("--action", required=True); p.add_argument("--folder-name"); p.add_argument("--note")
    p = sub.add_parser("apply", help="preview; --from-plan and --execute plus confirmation to move mail")
    p.add_argument("--account", required=True); p.add_argument("--folder", default="INBOX")
    p.add_argument("--only"); p.add_argument("--execute", action="store_true")
    p.add_argument("--from-plan", help="exact JSON path printed by the dry run")
    p = sub.add_parser("unsub", help="write a manual unsubscribe checklist; sends nothing")
    p.add_argument("--account", required=True); p.add_argument("--only")
    a = ap.parse_args()
    if getattr(a, "limit", None) is not None and a.limit < 1: ap.error("--limit must be positive")
    if a.cmd == "add-account": add_account(); return
    if a.cmd == "list-accounts": list_accounts(); return
    if a.cmd == "remove-account": remove_account(a.account); return
    acc = get_account(a.account)
    only = {x.strip().lower() for x in a.only.split(",")} if getattr(a, "only", None) else None
    if a.cmd in ("review", "queue", "apply") and not a.folder:
        a.folder = newest_scan_folder(acc)
        if a.folder != "INBOX": print(f"(using your most recent scan, which was of --folder {a.folder})")
    if a.cmd == "scan":
        ranked, total, skipped, uv, box = scan(acc, a.folder, a.limit)
        jpath, mpath = write_scan(acc, a.folder, ranked, total, skipped, uv, box)
        new = [s for s in ranked if not s["known_action"]]
        print(f"total={total} senders={len(ranked)} new={len(new)} known={len(ranked) - len(new)} own_sent_skipped={skipped} report={mpath}")
        for i, s in enumerate(ranked[: a.top], 1):
            tag = f" [rule:{s['known_action']}]" if s["known_action"] else ""
            print(f"{i:3}. {s['count']:4}  {s['email']:45} {s['name'][:22]:22} last={s['last']}{' bulk' if s['bulk'] else ''}{' 1click' if s['one_click'] else ''}{' dkim' if s['dkim_pass'] else ''}{tag}")
        if len(ranked) > a.top: print(f"     ... and {len(ranked) - a.top} more senders — full table in the report file above")
        print(f"\nNext step:  {PY} email_cleanup.py review --account {acc['name']}")
    elif a.cmd == "review": review(acc, a.folder)
    elif a.cmd == "queue": queue(acc, a.n, a.folder)
    elif a.cmd == "decide":
        if not (a.sender or a.domain): sys.exit("--sender or --domain required")
        decide(acc, a.sender, a.domain, a.action, a.folder_name, a.note)
    elif a.cmd == "apply":
        apply(acc, a.folder, only, a.execute, a.from_plan)
    elif a.cmd == "unsub":
        unsub(acc, only)

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(errors="backslashreplace")
    try: main()
    except (KeyboardInterrupt, EOFError): sys.exit("\nStopped. Choices are saved. If execution started, inspect the mailbox and log before retrying.")
    except (RuntimeError, imaplib.IMAP4.error, OSError, ValueError, KeyError, getpass.GetPassWarning) as error:
        sys.exit(f"Stopped: {dec(str(error))}\nIf execution started, some moves may already have completed. Check the mailbox and local log before retrying.")
