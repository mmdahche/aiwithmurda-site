# Description Writing — the load-bearing 300 characters

The skill picker never reads your skill body. It reads the `description`
field, decides whether to load the skill, and moves on. A perfect skill with
a vague description fires never; a decent skill with a sharp description
fires constantly and improves with use. This file is the drill for writing
that one field.

## The format

```
[Capability — one present-tense sentence: what it does.]
[Trigger sentence: "Use when the user says X, Y, Z, or wants W."]
[Optional clarifier: scope, modes, what it does NOT do, neighbor pointer.]
```

## The five rules

1. **Verbatim triggers, not synonyms.** Pickers match on the user's actual
   words. If you say "fix my broken deploy", the description must contain
   phrases like "fix the deploy" / "deploy is broken" — not "remediate
   deployment failures".
2. **Name the situation, not just the verb.** "Use when a Stripe webhook
   returns 4xx" beats "use when debugging". Situations discriminate; verbs
   overlap with everything.
3. **Discriminate against neighbors.** If two of your skills could both
   plausibly fire, each description must say which case belongs to the other:
   "For report-only mode, use /qa-only."
4. **Specificity beats brevity.** A 500-character description that matches
   reliably outperforms a clean 80-character one that never fires.
5. **No time-sensitive language.** "Newly built", "the latest version",
   "as of June" — skills outlive their drafting week.

## Before / after drills

| Bad | Why it fails | Good |
|---|---|---|
| `Helps with documents.` | No capability, no trigger, matches nothing | `Extract text and tables from PDFs, fill forms, merge documents. Use when the user says "parse this PDF", "extract from <file>.pdf", or works with any .pdf input.` |
| `A skill for testing.` | "Testing" collides with every QA skill | `Run the full Playwright E2E suite and summarize failures with screenshots. Use when the user says "run e2e", "did the flows break", or after any checkout-path change. For unit tests, use /test-unit.` |
| `Automates social media.` | Category, not capability | `Draft a week of posts from one source article, matched to each platform's format. Use when the user says "repurpose this post", "make a content week", or pastes an article asking for social copy. Does NOT publish — output is drafts.` |
| `The best deployment skill.` | Marketing, zero triggers | `Preflight-check env vars, run the build, deploy to the host, then smoke-test the live URL. Use when the user says "ship it", "deploy", or "push this live". Refuses when the working tree is dirty.` |

## The 60-second test

Read your description and ask:

1. Could a stranger predict what the skill will DO from this sentence alone?
2. Does it contain at least two phrases you would actually type in a session?
3. If you have a similar skill, does this description say when NOT to fire?

Three yeses = ship it. Anything else = rewrite the description, not the skill.
