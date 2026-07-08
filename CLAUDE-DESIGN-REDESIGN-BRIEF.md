# AI with Murda Site Redesign Brief

Use this as the master prompt for Claude Design, Claude Code, or any design/code agent rebuilding `aiwithmurda.com`.

## Project

Repo: `/Users/muhammad/ContentCreating/tools/60-day-command-center`

Production site: `https://aiwithmurda.com`

Stack:

- Vite + React single page app
- Express server serving `dist`
- Supabase Auth, profiles, subscribers, entitlements, member progress
- Stripe Checkout through Backbone Solutions only
- Render hosting
- Cloudflare DNS

Important command checks:

```bash
npm run build
npm run smoke:launch
```

Do not break these.

## Current Product Reality

This is not a normal course site. It is a public proof engine for Murad's 60-day AI operator sprint.

Core idea:

Murad sends his family overseas for roughly 60 days and publicly turns that window into an entertainment-first build sprint: live stream, ship AI-assisted products, track every meaningful number, sell the first products, and show the receipts.

Brand:

- Parent: AI with Murda
- Campaign: 60-Day AI Operator Sprint
- Artifact: 60-Day Command Center
- Product 1: The Future Proof Method
- Product 2: New Wave Live Builds
- Company bridge: Built with Codex, Claude Code, and Backbone Solutions

Audience:

- People watching from Twitch, YouTube, TikTok, Instagram, clips, and social posts
- AI-curious creators and small-business owners
- People who want to see real building, not guru polish
- Buyers who want templates, proof systems, and operator workflows extracted from the sprint

## Current Routes That Must Keep Working

- `/` campaign home
- `/60` public dashboard and scoreboard
- `/live` livestream hub and command center
- `/tools` public tools/resources shelf
- `/start` email capture
- `/kit` Future Proof Method sales page
- `/live-builds` New Wave Live Builds offer page
- `/members` Supabase-gated member hub
- `/members/module/:moduleKey` individual member modules
- `/day/:day` public daily receipt pages
- `/admin` private control room
- `/overlay` OBS overlay
- `/overlay/followers` follower ticker overlay
- `/obs` OBS alias
- `/obs/followers` follower ticker alias

## What Must Not Change

- Do not change payment ownership. AI with Murda uses Backbone Solutions Stripe only.
- Do not use Haas Stripe, Haas product names, or Haas env values.
- Do not remove Supabase login or entitlement checks.
- Do not expose `/admin` publicly.
- Do not expose gated member assets without a valid member session and entitlement.
- Do not break OBS overlay dimensions or transparency.
- Do not remove prelaunch preview labeling until launch day reset.
- Do not run `npm run baseline:launch:push` unless Murad explicitly says it is launch day and asks for it.
- Do not commit secrets or print secrets.

## Redesign Goal

The site currently works, but it can feel dense. The redesign should make it feel like a premium live control room and public proof show, not a generic AI SaaS page and not a classroom course page.

The new experience should answer these questions quickly:

1. What is Murad doing?
2. Is this live or prelaunch?
3. What are the current numbers?
4. Where do I watch?
5. What can I buy or join?
6. If I paid, what do I do next?
7. If I am Murad, where do I operate the launch from?

## Design Direction

Physical scene:

Late-night creator control room before a high-stakes live stream. Multiple monitors, scoreboard receipts, chat commands, a visible build log, and product drops turning into proof in real time. It should feel ambitious, slightly raw, practical, and accountable.

Use this mood:

- Streamer control room
- Public scoreboard
- Operator cockpit
- Proof receipts
- Build-in-public archive
- Product drop desk

Avoid:

- Generic AI gradient SaaS
- Calm beige creator funnel
- Classroom LMS feel
- Fake luxury guru polish
- Purple-blue AI blob aesthetic
- Endless equal-height cards
- Repeating tiny all-caps labels above every section
- Overly complex pages where every tool appears at once

Keep:

- Dark base
- Green command-center identity
- Amber proof/completion accent
- Clear contrast
- Dense but readable operator UI
- Very obvious CTAs
- Live/status language

Improve:

- Visual hierarchy
- First-viewport clarity
- Public route storytelling
- Member hub simplicity
- Mobile readability
- Reusable section patterns
- Dashboard polish
- Offer page conversion

## Information Architecture Recommendation

### Public Home `/`

Primary job: explain the show and drive people to watch, view scoreboard, or join.

Suggested first viewport:

- H1: `60 days. One public AI operator sprint.`
- Live/prelaunch status strip
- Primary CTA: `Watch live` or `Open live room`
- Secondary CTA: `View scoreboard`
- Tertiary CTA: `Get the build log`
- Current proof strip: revenue, followers, emails, builds shipped, clips posted

Keep the scoreboard/proof close to the top. The numbers are the main character.

### Scoreboard `/60`

Primary job: public accountability.

Make it feel like a broadcast-ready control panel:

- Current day/status
- Main goal progress
- Daily deltas
- Follower/email/revenue/build/clip counters
- Spike detection
- Best week/day callouts
- Daily receipt links

Do not turn this into a decorative dashboard. It is proof.

### Live Hub `/live`

Primary job: where viewers go during stream.

Make it feel like the stream lobby:

- Main room status
- Platform buttons
- Chat commands
- Today's build target
- Privacy-safe proof checklist
- Links to scoreboard, kit, live builds, member area

### Kit `/kit`

Primary job: sell The Future Proof Method.

Position it as:

`A proof-based operator kit extracted from the 60-day sprint, not a passive course.`

Sections:

- Promise
- Who it is for
- What they get
- Module path
- Proof outputs
- Downloads/assets
- Price `$47`
- Checkout CTA
- FAQ

### Live Builds `/live-builds`

Primary job: sell the higher-touch room/ticket.

Position it as:

`Watch a real workflow get picked, built, packaged, and turned into a money-path receipt.`

Sections:

- Founding room promise
- What happens in the room
- Candidate builds
- Buyer prep
- What they leave with
- Price `$97`
- Waitlist + checkout CTA

### Members `/members`

Primary job: make paid buyers know exactly what to do next.

Current direction is right: keep tabs.

Top-level tabs:

- `Today`: one next action only
- `Course`: modules and checklist
- `Tools`: downloads/assets
- `Proof`: proof receipt builder
- `Finish`: capstone, certificate, share pack

Rule:

Do not show every tool at once. Buyers should feel, "I know what to do next," not, "I bought a filing cabinet."

### Admin `/admin`

Primary job: Murad's private control room.

This can be denser than public pages, but it should still feel organized:

- Daily log
- Scoreboard sync
- Clip packet
- Run sheet
- Stream setup
- Privacy guard
- Offer Ops
- Subscriber summary

Do not redesign it like a marketing page. It is a work surface.

## Suggested Visual System

Use a small set of reusable patterns:

- `CommandHeader`: page title, status, primary action
- `SignalStrip`: compact metrics/status row
- `ProofPanel`: before/after/receipt proof block
- `RoomCard`: platform/live destination block
- `OperatorStep`: numbered workflow step only when sequence matters
- `AssetShelf`: grouped downloads, collapsed on mobile
- `ModuleRail`: module progress and next action
- `AdminPanel`: dense private tool surface

Token direction:

```css
--bg: #050807;
--surface: #0b1210;
--surface-2: #101a16;
--border: #22342d;
--text: #f4fbf6;
--muted: #9eb0a8;
--green: #61e36d;
--green-strong: #22c84d;
--amber: #f7c948;
--blue: #4f8dff;
--danger: #ff6961;
```

Do not flood the page with green glow everywhere. Green should mean command/action/live. Amber should mean proof/completion.

Typography:

- Use the existing sans stack unless deliberately improving it.
- Keep product UI readable.
- Avoid oversized headings inside compact panels.
- No negative letter spacing.
- No tiny uppercase label repeated above every single block unless it is genuinely useful.

## Implementation Plan

### Phase 1: Design Audit And Shell

- Audit `src/App.jsx` route sections.
- Audit `src/styles.css` for repeated patterns.
- Create/clean shared visual primitives in CSS.
- Improve nav/header consistency.
- Keep route behavior unchanged.

### Phase 2: Public Story Redesign

Redesign:

- `/`
- `/live`
- `/60`
- `/tools`
- `/start`

Goal:

People understand the show and know where to watch/join within 10 seconds.

### Phase 3: Offer Pages

Redesign:

- `/kit`
- `/live-builds`

Goal:

Make the offers feel premium, concrete, and proof-backed. Keep checkout APIs unchanged.

### Phase 4: Member Hub Polish

Redesign:

- `/members`
- `/members/module/:moduleKey`

Goal:

Make paid access feel valuable but not overwhelming. Keep `Today`, `Course`, `Tools`, `Proof`, `Finish`.

### Phase 5: Admin / OBS Safety

Only polish layout and readability. Do not break workflows.

Verify:

- `/admin`
- `/overlay`
- `/overlay/followers`
- `/obs`
- `/obs/followers`

### Phase 6: Verification

Run:

```bash
npm run build
npm run smoke:launch
```

Manual checks:

- Log into `/members`
- Confirm tabs work
- Confirm downloads work
- Confirm checkout still redirects correctly
- Confirm `/admin` is login-gated
- Confirm `/obs` still renders safely for OBS

## Claude Design Prompt

Use this prompt if asking Claude Design for the visual concept:

```text
Redesign aiwithmurda.com as a premium live control-room brand for a 60-day AI operator sprint.

This is not a normal SaaS site and not a passive course. It is an entertainment-first public proof engine: Murad livestreams himself building AI-assisted products, tracking revenue/followers/email/builds/clips, selling The Future Proof Method, and showing daily receipts.

Create a cohesive web design direction for these routes:
- Home
- Public scoreboard
- Live stream hub
- Future Proof Method sales page
- New Wave Live Builds offer page
- Member hub
- Admin control room

Design mood:
- late-night creator control room
- streamer scoreboard
- proof receipts
- operator cockpit
- public build archive

Avoid:
- generic AI gradients
- purple-blue blob SaaS
- beige creator funnel
- classroom LMS feel
- fake luxury guru polish
- endless equal cards

Keep:
- dark command-center base
- green command/live identity
- amber proof/completion accent
- visible scoreboard/proof near the top
- clear CTAs
- mobile readability

Important UX:
- Home must explain the show in under 10 seconds.
- Scoreboard is the main character.
- Live page must work like a stream lobby.
- Kit page must sell a $47 proof-based operator kit.
- Member hub must be dummy-proof: Today, Course, Tools, Proof, Finish.
- Admin must feel like a private cockpit, not marketing.

Deliver:
1. Visual direction summary.
2. Suggested homepage layout.
3. Suggested scoreboard layout.
4. Suggested member hub layout.
5. Color/type/spacing system.
6. Component inventory.
7. Notes for React implementation.
```

## Claude Code Implementation Prompt

Use this prompt if asking Claude Code to actually edit the repo:

```text
You are redesigning the existing aiwithmurda.com React/Vite site in this repo.

Read:
- PRODUCT.md
- PRODUCT-STACK.md
- LAUNCH-ROADMAP.md
- CLAUDE-DESIGN-REDESIGN-BRIEF.md
- src/App.jsx
- src/styles.css
- src/data/product.js
- src/data/liveBuilds.js
- src/data/seed.js

Goal:
Redesign the site to feel like a premium live control room for Murad's 60-day AI operator sprint while preserving every existing route, API call, checkout flow, Supabase auth flow, member entitlement gate, admin gate, and OBS overlay route.

Do not rewrite backend logic unless a style/layout change absolutely requires a small prop/class adjustment.

Primary work files:
- src/App.jsx
- src/styles.css

Preserve:
- Backbone Stripe only
- Supabase auth and entitlements
- /admin login protection
- /members paid access logic
- /overlay and /obs behavior
- all smoke-test-visible copy/route markers unless updating tests intentionally

Design target:
- home and public pages should feel like a broadcast control room, not generic AI SaaS
- scoreboard/proof should become visually central
- member hub should remain tabbed and dummy-proof
- offer pages should feel premium and proof-backed
- admin should be clearer but dense

Implement in conservative phases:
1. Clean shared visual shell and CSS primitives.
2. Redesign home/live/public storytelling sections.
3. Polish /kit and /live-builds offer surfaces.
4. Polish /members and module pages.
5. Light admin readability pass.
6. Verify responsive behavior.

After edits, run:
npm run build
npm run smoke:launch

Return:
- summary of changed routes
- files changed
- any tests that failed
- next recommended polish pass
```

