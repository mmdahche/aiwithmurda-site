# Behavioral Validation — TDD for skills

A skill that READS right can still change nothing. Static review checks
wording; it does not prove the skill alters agent behavior. For skills that
enforce discipline or gate dangerous actions, run this loop before trusting
them. (For low-stakes convenience skills, skip this — over-testing trivia is
its own waste.)

## The core principle

**If you didn't watch an agent fail without the skill, you don't know if the
skill teaches the right thing.** (Principle popularized by obra/superpowers.)

## RED / GREEN / REFACTOR

### 1. RED — baseline failure

Run a fresh agent session on a scenario the skill should govern, WITHOUT the
skill installed. Watch what it does.

- If it already behaves correctly unprompted → the skill teaches nothing.
  Reconsider whether it should exist.
- If it fails → note exactly HOW it fails. That failure is your test case.

Example: you're validating a "verify before claiming done" skill. RED run:
ask the agent to fix a bug and watch whether it claims success without
running the app. If it runs the app unprompted, your skill is redundant.

### 2. GREEN — behavior change

Install the skill. Run a FRESH session (no memory of the RED run) on the
same scenario. Confirm the behavior changed to match the skill's intent.

- Same failure as RED → the skill isn't firing (description problem — see
  `description-writing.md`) or isn't teaching (body problem).
- New, different failure → the skill fires but teaches the wrong thing.

### 3. REFACTOR — close the loopholes

Agents follow the letter and miss the spirit. If the GREEN run technically
complied but dodged the intent (e.g. "ran" a test by describing what the
test would do), tighten the wording that permitted the dodge and re-run
GREEN. One loophole closed per iteration; re-test after each.

## Practical notes

- **Fresh sessions matter.** A session that watched you install the skill
  behaves differently than a cold one. Always validate cold.
- **One scenario is enough to start.** Three RED/GREEN cycles on one good
  scenario beat one lazy pass on five.
- **Log the runs.** Keep the RED transcript and the GREEN transcript next to
  the skill. When the skill drifts months later, you'll know what "working"
  looked like.
- **Re-validate after big model upgrades.** A skill written to correct one
  model generation's habit may be redundant — or newly insufficient — on the
  next.

## When to apply

| Skill type | Validate? |
|---|---|
| Enforces discipline (verification, review gates, scope guards) | YES — always |
| Gates destructive actions (deploys, deletes, payments) | YES — always |
| Orchestrates a multi-stage pipeline | YES for the verify stage at minimum |
| Convenience formatting / lookup / boilerplate | No — static review is enough |
