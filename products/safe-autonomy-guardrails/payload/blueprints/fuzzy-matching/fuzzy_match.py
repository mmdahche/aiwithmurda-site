#!/usr/bin/env python3
"""fuzzy_match.py — pure-stdlib fuzzy ID resolver bundled with this product.

The local-agent kit's ``resolve_id`` guard imports :func:`resolve` from here so the
scoring logic has ONE owner (never re-implemented by the caller). This module is
deliberately small and dependency-free: it uses ``difflib.SequenceMatcher`` from the
standard library — no third-party fuzzy libs — and returns a tiered decision so the
caller can distinguish an auto-confidence match from something a human should confirm.

Design contract expected by :func:`kit.resolve_id`:
  * ``resolve(supplied, candidates, ...)`` returns a :class:`MatchResult` with:
        ``supplied``   the original id (echoed back for the caller's error message)
        ``best``       the winning candidate string, or ``None`` when nothing crosses
                       the review threshold
        ``score``      the winner's similarity ratio in [0.0, 1.0]
        ``tier``       one of ``"auto"`` / ``"review"`` / ``"unmatched"``
        ``candidates`` the list of candidates that were actually scored
  * An exact normalized match (case/whitespace-folded) is ALWAYS ``tier="auto"``
    with ``score=1.0`` — exact wins.
  * A close match at ``score >= AUTO_THRESHOLD`` is ``"auto"`` unless the runner-up
    is within a small margin (an ambiguous tie), in which case it downgrades to
    ``"review"`` so the caller does not silently pick between two near-equals.
  * A match at ``score >= REVIEW_THRESHOLD`` but below auto is ``"review"``.
  * Below the review threshold — or with no/empty candidates or an empty/non-string
    ``supplied`` — the result is ``"unmatched"`` with ``best=None``.

Usage:

    >>> resolve("email-send", ["email-send", "file-read"]).best
    'email-send'
    >>> resolve("emial-send", ["email-send", "file-read"]).tier
    'auto'
    >>> resolve("emial-send", ["email-send", "file-read"]).best
    'email-send'
    >>> resolve("totally-unrelated", ["email-send", "file-read"]).tier
    'unmatched'
    >>> resolve("anything", []).tier
    'unmatched'

Pure Python 3 stdlib (``difflib`` + ``dataclasses``). No network, no eval/exec, no
third-party deps.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Iterable, List, Optional

# Score >= AUTO_THRESHOLD is safe to act on automatically (unless it's ambiguous).
AUTO_THRESHOLD = 0.88
# Score in [REVIEW_THRESHOLD, AUTO_THRESHOLD) needs a human/operator decision.
REVIEW_THRESHOLD = 0.72
# If the winner is only this much ahead of the runner-up (both >= AUTO_THRESHOLD),
# the pick is treated as ambiguous and downgraded to "review".
AMBIGUITY_MARGIN = 0.03


@dataclass
class MatchResult:
    """The outcome of :func:`resolve` — a scored, tiered decision the caller can act on."""

    supplied: str
    best: Optional[str]
    score: float
    tier: str  # "auto" | "review" | "unmatched"
    candidates: List[str] = field(default_factory=list)


def _norm(s: str) -> str:
    """Case-fold and collapse internal whitespace so 'Foo  Bar' and 'foo bar' match."""
    return " ".join(str(s).strip().lower().split())


def _ratio(a: str, b: str) -> float:
    """SequenceMatcher.ratio() — a symmetric similarity score in [0.0, 1.0]."""
    return SequenceMatcher(None, a, b).ratio()


def resolve(supplied,
            candidates: Iterable[str],
            auto: float = AUTO_THRESHOLD,
            review: float = REVIEW_THRESHOLD,
            margin: float = AMBIGUITY_MARGIN) -> MatchResult:
    """Score *supplied* against each candidate and return a tiered :class:`MatchResult`.

    * Exact normalized match → ``tier="auto"``, ``score=1.0``.
    * Best score >= *auto*, clearly ahead of runner-up by *margin* → ``"auto"``.
    * Best score >= *auto* but runner-up within *margin* → ``"review"`` (ambiguous).
    * Best score in [*review*, *auto*) → ``"review"``.
    * Otherwise (or empty candidates / empty supplied) → ``"unmatched"``.
    """
    cand_list = [c for c in (candidates or []) if isinstance(c, str) and c]
    supplied_str = supplied if isinstance(supplied, str) else ""
    if not cand_list or not supplied_str.strip():
        return MatchResult(supplied=supplied_str, best=None, score=0.0,
                           tier="unmatched", candidates=cand_list)

    ns = _norm(supplied_str)

    # Exact normalized hit always wins.
    for c in cand_list:
        if _norm(c) == ns:
            return MatchResult(supplied=supplied_str, best=c, score=1.0,
                               tier="auto", candidates=cand_list)

    # Score every candidate; keep the top two so we can detect ambiguity.
    scored = sorted(((_ratio(ns, _norm(c)), c) for c in cand_list),
                    key=lambda t: t[0], reverse=True)
    top_score, top = scored[0]
    runner_up = scored[1][0] if len(scored) > 1 else 0.0

    if top_score >= auto:
        if runner_up >= auto and (top_score - runner_up) < margin:
            return MatchResult(supplied=supplied_str, best=top, score=top_score,
                               tier="review", candidates=cand_list)
        return MatchResult(supplied=supplied_str, best=top, score=top_score,
                           tier="auto", candidates=cand_list)
    if top_score >= review:
        return MatchResult(supplied=supplied_str, best=top, score=top_score,
                           tier="review", candidates=cand_list)
    return MatchResult(supplied=supplied_str, best=None, score=top_score,
                       tier="unmatched", candidates=cand_list)


if __name__ == "__main__":
    # Self-test — run `python3 fuzzy_match.py` to sanity-check the contract quickly.
    _cases = [
        ("email-send",         ["email-send", "file-read"], "auto",      "email-send"),
        ("emial-send",         ["email-send", "file-read"], "auto",      "email-send"),
        ("PROJ-123",           ["PROJ-123", "PROJ-999"],    "auto",      "PROJ-123"),
        ("proj 123",           ["PROJ-123", "PROJ-999"],    None,        None),   # tier variable
        ("totally-unrelated",  ["email-send", "file-read"], "unmatched", None),
        ("anything",           [],                          "unmatched", None),
    ]
    ok = True
    for supplied, cands, want_tier, want_best in _cases:
        r = resolve(supplied, cands)
        got = (r.tier, r.best)
        if want_tier is not None and (want_tier != r.tier or want_best != r.best):
            print("FAIL: resolve(%r, %r) -> %s, wanted (%s, %s)"
                  % (supplied, cands, got, want_tier, want_best))
            ok = False
        else:
            print("ok:   resolve(%r, %r) -> tier=%s best=%s score=%.3f"
                  % (supplied, cands, r.tier, r.best, r.score))
    raise SystemExit(0 if ok else 1)
