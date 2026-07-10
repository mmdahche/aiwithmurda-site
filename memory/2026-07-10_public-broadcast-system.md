---
name: AI with Murda public broadcast system
description: Verified design direction and production boundaries for the July 2026 public experience.
type: architecture
source: rubyx
date_added: 2026-07-10
---

# Public Broadcast System

## Design Direction

The public experience intentionally combines three influences as one coherent identity:

- Living Proof Broadcast is the foundation: documentary typography, public receipts, and visible work.
- Future Sports Network supplies pacing: scorebugs, tickers, day pressure, and live telemetry.
- Operator World supplies one signature spatial moment: the interactive Three.js 60-day route on the homepage.

Three.js stays reserved for the homepage so the signature moment does not become visual noise. Green represents actions and live state, amber represents day and proof pressure, blue represents future or spatial state, and black/white preserve documentary clarity.

## Production State

- Commit `1e9f9c9` is deployed on Render.
- Redesigned public routes: `/`, `/60`, and `/live`.
- Desktop and mobile Playwright checks passed without page errors or horizontal overflow.
- Reduced-motion behavior and direct WebGL pixel rendering were verified.
- The complete production smoke suite passed for tracker, deck, stream, subscribe, checkout, entitlements, member assets, and progress.

## Protected Boundaries

Public or member interface redesigns must preserve existing Stripe, Supabase, admin access, member entitlement, OBS overlay, tracking, and automation contracts unless Murad explicitly expands the scope.

## Source Handoff

`~/.planning/handoffs/2026-07-09_23-38_rubyx_aiwithmurda_immersive-broadcast-redesign.md`
