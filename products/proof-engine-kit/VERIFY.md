# VERIFY — Proof Engine Kit

## 1. Manifest

```bash
node scripts/verify-product-folder.mjs products/proof-engine-kit
```

Expect PASS, no forbidden content (no live secrets, no absolute user paths).

## 2. JSON schemas valid

```bash
node -e "JSON.parse(require('fs').readFileSync('products/proof-engine-kit/payload/schema/daily-log.schema.json'))"
node -e "JSON.parse(require('fs').readFileSync('products/proof-engine-kit/payload/schema/sprint-config.schema.json'))"
```

## 3. Campaign lib smoke

```bash
node -e "
import { getCampaignState } from './products/proof-engine-kit/payload/lib/campaign.js';
const s = getCampaignState({ startAt: '2099-01-01T00:00:00Z', startDate: '2099-01-01', totalDays: 60 });
if (s.phase !== 'rehearsal') throw new Error('expected rehearsal');
console.log('campaign.js OK');
"
```

## 4. Install dry run

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
bash products/proof-engine-kit/install/setup.sh
test -f "$CLAUDE_CONFIG_DIR/skills/proof-engine/SKILL.md"
```

## 5. Zip builds

```bash
npm run assets:store
test -f server/member-assets/proof-engine-kit.zip
```
