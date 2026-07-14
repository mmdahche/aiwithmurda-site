"""crossref.py -- CrossRef REST API. Free; polite-pool when UA carries mailto.

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from .. import cache
from ..http import HttpClient
from ..result import Result

ENDPOINT = "https://api.crossref.org/works"


class CrossRefSource:
    name = "crossref"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        r = self._client.get(ENDPOINT, params={
            "query": query, "rows": min(max(1, n), 50),
        }, client_name=self.name)
        if r.status != 200:
            return []
        results = _parse(r.json() or {})
        cache.put(self.name, query, results)
        return results


def _parse(payload: Dict[str, Any]) -> List[Result]:
    out = []
    items = ((payload.get("message") or {}).get("items")) or []
    for w in items:
        titles = w.get("title") or []
        title = titles[0] if titles else ""
        doi = w.get("DOI")
        url = w.get("URL") or (("https://doi.org/" + doi) if doi else "")
        abstract = w.get("abstract")
        authors = [
            ("%s %s" % (a.get("given", ""), a.get("family", ""))).strip()
            for a in (w.get("author") or [])
        ]
        year: Optional[int] = None
        date_parts = ((w.get("issued") or {}).get("date-parts")) or []
        if date_parts and date_parts[0]:
            try:
                year = int(date_parts[0][0])
            except (TypeError, ValueError):
                year = None
        out.append(Result(
            source="crossref",
            title=title,
            url=url,
            abstract=abstract,
            authors=[a for a in authors if a],
            year=year,
            extra={"doi": doi or ""},
        ))
    return out


__all__ = ["CrossRefSource"]
