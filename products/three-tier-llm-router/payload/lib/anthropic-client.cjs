// anthropic-client.cjs — Tier 3 (Anthropic Messages API, precision tier)
// Uses native /v1/messages format with system at top-level, x-api-key +
// anthropic-version headers. probeHealth() does a tiny ping (max_tokens:5) to
// confirm the key works.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function routerHome() {
  return process.env.ROUTER_HOME || path.join(os.homedir(), '.router');
}

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

const { logSoftFailure } = require('./soft-failure.cjs');
const roles = require('./model-roles.cjs');

const BASE = 'https://api.anthropic.com/v1';
const KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.TIER3_MODEL || roles.resolve('tier3_precision') || 'claude-opus-4-7';

async function callAnthropic({ system, prompt, temperature, max_tokens, timeout, model: modelParam } = {}) {
  if (!KEY) throw new Error('ANTHROPIC_API_KEY missing — Tier 3 unavailable');
  if (!prompt) throw new Error('callAnthropic: prompt required');

  const model = modelParam || MODEL;
  const body = {
    model,
    max_tokens: max_tokens ?? 1024,
    messages: [{ role: 'user', content: prompt }],
  };
  // Newer Anthropic model families (opus-4-7+, sonnet-4-7+) deprecate the
  // `temperature` param. Older models still accept it — skip the field for the
  // newer family; otherwise pass it through.
  const supportsTemperature = !/^claude-(opus|sonnet)-4-7/.test(model);
  if (supportsTemperature) body.temperature = temperature ?? 0.7;
  if (system) body.system = system;

  const timeoutMs = timeout ?? 120000;
  const start = Date.now();

  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const err = new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 300)}`);
    err.status = res.status;
    logSoftFailure('anthropic-client', err, { model, status: res.status });
    throw err;
  }

  const data = await res.json();
  const text = (data?.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');

  return {
    text,
    model,
    latency_ms: Date.now() - start,
    usage: data?.usage || {},
    raw: data,
  };
}

async function probeHealth() {
  if (!KEY) return { ok: false, reason: 'no key' };
  try {
    const r = await callAnthropic({ prompt: 'ping', max_tokens: 5, timeout: 12000 });
    return { ok: !!r.text, model: MODEL, sample: r.text };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

module.exports = { callAnthropic, probeHealth, MODEL, BASE };
