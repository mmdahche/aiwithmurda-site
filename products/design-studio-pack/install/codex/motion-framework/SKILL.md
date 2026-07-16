---
name: motion-framework
description: Motion design framework for product UI — duration tiers, easing, enter/exit patterns, and reduced-motion compliance. Use when adding animations, transitions, or micro-interactions without turning the app into a demo reel.
---

# Motion Framework

Motion **supports** hierarchy and feedback. It is not decoration. Default to
less motion; add only when it clarifies state change.

## When to use

- Page transitions, modal open/close, list reorder
- Button press feedback, toast enter/exit
- Loading states (skeleton vs spinner choice)
- Reviewing agent-added `transition:` or animation libraries

## Duration tiers

| Tier | Duration | Use for |
|------|----------|---------|
| Micro | 100–150ms | Hover color, focus ring, toggle |
| Standard | 180–240ms | Dropdown, tooltip, tab switch |
| Emphasis | 280–360ms | Modal, drawer, page section reveal |
| Never | >500ms | Block unless full-screen intentional |

## Easing

- **Enter:** ease-out (decelerate into rest)
- **Exit:** ease-in (accelerate out)
- **Move along axis:** ease-in-out for position changes under 200ms
- Avoid bounce/elastic unless brand contract explicitly playful

## What may animate

- `opacity`, `transform` (translate, scale)
- `color` and `background-color` on micro tier only
- `height`/`width` only with `overflow:hidden` and standard tier max

## What should not animate

- Layout reflow of main content (CLS risk)
- Box-shadow spread on scroll
- Infinite attention-grabbers (pulsing CTAs) — one pulse max on first visit if ever

## Enter / exit patterns

- **Modal:** opacity 0→1 + scale 0.98→1 enter; reverse exit; trap focus
- **Toast:** translateY(8px→0) + opacity; stack from bottom
- **List item add:** height 0→auto OR opacity only — pick one, not both long
- **Route change:** cross-fade 200ms OR instant — no slide-between-pages on web apps

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Verify this exists in global styles. Audit with OS setting enabled once per project.

## Motion-slop gate (fail if ≥2)

- Parallax scroll on marketing page
- Staggered fade-in of every card in a grid
- Hero text word-by-word animation
- Custom cursor trails
- Video background with no static fallback

## Output

For any motion PR, document: element, property, duration, easing, reduced-motion fallback.
