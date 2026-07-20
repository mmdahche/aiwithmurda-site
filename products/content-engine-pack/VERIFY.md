# VERIFY — Content Engine Pack

## 1. Manifest

```bash
node scripts/verify-product-folder.mjs products/content-engine-pack
```

Expect PASS, no forbidden source strings.

## 2. Install dry run

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
bash products/content-engine-pack/install/setup.sh
for s in hooks-angles content-humanizer ugc-scriptwriter trending-content audio-overview; do
  test -f "$CLAUDE_CONFIG_DIR/skills/$s/SKILL.md"
done
```

## 3. Zip builds

```bash
npm run assets:store
test -f server/member-assets/content-engine-pack.zip
```

## 4. Store shelf

After deploy, `/store` client bundle includes `Content Engine Pack`.
