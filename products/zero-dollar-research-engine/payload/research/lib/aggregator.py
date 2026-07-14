"""aggregator.py -- run multiple source clients in parallel with isolation + a hard
overall time budget.

Adapted (MIT) from obsidian-second-brain ``scripts/research/lib/aggregator.py``.
Differences:

  * We DEDUP results by normalized URL (the upstream original left dedup to the
    synthesizer; we do it here so the JSON returned to the agent is clean).
  * Per-source failures are routed into ``warnings`` only (never crash the run --
    one flaky source must not kill the others).
  * "Success" is >= 3 sources returning at least one result.
  * Every user-visible string on every result is run through the caller's
    scrubber BEFORE return (fail-closed: a scrubber exception propagates).

Sources must implement the ``SourceClient`` protocol:
    name: str
    def search(self, query, n=10) -> list[Result]

The aggregator never imports any source directly -- sources are constructed by
the caller and passed in, so the test suite (with a mock transport) shares the
exact production code path.

Pure stdlib (concurrent.futures, dataclasses, sys).
"""
from __future__ import annotations

import re
import sys
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout, as_completed
from dataclasses import asdict
from typing import Any, Callable, Dict, List, Optional, Protocol, Tuple
from urllib.parse import urlsplit, urlunsplit

from .result import Result

OVERALL_TIMEOUT_SECONDS = 30.0
SUCCESS_MIN_SOURCES = 3


class SourceClient(Protocol):
    name: str

    def search(self, query: str, n: int = 10) -> List[Result]: ...


def aggregate(
    query: str,
    sources: List[SourceClient],
    n_per_source: int = 10,
    timeout: float = OVERALL_TIMEOUT_SECONDS,
    scrubber: Optional[Callable[[str], str]] = None,
) -> Dict[str, Any]:
    """Run *sources* in parallel and return a JSON-serializable dict.

    * Per-source failure -> captured into ``warnings``; never propagated.
    * Overall hard budget *timeout* (default 30s) -> any source still running is
      marked ``timeout`` in ``warnings`` and its in-flight results are dropped.
    * Results are deduped by ``(normalized URL)`` then (fallback)
      ``(source, title)``; the first occurrence wins.
    * Optional *scrubber* (``str -> str``) is applied to every user-visible
      string on every result BEFORE return. Fail-closed: if the scrubber raises,
      the whole call raises.
    """
    if not sources:
        return {"topic": query, "results": [], "stats": _stats(0, 0, 0, False), "warnings": []}

    raw_results: List[Result] = []
    warnings: List[str] = []
    succeeded: set = set()

    # We manage the executor MANUALLY rather than via ``with`` because the context
    # manager's ``__exit__`` calls ``shutdown(wait=True)`` -- which would BLOCK
    # until every running source finishes, defeating the whole point of the budget.
    # On timeout we call ``shutdown(wait=False, cancel_futures=True)``: pending
    # futures are cancelled, running threads are left to finish in the background
    # (no Python primitive can interrupt a thread mid-syscall), but the function
    # returns immediately so the caller's deadline is honoured.
    max_workers = max(1, len(sources))
    ex = ThreadPoolExecutor(max_workers=max_workers)
    future_to_source = {
        ex.submit(_safe_search, s, query, n_per_source): s for s in sources
    }
    try:
        try:
            for future in as_completed(future_to_source, timeout=timeout):
                src = future_to_source[future]
                got, err = future.result()
                if err:
                    warnings.append("%s: %s" % (src.name, err))
                if got:
                    raw_results.extend(got)
                    succeeded.add(src.name)
        except FuturesTimeout:
            for f, s in future_to_source.items():
                if not f.done():
                    warnings.append("%s: timeout (overall %ds budget hit)" % (s.name, int(timeout)))
                    f.cancel()
    finally:
        # Python 3.9+: cancel queued-but-not-running futures; do NOT wait for
        # in-flight ones. The slow source's thread becomes a daemon-ish orphan
        # that finishes its sleep / network call and exits silently.
        ex.shutdown(wait=False, cancel_futures=True)

    deduped = _dedup(raw_results)
    scrubbed = _scrub_results(deduped, scrubber) if scrubber else deduped

    return {
        "topic": query,
        "results": [asdict(r) for r in scrubbed],
        "stats": _stats(len(sources), len(succeeded), len(scrubbed),
                        len(succeeded) >= SUCCESS_MIN_SOURCES),
        "warnings": warnings,
    }


# Strip the query string from any embedded URL in an error message. TransportError /
# HTTPError messages echo the full request URL, whose query carries the research
# TOPIC -- which would otherwise reach a shared stderr log aggregator and the
# returned ``warnings``. Keep the URL up to '?', drop the rest.
_URL_QS_RE = re.compile(r"(https?://[^\s?]+)\?\S*")


def _redact_exc(e: Exception) -> str:
    return _URL_QS_RE.sub(r"\1?...", str(e))[:300]


def _safe_search(source: SourceClient, query: str, n: int) -> Tuple[List[Result], Optional[str]]:
    """Run source.search and capture ANY exception as a string. The exception's
    short message is returned (query-stripped); the source's name is added by the
    caller. Stderr note for human triage; never re-raised."""
    try:
        out = source.search(query, n=n)
        if out is None:
            return [], None
        return list(out), None
    except Exception as e:  # noqa: BLE001 - per-source isolation by design
        msg = _redact_exc(e)
        print("[%s] %s: %s" % (getattr(source, "name", "?"), type(e).__name__, msg),
              file=sys.stderr)
        return [], "%s: %s" % (type(e).__name__, msg)


def _dedup(results: List[Result]) -> List[Result]:
    """Drop duplicate hits. Key by normalized URL when present, else
    (source, normalized title). Stable: first occurrence wins."""
    seen = set()
    out = []
    for r in results:
        url = (r.url or "").strip().rstrip("/").lower()
        if url:
            key = ("url", url)
        else:
            key = ("title", r.source.lower(), (r.title or "").strip().lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def _scrub_results(results: List[Result], scrubber: Callable[[str], str]) -> List[Result]:
    """Apply *scrubber* to every user-visible string on every result. Fail-closed:
    a scrubber exception propagates (callers must catch + drop the whole batch)."""
    out: List[Result] = []
    for r in results:
        out.append(Result(
            source=r.source,
            title=scrubber(r.title or "") or "",
            url=_scrub_url(r.url or "", scrubber),
            snippet=scrubber(r.snippet) if r.snippet else None,
            abstract=scrubber(r.abstract) if r.abstract else None,
            authors=[scrubber(a) for a in r.authors] if r.authors else None,
            year=r.year,
            points=r.points,
            comments=r.comments,
            posted_at=r.posted_at,
            extra=_scrub_extra(r.extra, scrubber),
        ))
    return out


def _scrub_url(url: str, scrubber: Callable[[str], str]) -> str:
    """Scrub ONLY a URL's query string + fragment -- where bearer tokens / OAuth
    creds / session params returned by an external API live -- while keeping the
    scheme / host / path intact (those were already allowlist-validated).
    Lossless for the useful part of the URL yet closes the path for a credential
    in an API-returned URL to reach logs / the consuming LLM unscrubbed.
    Un-parseable URLs are scrubbed whole (fail-safe)."""
    if not url:
        return ""
    try:
        p = urlsplit(url)
    except Exception:
        return scrubber(url) or ""
    q = scrubber(p.query) if p.query else p.query
    frag = scrubber(p.fragment) if p.fragment else p.fragment
    return urlunsplit((p.scheme, p.netloc, p.path, q, frag))


def _scrub_extra(extra: Dict[str, Any], scrubber: Callable[[str], str]) -> Dict[str, Any]:
    out = {}
    for k, v in (extra or {}).items():
        if isinstance(v, str):
            out[k] = scrubber(v)
        else:
            out[k] = v
    return out


def _stats(attempted: int, succeeded: int, total: int, success: bool) -> Dict[str, Any]:
    return {
        "sources_attempted": attempted,
        "sources_succeeded": succeeded,
        "results_total": total,
        "success": success,
        "success_min_sources": SUCCESS_MIN_SOURCES,
    }


__all__ = ["aggregate", "SourceClient", "OVERALL_TIMEOUT_SECONDS", "SUCCESS_MIN_SOURCES"]
