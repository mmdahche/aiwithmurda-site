---
name: motion-framework
description: Decide when to animate, how long, with which easing, and when to sit perfectly still. Use when adding transitions to a component, reviewing a page with too much motion, defining the motion section of a DESIGN.md contract, or debugging why a UI feels frantic. Enforces reduced-motion and rejects motion-slop by default.
---

# Motion Framework

You decide whether a UI element animates at all, and if it does, how. The
default answer is no. Motion is a communication tool for state change, not
decoration. Every animated element should answer "what is the user learning
from this movement?"

Motion-slop is the AI-UI equivalent of purple gradients: everything springs,
everything blurs on scroll, everything has a shimmer on load. This skill
rejects that by default.

## When to use

- Adding a transition to any component (modal, drawer, toast, dropdown, tab)
- Reviewing a page and something feels frantic or noisy without knowing why
- Filling in the motion section of a `DESIGN.md` contract
- Deciding whether a hover state should animate or just swap
- Someone asked for "make it feel premium" and you need to translate

## Workflow

1. **Ask what changed** — what state moved from A to B? If nothing changed, do not animate
2. **Pick the tier** — micro, standard, or deliberate (see table)
3. **Pick the easing** — standard curve for most; decelerate for enter; accelerate for exit
4. **Check reduced-motion** — write the reduced-motion fallback in the same commit
5. **Prove the value** — one sentence describing what the user learns from the motion

## The three duration tiers

| Tier | Range | Use for |
|------|-------|---------|
| Micro | 100–150 ms | Hover, focus, button press, checkbox tick, small color/opacity shifts |
| Standard | 200–300 ms | Dropdown open, tab change, toast enter, tooltip appear, small element in/out |
| Deliberate | 400–500 ms | Modal open, drawer slide, page transition, expanding a card into a detail view |

Nothing over 500 ms except deliberate onboarding beats. Anything under 100 ms
is imperceptible — either drop it or bump it to micro.

## Easing curves

- **Standard** — `cubic-bezier(0.4, 0, 0.2, 1)`: default for state changes where both start and end matter
- **Decelerate** — `cubic-bezier(0, 0, 0.2, 1)`: enter animations (element arriving into view)
- **Accelerate** — `cubic-bezier(0.4, 0, 1, 1)`: exit animations (element leaving; user does not need to see the endpoint)
- **Emphasized** — a stronger `cubic-bezier(0.2, 0, 0, 1)` for a single hero interaction; do not use everywhere
- **Never use `linear` for motion of anything with mass** — reserved for progress bars, timers, and true continuous motion

## Enter vs exit

- **Enter** — decelerate; the element should feel like it lands
- **Exit** — accelerate; the element should feel like it is leaving intentionally, faster than it entered (typically 80% of the enter duration)
- **Reverse** — an element that opens and closes uses different durations for open and close; do not just play the enter animation backward

## What to animate

- **State change on the same element** — collapse, expand, toggle, focus
- **Element arriving or leaving** — modal, toast, drawer, dropdown, tooltip
- **Position change that carries meaning** — item moved in a list, card reordered
- **Loading placeholder → real content** — a soft cross-fade, not a magic snap

## What NOT to animate (motion-slop tells)

- Scroll-triggered fade-in on every content block for no reason
- Parallax on marketing hero without a documented purpose
- Number counters that count up on scroll (users can read)
- Cards that lift on hover *and* rotate *and* glow
- Section headings that letter-by-letter reveal
- Icons that spin, wiggle, or bounce on page load
- Full-page loading spinners for actions under 300 ms
- Anything on a login form except focus ring and error shake

## Reduced-motion

Every animation this skill approves ships with a `prefers-reduced-motion:
reduce` fallback in the same commit. The fallback rule is simple:

- **Essential motion** (state transition the user needs to see) — collapse to
  a 0.01s duration; the element still moves but not perceptibly
- **Decorative motion** (scroll effects, hover lifts, marketing polish) — remove
  entirely; use opacity 0/1 or nothing

Never ship a component that respects reduced-motion for the demo screen but
ignores it in a nested modal.

## Output rules

- Every motion decision produces four lines: what moves, duration, easing, reduced-motion fallback
- If any of the four is missing, the motion is not approved for merge
- Motion values live in `DESIGN.md` as named tokens (`--motion-standard`, `--ease-decelerate`) — components reference tokens, not literals
- When rejecting a proposed animation, name which motion-slop tell it matches — do not just say "too much"
