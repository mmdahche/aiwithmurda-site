#!/usr/bin/env python3
"""redact.py — the ONE canonical redactor bundled with this product.

This is the single source of truth for *what* counts as a secret / PII / PHI and
*how* it is scrubbed. The redaction firewall (``firewall.py``) IMPORT-PINS this
module and never re-declares a pattern, so a pattern is defined or changed in
exactly one place — here.

The secret/PII pattern set has been adversarially hardened. Findings folded in here
include: email + private-key-block ReDoS hardened to linear time, credit-card
Luhn-gated to stop eating timestamps/ISBNs, Slack xapp- / Azure AccountKey /
non-Bearer auth coverage added, greedy-provider over-consumption fixed by
ordering the value-bearing assignment pass first.

Public surface consumed by firewall.py (do not rename):
  * ``PATTERNS``               list[(name, matcher)] — secrets + PII (default profile)
  * ``with_phi()``             -> PATTERNS + the opt-in PHI shapes
  * ``redact(text, patterns)`` -> (scrubbed_text, was_redacted); fail-closed via RedactionError
  * ``RedactionError``         a pattern failed to evaluate — FAIL-CLOSED (caller must not emit)
  * ``has_meaningful_content(text)`` -> True if content survives once markers are stripped

A "matcher" is anything exposing ``.search(text)`` and ``.subn(repl, text)`` — either a
compiled ``re.Pattern`` or the Luhn-validating ``_LuhnCardPattern`` below.

Design contract (matches firewall.py + tests/test_firewall.py exactly):
  * Every match is replaced by the literal marker ``[REDACTED:<name>]``.
  * ``redact(None)`` returns ``("", False)`` (never raises on None).
  * Matchers are applied SEQUENTIALLY over the running text, in list order. The
    value-bearing assignment/auth/bearer patterns run BEFORE the greedy
    provider-prefix keys so an adjacent ``keyword=value`` can't be swallowed and leak.
    anthropic-key is ordered before openai-key (``sk-…`` overlap).
  * A matcher that raises during evaluation is re-raised as ``RedactionError``.

KNOWN LIMITATIONS (best-effort static filter — inherited + accepted):
  * Static patterns match secrets in their *literal* textual form only. Base64/hex/
    URL-encoded or serialized/compressed credential blobs are NOT caught.
  * ``ssn`` matches any ``\\d{3}-\\d{2}-\\d{4}`` group (the firewall test mandates bare
    SSN redaction), so it can over-redact 3-2-4-shaped part numbers / IDs. Accepted.

Pure stdlib (``re`` only). No network, no eval/exec, no third-party deps.
"""
from __future__ import annotations

import re
from typing import List, Optional, Tuple


class RedactionError(RuntimeError):
    """A redaction pattern failed to evaluate. FAIL-CLOSED: the caller must NOT emit
    the content it was trying to scrub."""


# The replacement marker. Firewall tests assert the exact form ``[REDACTED:<name>]``.
_MARKER = "[REDACTED:%s]"


def _luhn_ok(digits: str) -> bool:
    """Standard Luhn (mod-10) checksum over a bare digit string."""
    total = 0
    alt = False
    for ch in reversed(digits):
        d = ord(ch) - 48  # '0' == 48; digits-only input guaranteed by caller
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        alt = not alt
    return total % 10 == 0


class _PemKeyPattern:
    """Linear PEM private-key matcher. One finditer pass collects every BEGIN/END
    PRIVATE KEY marker, then pairs each BEGIN with the next END and redacts the whole
    span — for ANY body (base64, encrypted-PEM headers, arbitrarily large keys), with
    NO length bound, so a big key can never leak. A BEGIN with no END is treated as a
    truncated key and redacted to end-of-text IF a real base64 run follows it soon
    (else it's prose mentioning 'BEGIN … PRIVATE KEY' and is left alone). O(n), no
    catastrophic backtracking — replaces the bounded-regex version that FAILED OPEN on
    keys whose body exceeded the bound."""

    _MARK = re.compile(r'-----(BEGIN|END)[A-Z ]*PRIVATE KEY-----')
    _BODY = re.compile(r'[A-Za-z0-9+/=]{40,}')  # a real key body: 40+ contiguous base64

    def _spans(self, text):
        marks = [(m.start(), m.end(), m.group(1)) for m in self._MARK.finditer(text)]
        spans = []
        i = 0
        n = len(marks)
        while i < n:
            s, e, kind = marks[i]
            if kind != "BEGIN":
                i += 1
                continue
            j = i + 1
            while j < n and marks[j][2] != "END":
                j += 1  # skip stray/nested BEGINs; pair with the next END
            if j < n:
                spans.append((s, marks[j][1]))  # complete BEGIN…END block
                i = j + 1
            else:
                # unterminated BEGIN: redact to EOF only if a real base64 body follows.
                if self._BODY.search(text, e, e + 200):
                    spans.append((s, len(text)))
                break  # nothing pairs after an unterminated BEGIN
        return spans

    def search(self, text):
        if not text:
            return None
        return self._MARK.search(text) if self._spans(text) else None

    def subn(self, repl, text):
        spans = self._spans(text)
        if not spans:
            return text, 0
        out = []
        last = 0
        for s, e in spans:
            out.append(text[last:s])
            out.append(repl)
            last = e
        out.append(text[last:])
        return "".join(out), len(spans)


class _LuhnCardPattern:
    """Matcher for 13–19 digit runs (optional single space/dash separators) that PASS
    the Luhn checksum. Luhn gating means real card numbers redact while 13-digit
    epoch-millisecond timestamps, ISBN-13s, order/tracking IDs and large integer
    counters (which fail Luhn) pass through untouched. Exposes .search/.subn so it is
    a drop-in for a compiled regex in PATTERNS. The candidate regex uses a bounded
    quantifier ({12,18}) and digit-run boundaries — linear time, no backtracking."""

    _CANDIDATE = re.compile(r'(?<![\d\-])(?:\d[ \-]?){12,18}\d(?![\d\-])')

    @staticmethod
    def _digits(s: str) -> str:
        return "".join(c for c in s if c.isdigit())

    def _is_card(self, matched: str) -> bool:
        d = self._digits(matched)
        return 13 <= len(d) <= 19 and _luhn_ok(d)

    def search(self, text: Optional[str]):
        if not text:
            return None
        for m in self._CANDIDATE.finditer(text):
            if self._is_card(m.group()):
                return m
        return None

    def subn(self, repl: str, text: str) -> Tuple[str, int]:
        count = 0

        def _sub(m):
            nonlocal count
            if self._is_card(m.group()):
                count += 1
                return repl
            return m.group()

        return self._CANDIDATE.sub(_sub, text), count


# ── secrets + PII (the "default" profile) ────────────────────────────────────────
# The 13 names in the firewall's _SECRET_ONLY_NAMES subset use the exact hyphenated
# spelling it expects; those are what `--profile secrets-only` keeps. Extra provider
# patterns enrich the DEFAULT egress guard (intentionally NOT in the secrets-only
# subset, matching the firewall's curated model).
PATTERNS: List[Tuple[str, object]] = [
    # PEM private-key block — linear span-scan matcher (see _PemKeyPattern). Unbounded
    # body (never fails open on large keys), handles truncated keys, prose-safe, O(n).
    ("private-key-block", _PemKeyPattern()),

    # ---- value-bearing patterns FIRST (so an adjacent keyword=value is redacted
    #      before a greedy provider-prefix key can swallow it and leak the value) ----
    # Generic `NAME = value` / `NAME: value` where NAME contains a secret keyword.
    # ReDoS-hardened: bounded flat prefix `[A-Za-z0-9_]{0,40}` (was nested `(?:…+_)*`).
    # account-key / shared-access-key added for Azure Storage connection strings.
    ("generic-secret-assignment", re.compile(
        r'(?i)(?:^|[^A-Za-z0-9])'
        r'[A-Za-z0-9_]{0,40}'
        r'(?:api[_-]?key|secret|password|passwd|token|access[_-]?key|'
        r'account[_-]?key|shared[_-]?access[_-]?key|'
        r'client[_-]?secret|private[_-]?key|auth[_-]?token|credential)'
        r'\s*["\']?\s*[:=]\s*["\']?\{?\{?<?'
        r'[A-Za-z0-9._\-+/=:*@#!~%^&?$]{12,}')),
    # Authorization header with a credential-bearing scheme (Bearer/Token/ApiKey).
    ("authorization-header", re.compile(
        r'(?i)\bauthorization\s*:\s*(?:bearer|token|apikey)\s+[A-Za-z0-9._~+/\-]{16,}=*')),
    # Bare `Bearer <token>` outside a header.
    ("bearer-token", re.compile(r'(?i)\bbearer\s+[A-Za-z0-9._\-]{20,}')),

    # ---- provider-prefix secrets (required-name subset first) ----
    ("age-secret-key", re.compile(r'\bAGE-SECRET-KEY-1[0-9A-Z]{58}\b')),
    # anthropic BEFORE openai (sk- overlap: sk-ant-… must match first).
    ("anthropic-key", re.compile(r'sk-ant-[A-Za-z0-9_\-]{20,}')),
    ("openai-key", re.compile(r'sk-(?:proj-)?[A-Za-z0-9_\-]{20,}')),
    ("github-token", re.compile(r'\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b')),
    ("github-pat", re.compile(r'\bgithub_pat_[A-Za-z0-9_]{22,}\b')),
    # Slack bot/user/app tokens — xapp- (app-level, Socket Mode) added.
    ("slack-token", re.compile(r'\bx(?:ox[baprs]|app)-[A-Za-z0-9\-]{10,}')),
    # AWS access-key IDs — full documented unique-ID prefix set.
    ("aws-access-key-id", re.compile(
        r'\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASCA|APKA|ABIA|ACCA)[0-9A-Z]{16}\b')),
    ("google-api-key", re.compile(r'\bAIza[0-9A-Za-z_\-]{35}\b')),
    ("jwt", re.compile(r'eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}')),
    ("postgres-url", re.compile(r'\bpostgres(?:ql)?://[^\s:@/]+:[^\s@/]+@\S+')),

    # ---- extra provider secrets (enrich DEFAULT; not in the secrets-only subset) ----
    ("stripe-key", re.compile(r'[rs]k_(?:live|test)_[A-Za-z0-9]{16,}')),
    ("stripe-webhook", re.compile(r'\bwhsec_[A-Za-z0-9]{32,}\b')),
    ("gitlab-pat", re.compile(r'\bglpat-[A-Za-z0-9_\-]{20,}')),
    ("google-oauth", re.compile(r'\bya29\.[A-Za-z0-9_\-]{20,}')),
    ("twilio", re.compile(r'\b(?:AC|SK)[0-9a-fA-F]{32}\b')),
    ("sendgrid", re.compile(r'SG\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}')),
    ("mailgun", re.compile(r'\bkey-[0-9a-f]{32}\b')),
    ("digitalocean", re.compile(r'\bdop_v1_[0-9a-f]{64}\b')),
    ("npm-token", re.compile(r'\bnpm_[A-Za-z0-9]{36}\b')),
    ("pypi-token", re.compile(r'\bpypi-[A-Za-z0-9_\-]{16,}')),
    ("shopify", re.compile(r'\bshp(?:at|ca|pa|ss)_[0-9a-fA-F]{32}\b')),
    ("square", re.compile(r'(?:sq0(?:atp|csp)-[\w\-]{22,}|EAAA[A-Za-z0-9_\-]{60,})')),
    ("telegram-bot", re.compile(r'\b\d{8,10}:[A-Za-z0-9_\-]{35}\b')),
    ("linear-pat", re.compile(r'\blin_api_[A-Za-z0-9]{40,}\b')),
    ("supabase-key", re.compile(r'\bsb_(?:publishable|secret)_[A-Za-z0-9]{8,}\b')),
    # Inline creds in a URL of any scheme (mysql/redis/mongodb/amqp/…) or UNC/`//` authority.
    ("url-credentials", re.compile(r'://[^/\s:@]+:[^/\s@]+@')),
    ("unc-inline-cred", re.compile(r'(?:\\{2}|/{2})[^\s/:@\\]+:[^\s/@\\]+@[^\s/\\]+')),

    # ---- PII (in DEFAULT; excluded by secrets-only) ----
    # Email — ReDoS-hardened with RFC-5321 BOUNDED quantifiers (local <=64, <=8 dot-free
    # domain labels each <=63). Bounding kills the O(n^2) blowup where the greedy local
    # run scanned forward for an '@' at every position of a long dotted string.
    ("email", re.compile(
        r'\b[A-Za-z0-9._%+\-]{1,64}@(?:[A-Za-z0-9\-]{1,63}\.){1,8}[A-Za-z]{2,24}\b')),
    ("ssn", re.compile(r'\b\d{3}-\d{2}-\d{4}\b')),
    # Credit card — Luhn-gated (see _LuhnCardPattern): only checksum-valid runs redact.
    ("credit-card", _LuhnCardPattern()),
]

# ── PHI shapes (opt-in via the `phi` profile only — false-positive-prone on prose) ──
_PHI_PATTERNS: List[Tuple[str, object]] = [
    ("phi-mrn", re.compile(r'(?i)\bMRN[#:\s]+\d{5,10}\b')),
    ("phi-npi", re.compile(r'(?i)\bNPI[#:\s]+\d{10}\b')),
    ("phi-icd", re.compile(r'(?i)\b(?:ICD(?:-1[0-9])?[:\s]+)?[A-TV-Z]\d{2}(?:\.\d{1,4})?\b')),
    ("phi-dob", re.compile(
        r'(?i)\b(?:DOB|date\s+of\s+birth)[:\s]+\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b')),
]


def with_phi() -> List[Tuple[str, object]]:
    """Return the default PATTERNS PLUS the opt-in PHI shapes (MRN/NPI/ICD/DOB)."""
    return PATTERNS + _PHI_PATTERNS


def redact(text: Optional[str],
           patterns: Optional[List[Tuple[str, object]]] = None) -> Tuple[str, bool]:
    """Scrub *text* by replacing every match of each matcher with ``[REDACTED:<name>]``.

    Returns ``(scrubbed_text, was_redacted)``. ``redact(None)`` returns ``("", False)``.
    Matchers are applied sequentially over the running text. If one raises while
    evaluating, a :class:`RedactionError` is raised (FAIL-CLOSED — caller must not emit).
    """
    if text is None:
        return "", False
    if patterns is None:
        patterns = PATTERNS
    result = text
    was = False
    for name, pat in patterns:
        try:
            result, n = pat.subn(_MARKER % name, result)
        except Exception as exc:  # noqa: BLE001 -- any matcher failure is fail-closed
            raise RedactionError(
                "redaction pattern %r failed to evaluate: %s"
                % (name, type(exc).__name__)) from exc
        if n:
            was = True
    return result, was


_MARKER_RE = re.compile(r'\[REDACTED:[^\]]*\]')


def has_meaningful_content(text: Optional[str]) -> bool:
    """True if content remains once the ``[REDACTED:…]`` markers are stripped — i.e.
    the text was more than just a redacted secret."""
    if not text:
        return False
    return bool(_MARKER_RE.sub("", text).strip())
