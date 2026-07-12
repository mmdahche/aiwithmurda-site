# Worked Example — The Dead "Save Draft" Button

A complete state-sequence audit on an invented-but-realistic bug, end to end,
so you can see the method produce a verdict that function-level debugging
cannot. Follow along, then run the same trace on your own "broken button"
report.

## The report

> "Save Draft does nothing. I click it, no error, nothing saves."

Function-level debugging comes back clean: the handler exists, both functions
it calls exist, nothing throws, types are right. Verdict from conventional
checks: **no bugs found**. The user is still right.

## Step 1 — Map the store's side effects first

```
STORE: editorStore
  saveDraft()          → sets {draft, savedAt}          (async — writes API, then state)
  setPanel(name)       → sets {activePanel}  RESETS {draft: null, dirty: false}
  markClean()          → sets {dirty: false}

DANGEROUS RESETS:
  setPanel → resets draft (owned by saveDraft)   ← note this line
```

Ten minutes of reading store definitions. This map is the whole game.

## Step 2 — Trace the handler, in order

```
TOUCHPOINT: "Save Draft" in EditorToolbar.tsx:41
  HANDLER: onClick → {
    call 1: saveDraft()        → async: POST /drafts, THEN sets {draft, savedAt}
    call 2: setPanel("list")   → sets {activePanel} RESETS {draft: null}
  }
```

## Step 3 — Match against the six shapes

Two shapes fire at once:

- **Sequential undo:** `setPanel` resets `draft` — whatever `saveDraft`
  eventually writes gets stomped.
- **Async race:** `saveDraft` sets state AFTER its network call resolves;
  `setPanel` runs immediately. The reset happens first, the save's state write
  lands second — so `draft` IS set… but `activePanel` already switched away
  and the list view read `draft` during the window it was null. The UI showed
  the empty state and never re-read.

This is why the bug felt "random" — on a fast network the save write
occasionally landed before the panel's first read.

## Step 4 — The report block

```
SEQ-001 [HIGH]
  Touchpoint: "Save Draft" — EditorToolbar.tsx:41
  Shape: Sequential undo + async race
  Trace:  saveDraft() → (async) sets {draft, savedAt}
          setPanel("list") → RESETS {draft} immediately
  Expected: draft persists and appears in the list
  Actual:   list renders during the null window; save write lands unseen
  Fix: await saveDraft() before setPanel(); remove draft-reset from setPanel
       (stale-draft cleanup belongs to closeEditor, which owns that state).
```

## Step 5 — Close the loop with the pack's other tools

1. **Regression test first** (`ai-blind-spot-testing`, Pattern 3): a failing
   test that clicks Save Draft and asserts the draft appears in the list —
   BEFORE touching the fix.
2. **Fix**, run the test fresh, and only claim it with the runner output
   inline (`verify-before-claiming`).
3. **Ranked follow-up** (`test-gap-detector`): the editor store had zero
   tests and a +3 recency signal — it goes to the top of the gap report so
   the next silent reset gets caught by CI, not by a user.

## What to take from this

The store side-effect map (Step 1) is not optional prep — it IS the audit.
Every "button does nothing" bug in this class is invisible until some line in
that map says `X → RESETS {thing another action owns}`.
