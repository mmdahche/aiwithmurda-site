"""http.py -- research HTTP client: egress allowlist + injectable transport + live gate.

This module enforces FOUR security properties on every outbound request the research
skill makes; sources MUST go through ``HttpClient.get`` (not raw urllib):

  1. EGRESS ALLOWLIST + HTTPS-ONLY. Every request URL is parsed and its hostname
     checked against a hardcoded ``ALLOWED_HOSTS`` set (the free-source domains);
     the scheme MUST be ``https``. A non-allowlisted host OR a non-https scheme
     raises ``AllowlistError`` BEFORE any socket is opened (SSRF guard +
     cleartext-egress guard). The skill never follows result links in v1 -- it
     queries the allowlisted source APIs only.

  2. REDIRECT-AWARE ALLOWLIST. The production transport installs a custom
     ``AllowlistRedirectHandler`` that re-runs the allowlist + https check on
     EVERY 3xx redirect target BEFORE following it. This closes a CWE-918 SSRF
     bypass where an allowlisted server (or an on-path attacker against a
     plaintext hop) could 301 the client to ``http://169.254.169.254/...`` or an
     internal host and have urllib follow it transparently. A redirect to a
     non-allowlisted host or to ``http://`` raises ``AllowlistError`` and the
     network call fails closed.

  3. LIVE GATE (default OFF). The default production transport (`UrllibTransport`)
     refuses to open a socket unless the operator has set ``RESEARCH_LIVE=1`` (or
     ``true`` / ``yes``). With the gate OFF, every ``.get()`` raises
     ``LiveDisabledError`` -- so importing / building the skill or running the
     entire test suite makes ZERO network calls.

  4. INJECTABLE TRANSPORT. ``HttpClient(transport=...)`` accepts any object with a
     ``.get(url, params, headers, timeout) -> Response`` method. Tests pass a
     ``MockTransport`` (this file) to exercise the source clients without touching
     the network. The allowlist guard runs inside ``HttpClient.get`` regardless of
     transport, so a mock transport cannot bypass the SSRF check.

Additional conventions:

  * Polite User-Agent string built from a per-client name + optional contact email
    (``RESEARCH_CONTACT_EMAIL``).
  * Retry-on-5xx with backoff (3 retries default).
  * Bounded response body read (5 MiB by default) -- fail-closed on over-cap.

Pure stdlib (urllib, json, os, time, socket) -- no `requests`, no `httpx`.
"""
from __future__ import annotations

import json
import os
import socket
import time
from typing import Any, Dict, List, Optional, Protocol
from urllib import error as urlerror
from urllib import parse as urlparse_mod
from urllib import request as urlrequest

DEFAULT_TIMEOUT = 15  # seconds
# A hard bound on how many response bytes we read into memory per request.
# WITHOUT this, a misbehaving / compromised / BGP-hijacked allowlisted server
# could stream unbounded data into one of the (up to 10) parallel aggregator
# threads and exhaust memory once RESEARCH_LIVE is on.
DEFAULT_MAX_BYTES = 5 * 1024 * 1024  # 5 MiB per response
USER_AGENT_BASE = "research-engine/1.0"
LIVE_ENV = "RESEARCH_LIVE"
LIVE_TRUE = ("1", "true", "yes", "on")

# --- HARDCODED EGRESS ALLOWLIST -----------------------------------------------
# Every outbound request must target a host in this set. Adding a host requires
# a deliberate code change. v1 does NOT follow result links -- only the
# allowlisted source APIs are queried.
ALLOWED_HOSTS = frozenset({
    # DuckDuckGo HTML (no key). SearXNG fallback is intentionally NOT
    # allowlisted -- public SearXNG instances are operator-trust, not host-fixed.
    "html.duckduckgo.com",
    "duckduckgo.com",
    # Wikipedia (free, MediaWiki API + REST summary)
    "en.wikipedia.org",
    # HackerNews via Algolia (no key)
    "hn.algolia.com",
    # Reddit public search.json (no key)
    "www.reddit.com",
    # arXiv (free, no key)
    "export.arxiv.org",
    # Semantic Scholar (free, no key)
    "api.semanticscholar.org",
    # OpenAlex (free, polite-pool when email present)
    "api.openalex.org",
    # CrossRef (free, polite-pool when email present)
    "api.crossref.org",
    # dev.to (free articles API, no key)
    "dev.to",
    # Lobste.rs (free search.json, no key)
    "lobste.rs",
})


# --- exceptions ----------------------------------------------------------------

class TransportError(RuntimeError):
    """A transport failed to fetch a URL (network, decode, transport-level)."""


class AllowlistError(RuntimeError):
    """SSRF guard: the requested URL targets a host not on ``ALLOWED_HOSTS``.

    Raised by ``HttpClient.get`` BEFORE any transport is invoked, so a misrouted
    rule or a poisoned result URL can never reach the network.
    """


class LiveDisabledError(RuntimeError):
    """The default ``UrllibTransport`` is gated behind ``RESEARCH_LIVE=1`` and the
    gate is OFF. Raised at the top of ``.get()`` before any socket call.
    """


# --- Response ------------------------------------------------------------------

class Response:
    """Minimal response surface sources need: status code, body text, JSON, headers."""

    __slots__ = ("status", "text", "headers", "url")

    def __init__(self, status: int, text: str, headers: Optional[Dict[str, str]] = None,
                 url: str = "") -> None:
        self.status = int(status)
        self.text = text or ""
        self.headers = dict(headers or {})
        self.url = url

    def json(self) -> Any:
        try:
            return json.loads(self.text) if self.text else None
        except json.JSONDecodeError as exc:
            raise TransportError("invalid JSON from %s: %s" % (self.url, exc)) from exc

    def __repr__(self) -> str:  # pragma: no cover - debug only
        return "Response(status=%d, url=%r, %d bytes)" % (self.status, self.url, len(self.text))


# --- Transport protocol --------------------------------------------------------

class Transport(Protocol):
    """Anything with ``.get(url, params, headers, timeout) -> Response``."""

    def get(self, url: str, params: Optional[Dict[str, Any]] = None,
            headers: Optional[Dict[str, str]] = None,
            timeout: float = DEFAULT_TIMEOUT) -> Response: ...


# --- polite User-Agent ---------------------------------------------------------

def polite_user_agent(client_name: str, contact_email: Optional[str]) -> str:
    """arXiv / CrossRef / OpenAlex polite-pool UA format. No contact = just the client name."""
    if contact_email and "@" in contact_email:
        return "%s (mailto:%s)" % (client_name, contact_email)
    return client_name


# --- allowlist helper ----------------------------------------------------------

def is_allowed_host(url: str) -> bool:
    """True iff *url* parses to a hostname on ``ALLOWED_HOSTS``. Used by the
    SSRF guard and exposed for tests. SCHEME-AGNOSTIC by design; the https-only
    check lives in :func:`is_allowed_url` and in ``HttpClient.get``."""
    try:
        host = (urlparse_mod.urlparse(url).hostname or "").lower()
    except (ValueError, AttributeError):
        return False
    return host in ALLOWED_HOSTS


def is_allowed_url(url: str) -> bool:
    """True iff *url* is both on the host allowlist AND uses the ``https`` scheme."""
    try:
        parsed = urlparse_mod.urlparse(url)
    except (ValueError, AttributeError):
        return False
    if (parsed.scheme or "").lower() != "https":
        return False
    return (parsed.hostname or "").lower() in ALLOWED_HOSTS


# --- redirect-aware allowlist handler (closes CWE-918 SSRF via 3xx) -----------

class AllowlistRedirectHandler(urlrequest.HTTPRedirectHandler):
    """A drop-in replacement for the stdlib :class:`HTTPRedirectHandler` that
    re-validates EVERY redirect target against the egress allowlist + https
    scheme BEFORE the parent class follows it.

    Why: ``urllib.request.urlopen`` follows 3xx redirects via the default
    ``HTTPRedirectHandler``; the resolved URL never passes back through
    ``HttpClient.get`` and therefore never re-touches :func:`is_allowed_url`.
    A redirect from an allowlisted (or MITM'd plaintext) source to
    ``http://169.254.169.254/latest/meta-data/...`` would otherwise be followed
    silently. We close it by intercepting every redirect -- same hop or
    cross-host -- and refusing anything that fails the allowlist + scheme check.
    """

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not is_allowed_url(newurl):
            host = (urlparse_mod.urlparse(newurl).hostname or "<none>")
            raise AllowlistError(
                "refusing %d redirect to non-allowlisted-or-plaintext host %r "
                "(URL=%s); this would bypass the egress allowlist"
                % (code, host, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


# --- production transport (urllib, live-gated) --------------------------------

class UrllibTransport:
    """Default production transport: stdlib ``urllib`` with retry-on-5xx.

    FAIL-CLOSED on live gate: any ``.get()`` raises ``LiveDisabledError`` unless
    ``RESEARCH_LIVE`` is in ``LIVE_TRUE`` -- the check runs before the URL is
    even constructed. Tests should NEVER instantiate this; they pass a
    ``MockTransport`` so the suite is 100% offline.
    """

    def __init__(self, retries: int = 3, backoff: float = 1.0,
                 live_env: str = LIVE_ENV) -> None:
        self.retries = max(0, int(retries))
        self.backoff = max(0.0, float(backoff))
        self.live_env = live_env
        # Build an opener that uses our allowlist-aware redirect handler INSTEAD
        # of the stdlib default. Passing our custom handler to build_opener
        # replaces ONLY the redirect handler; every 3xx is re-checked against
        # ALLOWED_HOSTS + the https-only rule before the next request is built.
        self._opener = urlrequest.build_opener(AllowlistRedirectHandler())

    def _live_enabled(self) -> bool:
        val = (os.environ.get(self.live_env) or "").strip().lower()
        return val in LIVE_TRUE

    def get(self, url: str, params: Optional[Dict[str, Any]] = None,
            headers: Optional[Dict[str, str]] = None,
            timeout: float = DEFAULT_TIMEOUT,
            max_bytes: int = DEFAULT_MAX_BYTES) -> Response:
        if not self._live_enabled():
            raise LiveDisabledError(
                "live research disabled -- set %s=1 after your security "
                "sign-off to enable real network calls (currently the skill "
                "makes ZERO outbound requests by default)" % self.live_env)
        full_url = _build_url(url, params)
        req_headers = dict(headers or {})
        # 5xx retries with linear backoff; 4xx returns the response (sources decide).
        last_exc: Optional[Exception] = None
        for attempt in range(self.retries + 1):
            try:
                req = urlrequest.Request(full_url, headers=req_headers, method="GET")
                with self._opener.open(req, timeout=timeout) as r:  # nosec - URL gated by allowlist + redirects re-checked
                    # Bounded read: ask for one byte MORE than the cap so an over-cap
                    # response is detectable. Fail closed (raise) -- never read unbounded.
                    body = r.read(max_bytes + 1)
                    if len(body) > max_bytes:
                        raise TransportError(
                            "response body exceeds %d-byte cap (URL=%s)" % (max_bytes, full_url))
                    text = _decode(body, r.headers.get_content_charset("utf-8"))
                    return Response(r.status, text,
                                    {k: v for k, v in r.headers.items()},
                                    full_url)
            except urlerror.HTTPError as e:
                if 500 <= e.code <= 599 and attempt < self.retries:
                    time.sleep(self.backoff * (attempt + 1))
                    last_exc = e
                    continue
                # 4xx (or final 5xx): wrap as a Response so the source's status-check
                # path runs uniformly. Cap the error-body read too.
                body = b""
                try:
                    body = (e.read(max_bytes + 1) or b"")[:max_bytes]
                except Exception:
                    pass
                return Response(e.code, _decode(body, "utf-8"), dict(e.headers or {}), full_url)
            except (urlerror.URLError, socket.timeout, ConnectionError, TimeoutError) as e:
                last_exc = e
                if attempt < self.retries:
                    time.sleep(self.backoff * (attempt + 1))
                    continue
                raise TransportError("network error fetching %s: %s" % (full_url, e)) from e
        # Unreachable in practice (loop either returns or raises) -- defensive.
        raise TransportError("exhausted retries for %s: %s" % (full_url, last_exc))


def _build_url(url: str, params: Optional[Dict[str, Any]]) -> str:
    if not params:
        return url
    # Drop None values so callers can pass optional params without conditionals.
    cleaned = [(k, v) for k, v in params.items() if v is not None]
    if not cleaned:
        return url
    qs = urlparse_mod.urlencode(cleaned, doseq=True)
    sep = "&" if "?" in url else "?"
    return url + sep + qs


def _decode(body: bytes, encoding: Optional[str]) -> str:
    enc = (encoding or "utf-8").lower()
    try:
        return body.decode(enc, errors="replace")
    except (LookupError, AttributeError):
        return body.decode("utf-8", errors="replace")


# --- MockTransport (for tests; also useful for offline demos) -----------------

class MockTransport:
    """Test double: serves canned ``Response`` objects matched by URL prefix.

    ``responses`` is a list of ``(url_prefix, response_or_callable)`` pairs;
    first match wins. A callable receives ``(url, params, headers)`` and must
    return a ``Response`` -- useful for sources that expect dynamic JSON.

    All calls are recorded in ``.calls`` for assertions. Unmatched URLs return
    a 404 Response so a source's status-check path runs.
    """

    def __init__(self, responses: Optional[List[Any]] = None,
                 default_status: int = 404) -> None:
        self.responses = list(responses or [])
        self.default_status = int(default_status)
        self.calls: List[Dict[str, Any]] = []

    def add(self, url_prefix: str, response_or_callable: Any) -> "MockTransport":
        self.responses.append((url_prefix, response_or_callable))
        return self

    def get(self, url: str, params: Optional[Dict[str, Any]] = None,
            headers: Optional[Dict[str, str]] = None,
            timeout: float = DEFAULT_TIMEOUT) -> Response:
        self.calls.append({"url": url, "params": dict(params or {}),
                            "headers": dict(headers or {}), "timeout": timeout})
        for prefix, resp in self.responses:
            if url.startswith(prefix):
                if callable(resp):
                    out = resp(url, dict(params or {}), dict(headers or {}))
                    return out if isinstance(out, Response) else Response(200, str(out), {}, url)
                return resp
        return Response(self.default_status, "", {}, url)


# --- HttpClient (sources use this; enforces allowlist around any transport) ----

class HttpClient:
    """The wrapper sources use. Enforces the egress allowlist around ANY transport
    (mock or production) so the SSRF guard always runs regardless of how the
    skill was constructed.

    Construction:
      ``HttpClient()`` -- default ``UrllibTransport`` (live-gated, OFF by default).
      ``HttpClient(transport=MockTransport([...]))`` -- for tests and offline demos.
    """

    def __init__(self, transport: Optional[Transport] = None,
                 contact_email: Optional[str] = None,
                 user_agent_base: str = USER_AGENT_BASE) -> None:
        self.transport: Transport = transport or UrllibTransport()
        self.contact_email = contact_email or os.environ.get("RESEARCH_CONTACT_EMAIL") or None
        self._ua_base = user_agent_base

    def user_agent(self, client_name: Optional[str] = None) -> str:
        name = client_name or self._ua_base
        return polite_user_agent(name, self.contact_email)

    def get(self, url: str, params: Optional[Dict[str, Any]] = None,
            extra_headers: Optional[Dict[str, str]] = None,
            timeout: float = DEFAULT_TIMEOUT,
            client_name: Optional[str] = None) -> Response:
        """Fetch *url*. Raises ``AllowlistError`` BEFORE invoking the transport if
        the host isn't in ``ALLOWED_HOSTS`` OR the scheme isn't ``https``. Tags
        the request with a polite UA. The https-only check closes the silent
        plaintext-egress gap: an allowlisted hostname over ``http://`` would
        otherwise pass the host check and leak the (already-scrubbed but
        user-derived) query in cleartext, AND be MITM-redirectable.
        """
        parsed = urlparse_mod.urlparse(url)
        host = (parsed.hostname or "<none>")
        scheme = (parsed.scheme or "").lower()
        if (parsed.hostname or "").lower() not in ALLOWED_HOSTS:
            raise AllowlistError(
                "refusing to fetch non-allowlisted host %r (URL=%s); update "
                "ALLOWED_HOSTS if this addition is intentional"
                % (host, url))
        if scheme != "https":
            raise AllowlistError(
                "refusing to fetch non-https URL (scheme=%r, URL=%s); the "
                "egress chokepoint is https-only to prevent cleartext leakage "
                "of the (scrubbed) query and MITM-injected redirects"
                % (scheme, url))
        headers = {"User-Agent": self.user_agent(client_name),
                   "Accept": "application/json, text/html;q=0.9, */*;q=0.5"}
        if extra_headers:
            headers.update(extra_headers)
        return self.transport.get(url, params=params, headers=headers, timeout=timeout)


__all__ = [
    "ALLOWED_HOSTS",
    "AllowlistError",
    "AllowlistRedirectHandler",
    "DEFAULT_TIMEOUT",
    "DEFAULT_MAX_BYTES",
    "HttpClient",
    "LIVE_ENV",
    "LiveDisabledError",
    "MockTransport",
    "Response",
    "Transport",
    "TransportError",
    "UrllibTransport",
    "is_allowed_host",
    "is_allowed_url",
    "polite_user_agent",
]
