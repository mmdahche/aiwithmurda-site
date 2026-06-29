# The Future Proof Method - Launch Day Runbook

Use this on the day the 60-day sprint starts. The goal is to make the first stream boring to operate and interesting to watch.

## Pre-Flight

- [ ] Confirm `aiwithmurda.com` loads on HTTPS.
- [ ] Confirm `/60`, `/live`, `/kit`, `/members`, `/day/1`, `/overlay`, and `/obs` load.
- [ ] Run `npm run smoke:tracker`.
- [ ] Run `npm run smoke:funnel`.
- [ ] Confirm the public scoreboard still says prelaunch until the baseline is pushed.
- [ ] Confirm the OBS overlay browser source uses `/obs`.
- [ ] Confirm the public command shelf has `!start`, `!kit`, `!members`, `!live`, and `!scoreboard`.

## Baseline Cutover

Run this only when the sprint is actually starting:

```bash
npm run baseline:launch
npm run baseline:launch:push
```

Then verify:

- [ ] `/60` shows Day 1 baseline.
- [ ] `/day/1` opens as the first public receipt page.
- [ ] Admin daily log opens on Day 1.
- [ ] The launch readiness panel still shows only the manual blockers as manual.

## Stream Room Setup

- [ ] Main camera scene ready.
- [ ] Screen-share scene ready.
- [ ] OBS overlay scene ready.
- [ ] Chat/pinned commands ready.
- [ ] Product link ready: `https://aiwithmurda.com/kit`.
- [ ] Member link ready: `https://aiwithmurda.com/members`.
- [ ] Scoreboard link ready: `https://aiwithmurda.com/60`.
- [ ] One sentence ready for the stream promise.

Stream promise:

```text
I am spending 60 days building in public with AI to prove what can become audience, software, and online income.
```

## First 30 Minutes

1. Say the goal clearly.
2. Show the scoreboard.
3. Show the command center.
4. Show the product page.
5. Explain the first build slice.
6. Start the timer.
7. Begin Module 1: Command Setup.

## First Build Slice

- Problem:
- Before state:
- User path:
- AI partner:
- Files/screens involved:
- Test path:
- Proof target:

Stop the slice when one visible thing works better than before.

## Chat Commands To Pin

```text
!scoreboard - public dashboard
!kit - Future Proof Method kit
!members - member login
!live - live room
!day1 - first daily receipt
```

## Receipt Capture

During the stream, save:

- [ ] Before screenshot.
- [ ] Best prompt.
- [ ] Failure screenshot.
- [ ] Working screenshot.
- [ ] Clip timestamp.
- [ ] Lesson.
- [ ] Tomorrow promise.

## Shutdown

- [ ] Update the daily log.
- [ ] Generate the Day 1 slide.
- [ ] Save the strongest screenshot.
- [ ] Write one clip hook.
- [ ] Write tomorrow's promise.
- [ ] Check `/day/1`.
- [ ] Commit or hand off any code changes.
- [ ] Confirm the first action for Day 2.

## If Something Breaks

- If checkout breaks: stop selling publicly and point viewers to `/start`.
- If member access breaks: collect the buyer email and fix entitlement manually after stream.
- If the overlay breaks: remove the OBS source and keep the scoreboard open in a browser tab.
- If the stream platform breaks: keep recording locally and post the receipt afterward.
- If the build breaks: turn the bug into the proof receipt instead of hiding it.
