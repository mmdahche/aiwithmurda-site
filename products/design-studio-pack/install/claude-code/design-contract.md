---
name: design-contract
description: Create and maintain a DESIGN.md brand contract — the single source of truth for UI generation. Use when starting a new product UI, onboarding a design system, or before any "make it look on-brand" task. Outputs a 9-section semantic design file agents can compose from instead of inventing styles each session.
---

# Design Contract (DESIGN.md)

A `DESIGN.md` file is the **brand contract** for UI work. Agents read it before
touching `.tsx`, `.html`, or CSS. Compose from the contract — don't freestyle
colors each generation.

## When to use

- New app, landing page, or major redesign
- "Make this match our brand" without a Figma file
- Handoff between design and build agents
- Preventing style drift across sessions

## The 9 sections

Write all nine. Skip none — empty sections invite invention.

### 1. Identity

- Product name, one-line promise, primary audience
- **Aesthetic direction** — pick ONE committed adjective pair (e.g. "industrial calm", "editorial sharp")
- What this product is NOT (generic SaaS purple, glassmorphism soup)

### 2. Palette

- Primary, secondary, accent, surface, border, text (primary/muted/inverse)
- Hex values + **when to use each** (not just swatches)
- Dark mode mapping if applicable

### 3. Typography

- Font families (heading, body, mono) with fallbacks
- Scale: h1–h4, body, caption — size/weight/line-height
- Max line length for prose (typically 60–72ch)

### 4. Spacing & layout

- Base unit (4px or 8px grid)
- Section padding, card padding, stack gaps
- Breakpoints and container max-widths

### 5. Components

- Buttons (primary/secondary/ghost/destructive) — radius, padding, states
- Inputs, cards, nav, badges — one paragraph each
- **Compose rule:** reuse these tokens; no one-off button styles per page

### 6. Motion

- Default duration tiers (micro 120ms, standard 200ms, emphasis 320ms)
- Easing curves; respect `prefers-reduced-motion`
- What animates (opacity, transform) vs what never does (layout thrash)

### 7. Voice & microcopy

- Sentence length, formality, forbidden phrases ("unlock", "leverage" unless brand says so)
- Error tone: helpful, not cute
- CTA verb style ("Start build" not "Get started today!!!")

### 8. Anti-patterns

- Explicit bans: gradient hero + stock illustration, 3-column feature grid clone, etc.
- Reference the anti-slop audit skill for full checklist

### 9. Verification

- How to prove compliance: screenshot checklist, contrast ratios, keyboard nav spot-check
- Who signs off before ship

## Workflow

1. Interview or infer brand inputs (existing site, logo, competitor you are NOT copying)
2. Draft all 9 sections in one file at repo root or `docs/DESIGN.md`
3. Run anti-slop audit on a sample screen generated FROM the contract
4. Iterate contract — not individual pages — when drift appears

## Output rules

- Every color has a semantic name AND hex
- No "TBD" in palette or typography — use provisional values with a REVIEW tag
- Link to motion-framework skill for animation depth
- File must be readable in under 5 minutes
