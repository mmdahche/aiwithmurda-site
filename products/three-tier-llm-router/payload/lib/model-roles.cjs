// model-roles.cjs — flat per-role model config loader.
// Resolves a tier's model string from a JSON file. Single source of truth for
// the router's model assignments, auditable in one human-readable file.
//
// Resolution order:
//   1. $ROUTER_HOME/model-roles.json                    (user override)
//   2. <package>/model-roles.json (bundled default)     (packaged fallback,
//                                                        resolved relative to
//                                                        this file: lib/../)
//
// Backward-compat is the contract: if BOTH files are missing/unreadable/malformed,
// every resolve() returns null and callers fall back to their hardcoded defaults.
// NEVER throws.
//
// Precedence (enforced by the callers, not here):
//   env var > this file > hardcoded default.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function routerHome() {
  return process.env.ROUTER_HOME || path.join(os.homedir(), '.router');
}

function candidatePaths() {
  return [
    path.join(routerHome(), 'model-roles.json'),
    path.join(__dirname, '..', 'model-roles.json'),
  ];
}

// Cache the parse result after the first successful attempt. `undefined` = not
// yet loaded, `null` = all candidates exhausted, object = parsed config.
let _cache;
let _warned = false;

function load() {
  if (_cache !== undefined) return _cache;
  for (const fp of candidatePaths()) {
    try {
      const raw = fs.readFileSync(fp, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        _cache = parsed;
        return _cache;
      }
    } catch (_) {
      // try next candidate
    }
  }
  if (!_warned) {
    _warned = true;
    try { process.stderr.write('[model-roles] config not loaded; using hardcoded defaults\n'); } catch (_) {}
  }
  _cache = null;
  return _cache;
}

/**
 * Resolve a model string for a tier from model-roles.json.
 * @param {string} tierKey  e.g. 'tier1_local', 'tier2_cheap', 'tier2b_overflow', 'tier3_precision'
 * @param {string} [field='model']  'model' or 'fallback_model'
 * @returns {string|null}  the model string, or null if missing/unreadable.
 */
function resolve(tierKey, field = 'model') {
  const cfg = load();
  if (!cfg || !cfg.tiers || typeof cfg.tiers !== 'object') return null;
  const tier = cfg.tiers[tierKey];
  if (!tier || typeof tier !== 'object') return null;
  const val = tier[field];
  return typeof val === 'string' && val.length > 0 ? val : null;
}

module.exports = { resolve };
