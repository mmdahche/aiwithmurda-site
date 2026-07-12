---
name: vault-index
description: Thin master-index generator/validator + append-only session log for a human-readable doc vault. Agents read the MAP (one line + a date per doc), not the whole corpus. `generate` scans the vault into a master index whose freshness is DERIVED from each doc's last-updated date (it can't lie fresh); `validate` flags missing/orphaned/stale/undated docs so the index stays correct-on-contact; `log` appends a timestamped, fail-closed-redaction-scrubbed entry to an append-only session log (secrets never enter the committed vault). $0, pure stdlib, cross-platform.
---

# vault-index — the thin-index brain for your doc vault

Your vault is the canonical **source of truth**: human-readable markdown (project
state, per-module specs, an append-only session log). Agents read a **thin master
index** — one line of purpose + a last-updated date per doc — and open only what
they need (cheap context). This tool keeps that map honest.

Installed location (via this pack's setup.sh): `~/.guardrails/vault-index/`.

## Three commands

| Command | What it does |
|---|---|
| `generate` | scan the vault → write `VAULT-INDEX.md` (every doc: purpose · last-updated · **derived** status) |
| `validate` | compare the index vs disk → flag `MISSING` / `ORPHANED` / `STALE` / `UNDATED` (exit 1 on drift) |
| `log` | append a timestamped, **scrubbed** entry to the append-only `SESSION-LOG.md` |

## Cannot lie fresh

A doc's status is **derived from `now − **Last updated:**`** (an age), never a
self-reported label. `FRESH` (≤14d) · `RECENT` (≤90d) · `STALE` (>90d, date your
facts) · `UNDATED` (no header → treat as stale). A doc that stops being updated
ages itself out; the index can't claim otherwise.

## Correct on contact

`validate` is how the index stays trustworthy: a new doc not yet indexed →
`MISSING`; an indexed doc deleted on disk → `ORPHANED`; an old doc → `STALE`; a
doc with no `**Last updated:**` header → `UNDATED`. Run it at session end;
regenerate / date the facts. The generated index is marked "do not hand-edit" —
regenerate instead.

### Stop-hook (advisory, one line)

Wire `validate --summary` as a Claude Code Stop-hook so drift surfaces at the end
of every turn without spamming (one count line, not one per finding). Copy the
pack's `settings.snippet.json` into your `settings.json`, replacing the two
placeholder paths:

```sh
~/.guardrails/vault-index/vault.sh validate --root . --summary
# vault-index: DRIFT — 7 issue(s): 1 NO-INDEX, 4 MISSING, 1 STALE, 1 UNDATED
```

Advisory by default (`|| true` — never blocks the session); drop the `|| true`
to make it blocking.

## Secrets never enter the vault

`log` runs each message through the **redaction-firewall** (`guard`, fail-closed)
before appending. If the scrub fails, **nothing is written** (exit 2) — a secret
never lands in a committed doc. The log is **append-only**: it opens in append
mode and never rewrites history.

## Usage

```sh
~/.guardrails/vault-index/vault.sh generate --root .    # write VAULT-INDEX.md
~/.guardrails/vault-index/vault.sh validate --root .    # exit 1 if the index drifted
~/.guardrails/vault-index/vault.sh log --root . --message "shipped the import fix" --author you
```

Library API: `vault_index.scan_vault(root)`, `render_index(records)`,
`validate(root, index)`, `append_session_log(log, message, author=…)` (all accept
an injectable `now=` for deterministic use; `append_session_log` accepts an
injectable `scrubber=`).

## Scope

Defaults to vault docs: `*.md` at the root + `specs/*.md` + `docs/*.md`,
excluding code/reference trees (`.git`, `node_modules`, build output, …). All
overridable. Generic — no project paths hardcoded.
