---
name: to-markdown
description: A $0, pure-Python doc/data -> Markdown converter -- a thin, fail-closed wrapper over microsoft/markitdown (MIT). Single trust boundary (size cap + extension allowlist + zip-bomb / archive-traversal guard for zip-based formats) and an OPTIONAL redaction scrubber (from the Safe-Autonomy Guardrails pack, sold separately) run over the output before it leaves the skill. Zero network -- URL inputs are REFUSED and pointed to the /web-fetch skill (egress in ONE place). markitdown's own URL / YouTube / plugin paths are deliberately bypassed.
allowed-tools: Read, Bash
---

# to-markdown -- doc/data -> Markdown, fail-closed, no network

A converter agents can actually trust: it turns the messy real world (HTML,
PDF, DOCX, PPTX, XLSX, CSV, JSON, XML, EPUB, ...) into plain Markdown an LLM
can read, with the trust boundary held in ONE place and the output run through
the optional redaction scrubber before it leaves the skill.

## One command

| Command | What it does |
|---|---|
| `~/.research-engine/to-markdown/tomd.sh convert --in <file> [--out <file>]` | parse `<file>` -> Markdown to `--out` (atomic) or stdout |

## The four gates

The trust boundary is checked BEFORE markitdown is ever invoked, and the output
is scrubbed AFTER. If any step fails, NOTHING is returned / written:

1. **URL inputs are REFUSED** (`http://`, `https://`, `ftp(s)://`, `file://`,
   `data:`). Network egress is centralised in the `/web-fetch` skill --
   markitdown's own URL / YouTube fetch is deliberately bypassed (this
   wrapper only calls `convert_stream`, never `convert_uri` /
   `convert_url`; `enable_plugins=False`).
2. **Existence + regular-file + extension allowlist + size cap** (default
   50 MiB). Anything off the allowlist is REFUSED (an attacker can't sneak
   through a converter we haven't reasoned about).
3. **Zip-bomb + archive-traversal guard** for zip-based formats (`.docx`,
   `.pptx`, `.xlsx`, `.epub`): refuse if the sum of central-directory
   `file_size` values exceeds 500 MiB OR the expansion ratio exceeds 100x,
   OR any entry name contains `..` / an absolute path / a drive letter. Raw
   `.zip` is deliberately off-allowlist in v1.
4. **Optional output scrubber.** If the Safe-Autonomy Guardrails pack is
   installed at `$GUARDRAILS_HOME/redaction-firewall/firewall.py` (or
   `~/.guardrails/redaction-firewall/firewall.py`), the Markdown output is
   run through its `guard()` fail-closed. Without it the scrubber is a
   passthrough with a one-time stderr note; the other three gates still hold.

## Runtime dep (buyer installs)

`pip install 'markitdown[pdf,docx,pptx,xlsx]==0.1.3'` -- MIT-licensed
(microsoft/markitdown). The Azure Document Intelligence extra
(`markitdown[az-doc-intel]`) is deliberately NOT installed -- it's paid, so
violates the `$0` rule of this pack.

## Scanned / image documents (no text layer)

A scanned PDF or an image-only PDF has no text layer -- markitdown extracts
nothing, so `/to-markdown` returns (correctly, per fail-closed) an empty or
near-empty `.md`. That is not a bug; OCR is deliberately excluded from the
pinned core (heavy + would complicate the hardened pipeline).

**Opt-in LOCAL OCR pre-pass (NOT part of this skill's deps).** If you have
`ocrmypdf` or similar installed:

```bash
ocrmypdf --skip-text scanned.pdf ocr.pdf   # adds a searchable text layer, offline
~/.research-engine/to-markdown/tomd.sh convert --in ocr.pdf
```

**Security posture is preserved:** the OCR step must be local / offline
only -- never a cloud OCR API, which would breach the `$0` + no-network
guarantees.

## Allowed extensions

`.html`, `.htm`, `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.xls`, `.csv`, `.tsv`,
`.txt`, `.md`, `.markdown`, `.json`, `.xml`, `.rtf`, `.epub`.

## Exit codes

| Exit | Meaning |
|---|---|
| 0 | Markdown on stdout (or written atomically to `--out`) |
| 2 | validation / conversion / scrub failure -- NOTHING written |

## When NOT to use

- You need to fetch a URL first -- use `/web-fetch` and pipe its output.
- You need OCR on a scanned PDF -- run an offline OCR pass first (see above),
  never a cloud OCR API.
- You need YouTube transcript extraction -- deliberately out of scope
  (markitdown supports it, but the network path is turned OFF here).

## Related (this pack)

- `/research` -- the multi-source aggregator that returns URLs.
- `/web-fetch` -- fetches a single URL's body for this skill to convert.
