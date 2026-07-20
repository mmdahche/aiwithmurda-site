# VERIFY — $0 Research Engine

The checklist we ran before shipping this folder. Re-run it yourself — an
unverified fetcher is a liability. Failures → murad@aiwithmurda.com with
the step number.

## 1. Folder integrity

- [ ] `LICENSE` (MIT), `CHANGELOG.md`, `README.md`, `00-START-HERE.md`,
      `VERIFY.md` present at the root.
- [ ] `install/setup.sh`, `install/claude-code/{research,web-fetch,to-markdown}.md`,
      and `install/codex/{research,web-fetch,to-markdown}/SKILL.md` all exist.
- [ ] `payload/{research,web-fetch,to-markdown}/` each contain their `.py`
      module, their `.sh` shim, and a `tests/` folder.
- [ ] `examples/one-question-fan-out.md` exists.

## 2. Shell shims are syntactically clean and executable

```bash
bash -n install/setup.sh \
  && bash -n payload/research/research.sh \
  && bash -n payload/web-fetch/web-fetch.sh \
  && bash -n payload/to-markdown/tomd.sh \
  && echo OK
```

- [ ] All four scripts pass `bash -n`.
- [ ] `ls -l payload/*/*.sh` shows the `x` bit set (re-run
      `chmod +x payload/*/*.sh` if it was stripped during transport).

## 3. Shipped tests pass from the new location (the load-bearing check)

Nothing here needs the internet — mocks cover every path.

```bash
# One-time: a throwaway venv with pytest + the two optional pip deps
# to-markdown needs. `/research` and `/web-fetch` tests run without them.
python3 -m venv /tmp/rre-venv
/tmp/rre-venv/bin/pip install --quiet --upgrade pip pytest
/tmp/rre-venv/bin/pip install --quiet 'markitdown[pdf,docx,pptx,xlsx]==0.1.3'
# (Optional; unlocks the /to-markdown PDF fixture:)
/tmp/rre-venv/bin/pip install --quiet reportlab

# Run each suite from the new location:
( cd payload/research    && /tmp/rre-venv/bin/pytest tests/ )
( cd payload/web-fetch   && /tmp/rre-venv/bin/pytest tests/ )
( cd payload/to-markdown && /tmp/rre-venv/bin/pytest tests/ )
```

- [ ] research: 39 passed.
- [ ] web-fetch: 50 passed.
- [ ] to-markdown: 30 passed (all reportlab-optional tests skip if that dep
      is missing).

## 4. No-network smoke of every CLI entrypoint

`--help` must exit 0 and never touch the network:

```bash
python3 payload/research/research.py --help    | head -3
python3 payload/web-fetch/web_fetch.py --help   | head -3
python3 payload/to-markdown/tomarkdown.py --help | head -3
```

- [ ] All three print usage and exit 0.

The live-gate refusal must fire without env vars set. Use a literal-IP URL
so DNS restrictions on a sandboxed CI runner cannot mask the assertion:

```bash
env -u RESEARCH_LIVE  python3 payload/research/research.py "smoke topic" ; echo "exit=$?"
env -u WEB_FETCH_LIVE python3 payload/web-fetch/web_fetch.py https://93.184.216.34/ ; echo "exit=$?"
```

- [ ] research prints `live research disabled …` and exits **3**.
- [ ] web-fetch prints `live web-fetch disabled …` and exits **3**.

SSRF refusals fire without any env vars:

```bash
python3 payload/web-fetch/web_fetch.py http://127.0.0.1/           ; echo "exit=$?"
python3 payload/web-fetch/web_fetch.py http://169.254.169.254/x   ; echo "exit=$?"
python3 payload/web-fetch/web_fetch.py file:///etc/passwd          ; echo "exit=$?"
```

- [ ] All three print `SSRF refused …` and exit **4**.

## 5. Install script produces the expected on-disk layout

```bash
RESEARCH_HOME=/tmp/re-install bash install/setup.sh
find /tmp/re-install -maxdepth 2 -type d
ls -l /tmp/re-install/research/research.sh \
      /tmp/re-install/web-fetch/web-fetch.sh \
      /tmp/re-install/to-markdown/tomd.sh
```

- [ ] Three skill directories exist under `/tmp/re-install/`.
- [ ] All three shim scripts have the `x` bit.

## 6. Optional guardrails seam works both ways

With no firewall installed, the default scrubber is a passthrough and a
one-time stderr note fires. Reset the `_FW*` module state between runs via
the tests — the shipped `test_guardrails_absent_default_scrubber_is_passthrough`
and `test_guardrails_present_default_scrubber_is_the_guard` tests (research)
plus their web-fetch / to-markdown twins cover both branches. Confirm they
appear in the pass list from step 3.

## Shipping record

- Verified by: the three shipped test suites, `bash -n` on every `.sh`, and
  the no-network CLI smokes above.
- Clean-machine pass: v1.0.0 verified on macOS (Apple Silicon), Python 3.14;
  the Codex layout mirrors the Claude Code layout byte-for-byte in the skill
  files.
