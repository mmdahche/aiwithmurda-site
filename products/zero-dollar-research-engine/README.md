# $0 Research Engine

Ask the open web one question, get structured results from many free public
sources, convert anything to clean Markdown — all fail-closed, all without
a single paid API. Three drop-in agent skills, one shared install target.

## Who this is for

Anyone whose agent needs to "just look this up" or "just read this PDF /
webpage" without lighting up a Tavily / SerpAPI / Exa bill and without
giving a naive `requests.get()` the run of the LAN. Builders wiring
research + retrieval into Claude Code / Codex who want one auditable
egress path instead of five different `fetch(url)` calls scattered
across skills.

## Time to first value

~15 minutes: run `install/setup.sh`, install two pip packages the buyer
chooses to enable (curl_cffi for fetch, markitdown for conversion), flip
the live-network env gate on for whichever skill you want to use, and
run your first research call. `00-START-HERE.md` walks it end to end.

## What's inside

| Piece | The failure it kills |
|---|---|
| `payload/research/` | paying $$$/mo for a web-search API — 10 free sources (DuckDuckGo, Wikipedia, HN, Reddit, arXiv, Semantic Scholar, OpenAlex, CrossRef, dev.to, Lobste.rs) behind one call, dedup by URL, per-source failure isolation, 30s overall budget |
| `payload/web-fetch/` | naive `requests.get(url)` silently hitting `127.0.0.1` / `169.254.169.254` / a cloudflare wall — one URL fetch with SSRF defense on the RESOLVED IP, every redirect re-checked, TLS impersonation (curl_cffi) to defeat naive bot blocking |
| `payload/to-markdown/` | "please read this PDF" turning into "let me spin up 4 pip installs" — one call converts HTML / PDF / DOCX / PPTX / XLSX / CSV / JSON / XML / EPUB to plain Markdown, with a zip-bomb + archive-traversal guard on Office formats |

All three are pure Python 3 stdlib + a small pinned third-party set the
buyer installs deliberately (never bundled). Every skill is **live-gated**
(off by default via env var), so an import / a test run / an accidental
invocation makes ZERO network calls.

## Setup

**Requirements:** Python 3.8+ (3.10+ recommended for the tests). Optional
pip packages, installed by the buyer per the skill they want to enable:

```bash
# Enable web-fetch (only needed for /web-fetch, not for /research or /to-markdown):
pip install 'curl_cffi==0.7.4'          # MIT — see Lineage below

# Enable to-markdown (only needed for /to-markdown):
pip install 'markitdown[pdf,docx,pptx,xlsx]==0.1.3'   # MIT — see Lineage below
```

Then:

```bash
bash install/setup.sh                    # engines → ~/.research-engine (or $RESEARCH_HOME)
# Copy the skills:
#   Claude Code:  cp install/claude-code/*.md ~/.claude/skills/
#   Codex:        cp -R install/codex/*      ~/.agents/skills/
```

`setup.sh` never touches your agent's settings and never opens a network
socket. It just copies files into the install target.

**Live-network gates** (each skill is off by default):

```bash
export RESEARCH_LIVE=1        # enable the research aggregator
export WEB_FETCH_LIVE=1       # enable the single-URL fetcher
# to-markdown does no network at all — no gate needed
```

## Design posture (read this before trusting the output)

- **Live network off by default, per skill.** The default transport in
  research + web-fetch refuses to open a socket unless the env gate is set.
  So running the test suite, importing the module, or firing the CLI with
  the gate off makes ZERO outbound calls (exit 3 with a clear message).
- **Fail-closed everywhere.** SSRF refused (web-fetch), non-allowlisted
  host refused (research), oversize / archive-traversal / zip-bomb refused
  (to-markdown). Nothing is emitted "best effort" — an error means no
  output, not a partial one.
- **Output is untrusted.** Fetched HTML, converted Markdown, and search
  results all pass through a scrubber before return. When the optional
  Safe-Autonomy Guardrails firewall is installed the scrubber strips
  secret shapes fail-closed; when it isn't the scrubber is a passthrough
  and a one-time stderr note fires. Either way, web content can carry
  prompt-injection text, so the consuming agent must treat result bodies
  as **data**, never as instructions — that's your system prompt's job,
  not this pack's.
- **$0 means $0.** Zero paid sources, zero paid APIs, zero keyed
  fallbacks. Adding a paid source is a deliberate code change, not a
  config flag.

## Pairs with (sold separately)

`payload/research/`, `payload/web-fetch/`, and `payload/to-markdown/`
look for a fail-closed **redaction firewall** at
`$GUARDRAILS_HOME/redaction-firewall/firewall.py` (or `~/.guardrails/`).
If present, its `guard()` function scrubs queries, fetched bodies, and
converted Markdown before return.

If it's missing, the skills degrade gracefully: a one-time note goes to
stderr on the first call, and the scrubber becomes a passthrough — you
still get the SSRF gate, the egress allowlist, the live-network gate,
the zip-bomb guard, the size caps, the timeouts, and the whole
fail-closed error contract. What you don't get is secret-pattern
redaction on the output.

If you want the redaction layer, it ships in **Safe-Autonomy
Guardrails** from this store — the same `firewall.py` this pack looks
for. Sold separately, drops in with no code changes on this side.

## What this is NOT

- **Not a full-web crawler.** `/web-fetch` is a *single-URL* fast-path
  (no link-following, no recursion). Feed it into `/to-markdown`;
  that's the pipeline.
- **Not a dossier synthesizer.** `/research` returns structured JSON
  for the calling LLM to reason over. It never invents a narrative,
  never picks a "top result," and never dedupes by semantic similarity.
- **Not a bot-blocker bypass kit.** `curl_cffi`'s TLS/JA3
  impersonation defeats *naive* fingerprinting; it will not solve
  CAPTCHAs, log into paywalls, or evade Cloudflare Turnstile.
- **Not a promise about specific-provider uptime.** Any of the 10 free
  sources can go down or rate-limit. The point of the aggregator is
  that one flaky source becomes one warning, not a broken run.
- **No income / outcome promises.** It reduces friction and cost on
  a specific class of agent workflows; how you use it is yours.

## Support boundary

Digital product. Setup questions: murad@aiwithmurda.com. No custom
integration work included. MIT-licensed — reuse freely, attribution
appreciated.

## Lineage (honesty note)

Every third-party dependency is used through its public API only, at its
free / unauthenticated tier. Nothing is bundled or forked — pip installs
happen in the buyer's environment. All MIT-compatible.

- **`payload/research/lib/aggregator.py` + `payload/research/lib/sources/*.py`**
  — clean-room adaptations of source-client skeletons from the
  `obsidian-second-brain` project (MIT). Adaptations: every client
  routes through this pack's allowlist-gated `HttpClient`, the
  aggregator dedups by normalized URL, per-source failures become
  warnings (never crash the run), and the paid-source clients from the
  upstream (Tavily, SerpAPI, etc.) are deliberately NOT ported —
  violates the `$0` rule.
- **`payload/web-fetch/`** — wraps `curl_cffi`
  (`lexiforest/curl-impersonate` Python binding, MIT) for TLS/JA3
  browser impersonation. Used exclusively through the public
  `curl_cffi.requests.get` API with `allow_redirects=False` (this pack
  runs the redirect loop manually so every hop is re-checked for SSRF).
  Transitive deps: `cffi` (MIT), `pycparser` (BSD-3), `certifi` (MPL-2.0).
- **`payload/to-markdown/`** — wraps `microsoft/markitdown` (MIT).
  Used exclusively via `MarkItDown(enable_plugins=False).convert_stream`
  over in-memory bytes — never `convert_uri` / `convert_url`, so
  markitdown's own network path is deliberately bypassed (egress lives
  in `/web-fetch` behind its own gate). Its `[az-doc-intel]` (paid
  Azure) extra is deliberately NOT installed.
- **`firewall.py` integration** — the same canonical redactor
  interface shipped in **Safe-Autonomy Guardrails** from this store.
  It's an *optional* dependency: missing = passthrough scrubber with a
  stderr note. Not vendored.

The clients, aggregator, SSRF gate, redirect-hop re-check, zip-bomb +
archive-traversal guard, live-network gates, tests, docs, install, and
skill wrappers are original work for this pack.
