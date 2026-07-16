# Walkthrough — Multi-step form automation

**Goal:** Fill a three-field contact form on a staging site and verify the
success message — without storing credentials in the robot file.

## Setup

1. Install the skill: `bash install/setup.sh`
2. Set `STAGING_FORM_URL` in your shell (your test site)
3. Confirm domain is on your allowlist

## Steps

1. Ask the agent to **scope** the task: single page, three fields, success toast
2. **Pick Playwright** — deterministic selectors beat NL for forms
3. **Snapshot** the empty form before filling
4. Fill: name, email, message — use test data, not real PII
5. Submit and **assert** success copy appears within 10s
6. **Receipt:** backend, URL, screenshot paths, selector list used

## If blocked

- Captcha → stop, file blocker report, do not attempt bypass
- Dynamic IDs → prefer `aria-label` or role selectors over brittle `#id` chains

## Done when

You have a screenshot pair (before/after) and a one-paragraph receipt another
operator could replay tomorrow.
