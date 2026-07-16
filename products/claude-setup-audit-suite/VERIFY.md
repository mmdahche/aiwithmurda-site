# VERIFY — Claude Setup Audit Suite

Run this on a clean machine after unzip. Every step should pass before you trust
the product in production work.

## 1. File manifest

```bash
node scripts/verify-product-folder.mjs products/claude-setup-audit-suite
```

Expect: `PASS claude-setup-audit-suite` with manifest matching disk.

## 2. Collector runs

```bash
python3 products/claude-setup-audit-suite/payload/audit-collect.py | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['schema_version']"
```

Expect: JSON with `schema_version`, `maturity`, `permissions` keys. Exit 0.

## 3. Eval runner executes

```bash
sh products/claude-setup-audit-suite/payload/run-evals.sh
```

Expect: summary line `config self-test: N passed, 0 failed, M skipped`. Exit 0
when zero failures (all SKIP is OK if no hooks installed).

## 4. Security scanner runs

```bash
python3 products/claude-setup-audit-suite/payload/scripts/skill_security_auditor.py products/operator-sampler/
```

Expect: verdict PASS or WARN on the bundled sampler (known-safe fixture).

## 5. Install script (optional destructive check)

In a temp `$CLAUDE_CONFIG_DIR`:

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
bash products/claude-setup-audit-suite/install/setup.sh
test -x "$CLAUDE_CONFIG_DIR/skills/audit-setup/audit-collect.py"
```

## 6. Forbidden content scan

Included in step 1 — no secret-shaped literals, no reference-source strings, no
absolute user paths.
