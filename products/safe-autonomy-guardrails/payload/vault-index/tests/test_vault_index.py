"""Tests for the vault-index (thin master-index generator/validator + session log).

Covers purpose/last-updated extraction, DERIVED freshness status (no self-report), the
scan→render→parse round-trip, the validator (MISSING / ORPHANED / STALE / UNDATED), and the
append-only session log including its FAIL-CLOSED redaction scrub. Uses a temp vault so it is
hermetic; the session-log scrub is exercised with the REAL firewall and with an injected
failing scrubber.

Fake secrets are built by concat so this file holds no contiguous secret literal.
"""
import datetime
import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

VI_DIR = Path(__file__).resolve().parents[1]
VI_PATH = VI_DIR / "vault_index.py"
UTC = datetime.timezone.utc


def _load(name="vault_under_test"):
    spec = importlib.util.spec_from_file_location(name, str(VI_PATH))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


vi = _load()
NOW = datetime.datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC)
GH_SECRET = "ghp_" + "ABCDEFGHIJ1234567890"


def _make_vault(tmp_path):
    (tmp_path / "specs").mkdir()
    (tmp_path / "00_UNDERSTANDING.md").write_text(
        "# Understanding\n\n**Last updated:** 2026-06-27\n\nThe problem.\n", encoding="utf-8")
    (tmp_path / "01_STATE.md").write_text(
        "# Project State\n\n**Last updated:** 2026-01-01\n\nold.\n", encoding="utf-8")   # STALE
    (tmp_path / "no_date.md").write_text("# No Date Doc\n\nbody only\n", encoding="utf-8")  # UNDATED
    (tmp_path / "specs" / "CORE-SPEC.md").write_text(
        "---\nname: core-spec\ndescription: bundled reference build spec\n---\n"
        "# Core Spec\n\n**Last updated:** 2026-06-28\n", encoding="utf-8")
    # excluded trees must not be scanned
    (tmp_path / "_archive").mkdir()
    (tmp_path / "_archive" / "ignore.md").write_text("# ignore\n", encoding="utf-8")
    return tmp_path


# ── extraction ────────────────────────────────────────────────────────────────────

def test_extract_last_updated():
    assert vi.extract_last_updated("x\n**Last updated:** 2026-06-28 (note)\n") == "2026-06-28"
    assert vi.extract_last_updated("no date here") is None


def test_extract_purpose_frontmatter_then_h1():
    fm = "---\ndescription: the purpose line\n---\n# Title\nbody"
    assert vi.extract_purpose(fm) == "the purpose line"
    assert vi.extract_purpose("# Just A Heading\n\nbody") == "Just A Heading"
    assert vi.extract_purpose("plain first line\nmore") == "plain first line"


def test_extract_purpose_strips_pipes():
    assert "|" not in vi.extract_purpose("# a | b | c")


def test_one_line_strips_control_and_ansi():
    # audit VI-05/CTRL-CHAR: ANSI escape (ESC 0x1b) + C1 (CSI 0x9b) + other controls removed
    out = vi._one_line("Normal\x1b[31mRED\x1b[0m\x9b mid \x07 end", 200)
    assert "\x1b" not in out and "\x9b" not in out and "\x07" not in out
    assert "Normal" in out and "RED" in out


def test_extract_purpose_strips_ansi():
    assert "\x1b" not in vi.extract_purpose("# Title\x1b[2J more")


# ── derived status (no self-report) ───────────────────────────────────────────────

def test_doc_status_buckets():
    assert vi.doc_status("2026-06-28", now=NOW) == vi.FRESH       # today
    assert vi.doc_status("2026-06-20", now=NOW) == vi.FRESH       # 8 days
    assert vi.doc_status("2026-05-01", now=NOW) == vi.RECENT      # ~58 days
    assert vi.doc_status("2026-01-01", now=NOW) == vi.STALE       # ~178 days
    assert vi.doc_status(None, now=NOW) == vi.UNDATED
    assert vi.doc_status("not-a-date", now=NOW) == vi.UNDATED
    assert vi.doc_status("2030-01-01", now=NOW) == vi.UNDATED   # audit: future-dated is NOT fresh


# ── scan ──────────────────────────────────────────────────────────────────────────

def test_scan_vault_records_and_excludes(tmp_path):
    root = _make_vault(tmp_path)
    recs = {r.path: r for r in vi.scan_vault(root, now=NOW)}
    assert set(recs) == {"00_UNDERSTANDING.md", "01_STATE.md", "no_date.md", "specs/CORE-SPEC.md"}
    assert "_archive/ignore.md" not in recs           # excluded tree
    assert recs["specs/CORE-SPEC.md"].purpose == "bundled reference build spec"
    assert recs["01_STATE.md"].status == vi.STALE
    assert recs["no_date.md"].status == vi.UNDATED


def test_session_log_and_index_excluded_from_scan(tmp_path):
    # audit SESSION-LOG-INDEXED: the generated index AND the session log are never indexed
    root = _make_vault(tmp_path)
    (root / vi.SESSION_LOG_NAME).write_text("# Session Log\n", encoding="utf-8")
    (root / vi.INDEX_NAME).write_text("# Vault Master Index\n", encoding="utf-8")
    paths = {r.path for r in vi.scan_vault(root, now=NOW)}
    assert vi.SESSION_LOG_NAME not in paths and vi.INDEX_NAME not in paths


# ── render + parse round-trip ─────────────────────────────────────────────────────

def test_render_and_parse_index_roundtrip(tmp_path):
    root = _make_vault(tmp_path)
    recs = vi.scan_vault(root, now=NOW)
    md = vi.render_index(recs, now=NOW)
    assert "Vault Master Index" in md and "Status legend" in md
    listed = set(vi.parse_index(md))
    assert listed == {"00_UNDERSTANDING.md", "01_STATE.md", "no_date.md", "specs/CORE-SPEC.md"}


# ── validate (correct on contact) ─────────────────────────────────────────────────

def test_validate_clean_after_generate(tmp_path):
    root = _make_vault(tmp_path)
    idx = root / vi.INDEX_NAME
    idx.write_text(vi.render_index(vi.scan_vault(root, now=NOW), now=NOW), encoding="utf-8")
    findings = vi.validate(root, idx, now=NOW)
    kinds = {f.kind for f in findings}
    # a freshly-generated index has no MISSING/ORPHANED; STALE+UNDATED are real disk conditions
    assert vi.MISSING not in kinds and vi.ORPHANED not in kinds
    assert vi.STALE in kinds and vi.UNDATED in kinds      # 01_STATE.md + no_date.md


def test_validate_detects_missing_and_orphaned(tmp_path):
    root = _make_vault(tmp_path)
    idx = root / vi.INDEX_NAME
    # index lists a doc that doesn't exist (orphan) and omits one that does (missing)
    stale_index = vi.render_index([vi.DocRecord("ghost.md", "gone", "2026-06-28", vi.FRESH)], now=NOW)
    idx.write_text(stale_index, encoding="utf-8")
    findings = vi.validate(root, idx, now=NOW)
    orphaned = {f.path for f in findings if f.kind == vi.ORPHANED}
    missing = {f.path for f in findings if f.kind == vi.MISSING}
    assert "ghost.md" in orphaned
    assert "specs/CORE-SPEC.md" in missing and "00_UNDERSTANDING.md" in missing


def test_validate_no_index_reports_no_index(tmp_path):
    root = _make_vault(tmp_path)
    findings = vi.validate(root, root / "does-not-exist.md", now=NOW)
    assert any(f.kind == "NO-INDEX" for f in findings)


# ── append-only session log + fail-closed scrub ──────────────────────────────────

_RAW = (lambda s: s)   # explicit no-op scrubber for non-secret test content (audit VI-03: no boolean bypass)


def test_session_log_is_append_only(tmp_path):
    log = tmp_path / "SESSION-LOG.md"
    vi.append_session_log(log, "first entry", author="alice", now=NOW, scrubber=_RAW)
    vi.append_session_log(log, "second entry", author="bob", now=NOW, scrubber=_RAW)
    text = log.read_text(encoding="utf-8")
    assert "first entry" in text and "second entry" in text
    assert text.index("first entry") < text.index("second entry")   # history preserved, in order
    assert text.count("# Session Log") == 1                          # header written once


def test_session_log_scrubs_references_and_author_real_firewall(tmp_path):
    # audit VI-01/VI-02: refs AND author are scrubbed (not just message) before they hit the vault
    log = tmp_path / "SESSION-LOG.md"
    vi.append_session_log(log, "deploy done", author="bot " + GH_SECRET,
                          refs="see " + GH_SECRET, now=NOW)   # default = real firewall
    text = log.read_text(encoding="utf-8")
    assert GH_SECRET not in text
    assert text.count("[REDACTED:github-token]") >= 2          # both author + refs scrubbed


def test_session_log_author_newline_no_heading_injection(tmp_path):
    # audit LOG-AUTHOR-INJECTION: a newline in author must not inject a fake "## " heading LINE.
    # The newline is collapsed so the injected text stays inline on the header (mid-line ## is
    # not a markdown heading), never a standalone heading line that fakes a new log entry.
    log = tmp_path / "SESSION-LOG.md"
    vi.append_session_log(log, "msg", author="real\n## injected heading", now=NOW, scrubber=_RAW)
    lines = log.read_text(encoding="utf-8").splitlines()
    assert not any(ln.lstrip().startswith("## injected") for ln in lines)   # no injected heading line
    assert any("real ## injected heading" in ln for ln in lines)           # collapsed inline instead


def test_session_log_scrubs_secret_real_firewall(tmp_path):
    log = tmp_path / "SESSION-LOG.md"
    vi.append_session_log(log, "deployed with token " + GH_SECRET, author="m", now=NOW)  # scrub=True (real fw)
    text = log.read_text(encoding="utf-8")
    assert GH_SECRET not in text
    assert "[REDACTED:github-token]" in text


def test_session_log_fail_closed_on_scrub_error(tmp_path):
    log = tmp_path / "SESSION-LOG.md"

    def _boom(_text):
        raise RuntimeError("redactor exploded")

    with pytest.raises(RuntimeError):
        vi.append_session_log(log, "secret " + GH_SECRET, now=NOW, scrubber=_boom)
    assert not log.exists()        # nothing written when the scrub fails (fail-closed)


def test_session_log_rejects_empty_message(tmp_path):
    with pytest.raises(vi.VaultError):
        vi.append_session_log(tmp_path / "L.md", "   ", scrubber=_RAW)


# ── CLI (the real production path) ────────────────────────────────────────────────

def _run(args, cwd):
    return subprocess.run([sys.executable, str(VI_PATH)] + args, cwd=str(cwd),
                          capture_output=True, text=True,
                          env={"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8",
                               "PATH": __import__("os").environ.get("PATH", "")})


def test_cli_generate_then_validate_clean(tmp_path):
    root = _make_vault(tmp_path)
    g = _run(["generate", "--root", str(root)], root)
    assert g.returncode == 0 and (root / vi.INDEX_NAME).is_file()
    # validate exits 1 here because the temp vault deliberately contains STALE + UNDATED docs
    v = _run(["validate", "--root", str(root)], root)
    assert v.returncode == 1 and ("STALE" in v.stdout or "UNDATED" in v.stdout)


def test_cli_validate_summary_is_one_line(tmp_path):
    # the Stop-hook uses --summary: a single drift line (not one per finding), exit 1 on drift.
    root = _make_vault(tmp_path)
    r = _run(["validate", "--root", str(root), "--summary"], root)
    assert r.returncode == 1
    out = [ln for ln in r.stdout.splitlines() if ln.strip()]
    assert len(out) == 1 and "DRIFT" in out[0] and "issue(s)" in out[0]


def test_cli_validate_summary_clean_when_no_drift(tmp_path):
    # an all-fresh, fully-indexed vault → CLEAN, exit 0 (the hook stays quiet).
    root = tmp_path
    (root / "doc.md").write_text("# Doc\n\n**Last updated:** %s\n" % datetime.datetime.now(UTC).strftime("%Y-%m-%d"),
                                 encoding="utf-8")
    _run(["generate", "--root", str(root)], root)
    r = _run(["validate", "--root", str(root), "--summary"], root)
    assert r.returncode == 0 and "CLEAN" in r.stdout


def test_cli_log_appends(tmp_path):
    root = _make_vault(tmp_path)
    r = _run(["log", "--root", str(root), "--message", "did a thing", "--author", "alice"], root)
    assert r.returncode == 0 and (root / vi.SESSION_LOG_NAME).is_file()
    assert "did a thing" in (root / vi.SESSION_LOG_NAME).read_text(encoding="utf-8")


def test_cli_requires_subcommand(tmp_path):
    assert _run([], tmp_path).returncode != 0
