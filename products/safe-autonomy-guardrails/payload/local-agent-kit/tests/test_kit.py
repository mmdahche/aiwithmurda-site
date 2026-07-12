"""Tests for the local-agent-kit guards.

Covers each pitfall-as-code guard (date-per-call, resolve-IDs-before-execute,
read/act scope separation, irreversible-action lock, token=identity, untrusted-input
allowlist + validation), the FAIL-CLOSED contract on every guard, the import-pin to
the bundled fuzzy-matching module (never forked), and the real CLI via subprocess.

Fake tokens are built by concatenation so this file contains no contiguous secret.
"""
import datetime
import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

KIT_DIR = Path(__file__).resolve().parents[1]
KIT_PATH = KIT_DIR / "kit.py"
FUZZY_PATH = KIT_DIR.parent / "blueprints" / "fuzzy-matching" / "fuzzy_match.py"

UTC = datetime.timezone.utc


def _load(name="kit_under_test"):
    spec = importlib.util.spec_from_file_location(name, str(KIT_PATH))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


kit = _load()


# ── 1. date-per-call ─────────────────────────────────────────────────────────────

def test_date_context_uses_supplied_now():
    fixed = datetime.datetime(2026, 6, 28, 14, 3, 22, tzinfo=UTC)
    out = kit.date_context(now=fixed)
    assert "2026-06-28" in out and "2026-06-28T14:03:22Z" in out


def test_date_context_normalizes_naive_and_offset_to_utc():
    naive = datetime.datetime(2026, 1, 1, 0, 0, 0)            # treated as UTC
    assert "2026-01-01T00:00:00Z" in kit.date_context(now=naive)
    plus2 = datetime.datetime(2026, 1, 1, 2, 0, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=2)))
    assert "2026-01-01T00:00:00Z" in kit.date_context(now=plus2)  # converted back to UTC


def test_date_context_default_is_read_at_call_time():
    # No `now` passed → it must produce a current-ish timestamp (not a fixed startup value).
    out = kit.date_context()
    assert kit.is_fresh(out.split("time (UTC): ")[1].rstrip(". ")) is True


def test_is_fresh_true_for_recent_false_for_stale():
    now = datetime.datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC)
    recent = "2026-06-28T11:59:00Z"        # 60s old
    stale = "2026-06-28T11:00:00Z"         # 1h old (> 900s)
    assert kit.is_fresh(recent, now=now) is True
    assert kit.is_fresh(stale, now=now) is False


def test_is_fresh_fail_closed_on_unparseable_and_future():
    now = datetime.datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC)
    assert kit.is_fresh("not-a-date", now=now) is False          # unparseable → stale
    assert kit.is_fresh(None, now=now) is False
    future = "2026-06-28T13:00:00Z"                              # 1h into the future
    assert kit.is_fresh(future, now=now) is False               # beyond skew → not trusted


# ── 2. resolve-IDs-before-execute (reuses the bundled fuzzy-matching module) ─────

def test_resolve_id_exact_match_returns_real_id():
    assert kit.resolve_id("PROJ-123", ["PROJ-123", "PROJ-999"]) == "PROJ-123"


def test_resolve_id_close_typo_resolves_to_real():
    # one-char difference → high confidence auto-match
    assert kit.resolve_id("super-merguer", ["super-merger", "other-project"]) == "super-merger"


def test_resolve_id_hallucination_fails_closed():
    with pytest.raises(kit.UnresolvedIDError):
        kit.resolve_id("totally-made-up-xyz", ["super-merger", "billing"])


def test_resolve_id_empty_candidates_fails_closed():
    with pytest.raises(kit.UnresolvedIDError):
        kit.resolve_id("anything", [])


def test_resolve_id_pins_to_bundled_fuzzy_module():
    assert kit._FUZZY_PATH.resolve() == FUZZY_PATH.resolve()


def test_resolve_id_fail_closed_when_bundled_module_missing(tmp_path, monkeypatch):
    m = _load("kit_no_fuzzy")
    m._FUZZY = None
    m._FUZZY_ERR = None
    m._FUZZY_PATH = tmp_path / "nope" / "fuzzy_match.py"
    # audit SEC-5: a None sentinel makes `import fuzzy_match` raise ImportError regardless of
    # what is on sys.path, so the fail-closed check holds even when the full suite runs from a
    # dir that exposes fuzzy_match (the old sys.modules.pop left the fallback environment-fragile).
    monkeypatch.setitem(sys.modules, "fuzzy_match", None)
    with pytest.raises(m.ResolveUnavailableError):
        m.resolve_id("x", ["y"])


def test_packaged_alongside_fallback_resolves(tmp_path):
    """audit PKG-1: with the sibling canonical path absent (packaged layout), the bare
    `import fuzzy_match` fallback must still resolve a fuzzy_match.py bundled in the module's
    OWN dir — spec-loading does not put that dir on sys.path, so the fallback must add it."""
    (tmp_path / "fuzzy_match.py").write_text(FUZZY_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    m = _load("kit_packaged")
    m._FUZZY = None
    m._FUZZY_ERR = None
    m._FUZZY_PATH = tmp_path / "blueprints" / "absent.py"   # sibling canonical missing
    m._HERE = tmp_path                                       # the bundled-alongside dir
    saved = sys.modules.pop("fuzzy_match", None)
    try:
        assert m.resolve_id("super-merger", ["super-merger", "x"]) == "super-merger"
        assert str(tmp_path) not in sys.path                # fallback restored sys.path
    finally:
        sys.modules.pop("fuzzy_match", None)
        if saved is not None:
            sys.modules["fuzzy_match"] = saved


def test_try_resolve_id_surfaces_review_tier():
    res = kit.try_resolve_id("super-merg", ["super-merger-platform", "z"])
    assert res.tier in ("auto", "review", "unmatched")


# ── 3. separation of duties (read/act never crossed) ─────────────────────────────

def test_require_scope_allows_matching():
    assert kit.require_scope(kit.READ, kit.READ) is None
    assert kit.require_scope(kit.ACT, kit.ACT) is None


def test_require_scope_blocks_read_token_acting():
    with pytest.raises(kit.ScopeError):
        kit.require_scope(kit.READ, kit.ACT)


def test_require_scope_blocks_act_token_reading():
    with pytest.raises(kit.ScopeError):
        kit.require_scope(kit.ACT, kit.READ)


def test_require_scope_rejects_unknown_scope():
    with pytest.raises(kit.ScopeError):
        kit.require_scope("superuser", kit.ACT)


def test_can_act_predicate():
    assert kit.can_act(kit.ACT) is True
    assert kit.can_act(kit.READ) is False


# ── 4. irreversible-action lock ──────────────────────────────────────────────────

@pytest.mark.parametrize("action", ["delete", "Delete", "mark-read", "MARK_READ",
                                    "send", "force push", "rm", "overwrite"])
def test_guard_action_blocks_irreversible(action):
    with pytest.raises(kit.IrreversibleActionError):
        kit.guard_action(action)


@pytest.mark.parametrize("action", ["archive", "label", "read", "draft", "list", "search"])
def test_guard_action_allows_reversible(action):
    assert kit.guard_action(action) == kit._norm_action(action)


def test_guard_action_operator_allowlist_opts_in():
    # delete is blocked by default, but an explicit operator allow-list opts it in
    assert kit.guard_action("delete", allow=["delete"]) == "delete"


def test_guard_action_error_suggests_alternative():
    with pytest.raises(kit.IrreversibleActionError) as ei:
        kit.guard_action("delete")
    assert "archive" in str(ei.value).lower()


def test_is_irreversible_predicate():
    assert kit.is_irreversible("DELETE") is True
    assert kit.is_irreversible("list") is False


def test_guard_action_blocks_unicode_fullwidth_homoglyphs():
    # audit SEC-1: fullwidth homoglyphs must NOT fail open (str.lower keeps them fullwidth,
    # so NFKD normalization is required to map them onto the blocked ASCII verbs).
    for fw in ["ＤＥＬＥＴＥ", "ＳＥＮＤ", "ＰＵＲＧＥ", "ＯＶＥＲＷＲＩＴＥ"]:
        with pytest.raises(kit.IrreversibleActionError):
            kit.guard_action(fw)


def test_guard_action_blocks_embedded_control_chars():
    # audit SEC-1: a control char embedded in the name must not let it bypass the set.
    for variant in ["del\x00ete", "del\x07ete", "del\x9bete"]:
        with pytest.raises(kit.IrreversibleActionError):
            kit.guard_action(variant)


def test_guard_action_cli_blocks_fullwidth():
    r = _run(["--guard-action", "ＤＥＬＥＴＥ"])
    assert r.returncode == 2 and "BLOCKED" in r.stderr


# ── 5. token = identity ──────────────────────────────────────────────────────────

def test_read_token_from_env(monkeypatch):
    secret = "tok_" + "ABCDEFG1234567890"
    monkeypatch.setenv("MY_TEST_TOKEN", secret)
    assert kit.read_token("MY_TEST_TOKEN") == secret


def test_read_token_missing_or_empty_fails_closed(monkeypatch):
    monkeypatch.delenv("ABSENT_TOKEN", raising=False)
    with pytest.raises(kit.TokenError):
        kit.read_token("ABSENT_TOKEN")
    monkeypatch.setenv("BLANK_TOKEN", "   ")
    with pytest.raises(kit.TokenError):
        kit.read_token("BLANK_TOKEN")


def test_mask_token_never_reveals_value():
    secret = "tok_" + "ABCDEFG1234567890"
    masked = kit.mask_token(secret)
    assert secret not in masked
    assert "len=%d" % len(secret) in masked
    assert kit.mask_token("") == "<token:empty>"


def test_check_token_file_mode(tmp_path):
    f = tmp_path / "tok.env"
    f.write_text("x", encoding="utf-8")
    import os
    if os.name == "nt":
        assert kit.check_token_file_mode(f) == "skipped-windows"
    else:
        os.chmod(f, 0o600)
        assert kit.check_token_file_mode(f) == "ok"
        os.chmod(f, 0o644)             # group/other readable
        with pytest.raises(kit.TokenError):
            kit.check_token_file_mode(f)


def test_check_token_file_mode_missing_file(tmp_path):
    with pytest.raises(kit.TokenError):
        kit.check_token_file_mode(tmp_path / "nope.env")


# ── 6. untrusted input: allowlist + validation ───────────────────────────────────

def test_allowlist_deny_by_default():
    al = kit.Allowlist(["status", "search", "help"])
    assert al.is_allowed("status") is True
    assert al.is_allowed("delete_everything") is False
    assert al.require_allowed("help") == "help"
    with pytest.raises(kit.NotAllowedError):
        al.require_allowed("rm -rf /")
    assert "status" in al


def test_validate_input_accepts_clean_text():
    assert kit.validate_input("what is the project status?") == "what is the project status?"
    assert kit.validate_input("line1\nline2\tend") == "line1\nline2\tend"


def test_validate_input_rejects_control_chars():
    with pytest.raises(kit.UntrustedInputError):
        kit.validate_input("evil\x00null")
    with pytest.raises(kit.UntrustedInputError):
        kit.validate_input("esc\x1b[2Jclear")   # terminal escape


def test_validate_input_rejects_c1_controls():
    # audit SEC-2: C1 controls (U+0080–U+009F), incl. U+009B CSI (the 8-bit escape
    # introducer) and U+0085 NEL, must be rejected — the old regex stopped at DEL.
    for cp in (0x80, 0x85, 0x9b, 0x9f):
        with pytest.raises(kit.UntrustedInputError):
            kit.validate_input("x" + chr(cp) + "y")


def test_safe_strips_c1_controls():
    # audit SEC-2: _safe must scrub C1 controls from log/error messages, not just C0/DEL.
    out = kit._safe("a" + chr(0x9b) + "[2J" + chr(0x85) + "b")
    assert chr(0x9b) not in out and chr(0x85) not in out


def test_validate_input_rejects_overlength():
    with pytest.raises(kit.UntrustedInputError):
        kit.validate_input("x" * 5000, max_len=4096)


def test_validate_input_rejects_non_str():
    with pytest.raises(kit.UntrustedInputError):
        kit.validate_input(b"bytes")


def test_validate_input_no_newlines_mode():
    with pytest.raises(kit.UntrustedInputError):
        kit.validate_input("a\nb", allow_newlines=False)


def test_error_messages_never_echo_untrusted_control_chars():
    al = kit.Allowlist(["ok"])
    try:
        al.require_allowed("bad\x1b[31mvalue\x07")
    except kit.NotAllowedError as exc:
        assert "\x1b" not in str(exc) and "\x07" not in str(exc)


# ── CLI entrypoint (the real production path for hooks) ───────────────────────────

def _run(args, stdin=None):
    return subprocess.run(
        [sys.executable, str(KIT_PATH)] + args,
        input=stdin, capture_output=True, text=True,
        env={"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8",
             "PATH": __import__("os").environ.get("PATH", "")})


def test_cli_date_prints_fresh_line():
    r = _run(["--date"])
    assert r.returncode == 0 and "Current date (UTC):" in r.stdout


def test_cli_validate_input_clean_exit0():
    r = _run(["--validate-input"], stdin="a normal question")
    assert r.returncode == 0


def test_cli_validate_input_control_char_exit2():
    r = _run(["--validate-input"], stdin="bad\x00null")
    assert r.returncode == 2
    # audit SEC-4: two INDEPENDENT assertions (the old `A or B` was vacuously true since the
    # kit never echoes the literal word 'null', so the message-quality clause never ran).
    assert "\x00" not in r.stderr            # the raw control char is never echoed back
    assert "control" in r.stderr.lower()     # the message names the failure class


def test_cli_validate_input_overlength_exit2():
    r = _run(["--validate-input", "--max-len", "10"], stdin="x" * 50)
    assert r.returncode == 2


def test_cli_guard_action_irreversible_exit2():
    r = _run(["--guard-action", "delete"])
    assert r.returncode == 2 and "BLOCKED" in r.stderr


def test_cli_guard_action_reversible_exit0():
    r = _run(["--guard-action", "archive"])
    assert r.returncode == 0


def test_cli_guard_action_allowlist_exit0():
    r = _run(["--guard-action", "delete", "--allow", "delete"])
    assert r.returncode == 0


def test_cli_requires_a_mode():
    r = _run([])
    assert r.returncode != 0   # argparse: one of the mutually-exclusive modes is required


def test_cli_undecodable_stdin_fails_closed():
    """An undecodable byte stream to --validate-input must FAIL-CLOSED (exit 2)."""
    r = subprocess.run(
        [sys.executable, str(KIT_PATH), "--validate-input"],
        input=b"\xff\xfe\x80 not utf-8", capture_output=True,
        env={"PATH": __import__("os").environ.get("PATH", "")})
    assert r.returncode == 2


# ── no exec/eval surface anywhere in the kit ─────────────────────────────────────

def test_kit_ships_no_exec_or_eval():
    src = KIT_PATH.read_text(encoding="utf-8")
    # the kit must never exec/eval untrusted text; assert the calls are absent
    assert "eval(" not in src
    assert "exec(" not in src
    assert "os.system(" not in src
    assert "subprocess." not in src   # the kit itself spawns nothing
