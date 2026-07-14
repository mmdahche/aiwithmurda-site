"""lobsters.py -- Lobste.rs search. Free, no key.

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

from typing import Any, List

from .. import cache
from ..http import HttpClient
from ..result import Result

ENDPOINT = "https://lobste.rs/search.json"


class LobstersSource:
    name = "lobsters"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        r = self._client.get(ENDPOINT, params={
            "q": query, "what": "stories", "order": "relevance",
        }, client_name=self.name)
        if r.status != 200:
            return []
        data: Any = r.json()
        if isinstance(data, list):
            items = data[:min(max(1, n), 25)]
        elif isinstance(data, dict) and isinstance(data.get("stories"), list):
            items = data["stories"][:min(max(1, n), 25)]
        else:
            items = []
        out = [
            Result(
                source=self.name,
                title=s.get("title") or "",
                url=s.get("url") or s.get("short_id_url") or "",
                points=s.get("score"),
                comments=s.get("comment_count"),
                posted_at=s.get("created_at"),
                extra={"tags": s.get("tags") or []},
            )
            for s in items
            if isinstance(s, dict)
        ]
        cache.put(self.name, query, out)
        return out


__all__ = ["LobstersSource"]
