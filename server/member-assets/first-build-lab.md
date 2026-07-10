# First Build Lab

Pick one track. Every track uses the same standard: one user, one action, one visible success state, one verification path.

## Track A - Start something new

Recommended build: a one-page utility.

Examples:

- Quote or estimate calculator
- Checklist generator
- Simple intake form with confirmation
- Text formatter or converter
- Small reference dashboard using local sample data

Scope template:

```text
User: [one person]
Problem: [one repeated pain]
Action: [one primary action]
Success state: [one visible result]
Failure or empty state: [one handled condition]
Non-goals: accounts, payments, admin, automation, production database, mobile app
```

Starter script:

```text
Help me reduce this idea to one useful screen. It must have one user, one primary action, one visible success state, and one handled empty or error state. List non-goals and a verification path before choosing the stack.
```

## Track B - Improve an existing project

Recommended build: fix one path a real user already touches.

Examples:

- Clarify a confusing form
- Fix a broken mobile layout
- Add a useful empty or error state
- Reduce the steps in one workflow
- Add one missing validation or confirmation

Scope template:

```text
User path:
Current behavior:
User pain:
Smallest useful change:
Preserved behavior:
Non-goals:
Verification viewport, command, or test:
```

Starter script:

```text
Inspect this project before editing. Trace [USER PATH], capture the current behavior, identify the smallest valuable improvement, list preserved behavior and non-goals, and tell me exactly how we will verify it.
```

## Track C - Automate a workflow

Recommended build: improve one manual handoff with sample data first.

Examples:

- Turn a form response into a formatted summary
- Rename and organize a small batch of sample files
- Convert a CSV row into an email draft
- Produce a daily report from local sample data
- Validate an input and route it to one of two outputs

Workflow map:

```text
Trigger:
Input:
Decision or rule:
Output:
Human approval point:
Failure state:
Sample data:
Non-goals: live credentials, production APIs, automatic sending, destructive file actions
```

Starter script:

```text
Map this manual workflow before choosing tools. Identify the trigger, inputs, decisions, outputs, failure cases, and human approval points. Build the first version with sample data and no production credentials or automatic side effects.
```

## Universal build brief

- User:
- Starting state:
- One primary action:
- Success state:
- Failure or empty state:
- Three non-goals:
- Relevant files:
- Main risk:
- Verification path:
- Stop condition:

## Done criteria

- [ ] The real path starts from a documented state.
- [ ] The user can perform the one primary action.
- [ ] The success state is visible.
- [ ] One empty or failure state is handled.
- [ ] Project tests and build checks pass where applicable.
- [ ] The README explains how to run the project.
- [ ] The next-build handoff separates done work from future ideas.
