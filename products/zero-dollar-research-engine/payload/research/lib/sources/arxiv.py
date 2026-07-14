"""arxiv.py -- arXiv via the official Atom API. Free, no key.

Adapted (MIT) from obsidian-second-brain's client. Uses our ``HttpClient``.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import List, Optional

from .. import cache
from ..http import HttpClient
from ..result import Result

ENDPOINT = "https://export.arxiv.org/api/query"
NS = {"atom": "http://www.w3.org/2005/Atom"}


class ArxivSource:
    name = "arxiv"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        r = self._client.get(ENDPOINT, params={
            "search_query": "all:" + (query or ""), "start": 0, "max_results": n,
        }, client_name=self.name)
        if r.status != 200 or not r.text:
            return []
        results = _parse(r.text)
        cache.put(self.name, query, results)
        return results


def _parse(atom_xml: str) -> List[Result]:
    # Reject any DTD / internal entities before parsing. A legit arXiv Atom feed
    # has none, and a ``<!DOCTYPE>`` / ``<!ENTITY>`` is the prerequisite for both
    # XXE and the internal-entity "billion laughs" expansion (which expat DOES
    # perform, so the input size cap alone doesn't stop it). Pure stdlib -- no
    # defusedxml dependency. Fail-safe: a hostile feed yields zero results.
    _head = atom_xml[:8192].upper()
    if "<!DOCTYPE" in _head or "<!ENTITY" in _head:
        return []
    try:
        root = ET.fromstring(atom_xml)
    except ET.ParseError:
        return []
    out: List[Result] = []
    for entry in root.findall("atom:entry", NS):
        title = _text(entry.find("atom:title", NS))
        summary = _text(entry.find("atom:summary", NS))
        link_el = entry.find("atom:link[@rel='alternate']", NS)
        url = link_el.attrib.get("href", "") if link_el is not None else ""
        published = _text(entry.find("atom:published", NS))
        year = _year(published)
        authors = [
            _text(a.find("atom:name", NS))
            for a in entry.findall("atom:author", NS)
            if a.find("atom:name", NS) is not None
        ]
        out.append(Result(
            source="arxiv",
            title=title,
            url=url,
            abstract=summary,
            authors=[a for a in authors if a],
            year=year,
            posted_at=published or None,
        ))
    return out


def _text(el) -> str:
    return (el.text or "").strip() if el is not None else ""


def _year(iso_date: str) -> Optional[int]:
    m = re.match(r"^(\d{4})", iso_date or "")
    return int(m.group(1)) if m else None


__all__ = ["ArxivSource"]
