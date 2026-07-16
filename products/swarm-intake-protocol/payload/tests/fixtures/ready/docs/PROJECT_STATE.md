# PROJECT_STATE — sample-app

**Owner:** founder
**Stage:** intake

## 1. What we're building + why

A sample app, used as the swarm-readiness golden fixture.

## 2. Architecture

- module-a — frontend
- module-b — backend
- shared — contracts
- integrations — adapters

## 3. Acceptance criteria

### module-a
- [ ] AC-A1: the landing page renders — verify: component test passes.

### module-b
- [ ] AC-B1: login returns a session — verify: integration test passes.

## 4. Decisions + rationale

| Decision | Why |
|---|---|
| pnpm workspace | JS/TS default |

## 5. Risk register

| # | Risk | Mitigation |
|---|---|---|
| 1 | scope drift | bind scope at task spawn |
