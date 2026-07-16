# VERIFY — Retail Ops AI Pack

## 1. Manifest

```bash
node scripts/verify-product-folder.mjs products/retail-ops-ai-pack
```

Expect PASS, no forbidden source strings (`origin: ECC`, `everything-claude-code`, etc.).

## 2. Install dry run

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
bash products/retail-ops-ai-pack/install/setup.sh
test -f "$CLAUDE_CONFIG_DIR/skills/inventory-demand-planning/SKILL.md"
test -f "$CLAUDE_CONFIG_DIR/skills/returns-reverse-logistics/SKILL.md"
```

## 3. Zip builds

```bash
npm run assets:store
test -f server/member-assets/retail-ops-ai-pack.zip
```

## 4. Store shelf

After deploy, `/store` client bundle includes `Retail Ops AI Pack`.
