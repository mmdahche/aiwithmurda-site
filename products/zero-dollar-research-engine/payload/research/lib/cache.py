"""cache.py -- file-based TTL JSON cache for source results.

Adapted (MIT) from obsidian-second-brain `scripts/research/lib/cache.py`.
Layout:

    <cache-root>/<source>-<sha1(normalized_query)>.json

TTL is enforced via file mtime. Misses return ``None``; callers fetch from the
network and call :func:`put` to seed the cache. The cache root is overridable
via env var ``RESEARCH_CACHE_DIR`` (default ``~/.cache/research-engine``) so
tests can use a temp directory.

Cache write failures are NON-FATAL -- research must still succeed when the
cache disk is full or read-only. Cache READ corruption returns a miss (not an
error).

Cache is keyed by source name + normalized query (lowercased, whitespace
collapsed). It is NOT keyed by anything secret, but the cache is also fed
already-scrubbed queries (caller's responsibility) -- so a secret-bearing
query is scrubbed BEFORE it ever reaches `_key()`.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_TTL_HOURS = 24
CACHE_DIR_ENV = "RESEARCH_CACHE_DIR"


def cache_root() -> Path:
    p = Path(os.environ.get(CACHE_DIR_ENV) or
             os.path.expanduser("~/.cache/research-engine"))
    try:
        p.mkdir(parents=True, exist_ok=True)
        # Owner-only: cached results (titles / snippets / topic names) must not be
        # world-readable on a shared server / container. Best-effort; a no-op on Windows.
        try:
            os.chmod(p, 0o700)
        except OSError:
            pass
    except OSError:
        # Read-only home / locked-down env -- degrade to a no-op cache by returning
        # a path that doesn't exist; get()/put() handle the failure silently.
        pass
    return p


def _normalize(query: str) -> str:
    return " ".join((query or "").lower().split())


def _key(source: str, query: str) -> Path:
    sha = hashlib.sha1(_normalize(query).encode("utf-8")).hexdigest()[:16]
    safe_source = "".join(c for c in (source or "src") if c.isalnum() or c in "-_") or "src"
    return cache_root() / ("%s-%s.json" % (safe_source, sha))


def get(source: str, query: str, ttl_hours: int = DEFAULT_TTL_HOURS) -> Optional[List[Dict[str, Any]]]:
    """Return cached results for (source, query) if fresh; else ``None``.

    Corrupted or unreadable cache files return ``None`` (treated as a miss) so
    a poisoned cache can never block a fresh fetch.
    """
    path = _key(source, query)
    try:
        if not path.exists():
            return None
        age_s = time.time() - path.stat().st_mtime
        if age_s > max(0, ttl_hours) * 3600:
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, ValueError):
        return None


def put(source: str, query: str, results: List[Any]) -> None:
    """Seed the cache. Failures are non-fatal (research must still succeed)."""
    from .result import encode_results
    path = _key(source, query)
    try:
        # Create owner-only (0o600) so cached research isn't world-readable on a
        # shared host. os.open sets the mode on CREATE; chmod covers a pre-existing file.
        data = json.dumps(results, default=encode_results)
        fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(data)
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
    except (OSError, TypeError):
        # Disk full / read-only / non-serializable result -> silently skip caching.
        pass


def clear() -> int:
    """Remove all cache entries; returns the count removed."""
    n = 0
    try:
        for f in cache_root().glob("*.json"):
            try:
                f.unlink()
                n += 1
            except OSError:
                pass
    except OSError:
        pass
    return n


__all__ = ["DEFAULT_TTL_HOURS", "CACHE_DIR_ENV", "cache_root", "get", "put", "clear"]
