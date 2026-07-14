"""semantic_scholar.py -- Semantic Scholar Graph API. Free; 100 req / 5 min unauth.

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

from typing import Any, Dict, List

from .. import cache
from ..http import HttpClient
from ..result import Result

ENDPOINT = "https://api.semanticscholar.org/graph/v1/paper/search"
FIELDS = "title,abstract,authors,year,url,externalIds"


class SemanticScholarSource:
    name = "semantic_scholar"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        r = self._client.get(ENDPOINT, params={
            "query": query, "limit": min(max(1, n), 100), "fields": FIELDS,
        }, client_name=self.name)
        if r.status != 200:
            return []
        results = _parse(r.json() or {})
        cache.put(self.name, query, results)
        return results


def _parse(payload: Dict[str, Any]) -> List[Result]:
    out = []
    for paper in payload.get("data", []) or []:
        authors = [a.get("name", "") for a in (paper.get("authors") or [])]
        doi = (paper.get("externalIds") or {}).get("DOI")
        url = paper.get("url") or (("https://doi.org/" + doi) if doi else "")
        out.append(Result(
            source="semantic_scholar",
            title=paper.get("title") or "",
            url=url,
            abstract=paper.get("abstract"),
            authors=[a for a in authors if a],
            year=paper.get("year"),
            extra={"doi": doi} if doi else {},
        ))
    return out


__all__ = ["SemanticScholarSource"]
