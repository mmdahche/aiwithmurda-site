---
name: AI with Murda member operator workspace
description: Locked information architecture and access behavior for the paid member experience.
type: architecture
source: rubyx
date_added: 2026-07-10
---

# Member Operator Workspace

## Product Decision

The member area is a focused product workspace, not another brand spectacle. It keeps the public visual identity but prioritizes familiar navigation, one next action, course progress, and direct access to working tools.

## Information Architecture

- Paid products never stack into one long page. Members with multiple entitlements switch between The Future Proof Method and New Wave Operator Bundle.
- The Future Proof Method uses five explicit areas: Start, Build path, Script vault, Build log, and Ship.
- Start shows one next unfinished task, a four-step first session, and one of three first-build tracks.
- Build path has one five-module, 20-step implementation sequence. Full frameworks, examples, workshops, questions, and traps remain collapsed until requested inside each lesson.
- Script vault is a searchable resource list rather than a dense card grid.
- Build log keeps the implementation receipt builder, with the generated receipt preview collapsed until requested.
- Ship keeps completion criteria, first-build handoff, certificate, and share pack.
- Mobile shows all five workspace destinations at once; the global site navigation uses an explicit menu button.

## Authentication

- Member access supports Supabase email/password sign-in and account creation.
- Magic-link login remains available as a recovery path for existing profiles without passwords.
- Account state, sign-out, checkout recovery, product entitlement, asset download, progress update, and completion-draft behavior remain intact.

## Verification Standard

Use temporary Supabase QA members for authenticated Playwright checks. Grant only the entitlements needed for the visual state, delete the user after the run, and never use Murad's account for automation.
