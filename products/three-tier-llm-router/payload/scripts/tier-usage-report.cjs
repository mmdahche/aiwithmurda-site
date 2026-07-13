#!/usr/bin/env node
// tier-usage-report.cjs — distribution + perf summary over recent calls.
// Usage: node scripts/tier-usage-report.cjs [N]   (default N=100)

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function routerHome() {
  return process.env.ROUTER_HOME || path.join(os.homedir(), '.router');
}

const USAGE_LOG = process.env.ROUTER_USAGE_LOG ||
  path.join(routerHome(), 'memory', 'tier-usage.jsonl');
const N = parseInt(process.argv[2] || '100', 10);

// Minimal .env loader — does not overwrite existing process.env entries.
(() => {
  try {
    const envPath = path.join(routerHome(), '.env');
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch (_) { /* optional */ }
})();

const LOCAL_OLLAMA_ENABLED = /^(1|true|yes|on)$/i.test(
  process.env.LOCAL_OLLAMA_ENABLED || process.env.TIER1_ENABLED || ''
);

function loadEntries() {
  if (!fs.existsSync(USAGE_LOG)) return [];
  const raw = fs.readFileSync(USAGE_LOG, 'utf8');
  return raw.trim().split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch (_) { return null; }
  }).filter(Boolean);
}

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }

function normalizeClass(cls) {
  if (cls === 1 || cls === '1') return 'chat';
  if (cls === 2 || cls === '2') return 'cheap';
  if (cls === 3 || cls === '3') return 'precision';
  if (cls === 'deepseek' || cls === 'cheap_overflow') return 'cheap';
  return cls;
}

function main() {
  const all = loadEntries();
  const window = all.slice(-N);

  if (window.length === 0) {
    console.log(`No entries in ${USAGE_LOG} yet.`);
    return;
  }

  const total = window.length;
  const byClass = { chat: 0, cheap: 0, precision: 0 };
  const byModel = {};
  let totalLatency = 0;
  let latencyCount = 0;
  let fallbackCount = 0;
  let verifyFlaggedCount = 0;
  let errorCount = 0;

  for (const e of window) {
    const cls = normalizeClass(e.class);
    if (byClass[cls] !== undefined) byClass[cls]++;
    if (e.model) byModel[e.model] = (byModel[e.model] || 0) + 1;
    if (typeof e.latency_ms === 'number') {
      totalLatency += e.latency_ms;
      latencyCount++;
    }
    if (e.fallback) fallbackCount++;
    if (e.verification_flags) verifyFlaggedCount++;
    if (e.error) errorCount++;
  }

  const targets = LOCAL_OLLAMA_ENABLED
    ? { chat: 30, cheap: 40, precision: 30 }
    : { chat: 0, cheap: 70, precision: 30 };
  const tolerance = 10;

  console.log(`\n# Tier-usage report — last ${total} calls\n`);
  if (!LOCAL_OLLAMA_ENABLED) {
    console.log('Local Ollama disabled; chat/light work is expected to route to cheap remote.\n');
  }

  console.log('Distribution by class:');
  for (const cls of ['chat', 'cheap', 'precision']) {
    const pct = Math.round((byClass[cls] / total) * 100);
    const target = targets[cls];
    const within = Math.abs(pct - target) <= tolerance;
    const flag = within ? 'ok' : (pct > target ? 'OVER' : 'UNDER');
    console.log(`  ${pad(cls, 10)} ${pad(byClass[cls], 4)} ${pad(`${pct}%`, 5)}  target ${target}% ±${tolerance}%  ${flag}`);
  }

  console.log('\nDistribution by model:');
  for (const [m, c] of Object.entries(byModel).sort((a, b) => b[1] - a[1])) {
    const pct = Math.round((c / total) * 100);
    console.log(`  ${pad(m, 32)} ${pad(c, 4)} ${pct}%`);
  }

  const avgLatency = latencyCount ? Math.round(totalLatency / latencyCount) : 0;
  console.log(`\nAvg latency: ${avgLatency}ms (${latencyCount} samples)`);
  console.log(`Fallback events: ${fallbackCount}`);
  console.log(`Verification-flagged: ${verifyFlaggedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('');
}

main();
