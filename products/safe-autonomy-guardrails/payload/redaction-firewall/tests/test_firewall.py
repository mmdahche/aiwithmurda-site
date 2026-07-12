"""Tests for the redaction firewall.

Covers the guard API (scrub/guard/find_secrets/is_clean), the three profiles
(default / phi / secrets-only) with PHI opt-in, the FAIL-CLOSED contract (unknown
profile · missing canonical redactor · pattern-evaluation failure), the
import-pinned-never-forked guarantee, and the real CLI entrypoint via subprocess
(filter + --check exit codes, value never echoed to stderr).

Fake secrets are built by concatenation so this source file contains no contiguous
secret a scanner could flag.
"""
import importlib.util
import subprocess
import sys
import types
from pathlib import Path

import pytest

FW_DIR = Path(__file__).resolve().parents[1]
FW_PATH = FW_DIR / "firewall.py"
LIB_REDACT = FW_DIR.parent / "lib" / "redact.py"


def _load(name="firewall_under_test"):
    """Load a FRESH firewall module instance (so a test can mutate its globals)."""
    spec = importlib.util.spec_from_file_location(name, str(FW_PATH))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


fw = _load()


# Built by concat → no contiguous secret literal in this file.
SECRETS = {
    "github-token": "ghp_" + "ABCDEFGHIJ1234567890",
    "aws-access-key-id": "AKIA" + "ABCDEFGH12345678",
    "openai-key": "sk-" + "ABCDEFGHIJ1234567890abcd",
    "postgres-url": "postgres://user:" + "p4ssw0rd" + "@db.host:5432/app",
}
PII = {
    "email": "alice@example.com",
    "ssn": "123-45-6789",
    "credit-card": "4111 1111 1111 1111",
}
PHI_SAMPLE = "patient MRN: " + "12345678" + " admitted"   # canonical phi-mrn shape


# ── guard API ───────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("name,sample", sorted({**SECRETS, **PII}.items()))
def test_scrub_redacts_secrets_and_pii(name, sample):
    text = "before " + sample + " after"
    out, was = fw.scrub(text)
    assert was is True
    assert sample not in out
    assert "[REDACTED:" in out


def test_guard_returns_only_scrubbed_text():
    out = fw.guard("ping " + SECRETS["github-token"] + " now")
    assert isinstance(out, str)
    assert SECRETS["github-token"] not in out


def test_scrub_clean_text_passes_through():
    out, was = fw.scrub("an ordinary sentence with nothing sensitive")
    assert was is False and "[REDACTED:" not in out


def test_scrub_none_is_empty():
    out, was = fw.scrub(None)
    assert out == "" and was is False


def test_find_secrets_returns_names_not_values():
    hits = fw.find_secrets("tok " + SECRETS["github-token"] + " mail " + PII["email"])
    assert "github-token" in hits and "email" in hits
    # the function returns NAMES — never the matched value
    assert all(SECRETS["github-token"] not in h and PII["email"] not in h for h in hits)


def test_is_clean():
    assert fw.is_clean("nothing to see here") is True
    assert fw.is_clean("contact " + PII["email"]) is False


def test_has_meaningful_content_reexport():
    assert fw.has_meaningful_content(fw.guard(PII["email"])) is False  # only a marker
    assert fw.has_meaningful_content(fw.guard("hi " + PII["email"])) is True


# ── profiles (PHI opt-in; secrets-only excludes PII) ─────────────────────────────

def test_phi_is_opt_in():
    # default profile does NOT touch PHI
    out_default, was_default = fw.scrub(PHI_SAMPLE, profile="default")
    assert was_default is False and "12345678" in out_default
    # phi profile DOES
    out_phi, was_phi = fw.scrub(PHI_SAMPLE, profile="phi")
    assert was_phi is True and "12345678" not in out_phi


def test_phi_profile_still_covers_secrets():
    out, was = fw.scrub("tok " + SECRETS["github-token"], profile="phi")
    assert was is True and SECRETS["github-token"] not in out


def test_secrets_only_excludes_pii():
    # an email is PII → secrets-only must leave it intact
    out, was = fw.scrub("mail " + PII["email"], profile="secrets-only")
    assert was is False and PII["email"] in out
    # but a real secret is still scrubbed
    out2, was2 = fw.scrub("key " + SECRETS["aws-access-key-id"], profile="secrets-only")
    assert was2 is True and SECRETS["aws-access-key-id"] not in out2


def test_valid_profiles_constant_matches_resolution():
    for p in fw.VALID_PROFILES:
        # each declared profile must resolve to a non-None pattern list without raising
        pats = fw._patterns_for(p)
        assert isinstance(pats, list)


# ── fail-closed contract ─────────────────────────────────────────────────────────

def test_unknown_profile_fails_closed():
    with pytest.raises(fw.FirewallError):
        fw.scrub("anything", profile="lenient")  # must NOT degrade to "no patterns"


def test_missing_canonical_redactor_fails_closed(tmp_path):
    """If the canonical redactor can't be located, every guard call raises."""
    m = _load("fw_missing_canon")
    m._REDACTOR = None
    m._REDACTOR_ERR = None
    m._CANONICAL_PATH = tmp_path / "does-not-exist" / "redact.py"
    # also make the `import redact` fallback fail deterministically
    sys.modules.pop("redact", None)
    with pytest.raises(m.FirewallError):
        m.scrub("anything")


def test_pattern_failure_propagates_fail_closed():
    """A canonical RedactionError (a pattern blew up) must propagate, not be swallowed."""
    m = _load("fw_broken_pattern")

    class _Boom:
        def subn(self, *a, **k):
            raise ValueError("pattern blew up")

    fake = types.ModuleType("fake_redact")

    class _RedErr(RuntimeError):
        pass

    def _redact(text, patterns=None):
        for name, pat in (patterns or []):
            try:
                pat.subn("x", text or "")
            except Exception as exc:
                raise _RedErr("fail-closed") from exc
        return text or "", False

    fake.redact = _redact
    fake.RedactionError = _RedErr
    fake.PATTERNS = [("boom", _Boom())]
    fake.with_phi = lambda: [("boom", _Boom())]
    fake.has_meaningful_content = lambda t: bool(t)
    m._REDACTOR = fake
    with pytest.raises(_RedErr):
        m.scrub("anything", profile="default")


# ── import-pinned, never forked ──────────────────────────────────────────────────

def test_pins_to_canonical_lib_path():
    assert fw._CANONICAL_PATH.resolve() == LIB_REDACT.resolve()


def test_uses_the_same_patterns_as_canonical_lib():
    canon = importlib.util.spec_from_file_location("canon_chk", str(LIB_REDACT))
    cm = importlib.util.module_from_spec(canon)
    canon.loader.exec_module(cm)
    fw_names = [n for n, _ in fw._patterns_for("default")]
    canon_names = [n for n, _ in cm.PATTERNS]
    assert fw_names == canon_names  # firewall does not add/remove/reorder patterns


def test_no_vendored_redact_copy_in_firewall_dir():
    """The firewall IMPORTS the canonical lib; it must not vendor a 3rd drift copy."""
    assert not (FW_DIR / "redact.py").exists(), \
        "redaction-firewall must import canonical lib/redact.py, never fork a copy"


def test_logger_name_is_guardrails_namespaced():
    """The firewall's logger must be namespaced under `guardrails.` so downstream
    log routing can filter on the product namespace."""
    assert fw.logger.name == "guardrails.redaction_firewall"


# ── CLI entrypoint (the real production path) ────────────────────────────────────

def _run(args, stdin):
    return subprocess.run(
        [sys.executable, str(FW_PATH)] + args,
        input=stdin, capture_output=True, text=True,
        env={"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8",
             "PATH": __import__("os").environ.get("PATH", "")})


def test_cli_filter_scrubs_and_exits_zero():
    r = _run(["--filter"], "tok " + SECRETS["github-token"] + " end")
    assert r.returncode == 0
    assert SECRETS["github-token"] not in r.stdout
    assert "[REDACTED:github-token]" in r.stdout


def test_cli_filter_passthrough_clean():
    r = _run([], "perfectly clean text")
    assert r.returncode == 0 and r.stdout == "perfectly clean text"


def test_cli_check_clean_exit0():
    r = _run(["--check"], "nothing sensitive here")
    assert r.returncode == 0 and r.stdout == ""


def test_cli_check_secret_exit1_names_only():
    r = _run(["--check"], "mail " + PII["email"])
    assert r.returncode == 1
    assert "email" in r.stderr            # pattern NAME reported
    assert PII["email"] not in r.stderr   # value NEVER echoed


def test_cli_phi_flag_checks_phi():
    # default check is clean (PHI off); --phi check finds it
    assert _run(["--check"], PHI_SAMPLE).returncode == 0
    r = _run(["--check", "--phi"], PHI_SAMPLE)
    assert r.returncode == 1 and "phi-mrn" in r.stderr
    assert "12345678" not in r.stderr


def test_cli_secrets_only_profile_leaves_pii():
    r = _run(["--filter", "--profile", "secrets-only"], "mail " + PII["email"])
    assert r.returncode == 0 and PII["email"] in r.stdout


def _run_bytes(args, stdin_bytes, extra_env=None):
    """Subprocess with raw BYTES stdin/stdout (no text decoding) and a MINIMAL env —
    deliberately WITHOUT PYTHONUTF8, to prove the in-code UTF-8 enforcement works."""
    env = {"PATH": __import__("os").environ.get("PATH", "")}
    if extra_env:
        env.update(extra_env)
    return subprocess.run(
        [sys.executable, str(FW_PATH)] + args,
        input=stdin_bytes, capture_output=True, env=env)


def test_cli_undecodable_stdin_fails_closed_not_false_clean():
    """Regression (audit finding 2): an undecodable byte stream must FAIL-CLOSED (exit 2),
    never be reported 'clean' (the old _read_stdin swallowed the error → exit 0)."""
    bad = b"\xff\xfe some bytes that are not valid utf-8 \x80\x81"
    r_check = _run_bytes(["--check"], bad)
    assert r_check.returncode == 2, "undecodable --check must fail closed, not report clean"
    r_filter = _run_bytes(["--filter"], bad)
    assert r_filter.returncode == 2 and r_filter.stdout == b""


def test_cli_enforces_utf8_for_boundary_anchored_pii_without_pythonutf8():
    """Regression (audit finding 1): a \\b-anchored PII value adjacent to a non-ASCII
    char must still be scrubbed because the CLI forces UTF-8 decoding in-code — even
    when launched directly as `python firewall.py` with NO PYTHONUTF8 in the env."""
    # "card 4111111111111111© end" as UTF-8 (© = c2 a9). Under a cp1252 mis-decode the
    # digit would be followed by a word-char ("Â") and \b would fail → leak; UTF-8 keeps
    # © a non-word char → boundary holds → redaction fires.
    payload = "card " + ("4111" + "111111111111") + "© end"
    r = _run_bytes(["--filter"], payload.encode("utf-8"))
    assert r.returncode == 0
    out = r.stdout.decode("utf-8")
    assert "[REDACTED:credit-card]" in out
    assert "4111" + "111111111111" not in out


def test_cli_fail_closed_exit2_when_canonical_missing(tmp_path):
    """Run a COPY of firewall.py with no ../lib/redact.py reachable → exit 2, no stdout."""
    copied = tmp_path / "firewall.py"
    copied.write_text(FW_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    r = subprocess.run(
        [sys.executable, str(copied), "--filter"],
        input="tok " + SECRETS["github-token"], capture_output=True, text=True,
        cwd=str(tmp_path),
        env={"PYTHONUTF8": "1", "PYTHONPATH": "",
             "PATH": __import__("os").environ.get("PATH", "")})
    assert r.returncode == 2
    assert r.stdout == ""                    # nothing emitted on fail-closed
    assert SECRETS["github-token"] not in r.stdout
