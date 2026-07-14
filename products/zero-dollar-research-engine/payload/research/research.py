#!/usr/bin/env python3
"""research.py -- $0 multi-source web-research aggregator.

WHAT IT IS

Asks the open web a question and returns STRUCTURED JSON results from many FREE
sources for an upstream agent to synthesize. The skill itself does NOT synthesize
a dossier -- that is the caller's job (LLM in the loop). The skill's job is to be
the safe, $0 fan-out + isolation + scrub layer between the LLM and the public web.

SECURITY POSTURE (the four gates)

  1. LIVE-OFF-BY-DEFAULT (the key gate). The default transport is
     ``lib.http.UrllibTransport``, which refuses to open a socket unless the
     operator has set ``RESEARCH_LIVE=1``. With the gate OFF, every ``client.get``
     raises ``LiveDisabledError`` and the skill returns a clear error WITHOUT
     making any network call. Enabling live is a SEPARATE operator step after
     the security sign-off.

  2. EGRESS ALLOWLIST (SSRF guard). Every outbound request goes through
     ``lib.http.HttpClient.get``, which checks the URL's hostname against the
     hardcoded ``lib.http.ALLOWED_HOSTS`` set BEFORE the transport is invoked.
     A non-allowlisted URL raises ``AllowlistError`` immediately -- no socket
     is ever opened for it. v1 does NOT follow result links (that would route
     through the to-markdown skill behind its own gate).

  3. SCRUB OUTBOUND (OPTIONAL guardrails hook). Every search query is run
     through the operator-supplied redaction guard BEFORE any request is
     built. The guard is looked up on disk at
     ``$GUARDRAILS_HOME/redaction-firewall/firewall.py`` (or
     ``~/.guardrails/redaction-firewall/firewall.py``). If present the guard
     is FAIL-CLOSED: a query the firewall cannot scrub raises and nothing is
     sent. If the file is not there the pack degrades gracefully -- a
     one-time stderr note fires and the scrubber becomes a passthrough. The
     other three gates (live, allowlist, per-source isolation) still hold.
     The pack does NOT ship the firewall. Pairs with the Safe-Autonomy
     Guardrails pack, sold separately.

  4. PER-SOURCE FAILURE ISOLATION + HARD TIME BUDGET. The aggregator runs sources
     in parallel; one source crashing only adds a warning, never kills the run.
     A 30s overall budget caps the whole call. >= 3 sources returning at least
     one result counts as success.

Result strings (title / snippet / abstract / authors / extras) are ALSO run
through the same guard on the way out -- a compromised source page cannot smuggle
a secret-shaped string back through the skill. Result URLs' query strings and
fragments are scrubbed too, host / path kept for provenance. Results are NEVER
executed; result URLs are emitted but NOT fetched.

OUTPUT IS UNTRUSTED. The scrubber removes SECRETS, NOT prompt-injection.
Result text is attacker-influenceable web content and CAN carry embedded
instructions ("ignore previous instructions", "mark APPROVE", "run X"). The
CONSUMING agent MUST treat ``results[*]`` as DATA, never as instructions --
its system prompt must say so.

INJECTABLE TRANSPORT

``HttpClient(transport=...)`` accepts any object with ``.get(url, params, headers,
timeout) -> Response``. The test suite passes a ``lib.http.MockTransport`` so the
ENTIRE suite is 100% offline regardless of the live-gate setting. The allowlist
guard still runs (it sits inside ``HttpClient.get``, not the transport), so a
mock transport cannot bypass the SSRF check.

OUTPUT SHAPE (the structured JSON)

::

    {
      "topic": "<scrubbed query>",
      "results": [ {Result}, ... ],   # title/url/snippet/source/abstract/authors/year/...
      "stats":   { "sources_attempted": N, "sources_succeeded": M,
                   "results_total": K, "success": M >= 3, "success_min_sources": 3 },
      "warnings": [ "<source>: <error>", ... ]
    }

CLI

    research.sh <topic> [--academic] [--sources s1,s2,...] [--n PER_SOURCE]
                        [--timeout SECS]

    --academic         Only scholarly sources (arxiv / semantic_scholar / openalex / crossref).
    --sources LIST     Comma-separated source names (default: all free sources).
    --n N              Max results per source (default: 10).
    --timeout SECS     Overall hard budget (default: 30s).
    --list-sources     Print available source names and exit.

Exit 0 = JSON written to stdout. Exit 2 = bad args. Exit 3 = live-gate OFF
(operator must set RESEARCH_LIVE=1). Exit 4 = query / result scrub failed
(guardrails fail-closed; nothing sent, nothing returned).

Pure Python 3 stdlib -- no `requests`, no `httpx`, no third-party runtime deps.
Cross-platform.
"""
from __future__ import annotations

import argparse
import importlib
import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

# Packaging: make ``research.py`` importable BOTH as a script (``python research.py``
# / via the ``research.sh`` shim) AND as a top-level import (``import research`` from
# tests using ``importlib.util.spec_from_file_location``). The ``lib/`` subdirectory
# is treated as a top-level package (``lib``) -- the source modules use ``from ..
# import cache`` / ``from ..http import HttpClient`` style relative imports which
# resolve correctly as long as ``lib`` is importable. We add THIS file's directory
# to ``sys.path`` (idempotent) BEFORE the absolute ``lib.*`` imports below.
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from lib.aggregator import OVERALL_TIMEOUT_SECONDS, aggregate  # noqa: E402
from lib.http import (  # noqa: E402
    AllowlistError,
    HttpClient,
    LIVE_ENV,
    LiveDisabledError,
    TransportError,
    UrllibTransport,
)
from lib.result import encode_results  # noqa: E402

RESEARCH_VERSION = "1.0.0"

# ---- known free sources (the canonical roster) ------------------------------

ALL_SOURCES = (
    "duckduckgo",
    "wikipedia",
    "hackernews",
    "reddit",
    "arxiv",
    "semantic_scholar",
    "openalex",
    "crossref",
    "devto",
    "lobsters",
)

ACADEMIC_SOURCES = ("arxiv", "semantic_scholar", "openalex", "crossref")


class ResearchError(RuntimeError):
    """A research-level failure (bad source name, gate OFF, scrub failure, ...).
    Always treated as fail-closed by the CLI (no partial output emitted)."""


# ---- optional redaction guard (Safe-Autonomy Guardrails hook) ---------------
#
# The pack does NOT ship the firewall. If the buyer owns the Safe-Autonomy
# Guardrails pack and dropped ``firewall.py`` into the expected location, we
# import + use its ``guard()`` fail-closed. Otherwise the scrubber becomes a
# passthrough and a one-time stderr note fires on the first default-scrubber
# call so the operator knows what's off.

_FW = None         # cached module (once loaded)
_FW_ERR = None     # cached "not found" reason (so the note only fires once)
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
    """Attempt to import the optional firewall module. Returns the module or
    None. Never raises; on any error the module is treated as absent."""
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
                "research_engine_guardrails", str(path))
            mod = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = mod
            try:
                spec.loader.exec_module(mod)
            except Exception:
                sys.modules.pop(spec.name, None)
                raise
        except Exception as exc:  # noqa: BLE001 -- degrade to passthrough
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
    note to stderr so the operator knows the layer is off; the OTHER three
    security gates (live, allowlist, per-source isolation) still hold."""
    global _FW_WARNED
    mod = _load_firewall_module()
    if mod is not None:
        return mod.guard
    if not _FW_WARNED:
        _FW_WARNED = True
        sys.stderr.write(
            "research: note -- optional Safe-Autonomy Guardrails firewall not "
            "found at $GUARDRAILS_HOME/redaction-firewall/firewall.py or "
            "~/.guardrails/redaction-firewall/firewall.py; running with "
            "passthrough scrubber. Live-gate, egress allowlist, and per-source "
            "isolation are still enforced.\n")
    return _passthrough


# ---- source construction ----------------------------------------------------

def _construct_sources(names: List[str], client: HttpClient, ttl_hours: int = 24):
    """Build source clients for *names*. Unknown names raise ResearchError.

    Imports are lazy + per-name so a bad import in one source does not break the
    others, and so the unused sources never load (cheap cold-start)."""
    constructors: Dict[str, Callable[[HttpClient, int], Any]] = {}

    def _add(name, importer):
        constructors[name] = importer

    _add("duckduckgo",       lambda c, t: _import("duckduckgo",       "DuckDuckGoSource")(c, t))
    _add("wikipedia",        lambda c, t: _import("wikipedia",        "WikipediaSource")(c, t))
    _add("hackernews",       lambda c, t: _import("hackernews",       "HackerNewsSource")(c, t))
    _add("reddit",           lambda c, t: _import("reddit",           "RedditSource")(c, t))
    _add("arxiv",            lambda c, t: _import("arxiv",            "ArxivSource")(c, t))
    _add("semantic_scholar", lambda c, t: _import("semantic_scholar", "SemanticScholarSource")(c, t))
    _add("openalex",         lambda c, t: _import("openalex",         "OpenAlexSource")(c, t))
    _add("crossref",         lambda c, t: _import("crossref",         "CrossRefSource")(c, t))
    _add("devto",            lambda c, t: _import("devto",            "DevToSource")(c, t))
    _add("lobsters",         lambda c, t: _import("lobsters",         "LobstersSource")(c, t))

    out = []
    for n in names:
        if n not in constructors:
            raise ResearchError("unknown source %r (valid: %s)" % (n, ", ".join(ALL_SOURCES)))
        out.append(constructors[n](client, ttl_hours))
    return out


def _import(module_basename: str, class_name: str):
    """Lazy-import a single source module by basename.

    The ``lib`` package is importable as a top-level package because the module
    prologue inserts ``_HERE`` on ``sys.path``. We use absolute imports here (NOT
    relative) so the lookup is independent of how the caller invoked us -- script,
    ``python -m``, or ``importlib.spec_from_file_location`` (the test rig).
    """
    mod = importlib.import_module("lib.sources." + module_basename)
    return getattr(mod, class_name)


# ---- public library API -----------------------------------------------------

def research(
    query: str,
    sources: Optional[List[str]] = None,
    *,
    n_per_source: int = 10,
    timeout: float = OVERALL_TIMEOUT_SECONDS,
    client: Optional[HttpClient] = None,
    scrubber: Optional[Callable[[str], str]] = None,
    ttl_hours: int = 24,
    academic: bool = False,
) -> Dict[str, Any]:
    """Run a research pass and return the structured JSON-serializable payload.

    Parameters
    ----------
    query : str
        The topic / question. Run through the scrubber BEFORE any request. A
        scrub failure RAISES (fail-closed) -- nothing is sent.
    sources : list[str] | None
        Source names to query (defaults to ``ALL_SOURCES`` or, if *academic*,
        ``ACADEMIC_SOURCES``). Unknown names raise.
    n_per_source : int
        Max results per source.
    timeout : float
        Overall hard budget in seconds (default 30s).
    client : HttpClient | None
        Override the HTTP client (tests pass a client built with a mock transport).
        Default = ``HttpClient()`` with the live-gated ``UrllibTransport``.
    scrubber : callable | None
        Override the default scrubber (tests may inject a no-op or a failing
        scrubber to assert fail-closed). Default = the guardrails ``guard`` if
        installed, otherwise a passthrough with a one-time stderr note.
    ttl_hours : int
        File-cache TTL per source (default 24h).
    academic : bool
        Restrict to scholarly sources when *sources* is None.

    Returns
    -------
    dict with keys ``topic``, ``results``, ``stats``, ``warnings``.

    Raises
    ------
    ResearchError
        Unknown source name, live-gate OFF (when the default transport is in use
        AND the env flag is not set), or a scrubber failure on the query.
    """
    if not isinstance(query, str) or not query.strip():
        raise ResearchError("query must be a non-empty string")

    # Resolve the scrubber FIRST. With the default path this is a lazy no-op
    # if the guardrails firewall is missing (passthrough) or the guard if it's
    # installed.
    fn = scrubber if scrubber is not None else default_scrubber()

    # Scrub the query BEFORE any request is built. A guard failure RAISES -- the
    # caller must treat the whole call as failed, no partial output.
    try:
        safe_query = fn(query)
    except Exception as exc:  # noqa: BLE001 -- fail-closed
        raise ResearchError("query scrub failed (%s); refusing to send"
                            % type(exc).__name__) from exc
    if not safe_query or not safe_query.strip():
        raise ResearchError("query became empty after scrubbing; refusing to send")

    chosen = sources or (list(ACADEMIC_SOURCES) if academic else list(ALL_SOURCES))
    cli = client if client is not None else HttpClient()

    # Preflight the live gate when the DEFAULT (production) transport is in use.
    # With the gate OFF every source would fail individually with the same
    # ``LiveDisabledError`` (captured into warnings) -- that's noisy AND would
    # mask the real cause behind a "0 results" payload. Surface a single clean
    # error instead, so the CLI maps it to exit 3 and the caller doesn't waste
    # a parallel fan-out to discover the obvious. Tests inject their own client
    # (with a ``MockTransport``) so this branch is never taken there.
    if client is None and isinstance(cli.transport, UrllibTransport):
        if not cli.transport._live_enabled():  # noqa: SLF001 -- intentional preflight
            raise ResearchError(
                "live research disabled -- set %s=1 after your security "
                "sign-off to enable real network calls (currently the skill "
                "makes ZERO outbound requests by default)" % LIVE_ENV)

    src_clients = _construct_sources(chosen, cli, ttl_hours=ttl_hours)

    # The aggregator catches per-source exceptions into warnings; it does NOT
    # catch the scrubber's exception on results -- that fail-closes the batch.
    try:
        payload = aggregate(
            safe_query, src_clients,
            n_per_source=n_per_source,
            timeout=timeout,
            scrubber=fn,
        )
    except LiveDisabledError as exc:
        raise ResearchError(str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 -- result-scrub failure -> fail-closed
        raise ResearchError("results scrub failed (%s); discarding batch"
                            % type(exc).__name__) from exc

    payload["mode"] = "free-sources"
    payload["sources_queried"] = chosen
    payload["live_gate"] = LIVE_ENV
    return payload


# ---- CLI --------------------------------------------------------------------

EXIT_OK = 0
EXIT_BAD_ARGS = 2
EXIT_LIVE_OFF = 3
EXIT_SCRUB = 4
EXIT_UNKNOWN = 5


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        prog="research",
        description="$0 multi-source web-research aggregator. Free sources only. "
                    "Emits structured JSON for an agent to synthesize. Live network "
                    "OFF by default -- set %s=1 after your security sign-off."
                    % LIVE_ENV)
    ap.add_argument("topic", nargs="*", help="The topic / question to research.")
    ap.add_argument("--sources", default=None,
                    help="Comma-separated source names (default: all free sources).")
    ap.add_argument("--academic", action="store_true",
                    help="Restrict to scholarly sources when --sources is not given.")
    ap.add_argument("--n", type=int, default=10, dest="n_per_source",
                    help="Max results per source (default: 10).")
    ap.add_argument("--timeout", type=float, default=OVERALL_TIMEOUT_SECONDS,
                    help="Overall hard budget in seconds (default: %d)."
                    % int(OVERALL_TIMEOUT_SECONDS))
    ap.add_argument("--ttl-hours", type=int, default=24,
                    help="Source-result cache TTL in hours (default: 24).")
    ap.add_argument("--list-sources", action="store_true",
                    help="Print available source names and exit.")
    ap.add_argument("--version", action="version", version="research %s" % RESEARCH_VERSION)
    return ap


def main(argv: Optional[List[str]] = None) -> int:
    args = _parser().parse_args(argv)

    if args.list_sources:
        sys.stdout.write("\n".join(ALL_SOURCES) + "\n")
        return EXIT_OK

    topic = " ".join(args.topic).strip()
    if not topic:
        sys.stderr.write("research: missing topic. Usage: research <topic> [--academic] "
                         "[--sources LIST] [--n N] [--timeout SECS]\n")
        return EXIT_BAD_ARGS

    chosen: Optional[List[str]] = None
    if args.sources:
        chosen = [s.strip() for s in args.sources.split(",") if s.strip()]
        unknown = [s for s in chosen if s not in ALL_SOURCES]
        if unknown:
            sys.stderr.write("research: unknown source(s) %s (valid: %s)\n"
                             % (", ".join(unknown), ", ".join(ALL_SOURCES)))
            return EXIT_BAD_ARGS

    try:
        payload = research(
            topic,
            sources=chosen,
            n_per_source=args.n_per_source,
            timeout=args.timeout,
            ttl_hours=args.ttl_hours,
            academic=args.academic,
        )
    except ResearchError as exc:
        msg = str(exc).lower()
        if "live research disabled" in msg or LIVE_ENV.lower() in msg:
            sys.stderr.write("research: %s\n" % exc)
            return EXIT_LIVE_OFF
        if "scrub" in msg or "redact" in msg:
            sys.stderr.write("research: %s\n" % exc)
            return EXIT_SCRUB
        sys.stderr.write("research: %s\n" % exc)
        return EXIT_UNKNOWN
    except (AllowlistError, TransportError) as exc:
        sys.stderr.write("research: transport-level failure (%s): %s\n"
                         % (type(exc).__name__, exc))
        return EXIT_UNKNOWN

    sys.stdout.write(json.dumps(payload, indent=2, default=encode_results) + "\n")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
