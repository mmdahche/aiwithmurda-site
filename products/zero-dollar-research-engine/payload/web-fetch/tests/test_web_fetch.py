"""Tests for the web-fetch skill (single-URL fast-path -- SSRF-defended, fail-closed).

The tests target the PRODUCTION code path of ``fetch`` / ``is_safe_target`` --
no convenience hooks, no test-only branches in the module. Drives the real
public API with:

  * a ``MockTransport`` so the suite makes ZERO real network calls regardless
    of the live gate;
  * a dict-backed mock RESOLVER so the SSRF guard is exercised against every
    deny-range class (loopback / private / link-local incl. cloud-metadata /
    multicast / reserved / unspecified / CGNAT / broadcast / IPv6 ::1 /
    fc00::/7 / fe80::/10 / IPv4-mapped) without touching real DNS;
  * a recording fake scrubber so we can prove ``guard()`` actually ran on the
    body BEFORE return (no-false-green).

The whole suite must pass even when ``curl_cffi`` is NOT installed -- the
runtime dep is lazy-imported behind the live gate, and every test patches the
transport.

The optional guardrails firewall is stubbed on-disk (in ``$GUARDRAILS_HOME``)
for the tests that assert the "default scrubber IS the guard" wiring works.
"""
from __future__ import annotations

import importlib.util
import io
import os
import subprocess
import sys
import types
from pathlib import Path

import pytest

# Load the module under test (file-path import).
WF_DIR = Path(__file__).resolve().parents[1]
WF_PATH = WF_DIR / "web_fetch.py"


def _load(name: str = "web_fetch_under_test"):
    spec = importlib.util.spec_from_file_location(name, str(WF_PATH))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


wf = _load()

# Defence-in-depth: make absolutely sure the live env flag is NOT set during the
# test process; the suite is supposed to be 100% offline.
os.environ.pop(wf.LIVE_ENV, None)


# ── shared fixtures ────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _isolate_guardrails(monkeypatch):
    """Reset the module-level guardrails cache and clear any GUARDRAILS_HOME so
    each test evaluates the optional-firewall lookup from scratch."""
    monkeypatch.delenv("GUARDRAILS_HOME", raising=False)
    monkeypatch.setattr(wf, "_FW", None)
    monkeypatch.setattr(wf, "_FW_ERR", None)
    monkeypatch.setattr(wf, "_FW_WARNED", False)


def _install_stub_firewall(monkeypatch, tmp_path, marker="[REDACTED]"):
    """Drop a tiny stub firewall inside a fake ``$GUARDRAILS_HOME`` and point
    the module at it. Used by tests that verify the default-scrubber wiring."""
    root = tmp_path / "guardrails"
    fw = root / "redaction-firewall" / "firewall.py"
    fw.parent.mkdir(parents=True, exist_ok=True)
    fw.write_text(
        "def guard(text):\n"
        "    if text is None:\n"
        "        return ''\n"
        "    import re\n"
        "    return re.sub(r'[A-Za-z]{3,}_[A-Za-z0-9]{10,}',\n"
        "                  '" + marker + "', text)\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("GUARDRAILS_HOME", str(root))
    monkeypatch.setattr(wf, "_FW", None)
    monkeypatch.setattr(wf, "_FW_ERR", None)
    monkeypatch.setattr(wf, "_FW_WARNED", False)
    return fw


def make_resolver(mapping):
    """Return a callable ``host -> [ip, ...]`` from a dict. Unknown host raises."""
    def _resolver(host):
        if host in mapping:
            return list(mapping[host])
        raise wf.WebFetchError("test resolver has no mapping for %r" % host)
    return _resolver


def make_response(status=200, url="https://example.com/", body=b"<html>ok</html>",
                  headers=None, encoding=None):
    return wf.RawResponse(status=status, url=url, content=body,
                          headers=headers or {"content-type": "text/html; charset=utf-8"},
                          encoding=encoding)


class RecordingScrubber:
    """Captures every text it was asked to scrub. Returns ``text + sentinel``."""

    SENTINEL = "\n<!-- scrubbed-by-test -->"

    def __init__(self):
        self.calls = []

    def __call__(self, text):
        self.calls.append(text)
        return (text or "") + self.SENTINEL


PUBLIC_IP = "93.184.216.34"          # example.com -- a public, globally-routable IPv4
PUBLIC_IP_V6 = "2606:2800:220:1:248:1893:25c8:1946"   # example.com v6


# ── 1) is_safe_target: scheme refusal classes ──────────────────────────────────

@pytest.mark.parametrize("bad", [
    "file:///etc/passwd",
    "ftp://example.com/x.txt",
    "gopher://example.com:70/0",
    "data:text/html,<h1>x</h1>",
    "javascript:alert(1)",
    "ldap://example.com/",
    "ssh://example.com/",
])
def test_is_safe_target_rejects_non_http_schemes(bad):
    ok, reason = wf.is_safe_target(bad, resolver=make_resolver({}))
    assert ok is False
    assert "scheme" in reason.lower()


def test_is_safe_target_rejects_empty_and_garbage():
    for bad in ("", "   ", "not-a-url"):
        ok, reason = wf.is_safe_target(bad, resolver=make_resolver({}))
        assert ok is False and reason


def test_is_safe_target_rejects_userinfo():
    ok, reason = wf.is_safe_target(
        "https://u:p@example.com/", resolver=make_resolver({"example.com": [PUBLIC_IP]}))
    assert ok is False
    assert "userinfo" in reason.lower()


# ── 2) is_safe_target: every deny-range class (literal IPs + resolved hosts) ───

@pytest.mark.parametrize("literal,why", [
    ("127.0.0.1",        "loopback"),
    ("127.255.255.254",  "loopback"),
    ("10.0.0.1",         "private"),
    ("10.255.255.255",   "private"),
    ("172.16.0.1",       "private"),
    ("172.31.255.255",   "private"),
    ("192.168.1.1",      "private"),
    ("169.254.0.1",      "link-local"),
    ("169.254.169.254",  "link-local"),
    ("0.0.0.0",          "unspecified"),
    ("100.64.0.1",       "cgnat"),
    ("198.18.0.1",       "benchmarking"),
    ("192.0.0.1",        "ietf"),
    ("224.0.0.1",        "multicast"),
    ("239.255.255.255",  "multicast"),
    ("240.0.0.1",        "reserved"),
    ("255.255.255.255",  "broadcast"),
    ("::1",              "loopback"),
    ("::",               "unspecified"),
    ("fe80::1",          "link-local"),
    ("fc00::1",          "private"),
    ("fd12:3456::1",     "private"),
    ("ff02::1",          "multicast"),
    ("::ffff:127.0.0.1", "loopback"),
    ("::ffff:169.254.169.254", "link-local"),
    ("64:ff9b::7f00:1", "loopback"),
    ("64:ff9b::a00:1",  "private"),
    ("64:ff9b::a9fe:a9fe", "link-local"),
    ("2002:7f00:1::",  "loopback"),
    ("2002:c0a8:101::", "private"),
    ("2001:0:7f00:1::", "loopback"),
    ("192.0.2.1",     "test-net"),
    ("198.51.100.1",  "test-net"),
    ("203.0.113.1",   "test-net"),
])
def test_is_safe_target_rejects_literal_deny_ranges(literal, why):
    host = "[%s]" % literal if ":" in literal else literal
    url = "https://%s/" % host
    ok, reason = wf.is_safe_target(url, resolver=make_resolver({}))
    assert ok is False, "expected refusal for %s; got reason=%r" % (literal, reason)
    assert why in reason.lower(), "expected %r in %r" % (why, reason.lower())


def test_is_safe_target_rejects_hostname_that_resolves_to_loopback():
    """DNS-rebinding defence: the hostname is benign-looking, but it RESOLVES
    to a loopback IP."""
    resolver = make_resolver({"evil.example.com": ["127.0.0.1"]})
    ok, reason = wf.is_safe_target("https://evil.example.com/", resolver=resolver)
    assert ok is False
    assert "loopback" in reason.lower()
    assert "127.0.0.1" in reason


def test_is_safe_target_rejects_hostname_that_resolves_to_metadata():
    resolver = make_resolver({"metadata.attacker.tld": ["169.254.169.254"]})
    ok, reason = wf.is_safe_target("https://metadata.attacker.tld/latest/meta-data/",
                                   resolver=resolver)
    assert ok is False
    assert "link-local" in reason.lower() or "169.254.169.254" in reason


def test_is_safe_target_rejects_when_any_resolved_ip_is_unsafe():
    """A host that resolves to a mix of public AND deny-range IPs must be refused."""
    resolver = make_resolver({"mixed.example.com": [PUBLIC_IP, "10.0.0.1"]})
    ok, reason = wf.is_safe_target("https://mixed.example.com/", resolver=resolver)
    assert ok is False
    assert "private" in reason.lower() and "10.0.0.1" in reason


def test_is_safe_target_rejects_when_v6_is_internal_but_v4_public():
    resolver = make_resolver({"mixed6.example.com": [PUBLIC_IP, "::1"]})
    ok, reason = wf.is_safe_target("https://mixed6.example.com/", resolver=resolver)
    assert ok is False
    assert "loopback" in reason.lower()


def test_is_safe_target_rejects_unresolvable_host():
    resolver = make_resolver({"no-records.example.com": []})
    ok, reason = wf.is_safe_target("https://no-records.example.com/",
                                   resolver=resolver)
    assert ok is False and "no IPs" in reason


def test_is_safe_target_rejects_when_resolver_raises():
    def boom(host):
        raise RuntimeError("simulated DNS failure")
    ok, reason = wf.is_safe_target("https://example.com/", resolver=boom)
    assert ok is False
    assert ("dns" in reason.lower()) or ("resolver" in reason.lower())


def test_is_safe_target_accepts_public_ip_literal():
    ok, reason = wf.is_safe_target("https://%s/" % PUBLIC_IP,
                                    resolver=make_resolver({}))
    assert ok is True and reason == ""


def test_is_safe_target_accepts_public_ipv6_literal():
    ok, reason = wf.is_safe_target("https://[%s]/" % PUBLIC_IP_V6,
                                    resolver=make_resolver({}))
    assert ok is True and reason == ""


def test_is_safe_target_accepts_resolved_public_host():
    resolver = make_resolver({"example.com": [PUBLIC_IP]})
    ok, reason = wf.is_safe_target("https://example.com/path?x=1",
                                    resolver=resolver)
    assert ok is True and reason == ""


# ── 3) fetch: live-gate OFF means ZERO network ─────────────────────────────────

def test_default_curl_transport_is_live_gated(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    with pytest.raises(wf.LiveDisabledError, match="live web-fetch disabled"):
        wf.fetch("https://%s/" % PUBLIC_IP,
                 resolver=make_resolver({}),
                 scrubber=lambda s: s)


def test_default_curl_transport_fetch_once_is_zero_network(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    t = wf.CurlCffiTransport()
    with pytest.raises(wf.LiveDisabledError):
        t.fetch_once("https://%s/" % PUBLIC_IP)


# ── 4) fetch: happy path uses the transport + scrubs the body ──────────────────

def test_fetch_calls_transport_then_scrubs(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    body = b"<html><body><p>hello world</p></body></html>"
    transport = wf.MockTransport([
        ("https://safe.example.com/", make_response(body=body)),
    ])
    sc = RecordingScrubber()
    out = wf.fetch("https://safe.example.com/",
                    transport=transport,
                    scrubber=sc,
                    resolver=make_resolver({"safe.example.com": [PUBLIC_IP]}))
    assert out.status == 200
    assert out.url == "https://safe.example.com/"
    assert "hello world" in out.content
    assert out.content.endswith(RecordingScrubber.SENTINEL)
    assert len(sc.calls) == 1
    assert "hello world" in sc.calls[0]
    assert out.bytes_in == len(body)
    assert out.content_type == "text/html; charset=utf-8"
    assert out.redirect_chain == []
    assert [c["url"] for c in transport.calls] == ["https://safe.example.com/"]


# ── 5) fetch: redirect hop is RE-CHECKED for SSRF ──────────────────────────────

def test_redirect_to_loopback_is_refused_hop_recheck(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://public.example.com/",
         make_response(status=302, body=b"",
                       headers={"location": "https://internal.attacker.tld/secret"})),
    ])
    resolver = make_resolver({
        "public.example.com":     [PUBLIC_IP],
        "internal.attacker.tld":  ["169.254.169.254"],
    })
    sc = RecordingScrubber()
    with pytest.raises(wf.SsrfRefused, match=r"(?i)link-local|169\.254\.169\.254"):
        wf.fetch("https://public.example.com/",
                  transport=transport, scrubber=sc, resolver=resolver)
    assert [c["url"] for c in transport.calls] == ["https://public.example.com/"]
    assert sc.calls == []


def test_redirect_to_loopback_literal_is_refused(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://public.example.com/",
         make_response(status=302, body=b"",
                       headers={"location": "http://127.0.0.1/admin"})),
    ])
    resolver = make_resolver({"public.example.com": [PUBLIC_IP]})
    with pytest.raises(wf.SsrfRefused, match=r"(?i)loopback|127\.0\.0\.1"):
        wf.fetch("https://public.example.com/",
                  transport=transport, scrubber=RecordingScrubber(), resolver=resolver)
    assert len(transport.calls) == 1


def test_redirect_to_non_http_scheme_is_refused(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://public.example.com/",
         make_response(status=301, body=b"",
                       headers={"location": "file:///etc/passwd"})),
    ])
    resolver = make_resolver({"public.example.com": [PUBLIC_IP]})
    with pytest.raises(wf.SsrfRefused, match="scheme"):
        wf.fetch("https://public.example.com/",
                  transport=transport, scrubber=RecordingScrubber(), resolver=resolver)
    assert len(transport.calls) == 1


def test_safe_redirect_chain_is_followed_and_recorded(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://a.example.com/",
         make_response(status=301, body=b"",
                       headers={"location": "https://b.example.com/page"})),
        ("https://b.example.com/page",
         make_response(status=302, body=b"",
                       headers={"location": "https://c.example.com/final"})),
        ("https://c.example.com/final",
         make_response(status=200, body=b"<p>final</p>")),
    ])
    resolver = make_resolver({
        "a.example.com": [PUBLIC_IP],
        "b.example.com": [PUBLIC_IP],
        "c.example.com": [PUBLIC_IP],
    })
    sc = RecordingScrubber()
    out = wf.fetch("https://a.example.com/",
                    transport=transport, scrubber=sc, resolver=resolver)
    assert out.status == 200
    assert out.url == "https://c.example.com/final"
    assert out.redirect_chain == ["https://a.example.com/", "https://b.example.com/page"]
    assert "final" in out.content
    assert len(sc.calls) == 1
    assert "final" in sc.calls[0]


def test_too_many_redirects_fails_closed(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport()
    resolver_map = {}
    for i in range(10):
        host = "h%d.example.com" % i
        nxt = "https://h%d.example.com/" % (i + 1)
        transport.add("https://%s/" % host,
                      make_response(status=302, body=b"",
                                    headers={"location": nxt}))
        resolver_map[host] = [PUBLIC_IP]
    transport.add("https://h10.example.com/", make_response(body=b"<p>x</p>"))
    resolver_map["h10.example.com"] = [PUBLIC_IP]

    sc = RecordingScrubber()
    with pytest.raises(wf.TooManyRedirects):
        wf.fetch("https://h0.example.com/", transport=transport,
                  scrubber=sc, resolver=make_resolver(resolver_map),
                  max_redirects=3)
    assert len(transport.calls) == 4
    assert sc.calls == []


# ── 6) fetch: SSRF refusal happens BEFORE the transport is touched ─────────────

def test_ssrf_check_runs_before_transport(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("http://127.0.0.1/", make_response(body=b"oops")),
    ])
    sc = RecordingScrubber()
    with pytest.raises(wf.SsrfRefused, match=r"(?i)loopback"):
        wf.fetch("http://127.0.0.1/", transport=transport,
                  scrubber=sc, resolver=make_resolver({}))
    assert transport.calls == []
    assert sc.calls == []


# ── 7) fetch: no-false-green guard for the "stub that allows everything" ───────

def test_no_false_green_permissive_resolver_still_refuses(monkeypatch):
    """A test-only resolver that maps an "evil" hostname to a loopback IP must
    STILL be refused."""
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    permissive_resolver = lambda host: ["127.0.0.1"]  # noqa: E731

    transport = wf.MockTransport([
        ("https://looks-public.test/", make_response(body=b"never sent")),
    ])
    sc = RecordingScrubber()
    with pytest.raises(wf.SsrfRefused, match=r"(?i)loopback"):
        wf.fetch("https://looks-public.test/", transport=transport,
                  scrubber=sc, resolver=permissive_resolver)
    assert transport.calls == [] and sc.calls == []

    ok, reason = wf.is_safe_target("https://looks-public.test/",
                                   resolver=permissive_resolver)
    assert ok is False and "loopback" in reason.lower()


# ── 8) scrub: fail-closed on scrubber error ────────────────────────────────────

def test_scrubber_failure_propagates_and_no_body_returned(monkeypatch):
    """A scrubber raising MUST surface as ScrubFailed -- never the un-scrubbed body."""
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://safe.example.com/", make_response(body=b"<p>x</p>")),
    ])

    def _boom(_text):
        raise RuntimeError("scrubber exploded on purpose")

    with pytest.raises(wf.ScrubFailed, match="(?i)scrub failed"):
        wf.fetch("https://safe.example.com/",
                  transport=transport, scrubber=_boom,
                  resolver=make_resolver({"safe.example.com": [PUBLIC_IP]}))


# ── 9) optional guardrails firewall: default scrubber wiring ───────────────────

def test_default_scrubber_passthrough_when_firewall_missing(monkeypatch, tmp_path, capsys):
    """No firewall installed -> default_scrubber is a passthrough + one-time note."""
    monkeypatch.delenv("GUARDRAILS_HOME", raising=False)
    empty_home = tmp_path / "empty-home"
    empty_home.mkdir()
    monkeypatch.setenv("HOME", str(empty_home))
    fn = wf.default_scrubber()
    assert fn("secret") == "secret"
    err = capsys.readouterr().err
    assert "optional Safe-Autonomy Guardrails firewall not found" in err


def test_default_scrubber_uses_guard_when_firewall_installed(monkeypatch, tmp_path):
    """Stub firewall installed -> default_scrubber returns the guard."""
    _install_stub_firewall(monkeypatch, tmp_path, marker="[REDACTED]")
    fn = wf.default_scrubber()
    tokenlike = "abc_" + "1234567890ABCDEFGHIJ"
    out = fn("prefix " + tokenlike + " suffix")
    assert tokenlike not in out
    assert "[REDACTED]" in out


def test_success_path_scrubs_url_and_headers_with_stub_guard(monkeypatch, tmp_path):
    """A secret in the final URL query string or a response header must be
    redacted in the returned FetchResult when the guardrails firewall is installed."""
    _install_stub_firewall(monkeypatch, tmp_path, marker="[REDACTED]")
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    tokenlike = "abc_" + "1234567890ABCDEFGHIJ"
    url = "https://safe.example.com/cb?token=" + tokenlike
    transport = wf.MockTransport([
        (url, make_response(body=b"<p>ok</p>",
                            headers={"content-type": "text/html",
                                     "x-leak": "key " + tokenlike})),
    ])
    out = wf.fetch(url, transport=transport,
                   resolver=make_resolver({"safe.example.com": [PUBLIC_IP]}))
    assert tokenlike not in out.url
    assert "[REDACTED]" in out.url
    assert tokenlike not in out.headers.get("x-leak", "")


# ── 10) caps + decoding ────────────────────────────────────────────────────────

def test_size_cap_enforced_in_transport(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    big = b"x" * 1024
    transport = wf.MockTransport([
        ("https://safe.example.com/", make_response(body=big)),
    ])
    sc = RecordingScrubber()
    with pytest.raises(wf.TransportError, match="cap"):
        wf.fetch("https://safe.example.com/", transport=transport,
                  scrubber=sc, resolver=make_resolver({"safe.example.com": [PUBLIC_IP]}),
                  max_bytes=64)
    assert sc.calls == []


def test_timeout_is_forwarded_to_transport(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://safe.example.com/", make_response(body=b"<p>ok</p>")),
    ])
    wf.fetch("https://safe.example.com/", transport=transport,
              scrubber=lambda s: s,
              resolver=make_resolver({"safe.example.com": [PUBLIC_IP]}),
              timeout=2.5)
    assert transport.calls[0]["timeout"] == pytest.approx(2.5)


def test_decode_uses_charset_from_content_type(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    body = "cafe\xe9".encode("cp1252")
    transport = wf.MockTransport([
        ("https://safe.example.com/",
         make_response(body=body,
                       headers={"content-type": "text/html; charset=cp1252"})),
    ])
    out = wf.fetch("https://safe.example.com/", transport=transport,
                    scrubber=lambda s: s,
                    resolver=make_resolver({"safe.example.com": [PUBLIC_IP]}))
    assert "cafe\xe9" in out.content


# ── 11) transport-level errors → fail-closed at fetch() ────────────────────────

def test_transport_error_propagates_no_partial_return(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([])
    sc = RecordingScrubber()
    with pytest.raises(wf.TransportError, match="no canned response"):
        wf.fetch("https://safe.example.com/", transport=transport,
                  scrubber=sc, resolver=make_resolver({"safe.example.com": [PUBLIC_IP]}))
    assert sc.calls == []


# ── 12) REAL CLI smoke (live-gate OFF / SSRF / bad args) ───────────────────────

def _run(args, cwd, env_extra=None):
    env = dict(os.environ)
    env.pop(wf.LIVE_ENV, None)
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    if env_extra:
        env.update(env_extra)
    return subprocess.run(
        [sys.executable, str(WF_PATH)] + args,
        cwd=str(cwd), capture_output=True, text=True, env=env)


def test_cli_missing_url_exits_bad_args(tmp_path):
    r = _run([], tmp_path)
    assert r.returncode == wf.EXIT_BAD_ARGS
    assert "missing URL" in r.stderr


def test_cli_help_runs(tmp_path):
    r = _run(["--help"], tmp_path)
    assert r.returncode == 0
    assert "single-URL fetch" in r.stdout


def test_cli_ssrf_literal_exits_4(tmp_path):
    r = _run(["http://127.0.0.1/admin"], tmp_path)
    assert r.returncode == wf.EXIT_SSRF
    assert "SSRF refused" in r.stderr
    assert "loopback" in r.stderr.lower()


def test_cli_ssrf_metadata_exits_4(tmp_path):
    r = _run(["http://169.254.169.254/latest/meta-data/"], tmp_path)
    assert r.returncode == wf.EXIT_SSRF
    assert "SSRF refused" in r.stderr


def test_cli_non_http_scheme_exits_4(tmp_path):
    r = _run(["file:///etc/passwd"], tmp_path)
    assert r.returncode == wf.EXIT_SSRF
    assert "scheme" in r.stderr.lower()


def test_cli_live_gate_off_exits_3(tmp_path):
    """A safe public-IP URL with the live gate OFF must exit 3 -- proves the
    CLI doesn't open a socket on a default install."""
    r = _run(["https://%s/" % PUBLIC_IP], tmp_path)
    assert r.returncode == wf.EXIT_LIVE_OFF
    assert "live web-fetch disabled" in r.stderr


# ── 13) DNS-rebind TOCTOU defence: validated IPs are PINNED into the connection ─

def _install_fake_curl(monkeypatch, captured, resp):
    """Install a fake `curl_cffi.requests` whose .get records its kwargs."""
    def _fake_get(url, **kw):
        captured["url"] = url
        captured.update(kw)
        return resp
    fake_requests = types.ModuleType("curl_cffi.requests")
    fake_requests.get = _fake_get
    fake_pkg = types.ModuleType("curl_cffi")
    fake_pkg.requests = fake_requests
    monkeypatch.setitem(sys.modules, "curl_cffi", fake_pkg)
    monkeypatch.setitem(sys.modules, "curl_cffi.requests", fake_requests)


class _FakeCurlResp:
    status_code = 200
    url = "https://safe.example.com/page"
    headers = {"content-type": "text/html; charset=utf-8"}
    content = b"<p>ok</p>"
    encoding = None


def test_curl_transport_passes_security_kwargs(monkeypatch):
    """The REAL production transport must call curl_cffi.requests.get with the
    security-critical kwargs."""
    monkeypatch.setenv(wf.LIVE_ENV, "1")
    captured = {}
    _install_fake_curl(monkeypatch, captured, _FakeCurlResp())
    t = wf.CurlCffiTransport()
    raw = t.fetch_once("https://safe.example.com/page",
                       headers={"User-Agent": "x"},
                       pinned_ips=["93.184.216.34", "93.184.216.35"])
    assert raw.status == 200
    assert captured["allow_redirects"] is False
    assert captured["accept_encoding"] == ""
    assert captured["verify"] is True
    assert captured["impersonate"] == wf.DEFAULT_IMPERSONATE
    assert captured["resolve"] == ["safe.example.com:443:93.184.216.34,93.184.216.35"]


def test_curl_transport_no_pin_for_literal_ip(monkeypatch):
    monkeypatch.setenv(wf.LIVE_ENV, "1")
    captured = {}
    _install_fake_curl(monkeypatch, captured, _FakeCurlResp())
    t = wf.CurlCffiTransport()
    t.fetch_once("https://%s/" % PUBLIC_IP, headers={}, pinned_ips=[PUBLIC_IP])
    assert captured["resolve"] is None


def test_pinned_ips_threaded_from_fetch_to_transport(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://safe.example.com/", make_response(body=b"<p>ok</p>")),
    ])
    wf.fetch("https://safe.example.com/", transport=transport, scrubber=lambda s: s,
             resolver=make_resolver({"safe.example.com": [PUBLIC_IP, "93.184.216.35"]}))
    assert transport.calls[0]["pinned_ips"] == [PUBLIC_IP, "93.184.216.35"]


# ── 14) HTTPS -> HTTP downgrade redirect is refused; upgrade is allowed ────────

def test_https_to_http_downgrade_redirect_refused(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://public.example.com/",
         make_response(status=302, body=b"",
                       headers={"location": "http://public.example.com/insecure"})),
    ])
    resolver = make_resolver({"public.example.com": [PUBLIC_IP]})
    with pytest.raises(wf.SsrfRefused, match=r"(?i)downgrade"):
        wf.fetch("https://public.example.com/", transport=transport,
                 scrubber=RecordingScrubber(), resolver=resolver)
    assert len(transport.calls) == 1


def test_http_to_https_upgrade_redirect_allowed(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("http://a.example.com/",
         make_response(status=301, body=b"",
                       headers={"location": "https://a.example.com/secure"})),
        ("https://a.example.com/secure", make_response(body=b"<p>ok</p>")),
    ])
    resolver = make_resolver({"a.example.com": [PUBLIC_IP]})
    out = wf.fetch("http://a.example.com/", transport=transport,
                   scrubber=lambda s: s, resolver=resolver)
    assert out.status == 200
    assert out.url == "https://a.example.com/secure"


# ── 15) charset codec injection: a transform codec is refused -> utf-8 fallback ─

def test_charset_transform_codec_falls_back_to_utf8(monkeypatch):
    """A server declaring charset=unicode_escape must NOT be honoured."""
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    raw_bytes = b"a\\u200bb"
    transport = wf.MockTransport([
        ("https://safe.example.com/",
         make_response(body=raw_bytes,
                       headers={"content-type": "text/html; charset=unicode_escape"})),
    ])
    out = wf.fetch("https://safe.example.com/", transport=transport,
                   scrubber=lambda s: s,
                   resolver=make_resolver({"safe.example.com": [PUBLIC_IP]}))
    assert out.content == "a\\u200bb"
    assert "\u200b" not in out.content


# ── 16) max_redirects=0 boundary (the SSRF-re-check hop counter) ───────────────

def test_max_redirects_zero_refuses_a_redirect(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://a.example.com/",
         make_response(status=302, body=b"",
                       headers={"location": "https://b.example.com/"})),
    ])
    resolver = make_resolver({"a.example.com": [PUBLIC_IP], "b.example.com": [PUBLIC_IP]})
    with pytest.raises(wf.TooManyRedirects):
        wf.fetch("https://a.example.com/", transport=transport,
                 scrubber=lambda s: s, resolver=resolver, max_redirects=0)
    assert len(transport.calls) == 1


def test_max_redirects_zero_terminal_ok(monkeypatch):
    monkeypatch.delenv(wf.LIVE_ENV, raising=False)
    transport = wf.MockTransport([
        ("https://a.example.com/", make_response(body=b"<p>ok</p>")),
    ])
    out = wf.fetch("https://a.example.com/", transport=transport,
                   scrubber=lambda s: s,
                   resolver=make_resolver({"a.example.com": [PUBLIC_IP]}),
                   max_redirects=0)
    assert out.status == 200


# ── 17) _write_atomic: round-trip, no orphan, cleanup on failure, confinement ──

def test_write_atomic_roundtrip_no_orphan(tmp_path):
    target = tmp_path / "sub" / "out.html"
    wf._write_atomic(target, "hello world")
    assert target.read_text(encoding="utf-8") == "hello world"
    assert list((tmp_path / "sub").glob("out.html.tmp-*")) == []


def test_write_atomic_cleans_temp_on_replace_failure(monkeypatch, tmp_path):
    target = tmp_path / "out.html"

    def boom(src, dst):
        raise OSError("simulated replace failure")

    monkeypatch.setattr(wf.os, "replace", boom)
    with pytest.raises(OSError):
        wf._write_atomic(target, "hello")
    assert list(tmp_path.glob("out.html.tmp-*")) == []
    assert not target.exists()


def test_out_dir_confinement_refuses_escape(monkeypatch, tmp_path):
    base = tmp_path / "allowed"
    base.mkdir()
    monkeypatch.setenv(wf.OUT_DIR_ENV, str(base))
    outside = tmp_path / "evil.txt"
    with pytest.raises(wf.WebFetchError, match="escapes"):
        wf._write_atomic(outside, "x")
    assert not outside.exists()


def test_out_dir_confinement_allows_inside(monkeypatch, tmp_path):
    base = tmp_path / "allowed"
    base.mkdir()
    monkeypatch.setenv(wf.OUT_DIR_ENV, str(base))
    inside = base / "ok.txt"
    wf._write_atomic(inside, "hello")
    assert inside.read_text(encoding="utf-8") == "hello"


def test_out_dir_unset_is_unrestricted(monkeypatch, tmp_path):
    monkeypatch.delenv(wf.OUT_DIR_ENV, raising=False)
    anywhere = tmp_path / "anywhere.txt"
    wf._write_atomic(anywhere, "hello")
    assert anywhere.read_text(encoding="utf-8") == "hello"
