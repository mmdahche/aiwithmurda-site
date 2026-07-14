"""result.py -- typed search result returned by every source client.

Pure data, no behavior. Sources fill the fields they have; rest stay None.

Adapted (MIT) from obsidian-second-brain `scripts/research/lib/result.py`,
trimmed to the fields the free-source set actually emits.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class Result:
    """One search result. Frozen so the aggregator can hash for dedup without copy."""

    source: str
    title: str
    url: str
    snippet: Optional[str] = None      # web / discourse one-line preview
    abstract: Optional[str] = None     # academic full abstract
    authors: Optional[List[str]] = None
    year: Optional[int] = None
    points: Optional[int] = None       # HN score / Reddit upvotes
    comments: Optional[int] = None
    posted_at: Optional[str] = None    # ISO 8601 if known
    extra: Dict[str, Any] = field(default_factory=dict)


def encode_results(obj: Any) -> Any:
    """`json.dumps` default= callable. Serializes Result to plain dict."""
    if isinstance(obj, Result):
        return asdict(obj)
    raise TypeError("Object of type %s is not JSON serializable" % type(obj).__name__)


__all__ = ["Result", "encode_results"]
