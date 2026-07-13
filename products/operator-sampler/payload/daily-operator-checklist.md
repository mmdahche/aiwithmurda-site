# The Daily Operator Checklist

One page. Run it every working day. The Future Proof Method teaches you the
operator loop; this checklist is the loop compressed into a daily rhythm you
can hold even on a 15-minute day. Print it, pin it, or keep it beside your
terminal.

Pick your session size honestly, then run that column top to bottom.

## 15-minute session — "keep the thread alive"

- [ ] Open yesterday's handoff note (or your build log) BEFORE opening the agent.
- [ ] One read-only inspection: have the agent explain the current state of the one path you're working on.
- [ ] Make ONE bounded move: a single small fix, one verification run, or one prompt-script pass. Nothing new.
- [ ] Write tomorrow's first move in one sentence. Close the session.

## 30-minute session — "one slice forward"

Everything in the 15-minute column, plus:

- [ ] State today's outcome in one sentence before any prompt: user path + visible success state.
- [ ] Run the loop once: inspect → plan → build the smallest slice → verify the real path.
- [ ] Capture one receipt (test output, screenshot, or command result) into your build log.
- [ ] If the agent claimed "done", make it prove it — run the path yourself or make it run the real check.

## 60-minute session — "ship and package"

Everything above, plus:

- [ ] Start from a clean baseline: `git status` clean, or checkpoint what isn't.
- [ ] One full module task from your current course module (Build path → next unfinished task).
- [ ] End with a checkpoint: commit with a message a stranger could follow.
- [ ] Update the handoff: what shipped, what's verified, what's deliberately deferred, exact next action.

## Verification gates (any session, non-negotiable)

- [ ] No secret ever goes into a chat, a file the agent writes, or a commit. If one slipped, rotate it today — not later.
- [ ] Nothing is "done" without a receipt: a command output, a passing test, or the real user path clicked through.
- [ ] Two failed fix attempts on the same bug = stop, write down the evidence, change strategy. No third blind retry.
- [ ] Scope drift check: is what you're building still today's one sentence? Extra ideas go to the deferred list, not into the session.

## When AI gives you a bad output

1. Don't argue with it and don't re-roll blindly — name what's specifically wrong in one sentence.
2. Check the input: did you give it the real file, the real error, the real constraint? Garbage context is the usual cause.
3. Narrow the ask: one file, one function, one behavior.
4. If the second attempt is still wrong, save the exchange to your "what broke" note and move to a task you can verify — come back with fresh framing.

## What to save for later (so today stays small)

- Feature ideas mid-session → one line in a deferred list, keep moving.
- Interesting tools/links → a "review Friday" note, not a new tab.
- Refactors the agent proposes while fixing → deferred list unless today's path breaks without them.

## Weekly review (10 minutes, once a week)

- [ ] Read the week's build-log receipts. Count what actually shipped vs what got started.
- [ ] Pick the ONE repeated friction from the week — that's next week's candidate for a reusable skill or script.
- [ ] Delete or archive stale deferred items older than two weeks. If it mattered, it would have resurfaced.
- [ ] Write next week's single most valuable outcome in one sentence.

---

The habit this builds: every session starts from context, moves one verified
slice, and ends with a handoff. Sessions compound instead of evaporating.
That is the whole method — daily.
