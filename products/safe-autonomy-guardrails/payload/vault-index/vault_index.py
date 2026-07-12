#!/usr/bin/env python3
"""vault_index.py — thin master-index generator + validator + append-only session log.

A "vault" is a directory of human-readable markdown docs that agents read via a THIN
MASTER INDEX — you read the map (one line + a date per doc), not the whole corpus
(cheap context). This tool keeps the index "correct on contact":

  * generate — scan the vault, emit a master index (every doc: 1-line purpose + last-updated
    date + a DERIVED freshness status). The status is derived from ``now - last_updated`` (an
    age), never a self-reported label — the "cannot lie green" discipline (a doc can't claim
    to be fresh when the file mtime says otherwise).
  * validate — compare the index against the vault on disk: flag MISSING (a doc not indexed),
    ORPHANED (indexed but the file is gone), STALE (too old), UNDATED (no ``**Last updated:**``).
    Exit non-zero on drift so the index is regenerated, not silently trusted.
  * log — append a TIMESTAMPED entry to an append-only session log (never rewrite history).
    The message is FAIL-CLOSED redaction-scrubbed first (secrets never enter the committed vault).

The scrub for `log` reuses the bundled redaction firewall (import-pinned) so the pattern
set is defined in exactly one place and freshness / drift decisions are traceable.

Pure Python 3 stdlib (argparse, datetime, importlib, json, os, re, sys, pathlib). No network,
no eval/exec, no third-party deps. Cross-platform (the vault.sh shim sets PYTHONUTF8=1).
"""
from __future__ import annotations

import argparse
import datetime
import importlib.util
import os
import re
import sys
from collections import namedtuple
from pathlib import Path
from typing import Callable, List, Optional

VAULT_INDEX_VERSION = "1.0.0"

_HERE = Path(__file__).resolve().parent
_FIREWALL_PATH = _HERE.parent / "redaction-firewall" / "firewall.py"

# Default scope: vault docs are markdown at the root + under specs/ + docs/. Code/reference
# trees are NOT vault docs and are excluded. All overridable on the CLI.
DEFAULT_INCLUDES = ("*.md", "specs/*.md", "docs/*.md")
DEFAULT_EXCLUDE_DIRS = {"_archive", "_vendor", ".git", "node_modules", "__pycache__",
                        "_reports", ".pytest_cache", "_ops"}
INDEX_NAME = "VAULT-INDEX.md"
SESSION_LOG_NAME = "SESSION-LOG.md"

RECENT_DAYS = 14      # <= this since last-updated => FRESH
STALE_DAYS = 90       # > this => STALE (the "date your facts / correct on contact" threshold)

# Freshness is DERIVED from the age, never self-reported.
FRESH = "FRESH"       # updated within RECENT_DAYS
RECENT = "RECENT"     # within STALE_DAYS
STALE = "STALE"       # older than STALE_DAYS
UNDATED = "UNDATED"   # no **Last updated:** header → treat as stale/unknown
ORPHANED = "ORPHANED"  # validation only: in the index, gone from disk
MISSING = "MISSING"    # validation only: on disk, absent from the index

_LAST_UPDATED_RE = re.compile(r"\*\*Last updated:\*\*\s*([0-9]{4}-[0-9]{2}-[0-9]{2})")
_H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
_FRONTMATTER_DESC_RE = re.compile(r"^description:\s*(.+?)\s*$", re.MULTILINE)

DocRecord = namedtuple("DocRecord", ["path", "purpose", "last_updated", "status"])


class VaultError(RuntimeError):
    """A vault-index failure (e.g. the redaction firewall is unavailable for `log`)."""


# ── time helpers (UTC; injectable now for deterministic tests) ────────────────────

def _now(now: Optional[datetime.datetime] = None) -> datetime.datetime:
    n = now or datetime.datetime.now(datetime.timezone.utc)
    return n if n.tzinfo else n.replace(tzinfo=datetime.timezone.utc)


def _iso(now: Optional[datetime.datetime] = None) -> str:
    return _now(now).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_date(date_str: str) -> Optional[datetime.date]:
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


# ── extraction ────────────────────────────────────────────────────────────────────

def extract_last_updated(text: str) -> Optional[str]:
    """Return the FIRST ``**Last updated:** YYYY-MM-DD`` date in *text*, or None."""
    m = _LAST_UPDATED_RE.search(text or "")
    return m.group(1) if m else None


def extract_purpose(text: str, max_len: int = 120) -> str:
    """A one-line purpose: a frontmatter ``description:`` if present, else the first H1
    heading, else the first non-empty line. Trimmed to *max_len*."""
    text = text or ""
    if text.lstrip().startswith("---"):
        md = _FRONTMATTER_DESC_RE.search(text)
        if md:
            return _one_line(md.group(1), max_len)
    mh = _H1_RE.search(text)
    if mh:
        return _one_line(mh.group(1), max_len)
    for line in text.splitlines():
        if line.strip():
            return _one_line(line, max_len)
    return "(empty)"


def _one_line(s: str, max_len: int) -> str:
    # Audit fix: strip control/ANSI chars FIRST (C0 non-whitespace + DEL + C1 incl. ESC 0x1b /
    # CSI 0x9b) so an untrusted doc title/description can't inject a terminal escape or break the
    # index table; then collapse whitespace and neutralize pipes. Keeps tab/LF/CR (the \s+ folds them).
    s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", str(s))
    s = re.sub(r"\s+", " ", s).replace("|", "/").strip().lstrip("#").strip()
    return s if len(s) <= max_len else s[:max_len - 1].rstrip() + "…"


def doc_status(last_updated: Optional[str], now: Optional[datetime.datetime] = None,
               recent_days: int = RECENT_DAYS, stale_days: int = STALE_DAYS) -> str:
    """Derive a freshness status from the age (now - last_updated). No self-report."""
    if not last_updated:
        return UNDATED
    d = _parse_date(last_updated)
    if d is None:
        return UNDATED
    age_days = (_now(now).date() - d).days
    if age_days < 0:                   # audit fix: a future-dated doc is NOT trustworthy-fresh
        return UNDATED                 # (cannot lie fresh — clock-skew/tamper → flag it)
    if age_days <= recent_days:
        return FRESH
    if age_days <= stale_days:
        return RECENT
    return STALE


# ── scan ────────────────────────────────────────────────────────────────────────

def _iter_doc_paths(root: Path, includes, exclude_dirs) -> List[Path]:
    out = set()
    for pattern in includes:
        for p in root.glob(pattern):
            if not p.is_file():
                continue
            rel_parts = p.relative_to(root).parts
            if any(part in exclude_dirs for part in rel_parts):
                continue
            if p.name in (INDEX_NAME, SESSION_LOG_NAME):   # never index the generated index / session log
                continue
            out.add(p)
    return sorted(out)


def scan_vault(root, includes=DEFAULT_INCLUDES, exclude_dirs=DEFAULT_EXCLUDE_DIRS,
               now: Optional[datetime.datetime] = None,
               recent_days: int = RECENT_DAYS, stale_days: int = STALE_DAYS) -> List[DocRecord]:
    """Scan *root* for vault docs and return a DocRecord per doc (relative path, 1-line
    purpose, last-updated date or None, derived status)."""
    root = Path(root).resolve()
    records = []
    for p in _iter_doc_paths(root, includes, exclude_dirs):
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            text = ""
        lu = extract_last_updated(text)
        records.append(DocRecord(
            path=str(p.relative_to(root)).replace(os.sep, "/"),
            purpose=extract_purpose(text),
            last_updated=lu,
            status=doc_status(lu, now, recent_days, stale_days),
        ))
    return records


# ── render the master index (blueprint INDEX.md house style) ─────────────────────

def render_index(records: List[DocRecord], now: Optional[datetime.datetime] = None) -> str:
    lines = [
        "# Vault Master Index — Documentation Registry",
        "",
        "**Status legend (DERIVED from `now − **Last updated:**`, never self-reported):** "
        "`FRESH` (≤ %d days) · `RECENT` (≤ %d days) · `STALE` (> %d days — date your facts) · "
        "`UNDATED` (no/invalid `**Last updated:**` header → treat as stale)." % (RECENT_DAYS, STALE_DAYS, STALE_DAYS),
        "",
        "**Check-first:** grep this index before adding a doc; if a relevant one exists, "
        "extend/link it instead of duplicating (thin index, not a second corpus).",
        "",
        "**Generated:** %s · %d docs. Regenerate with `vault_index.py generate` "
        "(this file is GENERATED — do not hand-edit; run `validate` to catch drift)." % (_iso(now), len(records)),
        "",
        "| Document | Purpose | Last updated | Status |",
        "|---|---|---|---|",
    ]
    # Worst-first so the eye lands on what needs attention (STALE/UNDATED at the top).
    order = {STALE: 0, UNDATED: 1, RECENT: 2, FRESH: 3}
    for r in sorted(records, key=lambda x: (order.get(x.status, 9), x.path)):
        lines.append("| `%s` | %s | %s | %s |" % (
            r.path, r.purpose, r.last_updated or "—", r.status))
    lines.append("")
    return "\n".join(lines)


def parse_index(index_text: str) -> List[str]:
    """Return the doc paths listed in an existing master index (the `path` column)."""
    paths = []
    for line in (index_text or "").splitlines():
        m = re.match(r"\|\s*`([^`]+)`\s*\|", line)
        if m:
            paths.append(m.group(1))
    return paths


# ── validate (correct on contact) ────────────────────────────────────────────────

Finding = namedtuple("Finding", ["kind", "path", "detail"])


def validate(root, index_path=None, now: Optional[datetime.datetime] = None,
             includes=DEFAULT_INCLUDES, exclude_dirs=DEFAULT_EXCLUDE_DIRS,
             stale_days: int = STALE_DAYS) -> List[Finding]:
    """Compare the index against the vault on disk. Returns findings (empty = clean):
    MISSING (doc on disk not in the index), ORPHANED (in the index, file gone), STALE
    (indexed doc older than *stale_days*), UNDATED (doc with no last-updated header)."""
    root = Path(root).resolve()
    index_path = Path(index_path) if index_path else (root / INDEX_NAME)
    records = scan_vault(root, includes, exclude_dirs, now, stale_days=stale_days)
    on_disk = {r.path: r for r in records}

    findings: List[Finding] = []
    if not index_path.is_file():
        findings.append(Finding("NO-INDEX", str(index_path.name),
                                "no master index found; run `generate` first"))
        indexed = set()
    else:
        indexed = set(parse_index(index_path.read_text(encoding="utf-8", errors="replace")))

    for path in sorted(set(on_disk) - indexed):
        findings.append(Finding(MISSING, path, "doc on disk is not in the index"))
    for path in sorted(indexed - set(on_disk)):
        findings.append(Finding(ORPHANED, path, "indexed doc no longer exists on disk"))
    for path, rec in sorted(on_disk.items()):
        if rec.status == STALE:
            findings.append(Finding(STALE, path, "last updated %s (> %d days)" % (rec.last_updated, stale_days)))
        elif rec.status == UNDATED:
            findings.append(Finding(UNDATED, path, "missing or invalid (e.g. future-dated) **Last updated:** — date your facts"))
    return findings


# ── append-only session log (fail-closed scrubbed) ───────────────────────────────

_FW = None


def _firewall():
    global _FW
    if _FW is not None:
        return _FW
    if not _FIREWALL_PATH.is_file():
        raise VaultError("redaction-firewall not found at %s; refusing to log un-scrubbed "
                         "(secrets-out-of-vault)" % _FIREWALL_PATH)
    try:
        spec = importlib.util.spec_from_file_location("guardrails_redaction_firewall_vault", str(_FIREWALL_PATH))
        mod = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = mod
        try:
            spec.loader.exec_module(mod)
        except Exception:
            sys.modules.pop(spec.name, None)
            raise
    except Exception as exc:  # noqa: BLE001 -- fail-closed
        raise VaultError("redaction-firewall failed to import (%s); refusing to log" % type(exc).__name__)
    if not hasattr(mod, "guard"):
        raise VaultError("redaction-firewall missing guard(); refusing to log")
    _FW = mod
    return mod


def append_session_log(log_path, message: str, author: Optional[str] = None,
                       now: Optional[datetime.datetime] = None, refs: Optional[str] = None,
                       scrubber: Optional[Callable[[str], str]] = None) -> str:
    """Append a TIMESTAMPED entry to the append-only session log. NEVER rewrites history
    (opens in append mode only).

    EVERY user-supplied field (message, author, refs) is FAIL-CLOSED redaction-scrubbed BEFORE
    anything is assembled or written — a scrub failure RAISES, so no secret ever lands in the
    committed vault (audit VI-01/VI-02). The author is also collapsed to one line so a newline
    cannot inject a fake "## " heading (audit LOG-AUTHOR-INJECTION). There is deliberately NO
    boolean bypass (the old ``scrub=False`` was a contractually-invisible hole, audit VI-03): to
    write raw in a test, inject an explicit ``scrubber=lambda s: s``.

    *scrubber* is injectable for tests; the default is the redaction-firewall's ``guard``.
    """
    if not isinstance(message, str) or not message.strip():
        raise VaultError("session-log message must be a non-empty string")
    fn = scrubber or _firewall().guard
    # Scrub ALL user fields first; any FirewallError/RedactionError propagates → nothing written.
    message = fn(message)
    safe_author = fn(author) if author else None
    scrubbed_ref = fn(refs) if refs else None
    header_author = _one_line(safe_author, 80) if (safe_author and safe_author.strip()) else "unknown"
    log_path = Path(log_path)
    new_file = not log_path.exists()
    entry = "\n## %s — %s\n\n%s\n" % (_iso(now), header_author, message.strip())
    if scrubbed_ref:
        entry += "\n_references: %s_\n" % _one_line(scrubbed_ref, 300)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "a", encoding="utf-8", newline="\n") as fh:   # append-only — never truncate
        if new_file:
            fh.write("# Session Log (append-only — never rewrite history)\n")
        fh.write(entry)
    return str(log_path)


# ── CLI ─────────────────────────────────────────────────────────────────────────

def _write_atomic(path: Path, text: str) -> None:
    """Temp-write + os.replace (no half-written index reads)."""
    path = path.resolve()
    tmp = path.with_name(path.name + ".tmp-%d" % os.getpid())
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
        fh.flush()
        os.fsync(fh.fileno())
    try:
        os.replace(tmp, path)
    finally:
        try:
            tmp.unlink()
        except OSError:
            pass


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(prog="vault-index",
                                 description="Thin vault master-index generator/validator + "
                                             "append-only session log.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="scan the vault → write the master index")
    g.add_argument("--root", default=".")
    g.add_argument("--out", default=None, help="index path (default <root>/%s)" % INDEX_NAME)

    v = sub.add_parser("validate", help="check the index against the vault (exit 1 on drift)")
    v.add_argument("--root", default=".")
    v.add_argument("--index", default=None)
    v.add_argument("--summary", action="store_true",
                   help="print ONE line of counts (for an advisory Stop-hook), not every finding")

    lg = sub.add_parser("log", help="append a timestamped (scrubbed) entry to the session log")
    lg.add_argument("--root", default=".")
    lg.add_argument("--message", required=True)
    lg.add_argument("--author", default=None)
    lg.add_argument("--refs", default=None)
    lg.add_argument("--log", default=None, help="log path (default <root>/%s)" % SESSION_LOG_NAME)

    ap.add_argument("--version", action="version", version="vault-index %s" % VAULT_INDEX_VERSION)
    args = ap.parse_args(argv)
    root = Path(args.root).resolve()

    if args.cmd == "generate":
        records = scan_vault(root)
        out = Path(args.out) if args.out else (root / INDEX_NAME)
        _write_atomic(out, render_index(records))
        sys.stdout.write("vault-index: wrote %s (%d docs)\n" % (out, len(records)))
        return 0

    if args.cmd == "validate":
        findings = validate(root, args.index)
        if not findings:
            sys.stdout.write("vault-index: CLEAN — index matches the vault\n")
            return 0
        if args.summary:
            counts = {}
            for f in findings:
                counts[f.kind] = counts.get(f.kind, 0) + 1
            summary = ", ".join("%d %s" % (n, k) for k, n in sorted(counts.items()))
            sys.stdout.write("vault-index: DRIFT — %d issue(s): %s (run `validate` for detail)\n"
                             % (len(findings), summary))
            return 1
        for f in findings:
            sys.stdout.write("  %-9s %s — %s\n" % (f.kind, f.path, f.detail))
        sys.stdout.write("vault-index: DRIFT — %d issue(s); run `generate` / date your facts\n" % len(findings))
        return 1

    # log
    try:
        log_path = Path(args.log) if args.log else (root / SESSION_LOG_NAME)
        append_session_log(log_path, args.message, author=args.author, refs=args.refs)
    except Exception as exc:  # VaultError / FirewallError / RedactionError → fail-closed
        sys.stderr.write("vault-index: NOT LOGGED (%s) — message not written (fail-closed)\n"
                         % type(exc).__name__)
        return 2
    sys.stdout.write("vault-index: appended a session-log entry\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
