"""reddit.py -- Reddit search.json. Free, no key (but needs a realistic UA).

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .. import cache
from ..http import HttpClient
from ..result import Result

ENDPOINT = "https://www.reddit.com/search.json"


class RedditSource:
    name = "reddit"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        r = self._client.get(ENDPOINT, params={
            "q": query, "limit": min(max(1, n), 25),
        }, client_name=self.name)
        if r.status != 200:
            return []
        # Let JSON-decode / parse errors PROPAGATE (see hackernews.py for rationale).
        results = _parse(r.json() or {})
        cache.put(self.name, query, results)
        return results


def _iso8601_from_epoch(value: Any) -> Optional[str]:
    """Convert Reddit's ``created_utc`` (Unix epoch float / int) to an ISO 8601
    UTC string matching the cross-source contract documented on ``Result.posted_at``.
    Returns ``None`` for missing / unparseable values rather than emitting a
    float-as-string like ``"1622000000.0"``."""
    if value is None:
        return None
    try:
        epoch = float(value)
    except (TypeError, ValueError):
        return None
    try:
        return datetime.fromtimestamp(epoch, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (OverflowError, OSError, ValueError):
        return None


def _parse(payload: Dict[str, Any]) -> List[Result]:
    out = []
    for child in (payload.get("data", {}) or {}).get("children", []) or []:
        d = child.get("data", {}) or {}
        out.append(Result(
            source="reddit",
            title=d.get("title") or "",
            url="https://www.reddit.com" + (d.get("permalink") or ""),
            snippet=((d.get("selftext") or "")[:280]) or None,
            points=d.get("score"),
            comments=d.get("num_comments"),
            posted_at=_iso8601_from_epoch(d.get("created_utc")),
            extra={"subreddit": d.get("subreddit") or ""},
        ))
    return out


__all__ = ["RedditSource"]
