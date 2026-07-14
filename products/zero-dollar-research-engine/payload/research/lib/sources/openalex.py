"""openalex.py -- OpenAlex Works API. Free; polite-pool when UA carries mailto.

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from .. import cache
from ..http import HttpClient
from ..result import Result

ENDPOINT = "https://api.openalex.org/works"


class OpenAlexSource:
    name = "openalex"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        r = self._client.get(ENDPOINT, params={
            "search": query, "per-page": min(max(1, n), 25),
        }, client_name=self.name)
        if r.status != 200:
            return []
        results = _parse(r.json() or {})
        cache.put(self.name, query, results)
        return results


def _parse(payload: Dict[str, Any]) -> List[Result]:
    out = []
    for w in payload.get("results", []) or []:
        title = w.get("display_name") or w.get("title") or ""
        doi = w.get("doi")
        url = doi or w.get("id") or ""
        abstract = _reconstruct_abstract(w.get("abstract_inverted_index"))
        authors = [
            (a.get("author") or {}).get("display_name", "")
            for a in (w.get("authorships") or [])
        ]
        out.append(Result(
            source="openalex",
            title=title,
            url=url,
            abstract=abstract,
            authors=[a for a in authors if a],
            year=w.get("publication_year"),
            extra={"doi": doi or "", "cited_by_count": w.get("cited_by_count")},
        ))
    return out


def _reconstruct_abstract(inv: Optional[Dict[str, Any]]) -> Optional[str]:
    """OpenAlex stores abstracts as inverted index {word: [positions]}. Reconstruct."""
    if not inv:
        return None
    pairs = []
    for word, positions in inv.items():
        for p in positions or []:
            try:
                pairs.append((int(p), word))
            except (TypeError, ValueError):
                continue
    pairs.sort()
    return " ".join(w for _, w in pairs) or None


__all__ = ["OpenAlexSource"]
