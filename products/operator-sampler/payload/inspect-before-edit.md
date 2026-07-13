# The Inspect-Before-Edit Script

One copy-ready prompt, the single highest-leverage habit in AI-assisted
building: make the agent prove it understands the code before it touches the
code. Paste it at the start of any change, in any agent, on any project.

## The script

```
Before editing anything, inspect this project and answer in this order:

1. MAP — Which files are involved in <the thing I want to change>? Name them
   and say what each one does in one line. If you're guessing, say "guessing".
2. CURRENT BEHAVIOR — Walk the path as it works TODAY: what happens, in
   order, when <the user action>. Cite the functions you're describing.
3. SMALLEST CHANGE — What is the smallest edit that produces <the outcome I
   want>? Name the exact file(s) and the risk if you're wrong.
4. VERIFICATION — What command, test, or click-through will PROVE the change
   worked? Name it now, before editing.

Do not edit any file until I say "go".
```

Fill the three `<...>` slots. Read the answer before saying "go".

## Why each line is there

- **MAP with a "guessing" clause** — forces the agent to separate what it read
  from what it assumed. Hallucinated file maps die here, not three edits deep.
- **CURRENT BEHAVIOR with citations** — an agent that can't narrate today's
  behavior will "fix" things that weren't broken.
- **SMALLEST CHANGE with named risk** — kills scope creep before it starts;
  the risk line tells you whether the agent understands the blast radius.
- **VERIFICATION named up front** — the proof is agreed BEFORE the work, so
  "done" has a definition the agent can't negotiate afterward.
- **The stop line** — you stay the operator. The agent plans; you release.

## When it earns its keep most

- First session in an unfamiliar or long-untouched codebase
- Anything touching payments, auth, or data you can't recreate
- After any previous attempt went sideways — reset the frame with a fresh map

## The follow-up move

When the answer to step 4 comes back, save it. After the edit, run exactly
that check and paste the output back. That closed loop — named proof, fresh
run, output shown — is the whole discipline (the full version ships as the
`verify-before-claiming` skill in this same folder).
