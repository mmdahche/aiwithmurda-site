# VERIFY — Safe-Autonomy Guardrails

The checklist we ran before shipping this folder. Re-run it yourself — a guard
you haven't watched block something is decoration. Failures →
murad@aiwithmurda.com with the step number and your OS.

## 1. Folder integrity

- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra).
- [ ] `LICENSE`, `CHANGELOG.md`, `README.md`, `00-START-HERE.md` present.

## 2. Environment + install

- [ ] `python3 --version` prints 3.10+.
- [ ] `bash install/setup.sh` completes; `~/.guardrails/` contains `lib/`,
      `redaction-firewall/`, `local-agent-kit/`, `vault-index/`,
      `blueprints/`, `set-secret/`.
- [ ] Both hooks staged at `~/.claude/hooks/` and the settings entries merged
      from `install/hooks/settings.hooks.example.json`.

## 3. The engines' own test suites (shipped, run them)

pytest is the one tool you may need to install (the engines themselves need
nothing). On a modern managed Python, use a throwaway venv:

```bash
python3 -m venv /tmp/guardrails-venv && /tmp/guardrails-venv/bin/pip -q install pytest
cd ~/.guardrails
/tmp/guardrails-venv/bin/python -m pytest redaction-firewall/tests/ local-agent-kit/tests/ vault-index/tests/ -q
```

- [ ] All tests pass (118 at v1.0.0).

## 4. Firewall live-fire

- [ ] Scrub: `printf 'mail me at test@example.com' | ~/.guardrails/redaction-firewall/firewall.sh`
      returns the line with the email replaced.
- [ ] Gate-clean: `printf 'nothing sensitive' | ~/.guardrails/redaction-firewall/firewall.sh --check`
      → exit 0.
- [ ] Gate-dirty: pipe a fake-but-shaped token through `--check` → exit 1 and a
      pattern NAME (never the value) on stderr.
- [ ] Fail-closed: temporarily rename `~/.guardrails/lib/redact.py` and repeat
      the scrub → exit 2, no output. Rename it back.

## 5. Kit guards live-fire

- [ ] `~/.guardrails/local-agent-kit/kit.sh --guard-action delete` → exit 2.
- [ ] `~/.guardrails/local-agent-kit/kit.sh --guard-action delete --allow delete` → exit 0.
- [ ] `printf 'normal text' | ~/.guardrails/local-agent-kit/kit.sh --validate-input` → exit 0.
- [ ] `kit.sh --date` prints a fresh UTC date line (compare to your clock).

## 6. Hooks actually block (the step people skip)

- [ ] In a Claude Code session with the hooks wired, ask the agent to run
      `rm -rf /tmp/guardrails-test-dir` → the destructive-command guard warns
      before execution.
- [ ] Run `/freeze /tmp/frozen-scope` (create the dir first), then ask the
      agent to edit a file OUTSIDE it → the edit is denied with the freeze
      reason. `/unfreeze` clears it.

## 7. Vault index

- [ ] In any docs folder: `~/.guardrails/vault-index/vault.sh generate --root .`
      writes `VAULT-INDEX.md` with derived statuses.
- [ ] Delete an indexed file, run `validate` → `ORPHANED`, exit 1.
- [ ] `vault.sh log --root . --message "test entry" --author you` appends a
      scrubbed line to `SESSION-LOG.md`.

## 8. set-secret (validation paths only — no real key needed)

- [ ] Running with no `--file` errors cleanly with usage text.
- [ ] With a throwaway value on the clipboard and `--shape any --create
      --file /tmp/test.env --var TEST_VAR`: file created 600-permed, output
      shows only `...` + last 4 chars + length.

## Shipping record

- Verified by: the build pipeline's manifest/count/secret-scan checks
  (`scripts/verify-product-folder.mjs`) on every release build, plus the three
  engine test suites run green at packaging time.
- Clean-machine pass: v1.0.0 verified on macOS (Apple Silicon). Engines are
  cross-platform; hooks require Claude Code.
