# VERIFY — Founder Finance Pack

## 1. Manifest

```bash
node scripts/verify-product-folder.mjs products/founder-finance-pack
```

Expect PASS, no forbidden source strings.

## 2. Install dry run

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
bash products/founder-finance-pack/install/setup.sh
for s in cfo-advisor financial-analyst saas-metrics-coach investor-materials investor-outreach board-deck-builder; do
  test -f "$CLAUDE_CONFIG_DIR/skills/$s/SKILL.md"
done
```

## 3. Zip builds

```bash
npm run assets:store
test -f server/member-assets/founder-finance-pack.zip
```

## 4. Store shelf

After deploy, `/store` client bundle includes `Founder Finance Pack`.
