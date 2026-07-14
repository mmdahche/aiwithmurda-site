#!/usr/bin/env python3
"""web_fetch.py -- $0 single-URL fetch fast-path.

WHAT IT IS

A *single-URL* fetcher whose output is the (scrubbed) page body. NOT a crawler:
no link-following, no recursion, no DOM walking. The downstream consumer in the
research / scraping pipeline is the ``to-markdown`` skill (which itself runs
behind its own trust boundary). The wrapper around the TLS / JA3-impersonating
HTTP client (`curl_cffi` -- `lexiforest/curl-impersonate` Python binding, MIT)
is deliberately thin: the entire point of this module is the *security model*
that sits AROUND the transport.

SECURITY POSTURE (the four gates -- ALL must hold or nothing leaves)

  1. SSRF DEFENSE (the core gate; runs BEFORE any socket call). Every URL is
     parsed and:

       * the scheme MUST be ``http`` or ``https`` -- ``file://``, ``gopher://``,
         ``ftp://``, ``data:``, etc. are REFUSED at the boundary;

       * the URL's hostname is resolved to ALL the IPs DNS returns (v4 AND v6;
         IPv4-mapped IPv6 is un-wrapped). EVERY resolved IP is checked against
         the deny ranges; a SINGLE deny-range hit REFUSES the fetch. Checking
         the *resolved IP* defeats DNS-rebinding-to-internal.

     Deny ranges are documented in this module's ``_classify_ip`` and cover
     RFC 1918 private, loopback, link-local (incl. the cloud-metadata IP
     ``169.254.169.254``), CGNAT, multicast, benchmark / test-net,
     unspecified / broadcast / reserved, and every IPv6 counterpart plus
     the IPv6 transition prefixes (IPv4-mapped, NAT64, 6to4, Teredo).

  2. REDIRECT HOP RE-CHECK. The production transport ``CurlCffiTransport``
     does NOT follow redirects on its own (``allow_redirects=False``).
     :func:`fetch` runs the redirect loop manually and re-runs the FULL
     :func:`is_safe_target` check on EVERY ``Location`` target before issuing
     the next request. This closes the classic SSRF-via-redirect bypass where
     an allowed public host 302's the client to
     ``http://169.254.169.254/...``. An HTTPS -> HTTP downgrade redirect is
     ALSO refused (a server / MITM must not strip TLS mid-fetch).

  3. LIVE GATE (default OFF). The production transport refuses to open a
     socket unless the operator has set ``WEB_FETCH_LIVE=1``. With the gate
     OFF every ``.fetch_once`` raises :class:`LiveDisabledError` and
     importing / running the skill / running the entire test suite makes
     ZERO network calls. ``curl_cffi`` is LAZY-IMPORTED behind the live gate
     so the test suite is runnable without the runtime dep installed.

  4. SCRUB ON OUTPUT (OPTIONAL guardrails hook) + CAPS + FAIL-CLOSED. The
     fetched body -- AND the returned ``url``, ``redirect_chain``, and
     response ``headers`` -- are run through the operator-supplied redaction
     ``guard`` BEFORE return. The guard is looked up on disk at
     ``$GUARDRAILS_HOME/redaction-firewall/firewall.py`` (or
     ``~/.guardrails/redaction-firewall/firewall.py``). If present the
     scrubber is FAIL-CLOSED (a scrubber failure RAISES; nothing un-scrubbed
     reaches the caller / disk). If absent the pack degrades gracefully: a
     one-time stderr note fires and the scrubber becomes a passthrough. The
     OTHER three gates (SSRF, redirect re-check, live) still hold.

     A per-fetch SIZE cap (default 5 MiB) and TIMEOUT (default 20 s) are
     enforced inside the transport AND re-checked in :func:`fetch`. The
     response charset is taken from an allowlist so a server cannot inject
     invisible characters via codec abuse. ``accept_encoding=""`` disables
     auto-decompression so the SIZE cap is enforced on the wire bytes, not
     a decompression bomb.

INJECTABLE TRANSPORT + INJECTABLE RESOLVER

``fetch(url, *, transport=..., scrubber=..., resolver=...)`` accepts:

  * ``transport`` -- anything with a ``.fetch_once(url, *, headers, timeout,
    max_bytes) -> RawResponse`` method. Tests pass a :class:`MockTransport`
    so the suite makes ZERO real network calls regardless of the live gate.

  * ``resolver`` -- a callable ``host -> list[str]`` of IP addresses. Tests
    pass a dict-backed resolver that returns canned IPs (incl. the
    DNS-rebind-to-internal scenarios) so the SSRF check is tested without
    touching real DNS. Default = stdlib ``socket.getaddrinfo``.

  * ``scrubber`` -- a callable ``text -> text``. Default = the guardrails
    ``guard`` if installed, otherwise a passthrough with a one-time stderr
    note. To skip scrubbing in a test, pass ``scrubber=lambda s: s``
    EXPLICITLY -- there is no boolean bypass.

OUTPUT SHAPE

::

    FetchResult(
      status:         int,
      url:            str,                # FINAL url after the redirect loop
      content:        str,                # SCRUBBED body text
      headers:        dict[str, str],
      redirect_chain: list[str],          # urls visited BEFORE the final one
      bytes_in:       int,                # raw body bytes received (pre-scrub)
      content_type:   str | None,
    )

CLI

  * ``web-fetch.sh <url> [--out <file>] [--max-bytes N] [--timeout S]
    [--max-redirects N] [--impersonate UA]``

Exit codes: 0 OK; 2 bad args; 3 live-gate OFF; 4 SSRF refused; 5 scrub
failed (guardrails fail-closed); 6 transport / network failure; 7 unknown.

Pure Python 3 stdlib + ONE pinned third-party runtime dep (``curl_cffi``),
which the buyer installs deliberately (``pip install 'curl_cffi==0.7.4'``).
The runtime dep is LAZY-IMPORTED so the test suite runs even if it isn't
installed -- the SSRF / scheme / redirect / gate / scrub logic is what's
tested, and that's all stdlib.
"""
from __future__ import annotations

import argparse
import importlib.util
import ipaddress
import os
import socket
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Protocol, Tuple
from urllib.parse import urljoin, urlparse

WEB_FETCH_VERSION = "1.0.0"

# ── defaults (overridable on the public API + CLI) ─────────────────────────────
LIVE_ENV = "WEB_FETCH_LIVE"
LIVE_TRUE = ("1", "true", "yes", "on")
DEFAULT_TIMEOUT = 20.0                          # seconds per individual request
DEFAULT_MAX_BYTES = 5 * 1024 * 1024             # 5 MiB per fetch (decompressed)
DEFAULT_MAX_REDIRECTS = 5                       # hop limit (each re-checked for SSRF)
DEFAULT_USER_AGENT = "research-engine-fetch/%s" % WEB_FETCH_VERSION
# Browser fingerprint to impersonate via curl_cffi. Picked because it has wide
# JA3 / TLS-fingerprint coverage in lexiforest/curl-impersonate's prebuilt wheels
# and matches a current-enough Chrome to not stand out on its own. Operator can
# override on the CLI (--impersonate); the choice does NOT relax the SSRF check.
DEFAULT_IMPERSONATE = "chrome120"

# Allowed URL schemes. file:// / gopher:// / ftp:// / data: are REFUSED -- this
# fetcher's whole reason for existing is single-URL HTTP(S) page bodies.
ALLOWED_SCHEMES = frozenset({"http", "https"})

# Optional output-confinement. When set, the CLI --out path MUST resolve inside
# this directory or the write is REFUSED (defence against an agent acting on a
# prompt-injected `--out /etc/cron.d/...`). UNSET = unrestricted (back-compat).
OUT_DIR_ENV = "WEB_FETCH_OUT_DIR"

# IPv6 transition-mechanism prefixes that EMBED an IPv4 address.
_NAT64_WKP = ipaddress.ip_network("64:ff9b::/96")   # RFC 6052 (v4 in low 32 bits)
_6TO4_NET = ipaddress.ip_network("2002::/16")        # RFC 3056 (v4 in bits 16-47)
_TEREDO_NET = ipaddress.ip_network("2001::/32")      # RFC 4380 (server + client v4)
# IPv4 documentation ranges (RFC 5737) -- denied explicitly.
_TESTNET1 = ipaddress.ip_network("192.0.2.0/24")
_TESTNET2 = ipaddress.ip_network("198.51.100.0/24")
_TESTNET3 = ipaddress.ip_network("203.0.113.0/24")

# Charset allowlist for response-body decoding. A server-supplied Content-Type
# charset is ONLY honoured if it normalises into this set; anything else falls
# back to utf-8. Stops a malicious server smuggling invisible / transformed
# characters into the body via codec abuse.
_ALLOWED_CHARSETS = frozenset({
    "utf-8", "utf8", "u8", "utf", "cp65001",
    "utf-16", "utf16", "utf-16le", "utf-16be", "utf-16-le", "utf-16-be",
    "utf-32", "utf32",
    "ascii", "us-ascii", "646", "iso646-us",
    "latin-1", "latin1", "latin", "l1", "iso-8859-1", "iso8859-1", "8859", "cp819",
    "iso-8859-15", "iso8859-15", "latin9", "l9",
    "cp1250", "windows-1250", "cp1251", "windows-1251", "cp1252", "windows-1252",
    "gb2312", "gbk", "gb18030", "big5", "big5hkscs",
    "shift-jis", "shift_jis", "sjis", "euc-jp", "euc-kr",
    "iso-2022-jp", "csiso2022jp",
    "koi8-r", "koi8-u", "mac-roman", "macroman",
})


# ── exceptions ─────────────────────────────────────────────────────────────────

class WebFetchError(RuntimeError):
    """A web-fetch-level failure (validation, transport, scrub). Always treated
    as fail-closed by the CLI -- nothing partial is ever returned / written."""


class SsrfRefused(WebFetchError):
    """SSRF guard: the requested URL targets an unsafe scheme or an IP in a deny
    range. Raised by :func:`fetch` BEFORE any transport is invoked, and re-raised
    by the redirect loop for any hop that fails the same check."""


class LiveDisabledError(WebFetchError):
    """The production transport is gated behind ``WEB_FETCH_LIVE=1`` and the gate
    is OFF. Raised at the top of ``.fetch_once`` BEFORE any socket call."""


class ScrubFailed(WebFetchError):
    """The redaction scrubber raised. Fail-closed: the un-scrubbed body NEVER
    reaches the caller / disk."""


class TransportError(WebFetchError):
    """A transport-level failure (network, decode, oversize). Fail-closed."""


class TooManyRedirects(WebFetchError):
    """More redirect hops than ``max_redirects`` allows. Fail-closed."""


# ── data carriers ──────────────────────────────────────────────────────────────

class RawResponse:
    """What a transport returns from ``.fetch_once``: the bytes off the wire,
    pre-scrub and pre-decode. Pure data; no behaviour."""

    __slots__ = ("status", "url", "headers", "content", "encoding")

    def __init__(self, status: int, url: str,
                 headers: Optional[Dict[str, str]] = None,
                 content: bytes = b"",
                 encoding: Optional[str] = None) -> None:
        self.status = int(status)
        self.url = url
        self.headers = {str(k).lower(): str(v) for k, v in (headers or {}).items()}
        self.content = bytes(content or b"")
        self.encoding = encoding


class FetchResult:
    """The public return of :func:`fetch`: scrubbed body text + provenance."""

    __slots__ = ("status", "url", "content", "headers", "redirect_chain",
                 "bytes_in", "content_type")

    def __init__(self, status: int, url: str, content: str,
                 headers: Optional[Dict[str, str]] = None,
                 redirect_chain: Optional[List[str]] = None,
                 bytes_in: int = 0,
                 content_type: Optional[str] = None) -> None:
        self.status = int(status)
        self.url = url
        self.content = content
        self.headers = dict(headers or {})
        self.redirect_chain = list(redirect_chain or [])
        self.bytes_in = int(bytes_in)
        self.content_type = content_type

    def __repr__(self) -> str:  # pragma: no cover
        return ("FetchResult(status=%d, url=%r, bytes_in=%d, chain=%d, content=%d chars)"
                % (self.status, self.url, self.bytes_in,
                   len(self.redirect_chain), len(self.content)))


# ── transport protocol ─────────────────────────────────────────────────────────

class Transport(Protocol):
    """Anything with ``.fetch_once(url, *, headers, timeout, max_bytes) -> RawResponse``.

    The transport MUST NOT follow redirects on its own (``allow_redirects=False``);
    :func:`fetch` runs the redirect loop manually so EVERY hop goes through the
    SSRF check."""

    def fetch_once(self, url: str, *,
                   headers: Optional[Dict[str, str]] = None,
                   timeout: float = DEFAULT_TIMEOUT,
                   max_bytes: int = DEFAULT_MAX_BYTES,
                   pinned_ips: Optional[List[str]] = None) -> RawResponse: ...


# ── DNS resolver (injectable) ──────────────────────────────────────────────────

Resolver = Callable[[str], List[str]]


def _default_resolver(host: str) -> List[str]:
    """Default DNS resolver: stdlib ``socket.getaddrinfo`` -> de-duped IP strings."""
    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise WebFetchError("DNS resolution failed for %r: %s" % (host, exc))
    out: List[str] = []
    seen = set()
    for fam, _stype, _proto, _canon, sockaddr in infos:
        if fam not in (socket.AF_INET, socket.AF_INET6):
            continue
        ip = sockaddr[0]
        if "%" in ip:
            ip = ip.split("%", 1)[0]
        if ip in seen:
            continue
        seen.add(ip)
        out.append(ip)
    return out


# ── SSRF helper (the heart of the security model) ──────────────────────────────

def _classify_ip(addr: str) -> Optional[str]:
    """Return a string reason if *addr* is in any deny range, else None."""
    try:
        ip = ipaddress.ip_address(addr)
    except (ValueError, TypeError):
        return "unparseable IP %r" % addr

    # IPv4-mapped IPv6 -- re-check on the embedded v4.
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        return _classify_ip(str(ip.ipv4_mapped))

    # IPv6 transition mechanisms that EMBED a v4.
    if isinstance(ip, ipaddress.IPv6Address):
        if ip in _NAT64_WKP:
            return _classify_ip(str(ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)))
        if ip in _6TO4_NET:
            return _classify_ip(
                str(ipaddress.IPv4Address((int(ip) >> 80) & 0xFFFFFFFF)))
        if ip in _TEREDO_NET:
            server_v4 = (int(ip) >> 64) & 0xFFFFFFFF
            client_v4 = (int(ip) & 0xFFFFFFFF) ^ 0xFFFFFFFF
            for v4 in (server_v4, client_v4):
                sub = _classify_ip(str(ipaddress.IPv4Address(v4)))
                if sub is not None:
                    return sub

    if ip.is_loopback:
        return "loopback (%s)" % addr
    if ip.is_unspecified:
        return "unspecified address (%s)" % addr
    if ip.is_link_local:
        return "link-local / cloud-metadata (%s)" % addr
    if ip.is_multicast:
        return "multicast (%s)" % addr

    # Specific IPv4 ranges checked BEFORE the generic ``is_private`` branch so
    # the refusal message is diagnostic.
    if isinstance(ip, ipaddress.IPv4Address):
        if ip == ipaddress.IPv4Address("255.255.255.255"):
            return "broadcast (%s)" % addr
        if ip in ipaddress.ip_network("100.64.0.0/10"):
            return "CGNAT 100.64.0.0/10 (%s)" % addr
        if ip in ipaddress.ip_network("198.18.0.0/15"):
            return "benchmarking 198.18.0.0/15 (%s)" % addr
        if ip in ipaddress.ip_network("192.0.0.0/24"):
            return "IETF protocol assignments 192.0.0.0/24 (%s)" % addr
        if ip in _TESTNET1:
            return "TEST-NET-1 192.0.2.0/24 (%s)" % addr
        if ip in _TESTNET2:
            return "TEST-NET-2 198.51.100.0/24 (%s)" % addr
        if ip in _TESTNET3:
            return "TEST-NET-3 203.0.113.0/24 (%s)" % addr
        if ip in ipaddress.ip_network("240.0.0.0/4"):
            return "reserved 240.0.0.0/4 (%s)" % addr

    if ip.is_private:
        return "private network (%s)" % addr
    if ip.is_reserved:
        return "reserved (%s)" % addr

    return None


def _resolve_and_validate(url: str, *,
                          resolver: Optional[Resolver] = None
                          ) -> Tuple[bool, str, List[str]]:
    """The SSRF gate, returning the VALIDATED IPs alongside the verdict."""
    if not isinstance(url, str) or not url.strip():
        return False, "empty URL", []

    try:
        parsed = urlparse(url.strip())
    except (ValueError, AttributeError) as exc:
        return False, "unparseable URL (%s)" % type(exc).__name__, []

    scheme = (parsed.scheme or "").lower()
    if scheme not in ALLOWED_SCHEMES:
        return False, ("scheme %r not in {http,https} (URL=%s)"
                       % (scheme or "<none>", _safe_url_for_log(url))), []

    host = parsed.hostname
    if not host:
        return False, "URL has no hostname", []

    if parsed.username is not None or parsed.password is not None:
        return False, "URL carries userinfo (refused -- ambiguous about host)", []

    try:
        ipaddress.ip_address(host)
        is_literal = True
    except ValueError:
        is_literal = False

    if is_literal:
        reason = _classify_ip(host)
        if reason is not None:
            return False, "literal-IP host refused: %s" % reason, []
        return True, "", [host]

    resolver = resolver if resolver is not None else _default_resolver
    try:
        ips = resolver(host)
    except WebFetchError as exc:
        return False, str(exc), []
    except Exception as exc:  # noqa: BLE001
        return False, "resolver error for %r: %s" % (host, exc), []

    if not ips:
        return False, "host %r resolved to no IPs" % host, []

    for ip in ips:
        reason = _classify_ip(ip)
        if reason is not None:
            return False, "host %r resolves to deny-range IP: %s" % (host, reason), []

    return True, "", list(ips)


def is_safe_target(url: str, *,
                   resolver: Optional[Resolver] = None
                   ) -> Tuple[bool, str]:
    """The SSRF gate (public 2-tuple API). Returns ``(True, "")`` if *url* may be
    fetched, else ``(False, reason)``. NEVER opens a socket itself."""
    ok, reason, _ips = _resolve_and_validate(url, resolver=resolver)
    return ok, reason


def _safe_url_for_log(url: str) -> str:
    """Return a URL safe to embed in an error / log line: strip userinfo, query,
    and fragment (any of which can carry a secret) and cap the length."""
    try:
        p = urlparse(url)
        netloc = p.hostname or ""
        if p.port:
            netloc += ":%d" % p.port
        base = p._replace(netloc=netloc, query="", fragment="").geturl()
        if p.query or p.fragment or p.username or p.password:
            base += " (<redacted>)"
        return base[:200]
    except Exception:  # noqa: BLE001
        return "<unparseable-url>"


def _build_resolve_list(url: str,
                        pinned_ips: Optional[List[str]]) -> Optional[List[str]]:
    """Build libcurl's CURLOPT_RESOLVE entry (``["host:port:ip,ip"]``) so the
    transport connects to the ALREADY-VALIDATED IPs without re-resolving."""
    if not pinned_ips:
        return None
    try:
        p = urlparse(url)
    except Exception:  # noqa: BLE001
        return None
    host = p.hostname
    if not host:
        return None
    try:
        ipaddress.ip_address(host)
        return None
    except ValueError:
        pass
    port = p.port or (443 if (p.scheme or "").lower() == "https" else 80)
    return ["%s:%d:%s" % (host, port, ",".join(pinned_ips))]


# ── optional guardrails firewall (lazy import; graceful degradation) ───────────

_FW = None
_FW_ERR: Optional[str] = None
_FW_WARNED = False


def _guardrails_locations() -> List[Path]:
    """Where we look for the optional firewall module, in order."""
    out: List[Path] = []
    gh = os.environ.get("GUARDRAILS_HOME")
    if gh and gh.strip():
        out.append(Path(gh).expanduser() / "redaction-firewall" / "firewall.py")
    out.append(Path("~/.guardrails/redaction-firewall/firewall.py").expanduser())
    return out


def _load_firewall_module():
    """Attempt to import the optional firewall module. Returns the module or None.
    Never raises; on any error the module is treated as absent."""
    global _FW, _FW_ERR
    if _FW is not None:
        return _FW
    if _FW_ERR is not None:
        return None
    for path in _guardrails_locations():
        if not path.is_file():
            continue
        try:
            spec = importlib.util.spec_from_file_location(
                "research_engine_webfetch_guardrails", str(path))
            mod = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = mod
            try:
                spec.loader.exec_module(mod)
            except Exception:
                sys.modules.pop(spec.name, None)
                raise
        except Exception as exc:  # noqa: BLE001
            _FW_ERR = "guardrails firewall failed to import (%s)" % type(exc).__name__
            return None
        if not hasattr(mod, "guard"):
            _FW_ERR = "guardrails firewall present but missing guard()"
            return None
        _FW = mod
        return mod
    _FW_ERR = "guardrails firewall not installed (optional dependency)"
    return None


def _passthrough(text: str) -> str:
    return text or ""


def default_scrubber() -> Callable[[str], str]:
    """Return the guardrails ``guard`` if the firewall is installed; otherwise
    return a passthrough scrubber. In the passthrough case we print a one-time
    stderr note so the operator knows the layer is off; the OTHER three security
    gates (SSRF, redirect re-check, live) still hold."""
    global _FW_WARNED
    mod = _load_firewall_module()
    if mod is not None:
        return mod.guard
    if not _FW_WARNED:
        _FW_WARNED = True
        sys.stderr.write(
            "web-fetch: note -- optional Safe-Autonomy Guardrails firewall not "
            "found at $GUARDRAILS_HOME/redaction-firewall/firewall.py or "
            "~/.guardrails/redaction-firewall/firewall.py; running with "
            "passthrough scrubber. SSRF defence, redirect-hop re-check, and the "
            "live gate are still enforced.\n")
    return _passthrough


# ── decode (transport-agnostic) ────────────────────────────────────────────────

def _decode_body(content: bytes, encoding: Optional[str],
                 content_type: Optional[str]) -> str:
    """Decode raw bytes to text. Prefers the transport-provided encoding, then
    a charset hint in ``Content-Type``, then utf-8. Uses ``errors='replace'``."""
    enc = encoding
    if not enc and content_type:
        for part in content_type.split(";"):
            part = part.strip().lower()
            if part.startswith("charset="):
                enc = part[len("charset="):].strip("'\"")
                break
    enc = (enc or "utf-8").strip()
    if enc.lower().replace("_", "-") not in _ALLOWED_CHARSETS:
        enc = "utf-8"
    try:
        return content.decode(enc, errors="replace")
    except (LookupError, TypeError):
        return content.decode("utf-8", errors="replace")


# ── production transport: curl_cffi (lazy import; live-gated) ──────────────────

class CurlCffiTransport:
    """Production transport: `curl_cffi` with a Chrome TLS / JA3 impersonation.

    ``allow_redirects=False`` is non-negotiable -- :func:`fetch` runs the
    redirect loop and re-checks SSRF on every hop.

    DNS-rebind TOCTOU defence: :func:`fetch` passes the ALREADY-VALIDATED IPs
    (``pinned_ips``) down; we hand them to libcurl via CURLOPT_RESOLVE so it
    connects to exactly those addresses and does NOT issue its own (racy)
    DNS query.

    Decompression-bomb defence: ``accept_encoding=""`` disables libcurl's
    transparent gzip / deflate / brotli decompression so the SIZE cap is
    enforced against on-the-wire bytes, not a multi-GiB decompressed buffer.
    """

    def __init__(self, impersonate: str = DEFAULT_IMPERSONATE,
                 live_env: str = LIVE_ENV) -> None:
        self.impersonate = impersonate
        self.live_env = live_env

    def _live_enabled(self) -> bool:
        val = (os.environ.get(self.live_env) or "").strip().lower()
        return val in LIVE_TRUE

    def fetch_once(self, url: str, *,
                   headers: Optional[Dict[str, str]] = None,
                   timeout: float = DEFAULT_TIMEOUT,
                   max_bytes: int = DEFAULT_MAX_BYTES,
                   pinned_ips: Optional[List[str]] = None) -> RawResponse:
        if not self._live_enabled():
            raise LiveDisabledError(
                "live web-fetch disabled -- set %s=1 after your security "
                "sign-off to enable real network calls (currently the skill "
                "makes ZERO outbound requests by default)" % self.live_env)
        # LAZY IMPORT: keeps the test suite runnable without curl_cffi installed.
        try:
            from curl_cffi import requests as _ccffi_requests
        except ImportError as exc:
            raise TransportError(
                "curl_cffi is not installed -- pip install 'curl_cffi==0.7.4' "
                "after reviewing this pack's README Lineage section (the "
                "curl-impersonate Python binding). ImportError: %s" % exc)

        resolve_list = _build_resolve_list(url, pinned_ips)
        try:
            r = _ccffi_requests.get(
                url,
                headers=dict(headers or {}),
                timeout=float(timeout),
                allow_redirects=False,
                impersonate=self.impersonate,
                accept_encoding="",
                verify=True,
                resolve=resolve_list,
            )
        except Exception as exc:  # noqa: BLE001
            raise TransportError(
                "curl_cffi failed for %s: %s: %s"
                % (_safe_url_for_log(url), type(exc).__name__, exc))

        try:
            raw_headers = dict(r.headers)
        except Exception:  # noqa: BLE001
            raw_headers = {}
        try:
            content = bytes(r.content or b"")
        except Exception:
            content = b""

        if max_bytes and len(content) > max_bytes:
            raise TransportError(
                "fetched body is %d bytes; exceeds the %d-byte cap (URL=%s). "
                "Raise max_bytes deliberately if this is intended."
                % (len(content), max_bytes, _safe_url_for_log(url)))

        return RawResponse(
            status=int(getattr(r, "status_code", 0) or 0),
            url=str(getattr(r, "url", url) or url),
            headers=raw_headers,
            content=content,
            encoding=getattr(r, "encoding", None),
        )


# ── mock transport (tests / offline demos) ─────────────────────────────────────

class MockTransport:
    """Test double: serves canned :class:`RawResponse` objects matched by exact URL."""

    def __init__(self, responses: Optional[List[Tuple[str, Any]]] = None) -> None:
        self.responses = list(responses or [])
        self.calls: List[Dict[str, Any]] = []

    def add(self, url: str, response_or_callable: Any) -> "MockTransport":
        self.responses.append((url, response_or_callable))
        return self

    def fetch_once(self, url: str, *,
                   headers: Optional[Dict[str, str]] = None,
                   timeout: float = DEFAULT_TIMEOUT,
                   max_bytes: int = DEFAULT_MAX_BYTES,
                   pinned_ips: Optional[List[str]] = None) -> RawResponse:
        self.calls.append({"url": url, "headers": dict(headers or {}),
                            "timeout": float(timeout), "max_bytes": int(max_bytes),
                            "pinned_ips": list(pinned_ips) if pinned_ips else None})
        for match_url, resp in self.responses:
            if match_url == url:
                out = resp(url, dict(headers or {})) if callable(resp) else resp
                if not isinstance(out, RawResponse):
                    raise TransportError(
                        "MockTransport response for %r must be a RawResponse"
                        " (got %r)" % (url, type(out).__name__))
                if max_bytes and len(out.content) > max_bytes:
                    raise TransportError(
                        "mock body is %d bytes; exceeds the %d-byte cap (URL=%s)"
                        % (len(out.content), max_bytes, url))
                return out
        raise TransportError(
            "MockTransport: no canned response for %r (test bug: add it explicitly)"
            % url)


# ── helpers ────────────────────────────────────────────────────────────────────

def _make_default_headers(user_agent: str,
                          extra: Optional[Dict[str, str]]) -> Dict[str, str]:
    h = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,"
                  "text/plain;q=0.8,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if extra:
        h.update(extra)
    return h


def _resolve_redirect(current_url: str, location: str) -> str:
    if not location:
        raise TransportError("redirect with empty Location header from %s"
                             % current_url)
    return urljoin(current_url, location)


# ── the public API ─────────────────────────────────────────────────────────────

def fetch(url: str, *,
          transport: Optional[Transport] = None,
          scrubber: Optional[Callable[[str], str]] = None,
          resolver: Optional[Resolver] = None,
          max_bytes: int = DEFAULT_MAX_BYTES,
          timeout: float = DEFAULT_TIMEOUT,
          max_redirects: int = DEFAULT_MAX_REDIRECTS,
          headers: Optional[Dict[str, str]] = None,
          user_agent: str = DEFAULT_USER_AGENT,
          ) -> FetchResult:
    """Fetch *url* (single page, no link-following) and return the SCRUBBED body.

    Fail-closed at every step (raises on any failure -- never returns partial /
    un-scrubbed content):

      1. :func:`is_safe_target` on the input URL.
      2. ``transport.fetch_once`` with ``allow_redirects=False``.
      3. If 3xx + Location, resolve the redirect target, re-run
         :func:`is_safe_target` on it (FULL check), and loop -- up to
         ``max_redirects`` hops.
      4. Enforce the size cap on the final body.
      5. Decode bytes -> text (charset from Content-Type, else utf-8).
      6. Run the scrubber over the body (default: guardrails ``guard`` if
         installed, otherwise a passthrough).
    """
    if not isinstance(url, str) or not url.strip():
        raise WebFetchError("url must be a non-empty string")

    if scrubber is None:
        scrubber = default_scrubber()
    meta_scrub = default_scrubber()
    transport = transport or CurlCffiTransport()

    ok, reason, pinned_ips = _resolve_and_validate(url, resolver=resolver)
    if not ok:
        raise SsrfRefused("refusing to fetch %s: %s"
                          % (_safe_url_for_log(url), reason))

    request_headers = _make_default_headers(user_agent, headers)
    current_url = url.strip()
    current_scheme = (urlparse(current_url).scheme or "").lower()
    redirect_chain: List[str] = []

    for hop in range(max_redirects + 1):
        raw = transport.fetch_once(
            current_url,
            headers=request_headers,
            timeout=timeout,
            max_bytes=max_bytes,
            pinned_ips=pinned_ips,
        )

        if 300 <= raw.status < 400 and "location" in raw.headers:
            target = _resolve_redirect(current_url, raw.headers["location"])
            target_scheme = (urlparse(target).scheme or "").lower()
            if current_scheme == "https" and target_scheme == "http":
                raise SsrfRefused(
                    "refusing HTTPS->HTTP downgrade redirect (hop %d) from %s to %s"
                    % (hop + 1, _safe_url_for_log(current_url),
                       _safe_url_for_log(target)))
            ok, reason, pinned_ips = _resolve_and_validate(target, resolver=resolver)
            if not ok:
                raise SsrfRefused(
                    "refusing %d-redirect (hop %d) from %s to %s: %s"
                    % (raw.status, hop + 1, _safe_url_for_log(current_url),
                       _safe_url_for_log(target), reason))
            redirect_chain.append(current_url)
            current_url = target
            current_scheme = target_scheme
            continue

        if max_bytes and len(raw.content) > max_bytes:
            raise TransportError(
                "final body is %d bytes; exceeds the %d-byte cap (URL=%s)"
                % (len(raw.content), max_bytes, _safe_url_for_log(current_url)))
        content_type = raw.headers.get("content-type")
        text = _decode_body(raw.content, raw.encoding, content_type)

        try:
            scrubbed = scrubber(text)
            safe_url = meta_scrub(current_url)
            safe_chain = [meta_scrub(u) for u in redirect_chain]
            safe_headers = {k: meta_scrub(v) for k, v in raw.headers.items()}
            safe_content_type = (meta_scrub(content_type)
                                 if content_type is not None else None)
        except Exception as exc:  # noqa: BLE001
            raise ScrubFailed(
                "output scrub failed (%s); refusing to return un-scrubbed body"
                % type(exc).__name__) from exc
        if scrubbed is None:
            raise ScrubFailed("scrubber returned None; refusing to return")

        return FetchResult(
            status=raw.status,
            url=safe_url,
            content=scrubbed,
            headers=safe_headers,
            redirect_chain=safe_chain,
            bytes_in=len(raw.content),
            content_type=safe_content_type,
        )

    raise TooManyRedirects(
        "more than %d redirects starting from %s (chain=%d hops); refusing"
        % (max_redirects, _safe_url_for_log(url), len(redirect_chain)))


# ── CLI ────────────────────────────────────────────────────────────────────────

EXIT_OK = 0
EXIT_BAD_ARGS = 2
EXIT_LIVE_OFF = 3
EXIT_SSRF = 4
EXIT_SCRUB = 5
EXIT_TRANSPORT = 6
EXIT_UNKNOWN = 7


def _enforce_out_dir(resolved_path: Path) -> None:
    """If ``WEB_FETCH_OUT_DIR`` is set, REFUSE a --out path that resolves outside
    it."""
    base = os.environ.get(OUT_DIR_ENV)
    if not base or not base.strip():
        return
    base_resolved = Path(base).expanduser().resolve()
    try:
        resolved_path.relative_to(base_resolved)
    except ValueError:
        raise WebFetchError(
            "--out path %s escapes %s=%s (refused)"
            % (resolved_path, OUT_DIR_ENV, base_resolved))


def _write_atomic(path: Path, text: str) -> None:
    """Temp-write + os.replace, so no half-written output is ever readable."""
    path = path.resolve()
    _enforce_out_dir(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp-%d" % os.getpid())
    try:
        with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    finally:
        try:
            tmp.unlink()
        except OSError:
            pass


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        prog="web-fetch",
        description="$0 single-URL fetch fast-path. Fail-closed: SSRF defended, "
                    "live network OFF by default (%s=1 to enable), every hop "
                    "re-checked, body scrubbed through the optional guardrails "
                    "hook." % LIVE_ENV)
    ap.add_argument("url", nargs="?",
                    help="A single http(s) URL. NOT a crawler -- no link-following.")
    ap.add_argument("--out", default=None,
                    help="Write the scrubbed body to this path (atomic). "
                         "Default: stdout.")
    ap.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES,
                    help="Per-fetch body size cap in bytes (default: %d)."
                         % DEFAULT_MAX_BYTES)
    ap.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT,
                    help="Per-request timeout in seconds (default: %.1f)."
                         % DEFAULT_TIMEOUT)
    ap.add_argument("--max-redirects", type=int, default=DEFAULT_MAX_REDIRECTS,
                    help="Maximum number of redirect hops (default: %d). "
                         "Each hop is re-checked for SSRF."
                         % DEFAULT_MAX_REDIRECTS)
    ap.add_argument("--impersonate", default=DEFAULT_IMPERSONATE,
                    help="curl_cffi browser fingerprint profile "
                         "(default: %s)." % DEFAULT_IMPERSONATE)
    ap.add_argument("--version", action="version",
                    version="web-fetch %s" % WEB_FETCH_VERSION)
    return ap


def main(argv: Optional[List[str]] = None) -> int:
    args = _parser().parse_args(argv)
    if not args.url:
        sys.stderr.write("web-fetch: missing URL. Usage: web-fetch <url> "
                         "[--out FILE] [--max-bytes N] [--timeout S]\n")
        return EXIT_BAD_ARGS

    try:
        result = fetch(
            args.url,
            transport=CurlCffiTransport(impersonate=args.impersonate),
            max_bytes=args.max_bytes,
            timeout=args.timeout,
            max_redirects=args.max_redirects,
        )
    except LiveDisabledError as exc:
        sys.stderr.write("web-fetch: %s\n" % exc)
        return EXIT_LIVE_OFF
    except SsrfRefused as exc:
        sys.stderr.write("web-fetch: SSRF refused -- %s\n" % exc)
        return EXIT_SSRF
    except ScrubFailed as exc:
        sys.stderr.write("web-fetch: scrub failed -- %s\n" % exc)
        return EXIT_SCRUB
    except TooManyRedirects as exc:
        sys.stderr.write("web-fetch: too many redirects -- %s\n" % exc)
        return EXIT_TRANSPORT
    except TransportError as exc:
        sys.stderr.write("web-fetch: transport error -- %s\n" % exc)
        return EXIT_TRANSPORT
    except WebFetchError as exc:
        sys.stderr.write("web-fetch: %s\n" % exc)
        return EXIT_UNKNOWN

    if args.out:
        try:
            _write_atomic(Path(args.out), result.content)
        except WebFetchError as exc:
            sys.stderr.write("web-fetch: %s\n" % exc)
            return EXIT_BAD_ARGS
        except OSError as exc:
            sys.stderr.write("web-fetch: cannot write %s (%s)\n" % (args.out, exc))
            return EXIT_UNKNOWN
        sys.stdout.write("web-fetch: wrote %s (%d chars, status=%d, final=%s)\n"
                         % (args.out, len(result.content), result.status,
                            result.url))
        return EXIT_OK

    try:
        sys.stdout.write(result.content)
        if not result.content.endswith("\n"):
            sys.stdout.write("\n")
    except OSError as exc:
        sys.stderr.write("web-fetch: stdout write failed (%s)\n" % exc)
        return EXIT_UNKNOWN
    return EXIT_OK


__all__ = [
    "ALLOWED_SCHEMES",
    "CurlCffiTransport",
    "DEFAULT_IMPERSONATE",
    "DEFAULT_MAX_BYTES",
    "DEFAULT_MAX_REDIRECTS",
    "DEFAULT_TIMEOUT",
    "DEFAULT_USER_AGENT",
    "FetchResult",
    "LIVE_ENV",
    "LiveDisabledError",
    "MockTransport",
    "RawResponse",
    "Resolver",
    "ScrubFailed",
    "SsrfRefused",
    "TooManyRedirects",
    "Transport",
    "TransportError",
    "WEB_FETCH_VERSION",
    "WebFetchError",
    "default_scrubber",
    "fetch",
    "is_safe_target",
    "main",
]


if __name__ == "__main__":
    sys.exit(main())
