# Day 2 Live Run Sheet - Backbone POS Transactions

## Today's Public Goal

Build the Backbone POS Transactions screen and ship the strongest tested slice we can complete today.

## Success Levels

- **Floor:** Prove the transaction server logic with tests for payments, refunds, voids, filters, and search.
- **Target:** Connect the POS app to that transaction data and pass the client tests.
- **Stretch:** Show a working Transactions screen with type filters and search.

The stream is successful when the floor is complete. Target and stretch are upside, not promises.

## Opening Script

Welcome to Day 2 of my 60-day AI operator sprint. Over these 60 days, I am building in public and working toward two goals: growing this into a real online business and building an audience around the process. You are going to see the real work, including what ships, what breaks, what makes money, and what I learn along the way.

Yesterday became a full troubleshooting day. I spent most of it stabilizing the stream itself: OBS, the camera, microphone routing, music, overlays, recording quality, and the delay between what I was doing and what viewers saw. I did not get the build stream I planned, but I am keeping that as Day 1 because it is part of the real process.

My software journey started with an inventory management system. Running a retail business showed me how much damage bad inventory causes, so inventory felt like the obvious place to begin. But as I kept building, I realized inventory cannot operate by itself. The point of sale is the transaction layer. It records what is sold, changes inventory, handles payments and refunds, feeds reporting, and eventually connects the rest of the Backbone platform.

So today we are moving the Backbone POS forward. The server side of a transaction history is partly built. Over the next few hours, I want to prove that logic with tests, connect it to the app, and see how far we can get toward a working Transactions screen for payments, refunds, voids, filters, and search.

I am building with Claude Code and Codex beside me. I will explain the decisions and the problems in plain English, but this is not a polished tutorial. It is the real build. By the end, we will either have a working screen or a clear tested milestone that moves the product forward.

## Three-Hour Schedule

### 0:00-0:10 - Welcome and the 60-Day Story

- Deliver the opening script.
- Show the public scoreboard.
- Explain that Day 1 was troubleshooting and Day 2 begins the real build phase.
- Tell viewers the floor, target, and stretch goals.

Chat prompt: "What is the worst part of the POS system you use today?"

### 0:10-0:20 - Why Inventory Led to POS

- Explain the original inventory-management-system idea.
- Explain why a POS became necessary to power inventory, sales, refunds, reporting, and future products.
- Show the Backbone product briefly without exposing private customer data, credentials, or production secrets.

### 0:20-0:30 - Current State and Build Map

- Open the locked POS build notes.
- Explain what already exists: the server half of the transaction ledger.
- Explain today's order: server tests, app connection, then the Transactions screen.
- State the floor, target, and stretch goals again for late arrivals.

### 0:30-1:10 - Build Block 1: Prove the Server

- Add tests for date range, tender type, transaction type, and search validation.
- Test payments, refunds, voids, and partial-refund rows.
- Run the focused tests and fix the first real failure.

Narration rule: explain what the test protects and why a store owner would care. Do not narrate every line of code.

### 1:10-1:20 - Checkpoint and Chat

- Show what passed and what failed.
- Mark the first completed item on the public Day 2 board.
- Read chat and answer two or three questions.
- Restate the next target in one sentence.

### 1:20-2:00 - Build Block 2: Connect the POS App

- Wire the app request to the transaction filters.
- Normalize the transaction data safely for the mobile app.
- Add and run the client tests.
- Keep the result honest if the server works but the app connection is not complete.

### 2:00-2:10 - Privacy Break

- Switch to Privacy / BRB before opening any account, key, deployment setting, or customer data.
- Keep licensed stream music available.
- Check Restream chat, OBS health, camera, microphone, and dropped frames.

### 2:10-2:50 - Build Block 3: Make It Visible

- Add the Transactions tab.
- Add Payments, Refunds, and Voids controls.
- Add search and transaction rows.
- Test the strongest visible path available in the remaining time.

If Build Block 2 is incomplete, stay there. Do not rush into UI just to create the appearance of progress.

### 2:50-3:05 - Test, Commit, and Capture Proof

- Run the focused tests.
- Capture the strongest proof: a passing test, working API response, or working screen.
- Commit the finished slice only if it is genuinely complete.
- Update the Day 2 public work board.

### 3:05-3:15 - Closing Recap

- What existed before the stream?
- What works now?
- What broke or slowed the build?
- What did the AI help with, and what required your judgment?
- What is the next exact POS milestone?
- Remind viewers where to see the live scoreboard and follow the build.

## Checkpoint Script

If you are just joining, this is Day 2 of my 60-day build in public. I started with inventory software, realized the POS has to become the transaction layer for the full platform, and today we are building the POS transaction history. Right now we have completed [say the finished milestone], and next we are working on [say the active milestone].

## Closing Script

That is the end of today's build block. We started with [before state]. We finished with [working result]. The biggest issue was [failure or friction], and the main lesson was [lesson]. I am recording the real result on the Day 2 dashboard, including anything that did not work. The next POS step is [next milestone], and that is where the next build stream will begin.

## On-Stream Rules

- Explain decisions, customer value, and failures; do not read code aloud.
- Give late viewers a 20-second recap at every checkpoint.
- Switch to Privacy / BRB before credentials, customer data, billing, deployment settings, or private messages appear.
- Never claim a feature shipped until the relevant test or working screen proves it.
- If one bug consumes the stream, turn the diagnosis and fix into the story instead of hiding it.
- Update the public queue when a milestone starts or finishes so viewers can follow the build without asking.
