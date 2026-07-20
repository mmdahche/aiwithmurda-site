# Changelog — $0 Research Engine

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably.

## 1.0.0 — 2026-07-14 — Launch edition

- `payload/research/` — the multi-source aggregator. Ten free-source clients
  (DuckDuckGo, Wikipedia, Hacker News, Reddit, arXiv, Semantic Scholar,
  OpenAlex, CrossRef, dev.to, Lobste.rs) behind one call. Egress allowlist
  enforced inside `HttpClient.get` (SSRF guard). Live-network gate
  (`RESEARCH_LIVE=1`, default OFF). Per-source failure isolation; hard 30 s
  overall budget; dedup by normalized URL. Redirect handler re-checks the
  allowlist + `https`-only rule on every 3xx hop (closes the CWE-918 SSRF
  bypass); response bodies are read with a 5 MiB per-request cap.
- `payload/web-fetch/` — the single-URL fetcher. `curl_cffi` (MIT) with a
  Chrome TLS / JA3 impersonation. Four gates: SSRF on the RESOLVED IP (v4
  and v6 deny ranges, incl. cloud-metadata `169.254.169.254`, CGNAT, NAT64,
  6to4, Teredo — every embedded-v4 tunnel is un-wrapped and re-classified);
  every redirect hop re-checked; live-network gate (`WEB_FETCH_LIVE=1`);
  size + timeout + redirect caps. `accept_encoding=""` disables
  auto-decompression so caps are enforced against wire bytes. Validated
  IPs pinned via CURLOPT_RESOLVE (closes the DNS-rebind TOCTOU window).
  HTTPS → HTTP downgrade redirects are refused. Optional
  `WEB_FETCH_OUT_DIR` confines `--out` paths.
- `payload/to-markdown/` — the doc → Markdown converter. Thin wrapper over
  `microsoft/markitdown` (MIT). Extension allowlist, 50 MiB size cap,
  zip-bomb + archive-traversal guard for `.docx` / `.pptx` / `.xlsx` /
  `.epub`. URL inputs are REFUSED (network egress lives in `/web-fetch`).
  `enable_plugins=False`; only `convert_stream` is called (no
  `convert_uri` / `convert_url`).
- Optional Safe-Autonomy Guardrails hook: every skill looks for
  `$GUARDRAILS_HOME/redaction-firewall/firewall.py` (or
  `~/.guardrails/redaction-firewall/firewall.py`). Present = the
  scrubber becomes the firewall's `guard()`, fail-closed. Absent = a
  passthrough scrubber + one-time stderr note; the SSRF / live / caps /
  isolation gates still hold. The firewall is NOT vendored — it ships in
  the Safe-Autonomy Guardrails pack (sold separately).
- Shipped tests (119 total: 39 research + 50 web-fetch + 30 to-markdown)
  drive the production code path against mocks; zero network calls
  regardless of the live gates. See `VERIFY.md` for the command.
- Install: `bash install/setup.sh` copies the three payloads to
  `~/.research-engine/` (override with `$RESEARCH_HOME`). Shell shims
  (`research.sh`, `web-fetch.sh`, `tomd.sh`) marked executable. Skill
  wrappers for Claude Code and Codex live under `install/claude-code/`
  and `install/codex/`.
- Runtime deps the buyer installs deliberately (nothing bundled):
  `pip install 'curl_cffi==0.7.4'` for `/web-fetch`,
  `pip install 'markitdown[pdf,docx,pptx,xlsx]==0.1.3'` for
  `/to-markdown`. `/research` is pure Python 3 stdlib.
- Worked example: `examples/one-question-fan-out.md` walks a full
  research → pick a URL → web-fetch → to-markdown pipeline.
