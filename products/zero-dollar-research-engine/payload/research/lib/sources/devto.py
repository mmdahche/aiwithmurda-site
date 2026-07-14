"""devto.py -- dev.to articles. Free, no key. Best-effort: query slugified as tag.

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

import re
from typing import List, Optional

from .. import cache
from ..http import HttpClient
from ..result import Result

ENDPOINT = "https://dev.to/api/articles"


class DevToSource:
    name = "devto"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        tag = _query_to_tag(query)
        params = {"per_page": min(max(1, n), 30)}
        if tag:
            params["tag"] = tag
        r = self._client.get(ENDPOINT, params=params, client_name=self.name)
        if r.status != 200:
            return []
        items = r.json() or []
        out = [
            Result(
                source=self.name,
                title=a.get("title") or "",
                url=a.get("url") or "",
                snippet=a.get("description"),
                points=a.get("public_reactions_count"),
                comments=a.get("comments_count"),
                posted_at=a.get("published_at"),
                extra={"tag_list": a.get("tag_list") or []},
            )
            for a in items
            if isinstance(a, dict)
        ]
        cache.put(self.name, query, out)
        return out


def _query_to_tag(q: str) -> Optional[str]:
    """First alphanumeric token >= 3 chars (dev.to tags are flat strings)."""
    words = re.findall(r"[a-z0-9]+", (q or "").lower())
    return next((w for w in words if len(w) >= 3), None)


__all__ = ["DevToSource"]
