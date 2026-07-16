# VERIFY — Design Studio Pack

## 1. Manifest

```bash
node scripts/verify-product-folder.mjs products/design-studio-pack
```

Expect PASS, no forbidden source strings.

## 2. Install dry run

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
bash products/design-studio-pack/install/setup.sh
for s in design-contract anti-slop-audit motion-framework ui-critique; do
  test -f "$CLAUDE_CONFIG_DIR/skills/$s/SKILL.md"
done
```

## 3. Zip builds

```bash
npm run assets:store
test -f server/member-assets/design-studio-pack.zip
```

## 4. Store shelf

After deploy, `/store` client bundle includes `Design Studio Pack`.
