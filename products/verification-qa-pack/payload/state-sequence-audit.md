---
name: state-sequence-audit
description: Trace every user-facing button and touchpoint through its full state-change sequence to find the bugs static reading misses — handlers whose calls individually work but cancel each other, leave the UI inconsistent, or never reach the action the label promises. Use when debugging found "no bugs" but users report dead buttons, after any refactor touching shared state stores, or when a button "does nothing".
---

# /state-sequence-audit — find the bugs that cancel themselves out

Conventional checks ask: does the handler exist, does it crash, are the types
right. A whole class of UI bugs passes all three: every function in the handler
works, and the BUTTON still does nothing, because a later call silently undoes
an earlier one through shared state. This audit traces the sequence, not the
functions.

## The failure class, concretely (original example)

An "Add to Cart" button:

```js
onClick={() => {
  cartStore.addItem(product)     // sets pendingItem, increments count
  cartStore.openDrawer()         // opens the cart drawer...
}}
```

Store definition:

```js
openDrawer: () => set({
  drawerOpen: true,
  pendingItem: null,   // ← "reset stale state when opening" — kills the add
})
```

`addItem` works. `openDrawer` works. The button doesn't: the drawer opens
empty because `openDrawer` clears the very state `addItem` just wrote. No
crash, no missing wiring, no type error — invisible to function-level checks,
obvious to a sequence trace.

## The method

### Step 1 — Map every store's side effects FIRST

Before auditing any button, build a side-effect map of every state store
(Redux/Zustand/context/signals — same discipline everywhere):

```
STORE: cartStore
  addItem(p)     → sets {items+, pendingItem, count}
  openDrawer()   → sets {drawerOpen: true}  RESETS {pendingItem: null}
  clearCart()    → resets everything

DANGEROUS RESETS (actions clearing state they don't own):
  openDrawer → resets pendingItem (owned by addItem)
```

This map is the audit's foundation — the cart bug is invisible without the
line that says `openDrawer` resets `pendingItem`.

### Step 2 — Trace each touchpoint call-by-call, in order

```
TOUCHPOINT: "Add to Cart" in ProductCard.tsx:88
  HANDLER: onClick → {
    call 1: addItem(product)  → sets {pendingItem}
    call 2: openDrawer()      → RESETS {pendingItem}   ← CONFLICT
  }
  EXPECTED: drawer opens showing the added item
  ACTUAL:   drawer opens empty
  VERDICT:  BUG — later call undoes the earlier one
```

### Step 3 — Check the six recurring shapes

1. **Sequential undo** — call B's side effect resets what call A set (the cart example).
2. **Async race** — two promises both write the same field; the final value depends on resolution order, not intent.
3. **Stale closure** — a memoized handler captures an old value, so repeated updates apply the same stale base (`setCount(count + 1)` twice increments once).
4. **Missing transition** — the label promises an action the handler never performs: "Save" only validates, "Delete" only sets a flag, "Send" calls an endpoint that's gone.
5. **Dead conditional path** — the real action sits behind a condition that is always false at click time.
6. **Watcher interference** — the handler sets X; an effect/subscription watching something else resets X before the user sees it.

### Step 4 — Report each finding in a fixed schema

```
SEQ-004 [HIGH]
  Touchpoint: "Add to Cart" — ProductCard.tsx:88
  Shape: Sequential undo
  Trace:  addItem → sets pendingItem;  openDrawer → RESETS pendingItem
  Expected: drawer shows added item   Actual: drawer empty
  Fix: openDrawer must not clear pendingItem (move stale-state cleanup to closeDrawer),
       or reorder + pass the item explicitly.
```

## Scoping (this audit is thorough, so aim it)

- **One button** — a user reported it; trace just that handler + its stores. Minutes.
- **One store** — you changed a store action; audit every consumer of that action.
- **One page** — after building or refactoring it.
- **Whole app** — pre-launch or post-big-refactor only. Parallelize by page, but the Step 1 store map is shared context and must be produced first.

## When to use

- Debugging found "no bugs" but a user says the button is broken
- After modifying any shared-store action (audit its callers)
- After any refactor that touches shared state
- Pre-release on the money paths (checkout, auth, send/submit)

## When NOT to use

- API-level bugs (wrong response shape, missing endpoint) — different discipline
- Pure styling/layout issues — visual inspection
- Performance — profiling tools

## Pairs with

- `/verify-before-claiming` — after the fix, prove the original symptom is gone before saying so.
- `/test-gap-detector` — every bug found here is a strong candidate for a regression test.
- `/qa` — this audit reads code paths; /qa clicks the real app. Different evidence, both count.

## Origin

Original write-up. The underlying practice — audit state interactions as
sequences, not functions — is common engineering wisdom popularized across
the agent-skills community; the framing, taxonomy wording, and every example
in this file are this product's own.
