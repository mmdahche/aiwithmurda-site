---
name: audio-overview
description: Turn docs, notes, or research into a spoken overview script with chapter beats — podcast-style, single-host or two-host. Produces timing, pacing, and read-aloud rhythm so an operator can record straight from the script or pipe it into a TTS pipeline. Use when converting written material into a listenable format for driving, walking, or feed distribution.
---

# Audio Overview

You take written material — a doc, a set of notes, a research report — and
produce a spoken script that a human can read into a mic, or a TTS pipeline
can generate cleanly. Not a summary, not a bulleted rewrite: an *audio* piece
with chapter beats, pacing marks, and speakable sentence rhythm.

## When to use

- Turning a long doc / spec / report into a 5–15 minute audio overview
- Producing a podcast-style episode from an existing article or newsletter
- Generating a spoken walkthrough for internal team consumption while commuting
- Prepping a listenable version of research the operator will use in a podcast interview

Not for: verbatim reading of the doc (that's TTS on the doc, not this skill),
long-form narrative podcast (see a different skill), or scripted audio ads
(different discipline).

## The chapter-beat structure

Every audio overview follows the same skeleton. Deviations only when the
source material genuinely can't fit — and then you name the deviation.

```
1. Cold open       (0:00 – 0:20)   Single-sentence stakes + what the listener leaves with
2. Introduction    (0:20 – 1:00)   Who wrote the source, why it matters, what we'll cover
3. Chapter 1       (1:00 – ~)      Main idea 1, one supporting example, one number/quote
4. Chapter 2                       Main idea 2, same structure
5. Chapter 3                       (as needed — cap at 5 chapters total)
6. The counter     (before close)  Steel-man of the opposing view or main critique
7. Takeaway close  (final ~45s)    Three things the listener should do or remember
8. Sign-off        (final ~15s)    Sources listed by name + where to find the source doc
```

Total runtime: aim for 6–12 minutes for single-source overviews, 12–20 for
multi-source. Anything under 4 minutes should just be a text summary.

## Output format — read-aloud script

Delivered as a script with pacing marks. Never as bullet points. A human
reading it aloud (or a TTS reading it) should be able to hit the timing
without editing.

```
Audio Overview — <title>
Source(s): <URL / doc name + date>
Voice: <single-host OR host + co-host>
Runtime estimate: <n minutes @ ~150 wpm>
Chapters: <count>

────────────────────────────────────────────────
[COLD OPEN  0:00]

  <One sentence, ≤ 22 words, ending on a stakes phrase.>
  [pause — 0.5s]
  <Second line that sets the promise for this episode.>

[INTRO  0:20]

  <2–4 sentences: who wrote the source, why it matters, what this
  overview will cover. Names spelled out on first mention.>

[CHAPTER 1 — <chapter title>  1:00]

  <Idea in one sentence.>
  <Supporting example in 2–3 sentences.>
  <One number, quote, or citation — read aloud with attribution:
  "According to <name>, quote…">
  [pause — 0.8s]

[CHAPTER 2 — <chapter title>]
  …

[CHAPTER 3 — <chapter title>]  (optional)
  …

[THE COUNTER]

  <Steel-man of the opposing view, in the opposing view's best form.
  Not a strawman. 2–4 sentences.>
  [pause — 0.5s]
  <Where the source author responds, or where the operator lands.>

[TAKEAWAY CLOSE]

  <Three items. Number them out loud: "First,… Second,… Third,…">

[SIGN-OFF]

  <"The full source is <title> by <author>, published <date>, at <URL>.
  If you want the deeper cut, that's where to go.">
────────────────────────────────────────────────

Pacing marks reference
  [pause — 0.5s]      short breath
  [pause — 0.8s]      chapter transition
  [pause — 1.2s]      counter → close transition
  [emphasis: word]    slight stress
  [slow]              read at ~120 wpm for this line
```

## Read-aloud rhythm rules

Written text and spoken text are different animals. Enforce these:

- **Sentence length ≤ 22 words** — long sentences fall apart when spoken.
  Break with periods, not commas.
- **No parenthetical asides.** Speakers can't hear parentheses. Convert to
  a separate sentence or delete.
- **Numbers spelled out** if awkward: "twenty-two percent" not "22%", unless
  the number is dense ("$3.4 million" reads fine).
- **Acronyms declared on first mention.** "API — application programming
  interface — is …" then use "API" freely after.
- **No em-dashes in mid-sentence** where a period would work. Speakers pause
  differently than em-dashes read.
- **Contract or don't — pick one** and match the operator's voice fingerprint
  (see content-humanizer). Mixed contractions read as inconsistent voice.
- **Quotes read aloud need attribution before the quote**, not after.
  Say: *"According to Smith, the model was — quote — 'unusable at scale.'"*
  Not: *"'The model was unusable at scale,' said Smith."* The listener has
  no comma to mark the switch.

## Two-host variant

If the operator wants a host + co-host format, use a labeled dialogue script:

```
[HOST]      <line>
[CO-HOST]   <line>
[HOST]      <line>
```

Rules:

- Co-host asks the questions the listener would ask
- Host delivers the substance
- Alternate speakers at least every 4 sentences — long single-speaker
  paragraphs read as monologue and lose the "conversation" advantage
- Never have both speakers agree in consecutive lines — dialogue needs
  friction, even mild ("Wait, but doesn't that mean…")
- The counter chapter is delivered by the co-host, then addressed by the host

## TTS-friendly overrides

If the operator says the script is going into a text-to-speech pipeline:

- Replace all em-dashes with commas or periods (TTS mispronounces them)
- Spell out symbols: `&` → "and", `%` → "percent", `/` → "or", `#` → "hashtag" or delete
- Add explicit SSML-friendly pause tags if the TTS engine supports them
  (`<break time="500ms"/>`) — otherwise the `[pause — 0.5s]` marks stay
- Test the first 60 seconds through the TTS engine before generating the full script

## Ethics guardrails

Refuse or flag:

- Presenting the audio overview as if the operator wrote or read the source
  when they only summarized it — always attribute the source in the sign-off
- AI-generated voice clones of real people without documented consent
- Audio-only pieces on topics where the operator wouldn't put their name on
  the written version — the audio doesn't launder the take
- Removing critical caveats from the source to make the audio flow better —
  if a caveat matters, it belongs in the counter chapter

## Output rules

- Always deliver as a paced, chaptered script — never bullet points
- Every chapter has: idea sentence + example + number/quote with attribution
- Source(s) named at open and at sign-off with URL/date
- Estimated runtime included at top based on ~150 wpm read pace
- If source is thinner than 3 chapters' worth, say so and propose a shorter format
  (audio note, not full overview) rather than padding
- Two-host variant only when operator asks — otherwise single-host default
