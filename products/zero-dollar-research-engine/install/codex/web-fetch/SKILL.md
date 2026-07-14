---
name: web-fetch
description: A $0 single-URL fetch fast-path for the research / scraping pipeline (its output feeds /to-markdown). NOT a crawler -- single URL, no link-following. Uses curl_cffi (lexiforest/curl-impersonate Python binding, MIT) for TLS / JA3 browser impersonation (defeats naive bot-blocking) with a thin security wrapper. Four gates -- SSRF on the RESOLVED IP (defeats DNS-rebind-to-internal; refuses every private / loopback / link-local / cloud-metadata / multicast / reserved / CGNAT / broadcast / IPv6 ULA / IPv4-mapped class), scheme http(s)-only, every redirect HOP re-checked against the same gate, and an OPTIONAL redaction scrubber (from the Safe-Autonomy Guardrails pack, sold separately) run over the body / url / headers before return. Live network OFF by default (WEB_FETCH_LIVE=1 gate). Fail-closed on every error -- no partial body ever returned.
allowed-tools: Read, Bash
---

# web-fetch -- single-URL fetch fast-path, SSRF-defended, fail-closed

A fetcher an agent can actually point at an arbitrary URL: one HTTP(S) request,
the resolved IP checked against every deny-range class, the redirect chain
re-checked on every hop, the body run through the optional redaction scrubber
before it leaves the skill. Live network is OFF by default.

The output is meant to feed the `/to-markdown` skill (which then converts the
HTML / data to Markdown behind its own trust boundary). This skill is not a
crawler -- it fetches exactly one URL, and only one.

## One command

| Command | What it does |
|---|---|
| `~/.research-engine/web-fetch/web-fetch.sh <url> [--out FILE]` | fetch `<url>`, scrub the body, write to `--out` (atomic) or stdout |
| `~/.research-engine/web-fetch/web-fetch.sh <url> --max-bytes N --timeout S --max-redirects N` | per-call safety caps |
| `~/.research-engine/web-fetch/web-fetch.sh <url> --impersonate chrome120` | pick the curl_cffi browser TLS / JA3 profile |

## The four security gates

1. **SSRF defense on the RESOLVED IP.** Scheme must be `http` or `https`. The
   hostname is resolved to ALL its IPs (IPv4 AND IPv6); every IP is classified
   against the deny ranges; a single hit REFUSES the fetch. Checking the
   *resolved IP* (not just the hostname text) defeats DNS-rebinding-to-internal
   -- `evil.example.com A 127.0.0.1` is REFUSED exactly like
   `http://127.0.0.1/` is.
2. **Redirect hops re-checked; no scheme downgrade.** The production transport
   runs with `allow_redirects=False`; `fetch()` runs the redirect loop
   manually, re-runs the FULL SSRF check on every `Location` target, and
   refuses an HTTPS -> HTTP downgrade redirect.
3. **Live network is OFF by default.** The production transport refuses to
   open a socket unless `WEB_FETCH_LIVE` is in `{"1","true","yes","on"}`. With
   the gate OFF, the CLI exits 3 and the API raises `LiveDisabledError`
   BEFORE any socket call (and BEFORE the lazy `import curl_cffi` is even
   reached).
4. **Optional scrub on output + hard caps.** If the Safe-Autonomy Guardrails
   pack is installed at `$GUARDRAILS_HOME/redaction-firewall/firewall.py`
   (or `~/.guardrails/redaction-firewall/firewall.py`), the fetched body --
   AND the returned URL, redirect chain, and headers -- are run through
   `guard()` fail-closed. Without it the scrubber is a passthrough with a
   one-time stderr note. Per-fetch SIZE cap (default 5 MiB) and TIMEOUT
   (default 20 s) are enforced inside the transport. `accept_encoding=""`
   disables auto-decompression so the SIZE cap protects against
   decompression bombs.

## Deny ranges (the SSRF gate)

Loopback, RFC 1918 private, link-local (incl. cloud-metadata `169.254.169.254`),
CGNAT, multicast, benchmark / TEST-NET, unspecified / broadcast / reserved,
IPv6 `::1` / `fc00::/7` / `fe80::/10` / `ff00::/8`, IPv4-mapped IPv6
(un-wrapped and re-checked), NAT64 (`64:ff9b::/96`), 6to4 (`2002::/16`), and
Teredo (`2001::/32`) -- the embedded v4 in each transition prefix is
extracted and re-classified. The validated IP is then PINNED into the
libcurl connection so it cannot re-resolve (closes the DNS-rebind TOCTOU
window, not just static rebind).

## CLI exit codes

| Exit | Meaning |
|---|---|
| 0 | scrubbed body on stdout (or written atomically to `--out`) |
| 2 | bad args (missing URL) |
| 3 | live-gate OFF (set `WEB_FETCH_LIVE=1`) |
| 4 | SSRF refused (scheme / resolved-IP / redirect-hop) |
| 5 | scrub failed (guardrails fail-closed, when installed) |
| 6 | transport / network / too-many-redirects failure |
| 7 | unknown failure |

## Runtime dep (buyer installs)

`pip install 'curl_cffi==0.7.4'` -- MIT-licensed
(`lexiforest/curl-impersonate` Python binding). Lazy-imported behind the
live gate so the test suite runs without it installed.

## Environment variables

| Var | Effect |
|---|---|
| `WEB_FETCH_LIVE` | `1`/`true`/`yes`/`on` enables real network calls (default OFF). |
| `WEB_FETCH_OUT_DIR` | If set, a `--out` path that resolves OUTSIDE this dir is refused (exit 2). Default unset = unrestricted. Defence against an agent acting on a prompt-injected absolute `--out`. |
| `GUARDRAILS_HOME` | Optional path to the Safe-Autonomy Guardrails pack. |

## When NOT to use

- You need to crawl a site -- this is single-URL only. Use two calls to walk
  a page (list -> pick a link -> fetch the linked URL).
- You need to POST / submit a form / carry a session cookie -- v1 is read-only
  HTTP GET.
- You need CAPTCHA solving or a Cloudflare Turnstile bypass -- `curl_cffi`'s
  TLS/JA3 impersonation defeats *naive* fingerprinting; it will not solve
  challenge-response walls.

## Related (this pack)

- `/research` -- the multi-source aggregator that returns URLs you might feed here.
- `/to-markdown` -- consumes the fetched body and produces clean Markdown.
