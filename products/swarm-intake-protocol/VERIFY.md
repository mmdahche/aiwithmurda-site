# VERIFY — Swarm Intake Protocol

## 1. Manifest

```bash
node scripts/verify-product-folder.mjs products/swarm-intake-protocol
```

Expect PASS, no forbidden content.

## 2. Readiness tests (21)

From repo root after install, or directly against payload:

```bash
PYTHONUTF8=1 python3 -m pytest products/swarm-intake-protocol/payload/tests/ -q
```

Expect 21 passed.

## 3. Golden fixture READY

```bash
products/swarm-intake-protocol/payload/lib/readiness_check.sh \
  products/swarm-intake-protocol/payload/tests/fixtures/ready --format human
```

Expect exit 0, all C1–C10 PASS.

## 4. Install dry run

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
bash products/swarm-intake-protocol/install/setup.sh
test -f "$CLAUDE_CONFIG_DIR/skills/swarm-intake/SKILL.md"
test -x "$CLAUDE_CONFIG_DIR/skills/swarm-intake/lib/readiness_check.sh"
PYTHONUTF8=1 python3 -m pytest "$CLAUDE_CONFIG_DIR/skills/swarm-intake/tests/" -q
```

## 5. Zip builds

```bash
npm run assets:store
test -f server/member-assets/swarm-intake-protocol.zip
```
