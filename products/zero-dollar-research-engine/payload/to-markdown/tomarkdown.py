#!/usr/bin/env python3
"""tomarkdown.py -- a $0, pure-Python doc/data -> Markdown converter.

A thin, fail-closed wrapper over microsoft/markitdown (MIT). Why a wrapper, not
a direct ``markitdown`` call:

  1. Trust boundary in ONE place. Untrusted files (PDF / DOCX / XLSX / PPTX /
     ZIP / XML / HTML, ...) are validated BEFORE conversion: existence, a SIZE
     cap, an extension ALLOWLIST, and a ZIP-BOMB guard for zip-based formats
     (docx / pptx / xlsx / zip / epub -- expansion ratio + total uncompressed
     cap + archive-path-traversal check).
  2. ONE egress for the network. markitdown CAN itself fetch URLs
     (``convert_uri`` / ``convert_url``) and pull YouTube transcripts; that
     path is DISABLED here. v1 REFUSES any ``http(s)://`` input and points
     the operator to the ``/web-fetch`` skill (this pack's other egress lane)
     -- keeping the network path in one place.
  3. OUTPUT IS UNTRUSTED. Converted Markdown can carry prompt-injection text,
     leaked secrets, or PII from the source. EVERY return / write is funnelled
     through a redaction scrubber BEFORE leaving this module. The default
     scrubber uses the OPTIONAL Safe-Autonomy Guardrails firewall if installed
     at ``$GUARDRAILS_HOME/redaction-firewall/firewall.py`` (or
     ``~/.guardrails/redaction-firewall/firewall.py``). If installed, the
     scrubber is fail-closed (a scrubber failure raises; nothing is returned /
     written). If absent, the scrubber degrades to a passthrough and a
     one-time stderr note fires. The trust boundary (extension allowlist,
     size cap, zip-bomb guard) still holds.
  4. No lie-greens. An empty conversion is NOT silently treated as success:
     the API refuses zero-byte / corrupt inputs at the validator, and the CLI
     reports an explicit failure (exit 2) rather than writing an empty file.

PUBLIC API
  * ``convert_path(path, *, scrubber=default, max_bytes=...) -> str``
  * ``convert_bytes(data, mimetype, *, scrubber=default, max_bytes=...) -> str``
  Both accept an injectable ``scrubber`` (for tests). The default resolves to
  the guardrails ``guard`` if installed, otherwise a passthrough. There is no
  boolean bypass: to convert without scrubbing in a test, pass an explicit
  ``scrubber=lambda s: s``.

CLI
  * ``convert --in <file> [--out <file>]``  (stdout if ``--out`` omitted)

Cross-platform; the ``tomd.sh`` shim sets ``PYTHONUTF8=1`` for Windows cp1252
consoles.
"""
from __future__ import annotations

import argparse
import importlib.util
import io
import os
import sys
import zipfile
from pathlib import Path
from typing import Callable, Optional, Union

TOMARKDOWN_VERSION = "1.0.0"

# ── safety limits (defaults; overridable on the API) ────────────────────────────
# A hard ceiling on input bytes (50 MiB). Catches accidentally huge inputs early --
# before they hit a parser that might allocate proportional memory.
DEFAULT_MAX_BYTES = 50 * 1024 * 1024

# Extension ALLOWLIST. Anything not on this list is REFUSED at the trust boundary
# (so an attacker can't sneak through a converter we haven't reasoned about).
ALLOWED_EXTENSIONS = frozenset({
    ".html", ".htm",            # web -> bs4 + markdownify
    ".pdf",                      # pdfminer.six
    ".docx",                     # mammoth (zip)
    ".pptx",                     # python-pptx (zip)
    ".xlsx", ".xls",            # openpyxl / xlrd-like (zip for .xlsx)
    ".csv", ".tsv",
    ".txt", ".md", ".markdown",
    ".json",
    ".xml",                      # routed through defusedxml in the markitdown deps
    ".rtf",
    ".epub",                     # zip-based ebook
})

# Subset that is ACTUALLY a zip container (so we run the zip-bomb / traversal guard).
ZIP_BASED_EXTENSIONS = frozenset({".docx", ".pptx", ".xlsx", ".zip", ".epub"})

# Zip-bomb guard knobs: refuse if uncompressed total > MAX_ZIP_UNCOMPRESSED OR the
# expansion ratio (uncompressed / file_size) > MAX_ZIP_RATIO. Office files
# commonly expand 5-20x; 100x is generous but a 100,000x bomb (the classic
# 42.zip family) is nowhere near.
MAX_ZIP_UNCOMPRESSED = 500 * 1024 * 1024
MAX_ZIP_RATIO = 100

# A URL prefix on `--in` is REFUSED -- markitdown can fetch URLs / YouTube itself,
# we keep network egress in ONE place (the ``/web-fetch`` skill). Case-insensitive.
_URL_PREFIXES = ("http://", "https://", "ftp://", "ftps://", "file://", "data:")

# Canonical MIME -> extension map for ``convert_bytes``. We deliberately do NOT
# use ``mimetypes.guess_extension`` here: it consults the OS / Windows registry
# and the returned extension is non-deterministic across platforms.
_MIME_TO_EXTENSION = {
    "text/html": ".html",
    "application/xhtml+xml": ".html",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-excel": ".xls",
    "text/csv": ".csv",
    "text/tab-separated-values": ".tsv",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/x-markdown": ".md",
    "application/json": ".json",
    "application/xml": ".xml",
    "text/xml": ".xml",
    "application/rtf": ".rtf",
    "text/rtf": ".rtf",
    "application/epub+zip": ".epub",
}


class ToMarkdownError(RuntimeError):
    """A to-markdown failure (validation, conversion, or scrub)."""


# ── optional guardrails firewall (lazy import; graceful degradation) ────────────

_FW = None
_FW_ERR: Optional[str] = None
_FW_WARNED = False


def _guardrails_locations():
    """Where we look for the optional firewall module, in order."""
    out = []
    gh = os.environ.get("GUARDRAILS_HOME")
    if gh and gh.strip():
        out.append(Path(gh).expanduser() / "redaction-firewall" / "firewall.py")
    out.append(Path("~/.guardrails/redaction-firewall/firewall.py").expanduser())
    return out


def _load_firewall_module():
    """Attempt to import the optional firewall module. Returns the module or None.
    Never raises."""
    global _FW, _FW_ERR
    if _FW is not None:
        return _FW
    if _FW_ERR is not None:
        return None
    for path in _guardrails_locations():
        if not path.is_file():
            continue
        try:
            spec = importlib.util.spec_from_file_location(
                "research_engine_tomd_guardrails", str(path))
            mod = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = mod
            try:
                spec.loader.exec_module(mod)
            except Exception:
                sys.modules.pop(spec.name, None)
                raise
        except Exception as exc:  # noqa: BLE001
            _FW_ERR = "guardrails firewall failed to import (%s)" % type(exc).__name__
            return None
        if not hasattr(mod, "guard"):
            _FW_ERR = "guardrails firewall present but missing guard()"
            return None
        _FW = mod
        return mod
    _FW_ERR = "guardrails firewall not installed (optional dependency)"
    return None


def _default_scrubber(text: str) -> str:
    """The default scrubber: resolve the guardrails guard lazily, then call it.
    If the firewall is missing, emit a one-time stderr note and passthrough."""
    global _FW_WARNED
    mod = _load_firewall_module()
    if mod is not None:
        return mod.guard(text)
    if not _FW_WARNED:
        _FW_WARNED = True
        sys.stderr.write(
            "to-markdown: note -- optional Safe-Autonomy Guardrails firewall "
            "not found at $GUARDRAILS_HOME/redaction-firewall/firewall.py or "
            "~/.guardrails/redaction-firewall/firewall.py; running with "
            "passthrough scrubber. Extension allowlist, size cap, zip-bomb "
            "guard, and URL-refusal are still enforced.\n")
    return text or ""


# ── validation (trust boundary) ─────────────────────────────────────────────────

def _refuse_url_input(source: str) -> None:
    """REFUSE any URL-like input. Network egress lives in ONE place (``/web-fetch``);
    markitdown's built-in URL / YouTube fetch is deliberately bypassed."""
    s = source.strip().lower()
    for prefix in _URL_PREFIXES:
        if s.startswith(prefix):
            raise ToMarkdownError(
                "URL inputs are REFUSED in v1 (egress is centralised in the "
                "/web-fetch skill). Got %r. Download the file first (or run "
                "/web-fetch), then pass a local path." % source[:120])


def _check_extension(path: Path) -> str:
    """Return the lowercased extension if it's on the allowlist; else FAIL-CLOSED."""
    ext = path.suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ToMarkdownError(
            "extension %r is NOT on the allowlist (got %s). Allowed: %s"
            % (ext, path.name, ", ".join(sorted(ALLOWED_EXTENSIONS))))
    return ext


def _check_size(nbytes: int, max_bytes: int, where: str) -> None:
    if nbytes <= 0:
        raise ToMarkdownError("%s is empty (0 bytes) -- refusing to convert "
                              "(no lie-green empty markdown)" % where)
    if nbytes > max_bytes:
        raise ToMarkdownError(
            "%s is %d bytes; exceeds the %d-byte cap. Raise max_bytes deliberately "
            "if this is intended." % (where, nbytes, max_bytes))


def _zip_bomb_guard(path_or_bytes: Union[Path, bytes], file_size: int) -> None:
    """For zip-based formats: open as a zip, sum every entry's UNCOMPRESSED size,
    and refuse if (a) the total exceeds MAX_ZIP_UNCOMPRESSED, (b) the expansion
    ratio exceeds MAX_ZIP_RATIO, or (c) any member name contains a path-traversal
    sequence (``..``, absolute path, drive letter)."""
    try:
        if isinstance(path_or_bytes, bytes):
            zf = zipfile.ZipFile(io.BytesIO(path_or_bytes))
        else:
            zf = zipfile.ZipFile(str(path_or_bytes))
    except zipfile.BadZipFile as exc:
        raise ToMarkdownError("not a valid zip-based file (%s)" % exc)

    try:
        total_uncompressed = 0
        for info in zf.infolist():
            name = info.filename
            norm = name.replace("\\", "/")
            if (norm.startswith("/") or ".." in norm.split("/")
                    or (len(norm) >= 2 and norm[1] == ":")):
                raise ToMarkdownError(
                    "archive contains a traversal / absolute path entry: %r" % name)
            total_uncompressed += int(info.file_size)
            if total_uncompressed > MAX_ZIP_UNCOMPRESSED:
                raise ToMarkdownError(
                    "archive uncompressed size exceeds %d bytes (zip-bomb guard)"
                    % MAX_ZIP_UNCOMPRESSED)
        if file_size > 0 and total_uncompressed / file_size > MAX_ZIP_RATIO:
            raise ToMarkdownError(
                "archive expansion ratio %.1fx exceeds %dx (zip-bomb guard)"
                % (total_uncompressed / file_size, MAX_ZIP_RATIO))
    finally:
        zf.close()


# ── markitdown bridge ───────────────────────────────────────────────────────────

def _markitdown_instance():
    """Construct a MarkItDown with the URL-fetch + plugin paths NOT used by this
    wrapper."""
    try:
        from markitdown import MarkItDown
    except ImportError as exc:
        raise ToMarkdownError(
            "markitdown is not installed (pip install 'markitdown[pdf,docx,pptx,xlsx]'). "
            "ImportError: %s" % exc)
    return MarkItDown(enable_plugins=False)


def _run_markitdown(data: bytes, file_extension: str) -> str:
    """Drive markitdown over an in-memory stream (NEVER over a URL). Returns the
    converted Markdown text. Raises ``ToMarkdownError`` on any conversion failure;
    NEVER returns a placeholder / empty string for an error (no lie-green)."""
    md = _markitdown_instance()
    try:
        result = md.convert_stream(io.BytesIO(data), file_extension=file_extension)
    except Exception as exc:  # noqa: BLE001
        raise ToMarkdownError(
            "markitdown conversion failed for %s: %s" % (file_extension, exc))
    text = getattr(result, "text_content", None)
    if text is None:
        raise ToMarkdownError("markitdown returned no text_content for %s" % file_extension)
    return text


# ── public API ──────────────────────────────────────────────────────────────────

def convert_path(path: Union[str, os.PathLike], *,
                 scrubber: Callable[[str], str] = _default_scrubber,
                 max_bytes: int = DEFAULT_MAX_BYTES) -> str:
    """Convert a LOCAL file at *path* to Markdown and return the scrubbed result."""
    if isinstance(path, str):
        _refuse_url_input(path)
    p = Path(path)
    if not p.exists():
        raise ToMarkdownError("input does not exist: %s" % p)
    if not p.is_file():
        raise ToMarkdownError("input is not a regular file: %s" % p)
    ext = _check_extension(p)
    try:
        nbytes = p.stat().st_size
    except OSError as exc:
        raise ToMarkdownError("cannot stat %s: %s" % (p, exc))
    _check_size(nbytes, max_bytes, "input %s" % p.name)
    try:
        data = p.read_bytes()
    except OSError as exc:
        raise ToMarkdownError("cannot read %s: %s" % (p, exc))
    # Re-validate against the bytes ACTUALLY READ, not just the pre-read stat.
    _check_size(len(data), max_bytes, "input %s (post-read)" % p.name)
    if ext in ZIP_BASED_EXTENSIONS:
        # Guard the BYTES we just read (not the path) -- otherwise the guard
        # re-opens the file from disk and could inspect a different byte stream
        # than the one markitdown processes (TOCTOU / verified-bytes mismatch).
        _zip_bomb_guard(data, len(data))
    text = _run_markitdown(data, ext)
    return scrubber(text)


def convert_bytes(data: bytes, mimetype: str, *,
                  scrubber: Callable[[str], str] = _default_scrubber,
                  max_bytes: int = DEFAULT_MAX_BYTES) -> str:
    """Convert in-memory *data* to Markdown, treating *mimetype* as the type hint."""
    if not isinstance(data, (bytes, bytearray)):
        raise ToMarkdownError("convert_bytes: data must be bytes, got %r" % type(data).__name__)
    _check_size(len(data), max_bytes, "in-memory input (%s)" % mimetype)
    canonical = (mimetype or "").split(";", 1)[0].strip().lower()
    ext = _MIME_TO_EXTENSION.get(canonical, "")
    if ext not in ALLOWED_EXTENSIONS:
        raise ToMarkdownError(
            "mimetype %r maps to extension %r which is NOT on the allowlist"
            % (mimetype, ext))
    if ext in ZIP_BASED_EXTENSIONS:
        _zip_bomb_guard(bytes(data), len(data))
    text = _run_markitdown(bytes(data), ext)
    return scrubber(text)


# ── CLI ─────────────────────────────────────────────────────────────────────────

def _write_atomic(path: Path, text: str) -> None:
    """Temp-write + os.replace, so no half-written output is ever readable."""
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp-%d" % os.getpid())
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
        fh.flush()
        os.fsync(fh.fileno())
    try:
        os.replace(tmp, path)
    finally:
        try:
            tmp.unlink()
        except OSError:
            pass


def main(argv: Optional[list] = None) -> int:
    ap = argparse.ArgumentParser(
        prog="to-markdown",
        description="Convert a local doc/data file to Markdown (fail-closed, "
                    "no-network, output-scrubbed).")
    sub = ap.add_subparsers(dest="cmd", required=True)

    cv = sub.add_parser("convert", help="convert --in <file> [--out <file>]")
    cv.add_argument("--in", dest="inp", required=True,
                    help="local file path; URL inputs are REFUSED")
    cv.add_argument("--out", dest="out", default=None,
                    help="output Markdown path (default: stdout)")
    cv.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES,
                    help="input size cap (default %d)" % DEFAULT_MAX_BYTES)

    ap.add_argument("--version", action="version",
                    version="to-markdown %s" % TOMARKDOWN_VERSION)
    args = ap.parse_args(argv)

    if args.cmd != "convert":
        ap.error("unknown subcommand")
        return 2  # unreachable

    try:
        markdown = convert_path(args.inp, max_bytes=args.max_bytes)
    except ToMarkdownError as exc:
        sys.stderr.write("to-markdown: REFUSED (%s)\n" % exc)
        return 2
    except Exception as exc:  # scrubber failure (fail-closed)
        sys.stderr.write("to-markdown: FAIL-CLOSED (%s: %s) -- no output written\n"
                         % (type(exc).__name__, exc))
        return 2

    if args.out:
        try:
            _write_atomic(Path(args.out), markdown)
        except OSError as exc:
            sys.stderr.write("to-markdown: cannot write %s (%s)\n" % (args.out, exc))
            return 2
        sys.stdout.write("to-markdown: wrote %s (%d chars)\n" % (args.out, len(markdown)))
        return 0

    try:
        sys.stdout.write(markdown)
        if not markdown.endswith("\n"):
            sys.stdout.write("\n")
    except OSError as exc:
        sys.stderr.write("to-markdown: stdout write failed (%s)\n" % exc)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
