"""hackernews.py -- HackerNews via Algolia search. Free, no key, no rate limit.

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

from typing import Any, Dict, List

from .. import cache
from ..http import HttpClient
from ..result import Result

ENDPOINT = "https://hn.algolia.com/api/v1/search"


class HackerNewsSource:
    name = "hackernews"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        r = self._client.get(ENDPOINT, params={
            "query": query, "hitsPerPage": min(max(1, n), 50), "tags": "story",
        }, client_name=self.name)
        if r.status != 200:
            return []
        # Let JSON-decode / parse errors PROPAGATE to the aggregator's _safe_search,
        # where they become a recorded warning. Silently swallowing them here would
        # make a malformed-API response indistinguishable from "no hits" (lie-green).
        results = _parse(r.json() or {})
        cache.put(self.name, query, results)
        return results


def _parse(payload: Dict[str, Any]) -> List[Result]:
    out = []
    for h in payload.get("hits", []) or []:
        out.append(Result(
            source="hackernews",
            title=h.get("title") or h.get("story_title") or "",
            url=h.get("url") or ("https://news.ycombinator.com/item?id=" + str(h.get("objectID") or "")),
            snippet=((h.get("story_text") or "")[:280]) or None,
            points=h.get("points"),
            comments=h.get("num_comments"),
            posted_at=h.get("created_at"),
        ))
    return out


__all__ = ["HackerNewsSource"]
