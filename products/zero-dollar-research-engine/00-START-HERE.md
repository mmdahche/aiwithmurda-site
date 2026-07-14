# START HERE — $0 Research Engine

You bought three drop-in agent skills that turn "please look this up on
the web" from a $50/month API line item into a fail-closed pipeline
running against ten free public sources — with a single-URL fetcher that
survives naive bot blocking, and a doc converter that turns almost
anything into clean Markdown.

Nothing here phones home on install. Every network-capable skill is
off by default (live-gated via env var) so an accidental `import` or a
`pytest -q` makes ZERO outbound calls.

## Your first win in 3 steps (~15 minutes)

1. **Install the engines:** `bash install/setup.sh` — copies the three
   payloads into `~/.research-engine/` (override with `$RESEARCH_HOME`)
   and marks the shell shims executable. Doesn't touch your agent's
   settings, doesn't open a socket.
2. **Install the pip dep for the skill you want first**
   (one line each, buyer's choice — nothing is bundled):
   ```bash
   pip install 'markitdown[pdf,docx,pptx,xlsx]==0.1.3'   # for /to-markdown
   pip install 'curl_cffi==0.7.4'                        # for /web-fetch
   # /research needs no third-party deps — pure stdlib
   ```
3. **Fire the aggregator once (no network — the gate is off):**
   ```bash
   ~/.research-engine/research/research.sh "how does pgvector work"
   # exit 3 with a clear "live research disabled" message — this is correct.
   # Then enable it deliberately and try again:
   RESEARCH_LIVE=1 ~/.research-engine/research/research.sh "how does pgvector work" | head -60
   ```

Then skim `examples/one-question-fan-out.md` for a worked pipeline
(research → pick a URL → web-fetch → to-markdown) and run `VERIFY.md`
end to end.

## What's inside (the one-line map)

- `payload/research/` — 10-source aggregator (DuckDuckGo, Wikipedia,
  HN, Reddit, arXiv, Semantic Scholar, OpenAlex, CrossRef, dev.to,
  Lobste.rs) behind one call. Egress allowlist + live gate + optional
  scrubber. Pure stdlib, no pip deps.
- `payload/web-fetch/` — single-URL HTTP(S) fetcher over `curl_cffi`
  with SSRF defense on the RESOLVED IP (defeats DNS-rebind), every
  redirect hop re-checked (https → http downgrade redirects refused),
  TLS impersonation to survive naive bot walls, size + timeout +
  redirect-count caps, optional scrubber on body / url / headers.
- `payload/to-markdown/` — doc/data → Markdown via `microsoft/markitdown`
  with extension allowlist, 50 MiB size cap, and a zip-bomb +
  archive-traversal guard for Office / EPUB.
- `install/setup.sh` — copies payload → `~/.research-engine`, chmods
  the shims. Doesn't wire skills into your agent (that's the next
  step, deliberately manual).
- `install/claude-code/` + `install/codex/` — three drop-in skill
  wrappers (`research`, `web-fetch`, `to-markdown`) in both layouts.
- `examples/one-question-fan-out.md` — a worked pipeline, end to end.
- `VERIFY.md` — the checklist we ran before shipping; re-run it.

## The one rule

An unverified fetcher is a liability. Run every checkbox in `VERIFY.md`
once — including watching `RESEARCH_LIVE` unset make the aggregator
refuse, and watching the SSRF gate refuse `http://127.0.0.1/`, and
watching `to-markdown` refuse a `.zip` file — before you point any of
these three at real production traffic.
