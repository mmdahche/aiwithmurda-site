// ollama-client.cjs — Tier 1 (local, free)
// POSTs to /api/chat with system+user messages. Confirms TIER1_MODEL is loaded
// in probeHealth(). Default 120s timeout (local can be slow on cold model load).

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function routerHome() {
  return process.env.ROUTER_HOME || path.join(os.homedir(), '.router');
}

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
  } catch (_) { /* .env optional */ }
})();

const { logSoftFailure } = require('./soft-failure.cjs');
const roles = require('./model-roles.cjs');

const ENABLED = /^(1|true|yes|on)$/i.test(
  process.env.LOCAL_OLLAMA_ENABLED || process.env.TIER1_ENABLED || ''
);
const BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.TIER1_MODEL || roles.resolve('tier1_local') || 'qwen2.5:7b';

async function callOllama({ system, prompt, temperature, max_tokens, timeout } = {}) {
  if (!ENABLED) throw new Error('LOCAL_OLLAMA_ENABLED=false — Tier 1 disabled');
  if (!prompt && !system) throw new Error('callOllama: prompt or system required');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  if (prompt) messages.push({ role: 'user', content: prompt });

  const body = {
    model: MODEL,
    messages,
    stream: false,
    options: {
      temperature: temperature ?? 0.7,
      num_predict: max_tokens ?? 1024,
    },
  };

  const timeoutMs = timeout ?? 120000;
  const start = Date.now();

  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const err = new Error(`Ollama HTTP ${res.status}: ${errText.slice(0, 300)}`);
    logSoftFailure('ollama-client', err, { model: MODEL, status: res.status });
    throw err;
  }

  const data = await res.json();
  const text = data?.message?.content || '';

  return {
    text,
    model: MODEL,
    latency_ms: Date.now() - start,
    usage: {
      prompt_tokens: data?.prompt_eval_count,
      completion_tokens: data?.eval_count,
    },
    raw: data,
  };
}

async function probeHealth() {
  if (!ENABLED) {
    return { ok: true, disabled: true, reason: 'LOCAL_OLLAMA_ENABLED=false', model: MODEL };
  }
  try {
    const res = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, reason: `tags HTTP ${res.status}` };
    const data = await res.json();
    const models = (data?.models || []).map((m) => m.name);
    if (!models.includes(MODEL)) {
      return { ok: false, reason: `model ${MODEL} not loaded; available: ${models.join(', ')}` };
    }
    return { ok: true, model: MODEL, available_models: models };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

module.exports = { callOllama, probeHealth, MODEL, BASE, ENABLED };
