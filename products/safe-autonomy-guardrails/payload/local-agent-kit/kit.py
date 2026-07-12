#!/usr/bin/env python3
"""kit.py — local-agent-kit: the recurring local-agent pitfalls, as code.

A small/local model can act safely only behind a hardening layer. This module
turns each recurring pitfall of letting a model drive tools into a REUSABLE,
FAIL-CLOSED guard so the rule is enforced in code, not just written in a doc.
Any agent, tool, or hook can import these guards.

The guards (each maps to a specific pitfall):

  * **Date-per-call** — ``date_context(now=None)`` computes the current UTC date AT
    CALL TIME (an LLM has no clock); ``is_fresh()`` detects a date that was injected
    once at startup and went stale on a long-running daemon (fail-closed: unparseable
    => not fresh).
  * **Resolve-IDs-before-execute** — ``resolve_id(supplied, real_ids)`` fuzzy-matches a
    model-SUPPLIED id against the REAL set BEFORE acting and returns a real id ONLY on
    an auto-confidence match; a hallucinated/ambiguous id RAISES (never acted on). It
    REUSES the bundled fuzzy-matching module's ``resolve()`` (import-pinned, never
    forked) so there is one owner of the matching logic; fail-closed if it can't load.
  * **Separation of duties** — ``require_scope(held, needed)``: a READ token may not
    perform an ACT-scope operation and vice-versa (the two are never crossed).
  * **Irreversible-action lock** — ``guard_action(name)`` BLOCKS delete / send /
    mark-read / overwrite / drop / force-push in code (archive-only), unless the
    operator explicitly allow-lists the action ("OFF by default, allow-listed"
    posture). Policy alone is not enough.
  * **Token = identity** — ``read_token(env_var)`` loads a token from the ENV (not argv,
    not a repo file); ``check_token_file_mode(path)`` rejects a group/other-readable
    token file on POSIX (chmod 600); ``mask_token()`` NEVER returns the value. Tokens
    are never logged.
  * **Untrusted input** — ``Allowlist`` (hard, deny-by-default) + ``validate_input()``
    (reject control chars / over-length): anything typed at an agent is untrusted —
    allowlist it, validate it, and NEVER ``exec`` raw text. This module deliberately
    ships NO exec/eval helper.

All guards are FAIL-CLOSED: on any doubt they RAISE (or the CLI exits non-zero) rather
than letting an unsafe action proceed. Messages name the failure class / the offending
action — never a secret value and never raw untrusted content echoed verbatim.

Pure Python 3 stdlib (datetime, os, re, stat, sys, argparse, importlib, pathlib).
No network, no eval/exec, no third-party deps. Cross-platform (the kit.sh shim sets
PYTHONUTF8=1 for Windows cp1252 consoles).
"""
from __future__ import annotations

import argparse
import datetime
import importlib.util
import os
import re
import stat
import sys
import unicodedata
from pathlib import Path
from typing import Iterable, List, Optional

KIT_VERSION = "1.0.0"

_HERE = Path(__file__).resolve().parent


# ── errors (all FAIL-CLOSED signals; the caller must NOT proceed) ─────────────────

class KitError(RuntimeError):
    """Base for every local-agent-kit guard failure."""


class ResolveUnavailableError(KitError):
    """The bundled fuzzy-matching module could not be loaded (resolve_id fails closed)."""


class UnresolvedIDError(KitError):
    """A model-supplied id did not resolve to a real id with auto-confidence."""


class ScopeError(KitError):
    """A token's scope does not cover the requested operation (read/act never crossed)."""


class IrreversibleActionError(KitError):
    """An irreversible action was requested that is not operator-allow-listed."""


class TokenError(KitError):
    """A token is missing/empty, or its file is too permissively readable."""


class NotAllowedError(KitError):
    """A value is not on a hard allowlist (deny-by-default)."""


class UntrustedInputError(KitError):
    """Untrusted input failed structural validation (control chars / over-length / type)."""


# ── small helpers ────────────────────────────────────────────────────────────────

def _safe(value, limit: int = 60) -> str:
    """Render a possibly-untrusted value for a log/error message WITHOUT echoing it
    verbatim: strip control chars (log-injection / terminal-escape defense) and
    truncate. Never used on secrets — those are masked instead."""
    s = "" if value is None else str(value)
    # Strip C0 (0x00-0x1F), DEL, and C1 (0x7F-0x9F) controls. C1 includes U+009B (CSI),
    # the 8-bit terminal-escape introducer — leaving it in would defeat the defense.
    s = re.sub(r"[\x00-\x1f\x7f-\x9f]", "?", s)
    return s if len(s) <= limit else s[:limit] + "…"


def _norm(s: str) -> str:
    return " ".join(str(s).strip().lower().split())


# ── 1. date-per-call ─────────────────────────────────────────────────────────────

# A date injected ONCE at startup goes stale on a long-running daemon. is_fresh()
# rejects a generated_at older than this so a stale (startup-cached) date is caught.
STALE_AFTER_S = 900  # 15 minutes


def now_utc() -> datetime.datetime:
    """Timezone-aware current UTC time, read AT CALL TIME (never cached)."""
    return datetime.datetime.now(datetime.timezone.utc)


def date_context(now: Optional[datetime.datetime] = None) -> str:
    """A one-line, fresh-at-call-time date context for injection on EVERY model call.

    Pass *now* only in tests; in production it is read at call time so the value can
    never be a stale startup snapshot. The LLM has no clock — this is its clock.
    """
    n = now or now_utc()
    if n.tzinfo is None:
        n = n.replace(tzinfo=datetime.timezone.utc)
    n = n.astimezone(datetime.timezone.utc)
    return ("Current date (UTC): %s. Current time (UTC): %s."
            % (n.strftime("%Y-%m-%d"), n.strftime("%Y-%m-%dT%H:%M:%SZ")))


def is_fresh(generated_at, now: Optional[datetime.datetime] = None,
             max_age_s: float = STALE_AFTER_S) -> bool:
    """True iff *generated_at* (an ISO-8601 UTC string or aware datetime) is recent.

    FAIL-CLOSED: a future date beyond a small skew, an unparseable value, or an age
    over *max_age_s* all return False (treat the date as stale → recompute it). Use
    this to catch the "date injected at startup, now stale" pitfall.
    """
    n = (now or now_utc())
    if n.tzinfo is None:
        n = n.replace(tzinfo=datetime.timezone.utc)
    gen = _parse_iso(generated_at) if not isinstance(generated_at, datetime.datetime) else generated_at
    if gen is None:
        return False
    if gen.tzinfo is None:
        gen = gen.replace(tzinfo=datetime.timezone.utc)
    age = (n - gen).total_seconds()
    if age < -STALE_AFTER_S:          # dated into the future beyond tolerance → not trusted
        return False
    return age <= max_age_s


def _parse_iso(value) -> Optional[datetime.datetime]:
    if not isinstance(value, str) or not value.strip():
        return None
    txt = value.strip()
    txt = txt[:-1] + "+00:00" if txt.endswith("Z") else txt
    try:
        dt = datetime.datetime.fromisoformat(txt)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)


# ── 2. resolve-IDs-before-execute (reuses the bundled fuzzy-matching module) ─────

# The matching logic has ONE owner: the bundled fuzzy-matching module. The kit does
# NOT re-implement scoring — it imports the module's resolve() so there is a single
# place the behaviour is defined and tested. Loaded lazily (only resolve_id needs it)
# so the rest of the kit works even where the module is not bundled; fail-closed if a
# caller asks to resolve an id and the module cannot be loaded.
_FUZZY_PATH = _HERE.parent / "blueprints" / "fuzzy-matching" / "fuzzy_match.py"
_FUZZY = None        # cached module
_FUZZY_ERR = None    # sticky import error (don't retry a broken import every call)


def _load_fuzzy():
    global _FUZZY, _FUZZY_ERR
    if _FUZZY is not None:
        return _FUZZY
    if _FUZZY_ERR is not None:
        raise ResolveUnavailableError(_FUZZY_ERR)
    mod = None
    if _FUZZY_PATH.is_file():
        try:
            spec = importlib.util.spec_from_file_location("guardrails_fuzzy", str(_FUZZY_PATH))
            mod = importlib.util.module_from_spec(spec)
            # Register BEFORE exec_module: the fuzzy module uses @dataclass + `from __future__
            # import annotations`, and the dataclass machinery looks the module up in
            # sys.modules while building each class. Without this it fails with an AttributeError.
            sys.modules[spec.name] = mod
            try:
                spec.loader.exec_module(mod)
            except Exception:
                sys.modules.pop(spec.name, None)   # don't leave a half-initialized module
                raise
        except Exception as exc:  # noqa: BLE001 -- fail-closed on any import failure
            _FUZZY_ERR = ("bundled fuzzy-matching module failed to import from %s: %s"
                          % (_FUZZY_PATH, type(exc).__name__))
            raise ResolveUnavailableError(_FUZZY_ERR)
    else:
        # Packaged-alongside layout: fuzzy_match.py was bundled next to this module. When
        # loaded via spec_from_file_location the module's own dir is NOT on sys.path, so the
        # bare import would never resolve (audit PKG-1) — add _HERE before importing so the
        # documented "bundled alongside" fallback actually works, then restore sys.path.
        here = str(_HERE)
        added = here not in sys.path
        if added:
            sys.path.insert(0, here)
        try:
            import fuzzy_match as mod  # packaged-alongside layout
        except Exception:
            mod = None
        finally:
            if added:
                try:
                    sys.path.remove(here)
                except ValueError:
                    pass
    if mod is None or not hasattr(mod, "resolve"):
        _FUZZY_ERR = ("bundled fuzzy-matching module not found or incomplete (looked for %s, "
                      "then `import fuzzy_match`); resolve_id fails closed" % _FUZZY_PATH)
        raise ResolveUnavailableError(_FUZZY_ERR)
    _FUZZY = mod
    return mod


def try_resolve_id(supplied_id: str, real_ids: Iterable[str], **kwargs):
    """Return the fuzzy module's MatchResult for *supplied_id* against *real_ids*
    (tiers auto / review / unmatched). For callers that want to handle the review tier
    themselves."""
    return _load_fuzzy().resolve(supplied_id, list(real_ids), **kwargs)


def resolve_id(supplied_id: str, real_ids: Iterable[str], **kwargs) -> str:
    """Resolve a model-SUPPLIED id to a REAL one BEFORE acting on it.

    Returns the real id ONLY on an auto-confidence match (an exact normalized hit, or a
    score >= the module's auto threshold). A hallucinated/ambiguous id (review/unmatched
    tier) RAISES :class:`UnresolvedIDError` — it is NEVER acted on. Fail-closed if the
    matcher is unavailable (:class:`ResolveUnavailableError`). The error names the tier/
    score, not the surrounding content.
    """
    result = try_resolve_id(supplied_id, real_ids, **kwargs)
    if result.tier == "auto" and result.best is not None:
        return result.best
    raise UnresolvedIDError(
        "id %r did not resolve with auto-confidence (tier=%s score=%.2f); refusing to act"
        % (_safe(supplied_id), result.tier, result.score))


# ── 3. separation of duties (read-token vs act-token, never crossed) ──────────────

READ = "read"
ACT = "act"
SCOPES = (READ, ACT)


def require_scope(held: str, needed: str) -> None:
    """Assert that a token whose scope is *held* may perform a *needed*-scope op.

    READ and ACT are STRICTLY separate (least privilege): a read-token cannot act and
    an act-token is not used for reads. Any mismatch — or an unknown scope — RAISES
    :class:`ScopeError`.
    """
    if held not in SCOPES:
        raise ScopeError("unknown held scope %r (valid: %s)" % (_safe(held), ", ".join(SCOPES)))
    if needed not in SCOPES:
        raise ScopeError("unknown needed scope %r (valid: %s)" % (_safe(needed), ", ".join(SCOPES)))
    if held != needed:
        raise ScopeError("a %r token cannot perform a %r-scope operation "
                         "(read/act are never crossed)" % (held, needed))


def can_act(held: str) -> bool:
    """True iff *held* is the ACT scope. Pure predicate (does not raise)."""
    return held == ACT


# ── 4. irreversible-action lock (archive-only; allow-list to opt in) ──────────────

# Verb taxonomy: application-level companion to a shell destructive-command guard.
# guard_action covers app-level verbs (send / email / mark_read / publish) that a
# shell hook cannot see, and FAILS CLOSED (raises on any doubt) where a shell hook
# typically fails open (a shell hook must allow on parse errors to avoid deadlocking
# legitimate work).
#
# Forbidden in code (not just policy). Names are normalized (lower, spaces→_) so
# "Mark Read" / "mark-read" / "MARK_READ" all match. The operator opts an action back
# in explicitly via guard_action(..., allow=[...]) — the same "allow-listed opt-in"
# posture used elsewhere in the product.
IRREVERSIBLE_ACTIONS = frozenset({
    "delete", "destroy", "purge", "drop", "truncate", "wipe", "erase", "remove", "rm",
    "mark_read", "send", "send_email", "email", "overwrite", "force_push", "reset_hard",
    "unsubscribe", "deactivate", "revoke", "publish",
})
# Suggested reversible alternative shown in the error (archive-only discipline).
ARCHIVE_ALTERNATIVE = {
    "delete": "archive / soft-delete", "destroy": "archive", "purge": "archive",
    "drop": "rename-aside", "truncate": "snapshot-then-rewrite", "wipe": "archive",
    "erase": "archive", "remove": "archive", "rm": "move-to-trash / archive",
    "mark_read": "label only (leave unread)", "send": "save as draft",
    "send_email": "save as draft", "email": "save as draft",
    "overwrite": "write a new versioned copy", "force_push": "push to a branch + PR",
    "reset_hard": "stash / branch", "unsubscribe": "archive the request",
    "deactivate": "flag for operator", "revoke": "flag for operator",
    "publish": "publish to a staging / preview registry first",
}


def _norm_action(action: str) -> str:
    """Normalize an action name to a canonical ASCII key for the irreversible set.

    FAIL-CLOSED against Unicode/control-char bypasses (audit SEC-1): without NFKD,
    fullwidth 'ＤＥＬＥＴＥ' would str.lower() to fullwidth 'ｄｅｌｅｔｅ' (NOT ASCII 'delete')
    and slip past IRREVERSIBLE_ACTIONS; a null byte ('del\\x00ete') would survive
    whitespace-only collapsing. So: NFKD-fold compatibility forms → ASCII, drop any
    remaining non-ASCII, strip control chars (incl. NUL) → then lower + collapse
    whitespace/hyphens. Now every homoglyph/embedded-control variant of an irreversible
    verb maps onto the blocked ASCII form."""
    nfkd = unicodedata.normalize("NFKD", str(action))
    ascii_only = nfkd.encode("ascii", "ignore").decode("ascii")
    ascii_clean = _CONTROL_RE.sub("", ascii_only)   # strip NUL + other control chars
    return re.sub(r"[\s\-]+", "_", " ".join(ascii_clean.strip().lower().split()))


def is_irreversible(action: str) -> bool:
    """True iff *action* (normalized) is a known irreversible action."""
    return _norm_action(action) in IRREVERSIBLE_ACTIONS


def guard_action(action: str, allow: Iterable[str] = ()) -> str:
    """Permit *action* only if it is reversible OR explicitly operator-allow-listed.

    Returns the normalized action name when permitted. RAISES
    :class:`IrreversibleActionError` (with a reversible alternative) otherwise.
    Allow-listing is the deliberate opt-in for the rare action the operator has
    decided is safe.
    """
    norm = _norm_action(action)
    allowed = {_norm_action(a) for a in allow}
    if norm in allowed:
        return norm
    if norm in IRREVERSIBLE_ACTIONS:
        alt = ARCHIVE_ALTERNATIVE.get(norm, "an archive-only / reversible alternative")
        raise IrreversibleActionError(
            "irreversible action %r is blocked in code; use %s, or operator-allow-list it"
            % (_safe(action), alt))
    return norm


# ── 5. token = identity (env-loaded, mode-checked, never logged) ──────────────────

def read_token(env_var: str) -> str:
    """Load a token from the environment variable *env_var*. RAISES if unset/empty.

    Tokens come from the ENV (chmod-600 .env exported by the shell), never from argv
    (which leaks via the process table) or a committed file. The returned value is the
    caller's to use; never log it — use :func:`mask_token` in any message.
    """
    val = os.environ.get(env_var)
    if val is None or not val.strip():
        raise TokenError("token env var %s is unset or empty" % _safe(env_var))
    return val


def mask_token(token: Optional[str]) -> str:
    """A loggable stand-in that NEVER reveals the token value (only its length)."""
    if not token:
        return "<token:empty>"
    return "<token:redacted len=%d>" % len(token)


def check_token_file_mode(path) -> str:
    """Verify a token file is not group/other-readable.

    On POSIX: RAISES :class:`TokenError` if any group/other permission bit is set
    (the file must be chmod 600). On Windows: returns ``"skipped-windows"`` (POSIX
    mode bits are not meaningful there — use an NTFS ACL / DPAPI instead). Returns
    ``"ok"`` when the mode is tight.
    """
    p = Path(path)
    if not p.is_file():
        raise TokenError("token file not found: %s" % _safe(str(p)))
    if os.name == "nt":
        return "skipped-windows"
    mode = stat.S_IMODE(p.stat().st_mode)
    if mode & 0o077:
        raise TokenError("token file %s is group/other-accessible (mode %o); chmod 600"
                         % (_safe(str(p)), mode))
    return "ok"


# ── 6. untrusted input: hard allowlist + structural validation ────────────────────

MAX_INPUT_LEN = 4096
# Control chars are rejected EXCEPT tab/newline/carriage-return. The range covers
# C0 (0x00-0x1F minus HT/LF/CR), DEL (0x7F), AND C1 (0x80-0x9F) — C1 includes U+009B
# (CSI), the 8-bit terminal-escape introducer, so omitting it would let an escape
# payload through. Blocks terminal-escape + log-injection in untrusted text.
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")


class Allowlist:
    """A hard, deny-by-default allowlist of permitted values (tools, commands, users).

    Anything not explicitly listed is rejected. There is intentionally no wildcard and
    no "deny-list" mode — deny-by-default is the only safe posture for untrusted input.
    """

    def __init__(self, items: Iterable[str]):
        self._items = frozenset(items)

    def __contains__(self, item) -> bool:
        return item in self._items

    def is_allowed(self, item) -> bool:
        return item in self._items

    def require_allowed(self, item) -> str:
        """Return *item* if allowed; RAISE :class:`NotAllowedError` otherwise."""
        if item not in self._items:
            raise NotAllowedError("%r is not on the allowlist (deny-by-default)" % _safe(item))
        return item

    @property
    def items(self):
        return sorted(self._items)


def validate_input(text, max_len: int = MAX_INPUT_LEN, allow_newlines: bool = True) -> str:
    """Structurally validate untrusted input. Returns it unchanged when valid; RAISES
    :class:`UntrustedInputError` otherwise (wrong type, over-length, control chars,
    or — when *allow_newlines* is False — embedded newlines).

    This is a STRUCTURAL gate, not a shell escaper: validated text is still untrusted
    data, never a command. The kit ships no exec helper on purpose — never ``exec`` raw
    text; route it through an allowlist + a typed handler instead.
    """
    if not isinstance(text, str):
        raise UntrustedInputError("input must be a string, got %s" % type(text).__name__)
    if len(text) > max_len:
        raise UntrustedInputError("input exceeds max length %d (was %d)" % (max_len, len(text)))
    if _CONTROL_RE.search(text):
        raise UntrustedInputError("input contains disallowed control characters")
    if not allow_newlines and ("\n" in text or "\r" in text):
        raise UntrustedInputError("newlines are not allowed in this input")
    return text


# ── CLI (so shell hooks / non-Python tools can use the guards) ───────────────────

def _enforce_utf8_stdio() -> None:
    """Force UTF-8 strict stdio so an undecodable stdin FAILS rather than mangling
    (same fail-closed stance as the redaction-firewall CLI)."""
    for stream in (sys.stdin, sys.stdout):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="strict")
        except (ValueError, OSError):
            pass


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        prog="kit",
        description="local-agent-kit guards for shell hooks. Each mode is FAIL-CLOSED "
                    "(exit 2 = blocked/invalid).")
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--date", action="store_true",
                      help="print a fresh UTC date-context line (inject on every model call)")
    mode.add_argument("--validate-input", action="store_true",
                      help="read stdin; exit 0=valid / 2=invalid (input never echoed)")
    mode.add_argument("--guard-action", metavar="ACTION",
                      help="exit 0 if reversible / 2 if irreversible (archive-only)")
    ap.add_argument("--allow", action="append", default=[],
                    help="(with --guard-action) operator-allow-list this action name")
    ap.add_argument("--max-len", type=int, default=MAX_INPUT_LEN,
                    help="(with --validate-input) max accepted length")
    ap.add_argument("--no-newlines", action="store_true",
                    help="(with --validate-input) reject embedded newlines")
    ap.add_argument("--version", action="version", version="local-agent-kit %s" % KIT_VERSION)
    args = ap.parse_args(argv)

    if args.date:
        sys.stdout.write(date_context() + "\n")
        return 0

    if args.guard_action is not None:
        try:
            guard_action(args.guard_action, allow=args.allow)
        except IrreversibleActionError as exc:
            sys.stderr.write("kit: BLOCKED — %s\n" % exc)
            return 2
        return 0

    # --validate-input
    _enforce_utf8_stdio()
    try:
        text = sys.stdin.read()
    except Exception as exc:  # noqa: BLE001 -- undecodable/IO → fail-closed
        sys.stderr.write("kit: INVALID — stdin read failed (%s)\n" % type(exc).__name__)
        return 2
    try:
        validate_input(text, max_len=args.max_len, allow_newlines=not args.no_newlines)
    except UntrustedInputError as exc:
        sys.stderr.write("kit: INVALID — %s\n" % exc)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
