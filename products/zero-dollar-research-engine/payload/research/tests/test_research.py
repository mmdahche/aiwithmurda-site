"""Tests for the `research` skill ($0 multi-source aggregator, fail-closed, no network).

The whole suite is HERMETIC: every test passes an explicit ``HttpClient(transport=
MockTransport(...))`` so the production code path runs with ZERO real network calls
regardless of the ``RESEARCH_LIVE`` env var. The egress allowlist guard sits INSIDE
``HttpClient.get`` (before the transport), so a ``MockTransport`` cannot bypass the
SSRF check -- that's verified directly.

What this suite proves (refute-verified):
  1. live-OFF makes ZERO network calls (the production transport refuses to open a
     socket; the API raises ``ResearchError`` BEFORE any fan-out);
  2. the egress allowlist REJECTS a non-allowlisted host (``AllowlistError``, no
     transport call);
  3. the outbound QUERY is scrubbed BEFORE the request is built (assert the scrubbed
     string is what reached the transport, never the raw query);
  4. one failing source does NOT kill the run (a warning is captured; siblings
     return their results);
  5. the overall ~30 s budget actually short-circuits a slow source (configurable
     via the ``timeout=`` arg so we exercise the real ``as_completed(timeout=...)``
     path on a 0.5 s budget);
  6. dedup by URL works;
  7. EVERY returned string is scrubbed BEFORE return (recording fake scrubber
     proves the call happened on every public surface);
  8. fail-closed on a query-scrub failure (raises BEFORE fan-out -> CLI exit 4);
  9. fail-closed on a result-scrub failure (raises AFTER fan-out, BEFORE return);
 10. optional guardrails firewall: when the firewall is missing the default
     scrubber is a passthrough (the other three gates still hold); when the
     firewall is installed the default scrubber IS the guardrails ``guard``.
 11. no-false-green guard: a query never appears in the recorded transport calls in
     its UN-SCRUBBED form; with the live gate off the production transport's
     ``.calls`` would never be populated (we verify it via the API behaviour).

Pure stdlib + pytest. ZERO new pip deps. ZERO network. Caches are redirected to a
per-test temp dir via ``RESEARCH_CACHE_DIR`` so the file-cache never pollutes the
operator's home and never serves a stale hit between tests.
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

# Load the module under test by file-path. Inserting the skill dir on sys.path
# means the production ``lib.*`` absolute imports inside research.py resolve
# correctly.
R_DIR = Path(__file__).resolve().parents[1]
R_PATH = R_DIR / "research.py"
if str(R_DIR) not in sys.path:
    sys.path.insert(0, str(R_DIR))


def _load(name: str = "research_under_test"):
    spec = importlib.util.spec_from_file_location(name, str(R_PATH))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


research_mod = _load()
from lib.http import (  # noqa: E402
    ALLOWED_HOSTS,
    AllowlistError,
    DEFAULT_MAX_BYTES,
    HttpClient,
    LIVE_ENV,
    LiveDisabledError,
    MockTransport,
    Response,
    TransportError,
    UrllibTransport,
    is_allowed_host,
)
from lib.result import Result  # noqa: E402
from lib.aggregator import aggregate  # noqa: E402


# ── per-test isolation: caches, live-gate env, and guardrails caches ──────────

@pytest.fixture(autouse=True)
def _isolate_env(tmp_path, monkeypatch):
    """Every test gets a private cache root AND a guaranteed-OFF live gate. Tests
    that need a different setting can ``monkeypatch`` it back."""
    monkeypatch.setenv("RESEARCH_CACHE_DIR", str(tmp_path / "cache"))
    monkeypatch.delenv(LIVE_ENV, raising=False)
    monkeypatch.delenv("RESEARCH_CONTACT_EMAIL", raising=False)
    monkeypatch.delenv("GUARDRAILS_HOME", raising=False)
    # Reset the module-level firewall cache so each test evaluates the
    # optional-firewall lookup from scratch.
    monkeypatch.setattr(research_mod, "_FW", None)
    monkeypatch.setattr(research_mod, "_FW_ERR", None)
    monkeypatch.setattr(research_mod, "_FW_WARNED", False)
    yield


# ── helpers ──────────────────────────────────────────────────────────────────

class RecordingScrubber:
    """Captures every string it was asked to scrub. Returns ``text + sentinel`` so
    a test can assert the SCRUBBED string (not the raw one) is what reached the
    next layer -- the request, or the caller."""

    SENTINEL = "::SCRUBBED::"

    def __init__(self):
        self.calls = []

    def __call__(self, text):
        self.calls.append(text)
        return (text or "") + self.SENTINEL


def _hn_canned(hits):
    """Build a canned HackerNews response payload (algolia shape)."""
    def _fn(_url, _params, _headers):
        return Response(200, json.dumps({"hits": hits}), {"Content-Type": "application/json"})
    return _fn


def _wiki_search_response(titles):
    """Wikipedia /w/api.php search result -> list of titles."""
    def _fn(_url, _params, _headers):
        payload = {"query": {"search": [{"title": t} for t in titles]}}
        return Response(200, json.dumps(payload), {"Content-Type": "application/json"})
    return _fn


def _lobsters_canned(stories):
    def _fn(_url, _params, _headers):
        return Response(200, json.dumps(stories), {"Content-Type": "application/json"})
    return _fn


def _devto_canned(articles):
    def _fn(_url, _params, _headers):
        return Response(200, json.dumps(articles), {"Content-Type": "application/json"})
    return _fn


def _install_stub_firewall(monkeypatch, tmp_path, marker="[REDACTED]"):
    """Drop a tiny stub ``firewall.py`` inside a fake ``$GUARDRAILS_HOME`` and
    point the module at it. Used by tests that verify the optional-guardrails
    seam actually picks the file up when present."""
    root = tmp_path / "guardrails"
    fw = root / "redaction-firewall" / "firewall.py"
    fw.parent.mkdir(parents=True, exist_ok=True)
    fw.write_text(
        "def guard(text):\n"
        "    if text is None:\n"
        "        return ''\n"
        "    # Toy pattern: 4-plus-letter prefix + digits looks like a token.\n"
        "    import re\n"
        "    return re.sub(r'[A-Za-z]{3,}_[A-Za-z0-9]{10,}',\n"
        "                  '" + marker + "', text)\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("GUARDRAILS_HOME", str(root))
    monkeypatch.setattr(research_mod, "_FW", None)
    monkeypatch.setattr(research_mod, "_FW_ERR", None)
    monkeypatch.setattr(research_mod, "_FW_WARNED", False)
    return fw


# ═══════════════════════════════════════════════════════════════════════════════
#  Gate 1 -- LIVE NETWORK OFF BY DEFAULT
# ═══════════════════════════════════════════════════════════════════════════════

def test_live_gate_off_makes_zero_network_calls():
    """With ``RESEARCH_LIVE`` unset and the DEFAULT (production) transport, the
    API MUST raise ``ResearchError`` BEFORE any fan-out -- no socket opened, no
    request constructed."""
    with pytest.raises(research_mod.ResearchError, match="live research disabled"):
        research_mod.research("anything", scrubber=lambda s: s)


def test_live_gate_off_urllib_transport_raises_before_socket():
    """``UrllibTransport.get`` MUST raise ``LiveDisabledError`` BEFORE it builds
    the URL or touches the network."""
    t = UrllibTransport()
    with pytest.raises(LiveDisabledError, match="live research disabled"):
        t.get("https://en.wikipedia.org/w/api.php", params={"q": "x"})


def test_live_gate_on_does_NOT_bypass_allowlist(monkeypatch):
    """Even with the gate ON, the allowlist check in ``HttpClient.get`` runs FIRST.
    A non-allowlisted host raises ``AllowlistError`` before the transport is even
    invoked. Refute-verified: the gate enables network, it does NOT enable SSRF."""
    monkeypatch.setenv(LIVE_ENV, "1")
    cli = HttpClient(transport=UrllibTransport())
    with pytest.raises(AllowlistError):
        cli.get("https://attacker.example/exfil")


def test_cli_live_gate_off_exits_3(tmp_path):
    """End-to-end: ``python research.py <topic>`` with the gate OFF exits 3 and
    writes nothing useful to stdout (the API path is what we just unit-tested;
    this proves the CLI maps the error to the documented exit code)."""
    env = dict(os.environ)
    env["PYTHONUTF8"] = "1"
    env.pop(LIVE_ENV, None)
    env["RESEARCH_CACHE_DIR"] = str(tmp_path / "cache")
    r = subprocess.run([sys.executable, str(R_PATH), "hello"],
                       capture_output=True, text=True, env=env)
    assert r.returncode == 3
    assert "live research disabled" in r.stderr


# ═══════════════════════════════════════════════════════════════════════════════
#  Gate 2 -- EGRESS ALLOWLIST (SSRF guard) -- enforced inside HttpClient.get
# ═══════════════════════════════════════════════════════════════════════════════

def test_allowlist_rejects_non_allowlisted_host_before_transport():
    """The allowlist guard sits INSIDE ``HttpClient.get``, ABOVE the transport."""
    mock = MockTransport()
    cli = HttpClient(transport=mock)
    with pytest.raises(AllowlistError, match="non-allowlisted host"):
        cli.get("https://attacker.example/")
    assert mock.calls == []


def test_allowlist_rejects_every_non_listed_variant():
    """A few common SSRF / data-exfil shapes must all be refused without a socket."""
    mock = MockTransport()
    cli = HttpClient(transport=mock)
    for url in (
        "http://127.0.0.1/",
        "http://localhost:8000/",
        "http://169.254.169.254/latest/meta-data/",   # cloud metadata
        "http://internal.corp/secrets",
        "https://www.google.com/search?q=x",
        "ftp://attacker.example/",
        "http://en.wikipedia.org.attacker.example/",   # not the allowlisted host
    ):
        with pytest.raises(AllowlistError):
            cli.get(url)
    assert mock.calls == []


def test_is_allowed_host_only_accepts_the_canonical_roster():
    """The allowlist must be a CLOSED set -- adding a host is a deliberate review,
    not a config flag."""
    expected = {
        "html.duckduckgo.com", "duckduckgo.com", "en.wikipedia.org",
        "hn.algolia.com", "www.reddit.com", "export.arxiv.org",
        "api.semanticscholar.org", "api.openalex.org", "api.crossref.org",
        "dev.to", "lobste.rs",
    }
    assert ALLOWED_HOSTS == frozenset(expected)
    assert is_allowed_host("https://en.wikipedia.org/x") is True
    assert is_allowed_host("https://attacker.example/") is False
    assert is_allowed_host("not-a-url") is False


# ═══════════════════════════════════════════════════════════════════════════════
#  Gate 3 -- SCRUB THE QUERY BEFORE BUILDING ANY REQUEST
# ═══════════════════════════════════════════════════════════════════════════════

def test_outbound_query_is_scrubbed_before_the_transport_sees_it():
    """A secret-bearing query MUST be transformed by the scrubber BEFORE the
    request URL is built. We assert it by inspecting what reached the transport:
    the scrubbed string (with the sentinel) -- never the raw query."""
    raw = "secret query"
    mock = MockTransport([("https://hn.algolia.com/api/v1/search",
                            _hn_canned([{"title": "T", "url": "https://example.org/x"}]))])
    cli = HttpClient(transport=mock)
    sc = RecordingScrubber()
    payload = research_mod.research(raw, sources=["hackernews"], client=cli, scrubber=sc)

    assert sc.calls[0] == raw
    sent = [c["params"].get("query", "") for c in mock.calls]
    assert any(RecordingScrubber.SENTINEL in q for q in sent)
    assert all(q != raw for q in sent)
    assert RecordingScrubber.SENTINEL in payload["topic"]


def test_query_scrub_failure_raises_BEFORE_any_request_is_built():
    """If the scrubber raises on the QUERY, fail closed: nothing is sent, no warnings,
    no partial output. The transport's ``.calls`` MUST be empty."""
    mock = MockTransport([("https://hn.algolia.com/api/v1/search",
                            _hn_canned([]))])
    cli = HttpClient(transport=mock)

    def _exploding_scrubber(_t):
        raise RuntimeError("redactor exploded on query")

    with pytest.raises(research_mod.ResearchError, match="query scrub failed"):
        research_mod.research("anything", client=cli, scrubber=_exploding_scrubber)
    assert mock.calls == []


def test_query_that_becomes_empty_after_scrubbing_is_refused():
    """A scrubber that returns an empty string MUST be treated as fail-closed --
    sending an empty query would leak the FACT of the lookup AND succeed silently."""
    mock = MockTransport()
    cli = HttpClient(transport=mock)
    with pytest.raises(research_mod.ResearchError, match="became empty after scrubbing"):
        research_mod.research("anything", client=cli, scrubber=lambda _t: "")
    assert mock.calls == []


# ═══════════════════════════════════════════════════════════════════════════════
#  Gate 4 -- TREAT RESULTS AS UNTRUSTED (scrub before return; fail-closed)
# ═══════════════════════════════════════════════════════════════════════════════

def test_returned_result_strings_are_scrubbed_before_return():
    """Every user-visible field on every returned ``Result`` (title / snippet /
    abstract / authors / extras) MUST be transformed by the scrubber BEFORE the
    payload reaches the caller."""
    mock = MockTransport([(
        "https://hn.algolia.com/api/v1/search",
        _hn_canned([
            {"title": "Story Title", "url": "https://example.org/a",
             "story_text": "preview text", "points": 10, "num_comments": 2},
        ])),
    ])
    cli = HttpClient(transport=mock)
    sc = RecordingScrubber()
    payload = research_mod.research("topic", sources=["hackernews"], client=cli, scrubber=sc)
    assert payload["results"], "the test fixture must produce at least one result"
    r0 = payload["results"][0]
    assert r0["title"].endswith(RecordingScrubber.SENTINEL)
    assert r0["snippet"].endswith(RecordingScrubber.SENTINEL)
    assert r0["url"] == "https://example.org/a"


def test_result_url_query_and_fragment_are_scrubbed_host_path_kept():
    """A token in an API-returned result URL's query / fragment MUST pass through
    the scrubber -- a bearer token embedded there would otherwise reach logs /
    the consuming LLM unscrubbed -- while scheme / host / path stay intact."""
    mock = MockTransport([(
        "https://hn.algolia.com/api/v1/search",
        _hn_canned([{"title": "t", "url": "https://example.org/doc?access_token=ABC#sec",
                     "story_text": "x", "points": 1, "num_comments": 0}])),
    ])
    cli = HttpClient(transport=mock)
    sc = RecordingScrubber()
    payload = research_mod.research("topic", sources=["hackernews"], client=cli, scrubber=sc)
    url = payload["results"][0]["url"]
    assert url.startswith("https://example.org/doc")
    assert RecordingScrubber.SENTINEL in url


class _FakeResp:
    status = 200

    class _H:
        def get_content_charset(self, d): return "utf-8"
        def items(self): return []
        def get(self, k, d=None): return d

    def __init__(self, body): self._body = body
    def read(self, n=-1): return self._body[:n] if (n is not None and n >= 0) else self._body
    @property
    def headers(self): return self._H()
    def __enter__(self): return self
    def __exit__(self, *a): return False


class _FakeOpener:
    def __init__(self, body): self._body = body
    def open(self, req, timeout=None): return _FakeResp(self._body)


def test_urllib_transport_caps_oversize_response_body(monkeypatch):
    """UrllibTransport.get MUST fail closed on an over-cap response instead of
    reading unbounded memory."""
    monkeypatch.setenv(LIVE_ENV, "1")
    t = UrllibTransport()
    t._opener = _FakeOpener(b"x" * 50)
    with pytest.raises(TransportError, match="cap"):
        t.get("https://en.wikipedia.org/w/api.php", params={"q": "x"}, max_bytes=10)


def test_urllib_transport_accepts_within_cap(monkeypatch):
    monkeypatch.setenv(LIVE_ENV, "1")
    t = UrllibTransport()
    t._opener = _FakeOpener(b'{"ok": 1}')
    resp = t.get("https://en.wikipedia.org/w/api.php", params={"q": "x"}, max_bytes=100)
    assert resp.status == 200 and "ok" in resp.text


def test_default_max_bytes_matches_5mib():
    assert DEFAULT_MAX_BYTES == 5 * 1024 * 1024


def test_arxiv_parse_rejects_doctype_entity_bomb():
    """An Atom feed carrying a DTD / <!DOCTYPE> / <!ENTITY> is rejected BEFORE
    parsing -- a legit arXiv feed has none. Fail-safe: zero results."""
    from lib.sources.arxiv import _parse
    bomb = ('<?xml version="1.0"?>\n<!DOCTYPE lolz [<!ENTITY lol "lol">'
            '<!ENTITY lol2 "&lol;&lol;&lol;">]>\n<feed><entry/></feed>')
    assert _parse(bomb) == []
    ok = ('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">'
          '<entry><title>t</title></entry></feed>')
    assert isinstance(_parse(ok), list)


def test_result_scrub_failure_raises_AND_discards_the_whole_batch():
    """If the scrubber raises on a RESULT (not the query), fail closed: the
    whole batch is discarded, the API raises, the CLI exits 4."""
    mock = MockTransport([(
        "https://hn.algolia.com/api/v1/search",
        _hn_canned([{"title": "x", "url": "https://example.org/x"}])),
    ])
    cli = HttpClient(transport=mock)

    calls = {"n": 0}

    def _scrubber(text):
        calls["n"] += 1
        if calls["n"] == 1:
            return text
        raise RuntimeError("redactor exploded on result")

    with pytest.raises(research_mod.ResearchError, match="results scrub failed"):
        research_mod.research("topic", sources=["hackernews"], client=cli, scrubber=_scrubber)


# ═══════════════════════════════════════════════════════════════════════════════
#  Gate 5 -- PER-SOURCE FAILURE ISOLATION + HARD OVERALL BUDGET
# ═══════════════════════════════════════════════════════════════════════════════

def test_one_failing_source_does_not_kill_the_run():
    """A source raising MUST become a warning, never kill siblings."""
    def _lobsters_explodes(_url, _params, _headers):
        raise RuntimeError("lobsters is down today")

    mock = MockTransport([
        ("https://hn.algolia.com/api/v1/search",
         _hn_canned([{"title": "good", "url": "https://example.org/good"}])),
        ("https://lobste.rs/search.json", _lobsters_explodes),
    ])
    cli = HttpClient(transport=mock)
    payload = research_mod.research("topic",
                                     sources=["hackernews", "lobsters"],
                                     client=cli, scrubber=lambda s: s)

    titles = [r["title"] for r in payload["results"]]
    assert "good" in titles
    assert any("lobsters" in w for w in payload["warnings"])


def test_overall_budget_short_circuits_slow_sources():
    """The aggregator's ``as_completed(timeout=...)`` MUST stop waiting after the
    budget. We give it a 0.5 s budget and one source that sleeps 5 s."""
    def _slow(_url, _params, _headers):
        time.sleep(5.0)
        return Response(200, "{}", {})

    mock = MockTransport([
        ("https://hn.algolia.com/api/v1/search",
         _hn_canned([{"title": "fast", "url": "https://example.org/fast"}])),
        ("https://lobste.rs/search.json", _slow),
    ])
    cli = HttpClient(transport=mock)

    t0 = time.monotonic()
    payload = research_mod.research("topic",
                                     sources=["hackernews", "lobsters"],
                                     client=cli, scrubber=lambda s: s,
                                     timeout=0.5)
    elapsed = time.monotonic() - t0
    assert elapsed < 3.0, ("the 0.5s budget must short-circuit the slow source "
                            "(elapsed=%.2fs)" % elapsed)
    titles = [r["title"] for r in payload["results"]]
    assert "fast" in titles
    assert any("timeout" in w and "lobsters" in w for w in payload["warnings"])


def test_dedup_by_normalized_url():
    """Two sources may return the same URL; the aggregator dedups by normalized
    URL (lowercased + trailing-slash-stripped)."""
    same_url = "https://example.org/same"
    mock = MockTransport([
        ("https://hn.algolia.com/api/v1/search",
         _hn_canned([{"title": "hn-side", "url": same_url}])),
        ("https://lobste.rs/search.json",
         _lobsters_canned([{"title": "lobster-side", "url": same_url + "/"}])),
    ])
    cli = HttpClient(transport=mock)
    payload = research_mod.research("topic",
                                     sources=["hackernews", "lobsters"],
                                     client=cli, scrubber=lambda s: s)
    urls = [r["url"] for r in payload["results"]]
    assert urls.count(same_url) + urls.count(same_url + "/") == 1, (
        "the same URL must appear at most once after dedup (got %r)" % urls)


def test_success_metric_requires_at_least_three_sources():
    """``stats.success`` MUST be ``len(successful_sources) >= 3``."""
    mock = MockTransport([
        ("https://hn.algolia.com/api/v1/search",
         _hn_canned([{"title": "x", "url": "https://example.org/x"}])),
    ])
    cli = HttpClient(transport=mock)
    payload = research_mod.research("topic", sources=["hackernews"], client=cli,
                                     scrubber=lambda s: s)
    assert payload["stats"]["sources_succeeded"] == 1
    assert payload["stats"]["success"] is False
    assert payload["stats"]["success_min_sources"] == 3


# ═══════════════════════════════════════════════════════════════════════════════
#  No-false-green guard -- the recording scrubber proves guard() ran on every path
# ═══════════════════════════════════════════════════════════════════════════════

def test_scrubber_is_called_at_least_once_for_query_AND_once_per_result_string():
    """The scrubber call count MUST include (1) the query, and (2) at least one
    call per returned result string (title is always present)."""
    mock = MockTransport([(
        "https://hn.algolia.com/api/v1/search",
        _hn_canned([
            {"title": "T1", "url": "https://example.org/1",
             "story_text": "snip", "points": 1, "num_comments": 0},
            {"title": "T2", "url": "https://example.org/2",
             "story_text": "snip2", "points": 2, "num_comments": 0},
        ])),
    ])
    cli = HttpClient(transport=mock)
    sc = RecordingScrubber()
    payload = research_mod.research("Q", sources=["hackernews"], client=cli, scrubber=sc)

    assert sc.calls[0] == "Q"
    assert len(sc.calls) >= 1 + 2 * 2
    for r in payload["results"]:
        assert r["title"].endswith(RecordingScrubber.SENTINEL)


def test_research_does_NOT_invent_results_when_every_source_fails():
    """When every source raises, ``results`` MUST be empty AND ``success`` MUST
    be False. Never a "yes I researched it" with zero data."""
    def _boom(_url, _params, _headers):
        raise RuntimeError("everyone's down")

    mock = MockTransport([
        ("https://hn.algolia.com/api/v1/search", _boom),
        ("https://lobste.rs/search.json", _boom),
        ("https://dev.to/api/articles", _boom),
    ])
    cli = HttpClient(transport=mock)
    payload = research_mod.research("topic",
                                     sources=["hackernews", "lobsters", "devto"],
                                     client=cli, scrubber=lambda s: s)
    assert payload["results"] == []
    assert payload["stats"]["sources_succeeded"] == 0
    assert payload["stats"]["success"] is False
    assert len(payload["warnings"]) == 3


# ═══════════════════════════════════════════════════════════════════════════════
#  Optional guardrails firewall -- present = guard used; absent = passthrough
# ═══════════════════════════════════════════════════════════════════════════════

def test_guardrails_absent_default_scrubber_is_passthrough(monkeypatch, capsys, tmp_path):
    """Missing firewall -> default_scrubber returns identity + emits ONE stderr
    note. The other three gates still hold (live, allowlist, isolation) -- proven
    elsewhere; here we just prove the seam."""
    monkeypatch.delenv("GUARDRAILS_HOME", raising=False)
    # Point HOME at an empty tmp dir so the ~/.guardrails/... fallback misses too.
    empty_home = tmp_path / "empty-home"
    empty_home.mkdir()
    monkeypatch.setenv("HOME", str(empty_home))
    fn = research_mod.default_scrubber()
    assert fn("secret") == "secret"
    err = capsys.readouterr().err
    assert "optional Safe-Autonomy Guardrails firewall not found" in err

    # Second call MUST NOT emit the note again (once per process).
    fn2 = research_mod.default_scrubber()
    assert fn2("x") == "x"
    err2 = capsys.readouterr().err
    assert "not found" not in err2


def test_guardrails_present_default_scrubber_is_the_guard(monkeypatch, tmp_path):
    """With a stub firewall installed in $GUARDRAILS_HOME, default_scrubber
    returns the firewall's guard() and it actually redacts."""
    _install_stub_firewall(monkeypatch, tmp_path, marker="[REDACTED]")
    fn = research_mod.default_scrubber()
    tokenlike = "abc_" + "1234567890ABCDEFGHIJ"
    out = fn("prefix " + tokenlike + " suffix")
    assert tokenlike not in out
    assert "[REDACTED]" in out


def test_guardrails_present_end_to_end_scrub(monkeypatch, tmp_path):
    """End-to-end: with the stub firewall installed, a fake token in a mock
    result body is redacted on the way out."""
    _install_stub_firewall(monkeypatch, tmp_path, marker="[REDACTED]")
    tokenlike = "abc_" + "1234567890ABCDEFGHIJ"
    mock = MockTransport([(
        "https://hn.algolia.com/api/v1/search",
        _hn_canned([{"title": "leak " + tokenlike, "url": "https://example.org/x",
                     "story_text": "body", "points": 0, "num_comments": 0}])),
    ])
    cli = HttpClient(transport=mock)
    payload = research_mod.research("topic", sources=["hackernews"], client=cli)
    assert tokenlike not in payload["results"][0]["title"]
    assert "[REDACTED]" in payload["results"][0]["title"]


# ═══════════════════════════════════════════════════════════════════════════════
#  Integration -- end-to-end multi-source happy path (still hermetic)
# ═══════════════════════════════════════════════════════════════════════════════

def test_three_sources_happy_path_returns_success_true():
    """End-to-end with three healthy mock sources -- the payload MUST have
    ``success = True`` and one result per source (no dedup collisions)."""
    mock = MockTransport([
        ("https://hn.algolia.com/api/v1/search",
         _hn_canned([{"title": "hn-hit", "url": "https://example.org/hn"}])),
        ("https://lobste.rs/search.json",
         _lobsters_canned([{"title": "lobsters-hit", "url": "https://example.org/lob"}])),
        ("https://dev.to/api/articles",
         _devto_canned([{"title": "devto-hit", "url": "https://example.org/dev",
                          "description": "snip"}])),
    ])
    cli = HttpClient(transport=mock)
    payload = research_mod.research("topic",
                                     sources=["hackernews", "lobsters", "devto"],
                                     client=cli, scrubber=lambda s: s)
    titles = sorted(r["title"] for r in payload["results"])
    assert titles == ["devto-hit", "hn-hit", "lobsters-hit"]
    assert payload["stats"]["sources_succeeded"] == 3
    assert payload["stats"]["success"] is True
    assert payload["live_gate"] == LIVE_ENV
    assert payload["mode"] == "free-sources"


def test_unknown_source_name_is_refused():
    """Asking for a source we don't ship MUST raise."""
    with pytest.raises(research_mod.ResearchError, match="unknown source"):
        research_mod.research("x", sources=["bing"],
                              client=HttpClient(transport=MockTransport()),
                              scrubber=lambda s: s)


def test_empty_query_is_refused():
    """An empty / whitespace-only query MUST raise."""
    cli = HttpClient(transport=MockTransport())
    with pytest.raises(research_mod.ResearchError, match="non-empty string"):
        research_mod.research("   ", client=cli, scrubber=lambda s: s)
    with pytest.raises(research_mod.ResearchError, match="non-empty string"):
        research_mod.research("", client=cli, scrubber=lambda s: s)


# ═══════════════════════════════════════════════════════════════════════════════
#  CLI smoke -- the gate-off path AND --list-sources end-to-end
# ═══════════════════════════════════════════════════════════════════════════════

def _run_cli(args, env_overrides=None):
    env = dict(os.environ)
    env["PYTHONUTF8"] = "1"
    env.pop(LIVE_ENV, None)
    if env_overrides:
        env.update(env_overrides)
    return subprocess.run([sys.executable, str(R_PATH)] + args,
                          capture_output=True, text=True, env=env)


def test_cli_help_runs_cleanly():
    r = _run_cli(["--help"])
    assert r.returncode == 0
    assert "multi-source web-research aggregator" in r.stdout


def test_cli_list_sources_prints_the_full_roster():
    r = _run_cli(["--list-sources"])
    assert r.returncode == 0
    listed = r.stdout.split()
    assert set(research_mod.ALL_SOURCES).issubset(set(listed))


def test_cli_missing_topic_exits_2():
    r = _run_cli([])
    assert r.returncode == 2
    assert "missing topic" in r.stderr


def test_cli_unknown_source_exits_2():
    r = _run_cli(["topic", "--sources", "bing"])
    assert r.returncode == 2
    assert "unknown source" in r.stderr


# ═══════════════════════════════════════════════════════════════════════════════
#  Regression tests for refute-verified findings (CWE-918 / CWE-319 / contract)
# ═══════════════════════════════════════════════════════════════════════════════

def test_redirect_to_non_allowlisted_host_is_blocked():
    """SSRF via unchecked HTTP redirect bypass of egress allowlist.

    Default ``urllib.request.urlopen`` follows 3xx redirects via the stdlib
    ``HTTPRedirectHandler``; the resolved URL never re-passes through
    ``HttpClient.get`` and is therefore never re-checked against ``ALLOWED_HOSTS``.
    Our custom ``AllowlistRedirectHandler`` re-runs the check on every hop."""
    from lib.http import AllowlistRedirectHandler
    import urllib.request as _urlrequest

    handler = AllowlistRedirectHandler()
    req = _urlrequest.Request("https://en.wikipedia.org/wiki/anything")

    # 1) Redirect to the AWS instance-metadata service MUST raise.
    with pytest.raises(AllowlistError, match="redirect"):
        handler.redirect_request(req, fp=None, code=301, msg="Moved",
                                 headers={},
                                 newurl="http://169.254.169.254/latest/meta-data/iam/")

    # 2) Redirect to localhost MUST raise.
    with pytest.raises(AllowlistError):
        handler.redirect_request(req, fp=None, code=302, msg="Found",
                                 headers={}, newurl="http://127.0.0.1:8000/exfil")

    # 3) Redirect to an allowlisted host but over plaintext http:// MUST raise.
    with pytest.raises(AllowlistError):
        handler.redirect_request(req, fp=None, code=301, msg="Moved",
                                 headers={}, newurl="http://en.wikipedia.org/wiki/x")

    # 4) Redirect that stays inside the allowlist + keeps https returns a real
    #    Request object (delegated to the stdlib parent class).
    out = handler.redirect_request(req, fp=None, code=302, msg="Found",
                                   headers={},
                                   newurl="https://en.wikipedia.org/wiki/y")
    assert isinstance(out, _urlrequest.Request)
    assert out.full_url == "https://en.wikipedia.org/wiki/y"


def test_urllib_transport_installs_allowlist_redirect_handler():
    """The production transport's opener MUST chain the AllowlistRedirectHandler."""
    from lib.http import AllowlistRedirectHandler

    t = UrllibTransport()
    handlers = getattr(t, "_opener", None).handlers if getattr(t, "_opener", None) else []
    assert any(isinstance(h, AllowlistRedirectHandler) for h in handlers), (
        "UrllibTransport must install AllowlistRedirectHandler so 3xx targets "
        "are re-checked; found handlers: %r"
        % [type(h).__name__ for h in handlers])


def test_arxiv_endpoint_is_https_not_plaintext_http():
    """arXiv ENDPOINT must be https:// so a copy-paste from a legacy fixture
    cannot silently regress the CWE-319 fix."""
    from lib.sources import arxiv as arxiv_mod

    assert arxiv_mod.ENDPOINT.startswith("https://"), (
        "arXiv ENDPOINT must be https:// (got %r)" % arxiv_mod.ENDPOINT)
    cli = HttpClient(transport=MockTransport())
    try:
        cli.get(arxiv_mod.ENDPOINT)
    except AllowlistError as exc:  # pragma: no cover
        pytest.fail("arxiv ENDPOINT failed the egress chokepoint: %s" % exc)


def test_allowlist_refuses_http_scheme_even_for_allowlisted_host():
    """The chokepoint must reject ``http://en.wikipedia.org/...`` even though
    the HOST is on the allowlist -- otherwise an accidental http:// in a source
    module passes the SSRF guard and leaks the (scrubbed) query in cleartext."""
    mock = MockTransport()
    cli = HttpClient(transport=mock)
    for url in (
        "http://en.wikipedia.org/wiki/x",
        "http://hn.algolia.com/api/v1/search",
        "http://export.arxiv.org/api/query",
        "ftp://en.wikipedia.org/x",
    ):
        with pytest.raises(AllowlistError):
            cli.get(url)
    assert mock.calls == []


def test_reddit_posted_at_is_iso8601_not_float_string():
    """Reddit ``posted_at`` must be ISO 8601 UTC, never a float-as-string."""
    def _reddit_canned(_url, _params, _headers):
        payload = {"data": {"children": [
            {"data": {"title": "T1", "permalink": "/r/x/comments/1",
                      "created_utc": 1622000000.0, "score": 1, "num_comments": 0,
                      "subreddit": "x"}},
            {"data": {"title": "T2", "permalink": "/r/x/comments/2",
                      "created_utc": None, "score": 0, "num_comments": 0,
                      "subreddit": "x"}},
        ]}}
        return Response(200, json.dumps(payload), {"Content-Type": "application/json"})

    mock = MockTransport([("https://www.reddit.com/search.json", _reddit_canned)])
    cli = HttpClient(transport=mock)
    payload = research_mod.research("topic", sources=["reddit"],
                                     client=cli, scrubber=lambda s: s)

    results = payload["results"]
    assert len(results) == 2

    import re as _re
    iso_re = _re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
    assert iso_re.match(results[0]["posted_at"] or ""), (
        "reddit posted_at must be ISO 8601 'Z' string (got %r)"
        % results[0]["posted_at"])
    assert results[0]["posted_at"] == "2021-05-26T03:33:20Z"
    assert results[1]["posted_at"] is None


def test_source_json_decode_errors_propagate_to_warnings_not_silent_empty():
    """Source parsers must let JSON / parse errors PROPAGATE so the aggregator
    can record them in warnings -- silently returning [] would be lie-green."""
    def _malformed_json(_url, _params, _headers):
        return Response(200, "<<not json>>", {"Content-Type": "application/json"})

    mock = MockTransport([
        ("https://hn.algolia.com/api/v1/search", _malformed_json),
    ])
    cli = HttpClient(transport=mock)
    payload = research_mod.research("topic", sources=["hackernews"],
                                     client=cli, scrubber=lambda s: s)

    assert payload["results"] == []
    assert payload["stats"]["sources_succeeded"] == 0
    assert any("hackernews" in w for w in payload["warnings"]), (
        "JSON decode failure must surface in warnings[] (got %r)"
        % payload["warnings"])
    assert any("TransportError" in w or "invalid JSON" in w
               for w in payload["warnings"]), (
        "warning should name the underlying parse failure (got %r)"
        % payload["warnings"])
