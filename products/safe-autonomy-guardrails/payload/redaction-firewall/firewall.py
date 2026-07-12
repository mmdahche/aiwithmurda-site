#!/usr/bin/env python3
"""firewall.py — the reusable, fail-closed egress redaction firewall.

What this is: a thin GUARD layer that lets ANY agent / tool / hook scrub secrets,
PII and (opt-in) PHI out of content **before it leaves a trust boundary** — a log
line, an OS notification, an off-box send, a memory write, a dashboard JSON. It
promotes a single canonical scrubber into a component every surface can call.

Guard layer — IMPORT-PINNED, NEVER FORKED. This firewall imports the canonical
redactor bundled with this product at ``lib/redact.py`` (the single source of
truth for what counts as a secret / PII / PHI). It does NOT copy or re-declare
any pattern — so there is exactly ONE place a pattern is ever defined or changed.
If ``lib/redact.py`` cannot be loaded, the firewall FAILS CLOSED (every guard
call raises) rather than silently letting un-scrubbed content through.

Profiles (a profile = which canonical pattern set is active):
  * ``default``      — secrets + PII (canonical ``PATTERNS``). The general egress guard.
  * ``phi``          — ``default`` PLUS the opt-in PHI shapes (canonical ``with_phi()``):
                       MRN / NPI / ICD / DOB. OFF unless a project explicitly asks for
                       it (most work is code, and labeled PHI shapes can false-positive
                       on prose).
  * ``secrets-only`` — secrets WITHOUT the PII shapes (email / SSN / credit-card).
                       For scanning *code/docs* where benign emails and long digit
                       runs would false-positive (matches the scanner preflight subset).
An unknown profile name is a FAIL-CLOSED error — it never degrades to "no patterns"
(which would pass everything through), and never silently picks a weaker set.

KNOWN LIMITATION (inherited verbatim from the canonical lib — static patterns only):
matches secrets/PII/PHI in their *literal* textual form. It does NOT catch
base64/hex/URL-encoded values, secrets inside serialized/compressed blobs, or
otherwise transformed strings. Treat redaction as a strong best-effort filter for
human-readable content, not a guarantee — callers must not feed encoded/serialized
credential blobs in.

CLI (so non-Python tools / shell pipelines / hooks can use it too):
  * filter (default): read stdin, write the SCRUBBED text to stdout.
        exit 0 = produced scrubbed output (whether or not anything was redacted)
        exit 2 = FAIL-CLOSED (redactor unavailable or a pattern failed) — stdout is
                 NOT trustworthy; the caller must drop it, not emit it.
  * --check: read stdin, emit nothing to stdout; decide whether content may leave AS-IS.
        exit 0 = clean (no secrets/PII/PHI found)
        exit 1 = secrets/PII/PHI present (advisory: scrub first or block) — pattern
                 NAMES only go to stderr, never the matched value
        exit 2 = FAIL-CLOSED
Profile selection on either mode: ``--profile NAME`` (``--phi`` is sugar for
``--profile phi``). PII is included by default for human content; pass
``--profile secrets-only`` when scanning code.

Pure stdlib (argparse, importlib, logging, re via the canonical lib, sys). No network,
no eval/exec, no third-party deps. Cross-platform (the shim sets PYTHONUTF8=1 for
Windows cp1252 consoles).
"""
from __future__ import annotations

import argparse
import importlib.util
import logging
import sys
from pathlib import Path
from typing import List, Optional, Tuple

FIREWALL_VERSION = "1.0.0"

logger = logging.getLogger("guardrails.redaction_firewall")

# Where the ONE canonical redactor lives, relative to this file in the bundled
# layout (payload/redaction-firewall/firewall.py -> payload/lib/redact.py). When
# ``redact.py`` is bundled alongside instead of at the sibling ``lib/`` path, the
# second resolution path (``import redact``) finds it. We deliberately do NOT
# support an arbitrary exec-from-env path (that would be an arbitrary-file-exec
# surface).
_HERE = Path(__file__).resolve().parent
_CANONICAL_PATH = _HERE.parent / "lib" / "redact.py"

# Secret-only subset (PII excluded). Mirrors the scanner preflight's secret-name set.
# Kept as a NAME set, not re-declared patterns — the patterns themselves stay canonical.
_SECRET_ONLY_NAMES = frozenset({
    "private-key-block", "age-secret-key", "github-token", "github-pat",
    "slack-token", "aws-access-key-id", "anthropic-key", "openai-key",
    "google-api-key", "jwt", "postgres-url", "bearer-token",
    "generic-secret-assignment",
})

VALID_PROFILES = ("default", "phi", "secrets-only")


class FirewallError(RuntimeError):
    """Firewall-level failure (canonical redactor unavailable, unknown profile).

    Distinct from the canonical ``RedactionError`` (a pattern failed to evaluate).
    Both are FAIL-CLOSED signals: the caller must NOT emit the content.
    """


# Lazily-loaded, cached canonical redactor module. Import failure is sticky so we
# don't retry a broken import on every call — and it always raises FirewallError.
_REDACTOR = None  # type: Optional[object]
_REDACTOR_ERR = None  # type: Optional[str]


def _load_redactor():
    """Import-pin to the canonical redactor. FAIL-CLOSED: raise if it can't be loaded
    or is missing the expected surface (so the firewall never runs without it)."""
    global _REDACTOR, _REDACTOR_ERR
    if _REDACTOR is not None:
        return _REDACTOR
    if _REDACTOR_ERR is not None:
        raise FirewallError(_REDACTOR_ERR)

    mod = None
    # 1) Canonical path in the bundled tree (the single source of truth). If the file
    #    exists but importing it raises, FAIL CLOSED — do not fall back to some other
    #    `redact` on sys.path that might not be the canonical one.
    if _CANONICAL_PATH.is_file():
        try:
            spec = importlib.util.spec_from_file_location("guardrails_redact_canonical",
                                                          str(_CANONICAL_PATH))
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
        except Exception as exc:  # noqa: BLE001 -- fail-closed on any import failure
            _REDACTOR_ERR = ("canonical redactor failed to import from %s: %s"
                             % (_CANONICAL_PATH, type(exc).__name__))
            raise FirewallError(_REDACTOR_ERR)
    else:
        # 2) Packaged layout: redact.py bundled alongside. Loaded via spec_from_file_location
        #    the module's own dir is NOT on sys.path, so add _HERE before the bare import so the
        #    bundled-alongside fallback actually resolves (audit PKG-1), then restore sys.path.
        here = str(_HERE)
        added = here not in sys.path
        if added:
            sys.path.insert(0, here)
        try:
            import redact as mod  # type: ignore
        except Exception:
            mod = None
        finally:
            if added:
                try:
                    sys.path.remove(here)
                except ValueError:
                    pass

    if mod is None or not all(hasattr(mod, a) for a in ("redact", "PATTERNS", "with_phi")):
        _REDACTOR_ERR = ("canonical redactor not found or incomplete (looked for %s, "
                         "then `import redact`); firewall fails closed" % _CANONICAL_PATH)
        raise FirewallError(_REDACTOR_ERR)

    _REDACTOR = mod
    return mod


def _patterns_for(profile: str) -> List[Tuple[str, "object"]]:
    """Resolve a profile NAME to its canonical pattern list. FAIL-CLOSED on unknown."""
    redactor = _load_redactor()
    if profile == "default":
        return list(redactor.PATTERNS)
    if profile == "phi":
        return list(redactor.with_phi())
    if profile == "secrets-only":
        return [(n, p) for (n, p) in redactor.PATTERNS if n in _SECRET_ONLY_NAMES]
    raise FirewallError(
        "unknown redaction profile %r (valid: %s); refusing to guess a weaker set"
        % (profile, ", ".join(VALID_PROFILES)))


# ── public guard API (importable by any Python agent/tool) ──────────────────────

def scrub(text: Optional[str], profile: str = "default") -> Tuple[str, bool]:
    """Scrub *text* through the canonical redactor for *profile*.

    Returns ``(scrubbed_text, was_redacted)``. Raises ``FirewallError`` if the
    redactor is unavailable or the profile is unknown, and propagates the canonical
    ``RedactionError`` if a pattern fails to evaluate — both FAIL-CLOSED (the caller
    must NOT emit *text*).
    """
    redactor = _load_redactor()
    return redactor.redact(text, patterns=_patterns_for(profile))


def guard(text: Optional[str], profile: str = "default") -> str:
    """Convenience: return ONLY the scrubbed text (drops the was_redacted flag).

    Fail-closed identically to :func:`scrub` — use this at an egress boundary when you
    just want the safe-to-emit string and want any failure to raise rather than leak.
    """
    scrubbed, _ = scrub(text, profile=profile)
    return scrubbed


def find_secrets(text: Optional[str], profile: str = "default") -> List[str]:
    """Return the NAMES of patterns that match *text* (never the matched values).

    Empty list = clean for *profile*. Fail-closed (raises) if scrubbing fails, so an
    error is never mistaken for "clean".
    """
    if not text:
        return []
    # Drive scrub() first so a pattern-evaluation failure FAILS CLOSED (raises) rather
    # than being silently skipped by the name re-scan below.
    _scrubbed, was = scrub(text, profile=profile)
    if not was:
        return []
    return [name for (name, pat) in _patterns_for(profile) if pat.search(text)]


def is_clean(text: Optional[str], profile: str = "default") -> bool:
    """True iff *text* carries no secrets/PII/PHI for *profile*. Fail-closed (raises)."""
    return not find_secrets(text, profile=profile)


def has_meaningful_content(text: Optional[str]) -> bool:
    """Re-exported from the canonical lib: True if content survives once redaction
    markers are stripped (i.e. it was more than just a secret)."""
    return _load_redactor().has_meaningful_content(text)


# ── CLI ─────────────────────────────────────────────────────────────────────────

def _enforce_utf8_stdio() -> None:
    """Make the CLI's stdin/stdout UTF-8 with STRICT decoding, regardless of how the
    process was launched.

    The firewall.sh shim already exports PYTHONUTF8=1, but a DIRECT ``python firewall.py``
    on a Windows cp1252 console would otherwise decode stdin as cp1252 — which (a) can
    leave a ``\\b``-anchored PII/PHI value (credit-card/SSN/PHI) un-scrubbed when it sits
    next to a byte that cp1252 maps to a word character, and (b) silently mangles
    non-ASCII content. We reconfigure to UTF-8 with ``errors='strict'`` so undecodable
    input RAISES (caught below → fail-closed exit 2) instead of being mangled — using
    ``errors='replace'`` would substitute U+FFFD and violate the fail-closed contract.
    """
    for stream in (sys.stdin, sys.stdout):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue  # non-text stream (e.g. already wrapped in a test) — read still fail-closes
        try:
            reconfigure(encoding="utf-8", errors="strict")
        except (ValueError, OSError):
            # Stream already detached / not reconfigurable. A later decode failure on
            # read still maps to fail-closed (exit 2); never silently proceed mangled.
            pass


def _read_stdin() -> str:
    """Read all of stdin. FAIL-CLOSED: a read/decode failure RAISES (mapped to exit 2)
    — an unreadable or undecodable stream must never be reported 'clean' or emitted.
    The message names only the failure class; the unreadable bytes are never echoed.
    """
    try:
        return sys.stdin.read()
    except Exception as exc:  # noqa: BLE001 -- decode/IO error → fail-closed, not empty
        raise FirewallError("stdin read failed: %s" % type(exc).__name__) from exc


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        prog="firewall",
        description="Fail-closed egress redaction firewall. Scrubs secrets/PII/PHI "
                    "from stdin via the canonical redactor bundled with this product.")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--filter", action="store_true",
                      help="(default) write the scrubbed text to stdout")
    mode.add_argument("--check", action="store_true",
                      help="emit nothing; exit 0=clean / 1=secrets present / 2=fail-closed")
    ap.add_argument("--profile", default="default", choices=VALID_PROFILES,
                    help="which canonical pattern set to apply (default: default)")
    ap.add_argument("--phi", action="store_true",
                    help="shorthand for --profile phi (opt-in PHI shapes)")
    ap.add_argument("--version", action="version",
                    version="redaction-firewall %s" % FIREWALL_VERSION)
    args = ap.parse_args(argv)

    profile = "phi" if args.phi else args.profile
    _enforce_utf8_stdio()

    # Read AND scan/scrub inside ONE try so a stdin read/decode failure (FirewallError)
    # maps to fail-closed exit 2 — never an uncaught traceback, never a false "clean".
    try:
        text = _read_stdin()
        if args.check:
            hits = find_secrets(text, profile=profile)
        else:
            scrubbed, _was = scrub(text, profile=profile)
    except Exception as exc:  # FirewallError (incl. stdin) + canonical RedactionError
        # Name only the failure class — never echo input.
        sys.stderr.write("firewall: FAIL-CLOSED (%s) — %s\n" % (
            type(exc).__name__,
            "cannot verify content; treat as unsafe" if args.check
            else "output suppressed; do NOT emit the input"))
        return 2

    if args.check:
        if hits:
            sys.stderr.write("firewall: content carries %d secret/PII/PHI pattern(s): %s "
                             "(profile '%s'). Scrub before emitting.\n"
                             % (len(hits), ", ".join(sorted(set(hits))), profile))
            return 1
        return 0

    sys.stdout.write(scrubbed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
