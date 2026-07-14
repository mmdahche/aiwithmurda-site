"""duckduckgo.py -- DuckDuckGo HTML scrape. Free, no key.

Adapted (MIT) from obsidian-second-brain's client. Differences: uses our
``HttpClient`` (allowlist-gated + injectable transport) instead of a private
``requests.Session``; SearXNG fallback dropped in v1 (public SearXNG instances
are operator-trust, not a fixed host-set we can pin).
"""
from __future__ import annotations

import re
from html import unescape
from typing import List
from urllib.parse import parse_qs, unquote, urlparse

from .. import cache
from ..http import HttpClient
from ..result import Result

DDG_URL = "https://html.duckduckgo.com/html/"
RESULT_RE = re.compile(
    r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)</a>'
    r'.*?<a[^>]+class="result__snippet"[^>]*>(.*?)</a>',
    re.DOTALL,
)


class DuckDuckGoSource:
    name = "duckduckgo"

    def __init__(self, client: HttpClient, ttl_hours: int = 24) -> None:
        self._client = client
        self._ttl = ttl_hours

    def search(self, query: str, n: int = 10) -> List[Result]:
        cached = cache.get(self.name, query, ttl_hours=self._ttl)
        if cached is not None:
            return [Result(**r) for r in cached]
        results = self._try_ddg(query, n)
        cache.put(self.name, query, results)
        return results

    def _try_ddg(self, query: str, n: int) -> List[Result]:
        r = self._client.get(
            DDG_URL,
            params={"q": query},
            extra_headers={"Accept-Language": "en-US,en;q=0.9"},
            client_name=self.name,
        )
        if r.status != 200 or not r.text:
            return []
        out: List[Result] = []
        for m in list(RESULT_RE.finditer(r.text))[:n]:
            raw_url, title, snippet = m.group(1), m.group(2), m.group(3)
            final_url = _strip_ddg_redirect(raw_url)
            clean_snippet = re.sub(r"<[^>]+>", "", snippet).strip()
            out.append(Result(
                source=self.name,
                title=unescape(title).strip(),
                url=final_url,
                snippet=unescape(clean_snippet) or None,
            ))
        return out


def _strip_ddg_redirect(raw: str) -> str:
    """DDG wraps result URLs in /l/?uddg=<encoded>. Unwrap to the destination URL.
    The unwrapped URL is informational only -- v1 does NOT fetch it."""
    if raw.startswith("//"):
        raw = "https:" + raw
    try:
        parsed = urlparse(raw)
    except ValueError:
        return raw
    if "duckduckgo.com" in (parsed.netloc or "") and "uddg" in (parsed.query or ""):
        q = parse_qs(parsed.query).get("uddg", [""])[0]
        return unquote(q)
    return raw


__all__ = ["DuckDuckGoSource"]
