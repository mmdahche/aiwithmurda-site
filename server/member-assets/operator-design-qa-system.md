# Design + QA System

Use this sequence to turn an interface request into a clear, responsive, verified user experience.

## 1. Domain brief

Record:

- Audience and work context
- Primary recurring task
- First visible decision or action
- Information density needed
- Brand or emotional signal
- Accessibility and device requirements
- Existing design-system constraints

An operational dashboard should optimize scanning and repeated action. A public brand experience can be more expressive. Do not apply the same composition to both.

## 2. Information architecture

Classify every item:

- Required now
- Context for the current task
- Reference library
- Administrative
- Duplicate or removable

The default view should answer:

1. Where am I?
2. What is the current state?
3. What should I do next?
4. What proves it worked?
5. Where is deeper help when needed?

## 3. Component rules

- Use icons for familiar tools and direct commands.
- Use text buttons for clear named actions.
- Use tabs for peer views, toggles for binary settings, and menus for option sets.
- Keep repeated items consistent in dimensions and hierarchy.
- Do not place cards inside cards.
- Do not turn every page section into a floating card.
- Keep tool surfaces dense enough for work but visually grouped.
- Reserve large type for true page-level signals.

## 4. State inventory

For each important component, define:

- Loading
- Empty
- First use
- Returning use
- Success
- Error
- Partial data
- Disabled
- Unauthorized
- Offline or failed network
- Long text and large values

## 5. Responsive QA matrix

Test at minimum:

| Viewport | Width | Checks |
| --- | ---: | --- |
| Small phone | 390 | Navigation, wrapping, touch targets, no clipped controls |
| Large phone | 430 | Forms, long cards, sticky or fixed UI |
| Tablet | 768 | Grid transitions, sidebars, modal framing |
| Laptop | 1280 | Density, hierarchy, line length |
| Desktop | 1440 | Main composition and repeated actions |
| Wide | 1920 | Max width, media framing, unused space |

Programmatic check:

```text
document.documentElement.scrollWidth <= window.innerWidth
```

This detects page overflow but does not prove controls are visible. Inspect screenshots and bounding boxes.

## 6. Accessibility pass

- Keyboard reaches every interactive control in a logical order.
- Focus is visible.
- Inputs have persistent labels.
- Headings and landmarks describe structure.
- Status and errors do not depend only on color.
- Contrast supports reading and controls.
- Motion respects reduced-motion preference.
- Zoom and text resizing do not hide actions.
- Icon-only controls have accessible names and tooltips when needed.

## 7. Browser proof

Capture:

- First viewport
- Full page
- Primary interaction before and after
- Empty and error states
- Mobile navigation open and closed
- Longest realistic text
- Authenticated or entitled state where applicable

Record console and page errors. A screenshot without interaction and error checks is not a complete browser test.

## Design receipt

```markdown
# Design + QA Receipt

Audience:
Primary task:
Navigation model:
Default next action:
States tested:
Viewports:
Keyboard result:
Overflow result:
Console errors:
Screenshots:
Known limits:
Ready to ship: yes | no
```
