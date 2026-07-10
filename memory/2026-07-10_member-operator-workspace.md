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

- Paid products never stack into one long page. Members with multiple entitlements switch between The Future Proof Method and New Wave Live Builds.
- The Future Proof Method uses five explicit areas: Home, Course, Library, Proof, and Finish.
- Home shows one next unfinished task. First-session onboarding appears only before the first task is complete.
- Course has one five-module path. The former workbench and roadmap duplication was removed from the overview; full prompts, examples, checklists, and downloads remain inside each module.
- Library is a searchable resource list rather than a dense card grid.
- Proof keeps the receipt builder, with the generated receipt preview collapsed until requested.
- Finish keeps completion criteria, capstone receipt, certificate, share pack, and future live-drop information.

## Authentication

- Member access supports Supabase email/password sign-in and account creation.
- Magic-link login remains available as a recovery path for existing profiles without passwords.
- Account state, sign-out, checkout recovery, product entitlement, asset download, progress update, and completion-draft behavior remain intact.

## Verification Standard

Use temporary Supabase QA members for authenticated Playwright checks. Grant only the entitlements needed for the visual state, delete the user after the run, and never use Murad's account for automation.
