"""wikipedia.py -- Wikipedia MediaWiki search + REST summary. Free, no key.

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

import urllib.parse
from typing import List, Optional

from .. import cache
from ..http import HttpClient
from ..result import Result

SEARCH = "https://en.wikipedia.org/w/api.php"
SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/"


class WikipediaSource:
    name = "wikipedia"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 5) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]

        r = self._client.get(SEARCH, params={
            "action": "query", "list": "search", "srsearch": query,
            "srlimit": n, "format": "json",
        }, client_name=self.name)
        if r.status != 200:
            return []
        # Let JSON-decode errors PROPAGATE -- the aggregator's per-source isolation
        # turns them into a "wikipedia: <error>" warning without silencing them.
        titles = [h.get("title", "") for h in (r.json() or {}).get("query", {}).get("search", [])]
        out: List[Result] = []
        for t in titles[:n]:
            s = self._summary(t)
            if s:
                out.append(s)
        cache.put(self.name, query, out)
        return out

    def _summary(self, title: str) -> Optional[Result]:
        url = SUMMARY + urllib.parse.quote(title.replace(" ", "_"), safe="")
        r = self._client.get(url, client_name=self.name)
        if r.status != 200:
            return None
        j = r.json() or {}
        page_url = (((j.get("content_urls") or {}).get("desktop") or {}).get("page") or "")
        return Result(
            source=self.name,
            title=j.get("title") or title,
            url=page_url,
            snippet=j.get("extract"),
        )


__all__ = ["WikipediaSource"]
