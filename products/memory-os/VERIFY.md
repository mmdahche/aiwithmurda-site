# VERIFY — Memory OS

The checklist we ran before shipping this folder. Re-run it yourself over
your first week — this product's claims are behavioral, so the verification
is too. Failures → murad@aiwithmurda.com with the step number.

## 1. Folder integrity

- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra).
- [ ] `LICENSE`, `CHANGELOG.md`, `README.md`, `00-START-HERE.md` present.
- [ ] Every template's bracketed fill-ins are clearly marked (nothing looks
      pre-filled with someone else's identity — this is the de-personalized
      edition, and shipping anyone's actual soul would be a defect).

## 2. Install

- [ ] SOUL.md filled and placed; AGENTS addon merged into your workspace
      contract; `MEMORY.md`, `memory/`, `handoffs/` created.
- [ ] The three commands copied from `install/claude-code/` (or the
      `install/codex/` layouts) and discoverable — ask the agent "what can
      you do about handoffs?"

## 3. Identity persists

- [ ] Fresh session: the assistant speaks in the voice you wrote and can
      state its standing rules when asked. PASS = it quotes YOUR rules, not
      generic ones.

## 4. The bridge works (the load-bearing test)

- [ ] End a real session with `/handoff` → the file lands in `handoffs/`
      with a timestamped name, open threads, gotchas, and a literal resume
      command; the memory index gained a pointer line.
- [ ] Fresh terminal, `/resume` → the assistant presents last state and
      WAITS (does not auto-execute). Staleness caveat appears when you test
      with an old handoff.

## 5. Memory behaves

- [ ] Say "remember this: [anything]" mid-session → it lands in today's
      daily note within the same session, not promised for later.
- [ ] Run the weekly curation after a few days → promotions are proposed
      (not silently applied), index lines are trigger-phrased, and nothing
      is pruned for being old.

## 6. The honesty rules hold

- [ ] End a session with no scheduler wired → the assistant says it is
      stopping, and does NOT claim it will keep working overnight.
- [ ] `/dispatch` a small task → the report comes back in the required
      fields, and the main session reads the actual artifact before
      relaying success.

## Shipping record

- Verified by: the build pipeline's manifest/count/secret-scan checks
  (`scripts/verify-product-folder.mjs`) on every release build.
- Behavioral pass: v1.0.0 rituals exercised on macOS with Claude Code; Codex
  layouts mirrored.
