// fireworks-client.cjs — Tier 2.5 (Fireworks AI, OpenAI-compatible)
// Used as overflow when Groq quota is hit, or directly for the deepseek flag.

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

const BASE = process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1';
const KEY = process.env.FIREWORKS_API_KEY || '';
const PRIMARY = process.env.FIREWORKS_PRIMARY_MODEL || roles.resolve('tier2b_overflow') || 'accounts/fireworks/models/deepseek-v3';
const FALLBACK = process.env.FIREWORKS_FALLBACK_MODEL || roles.resolve('tier2b_overflow', 'fallback_model') || 'accounts/fireworks/models/llama-v3p1-70b-instruct';

const RETRY_STATUSES = new Set([429, 502, 503, 504]);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function callFireworks({ system, prompt, model, temperature, max_tokens, timeout, retries } = {}) {
  if (!KEY) throw new Error('FIREWORKS_API_KEY missing');
  if (!prompt && !system) throw new Error('callFireworks: prompt or system required');

  const useModel = model || PRIMARY;
  const inputSize = (system?.length || 0) + (prompt?.length || 0);
  // Base 180s + 1s per 1K input chars, capped at 300s. The higher base timeout
  // handles large synthesis jobs where 6K-token outputs otherwise abort near 100s
  // and force a cascade to the precision tier.
  const autoTimeout = Math.min(300000, 180000 + Math.floor(inputSize / 1000) * 1000);
  const timeoutMs = timeout ?? autoTimeout;
  const maxRetries = retries ?? 1;

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  if (prompt) messages.push({ role: 'user', content: prompt });

  const body = {
    model: useModel,
    messages,
    max_tokens: max_tokens ?? 1024,
    temperature: temperature ?? 0.7,
    stream: false,
  };

  let attempt = 0;
  let lastErr;

  while (attempt <= maxRetries) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const err = new Error(`Fireworks HTTP ${res.status}: ${errText.slice(0, 300)}`);
        err.status = res.status;
        if (RETRY_STATUSES.has(res.status) && attempt < maxRetries) {
          await sleep(1500 * Math.pow(2, attempt));
          attempt++;
          lastErr = err;
          continue;
        }
        logSoftFailure('fireworks-client', err, { model: useModel, status: res.status });
        throw err;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';

      return {
        text,
        model: useModel,
        latency_ms: Date.now() - start,
        usage: data?.usage || {},
        raw: data,
      };
    } catch (e) {
      const isAbort = e?.name === 'AbortError' || /aborted/i.test(e?.message || '');
      const retryable = isAbort || (e?.status && RETRY_STATUSES.has(e.status));
      if (retryable && attempt < maxRetries) {
        await sleep(1500 * Math.pow(2, attempt));
        attempt++;
        lastErr = e;
        continue;
      }
      logSoftFailure('fireworks-client', e, { model: useModel });
      throw e;
    }
  }

  throw lastErr || new Error('Fireworks: retries exhausted with no captured error');
}

async function probeHealth() {
  if (!KEY) return { ok: false, reason: 'FIREWORKS_API_KEY missing' };
  try {
    const res = await fetch(`${BASE}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, reason: `models HTTP ${res.status}` };
    return { ok: true, primary: PRIMARY, fallback: FALLBACK };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

module.exports = { callFireworks, probeHealth, PRIMARY, FALLBACK, BASE };
