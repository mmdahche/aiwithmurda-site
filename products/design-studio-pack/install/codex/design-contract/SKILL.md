---
name: design-contract
description: Draft or update a DESIGN.md brand contract that agents obey on every screen — identity, palette, typography, spacing, components, motion, voice, anti-patterns, and verification. Use before starting any new product surface, when unifying a fragmented UI, or when an agent keeps inventing new colors and spacing tokens each session.
---

# Design Contract

You write the single source of truth that every agent, every screen, and
every reviewer refers back to when a design decision is on the table. The
output is a `DESIGN.md` file that lives at the repo root next to `README.md`.

The contract is enforced, not aspirational. If a component violates a section
of the contract, the component is wrong — not the contract.

## When to use

- Starting a new product or marketing site from scratch
- Unifying two surfaces that drifted apart (marketing vs app)
- An agent keeps inventing new colors, weights, or spacings each session
- Onboarding a new contractor and needing a one-page brand handoff
- Preparing a design audit — you need the target before the diff

## Workflow

1. **Read the current UI** — screenshots of the top five surfaces, current CSS variables, any brand PDF
2. **Ask the founder five questions** — see below; do not skip
3. **Draft the nine sections** — every section must have concrete values, not adjectives
4. **List anti-patterns explicitly** — three things this brand will never do
5. **Write the verification protocol** — how a reviewer proves compliance in under 60 seconds

## Five questions before drafting

1. Who is this for, in one sentence?
2. What feeling should the first screen produce (calm, urgent, credible, playful)?
3. Name two brands whose look you'd steal, and one you'd never look like
4. Where does this UI live (dashboard, marketing, mobile, in-terminal)?
5. What is the one rule you never want an agent to break?

## The nine sections

### 1. Identity

- Product name, one-line positioning, target user
- Personality traits (pick three, e.g. precise, dry, human)
- Two visual moodboard references (public URLs or attached images)
- One-line anti-positioning ("we are not X")

### 2. Palette

- Primary, secondary, accent, background, surface, text, muted, danger, success — each with a hex value and a usage rule
- Contrast pairs called out (which text goes on which surface)
- Semantic tokens named by role, not by hue (`--color-danger`, not `--color-red`)
- Dark-mode equivalents where the product supports it — with contrast ratios

### 3. Typography

- Display, heading, body, mono — family name, weight, line-height for each
- Type ramp with pixel values (e.g. 12, 14, 16, 18, 24, 32, 48) and the intended use for each step
- Never mix more than two families; state the two
- Letter-spacing and paragraph rhythm rules (measure, tracking)

### 4. Spacing

- Base unit (usually 4px or 8px)
- Named scale (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`) with pixel values
- Grid columns and gutters
- Container max-width and the rule for when to break it

### 5. Components

- Button (variants, heights, radii, disabled state)
- Input (default, focus, error, disabled)
- Card (padding, radius, border, elevation)
- Modal, toast, tooltip — pick the primitives this product actually uses
- Icon system: which family, which stroke width, at which sizes

### 6. Motion

- Duration tiers (micro / standard / deliberate) with millisecond values
- Default easing curve
- Which interactions animate, which do not
- Reduced-motion behaviour (respect `prefers-reduced-motion` in one sentence)

### 7. Voice

- Reading grade level target
- Sentence-length rule (e.g. average under 18 words)
- Words this brand uses; words this brand refuses
- Capitalisation rule for headings and buttons
- One-line elevator sentence used verbatim in metadata

### 8. Anti-patterns

- Three things this brand will never ship (specific — "no glassmorphism headers", "no purple-to-pink gradients", "no auto-playing hero video")
- One anti-pattern per drift category (visual, motion, copy)

### 9. Verification

- The 60-second review protocol a human uses on any new screen
- The token search command that proves no hard-coded colors slipped in
- The screenshot-diff cadence (weekly, per PR, per release)
- Who owns the contract and how it is amended (PR against `DESIGN.md`)

## Output rules

- Every value is concrete — hex, pixels, milliseconds, family names
- No adjective without a measurement next to it
- Contract fits on one screen when collapsed — sections are dense, not verbose
- The file is versioned; the top of the file lists the current revision date
- The contract points to the audit skill by name: `anti-slop-audit` runs after every material change
