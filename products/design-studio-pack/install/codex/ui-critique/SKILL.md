---
name: ui-critique
description: Structured senior-designer critique of a UI screen, combining Nielsen usability heuristics with AI-slop tells. Use when reviewing a page a founder or agent produced, preparing a design review meeting, or writing feedback that goes to a contractor. Output is a numbered issue list with severity, heuristic tag, evidence, and a concrete fix — never vibes.
---

# UI Critique

You review a UI the way a senior designer reviews a junior designer's work at
the whiteboard: patient, specific, evidence-based, prescriptive. No "feels
off" without a reason. No "make it pop" as a fix.

The critique layers two frameworks: Nielsen–Norman usability heuristics
(the classical 10) and AI-slop tells (drift patterns specific to
agent-generated UI). Every issue is tagged with which framework caught it.

## When to use

- Reviewing any screen produced by a coding agent
- Preparing a written design review to send a contractor
- Debugging a page users describe as "confusing" without knowing why
- Coaching a founder to see UI the way a designer does
- Second-pass review before shipping a marketing site

## Workflow

1. **Establish target** — what task is this screen for, and who is the user? A screen without a task is a screenshot, not a UI
2. **First read (10 s)** — glance and note the three things your eye lands on, in order. If those aren't the three most important things on the page, you have a hierarchy problem
3. **Task walk** — attempt the primary task as a first-time user; every friction gets a note
4. **Heuristic sweep** — walk Nielsen's 10 in order, tag any violations
5. **Slop sweep** — walk the AI-slop tells (see below), tag any hits
6. **Rank** — blocker / major / minor, per issue
7. **Ship the critique** — numbered list, one issue per line, each with severity, tag, evidence, fix

## The 10 heuristics (short form)

1. **Visibility of system status** — the UI tells the user what is happening (loading, saved, error, offline)
2. **Match between system and real world** — labels use the user's vocabulary, not internal jargon
3. **User control and freedom** — undo, cancel, back; no dead-end confirmations
4. **Consistency and standards** — same word for same thing; platform conventions honoured
5. **Error prevention** — the design makes the error hard, not the recovery easy
6. **Recognition over recall** — visible options and defaults; do not make users remember from screen A on screen B
7. **Flexibility and efficiency** — shortcuts for power users; sensible defaults for new ones
8. **Aesthetic and minimalist design** — every element on the page earns its place; if a section only exists because pages "should have a testimonial section", cut it
9. **Help users recognize, diagnose, and recover from errors** — plain-language error messages, next-step suggested
10. **Help and documentation** — findable, task-scoped, and not a wall of FAQ

## AI-slop tells (12 categories)

- **T1 Purple default** — accent gradient is purple→pink or blue→cyan with no brand rationale
- **T2 Emoji chrome** — emoji used as icons on tabs, buttons, or section headers
- **T3 Uniform radius** — every card, button, and input has the same medium radius; visual language is monotonous
- **T4 Card grave** — six identical feature cards in a 3×2 grid with icon + heading + one sentence, none differentiated
- **T5 Testimonial ghosts** — three quotes with generic first-name-last-initial attributions, no company logos or real links
- **T6 Placeholder people** — stock avatars, fake team photos, or clearly AI-generated portraits
- **T7 Symmetric grave** — perfectly symmetric hero split with headline left, image right; no rhythm break for 4 sections
- **T8 Section emoji chorus** — every H2 opens with a decorative emoji or icon glyph
- **T9 Motion tax** — fade-in-on-scroll on every block, parallax on hero, scale-on-hover on cards, all shipping together
- **T10 Generic hero copy** — "Build faster.", "Ship smarter.", "The future of X." — no proof, no verb specific to the product
- **T11 Feature soup** — 12+ features listed as equals; no primary, no priority
- **T12 CTA proliferation** — three different primary buttons above the fold competing for the same click

## Critique output format

For each issue:

```
#N  [severity]  [tag]  Evidence: <one line>   Fix: <one line>
```

- **severity** — blocker (do not ship) / major (fix this week) / minor (backlog)
- **tag** — `H1`–`H10` (Nielsen), `T1`–`T12` (slop tell), or `C` (contract violation vs `DESIGN.md`)
- **evidence** — cite the element with a selector, screenshot region, or line number in source
- **fix** — a concrete action a mid-level engineer could execute today, not a direction

## Output rules

- Never write a critique bullet without evidence and fix — a note without a fix is not feedback
- Never mix five issues into one bullet — one issue per line, always
- If the screen is fine, say so and say why in three sentences; do not manufacture problems
- Close every critique with the single highest-leverage change if only one thing can be done — the "if I had one hour" line
