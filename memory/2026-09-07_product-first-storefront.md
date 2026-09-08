---
name: Product-first storefront implementation
description: Approved reference strategy implemented as explicit free/paid browsing and useful plain-English tool cards, preserving purchase and access boundaries.
type: project
source: rubyx
date_added: 2026-09-07
---

# Product-First Storefront

Murad approved the September 7 reference-study recommendations. The local preview now leads with a short founder intro, Free Tools / Paid Packages / All Tools choices, one free pack with three parts, three featured paid tools, and then package comparison. The full shop retains all 17 paid tool folders, searchable by plain name, old name, description, or inclusions.

Cards name the job, three contents, file format, prerequisites, containing package, and billing. Paid examples are limited source-checked excerpts, not full public payloads. The Save Draft example is labeled fictional. Every nonfeatured card shows verified filenames. Free preview links select the correct file in the existing interactive sampler.

URLs preserve free/paid modes across reload and browser history. All Tools does not count three sampler parts as three additional products. No unconfigured standalone buy links or proposed standalone prices are shown.

The $47/$97 once and Toolkit $327 today then $30/month terms remain unchanged. Operator Arsenal remains an older separate $497-today/$30-month package. Existing entitlement keys, Backbone Stripe, Supabase, download library, and course workspaces are preserved. No production deployment was performed.

See `../STOREFRONT-IMPLEMENTATION.md` for tests and publication gates. Local UI tests mock auth, email, payments, and protected downloads; they are not live buyer or fresh-install verification. Preview remains `http://127.0.0.1:5173`.
