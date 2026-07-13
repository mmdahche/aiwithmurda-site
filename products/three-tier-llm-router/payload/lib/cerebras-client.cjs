// cerebras-client.cjs — Tier 2c (Cerebras Inference, OpenAI-compatible)
// Ultra-fast lane. Reached via the `cerebras` flag or as an additional cheap
// fast option. Mirrors fireworks-client.cjs.

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
      // Trim whitespace, then strip one layer of matching surrounding quotes
      // (dotenv-style) so a value saved as "csk-..." doesn't send the quotes.
      let val = line.slice(eq + 1).trim();
      if (val.length >= 2 && ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'"))) {
        val = val.slice(1, -1);
      }
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch (_) { /* optional */ }
})();

const { logSoftFailure } = require('./soft-failure.cjs');
const roles = require('./model-roles.cjs');

const BASE = process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1';
const KEY = process.env.CEREBRAS_API_KEY || '';
// Defaults reflect commonly-available Cerebras Inference models. Override via
// CEREBRAS_PRIMARY_MODEL / CEREBRAS_FALLBACK_MODEL in .env or model-roles.json.
const PRIMARY = process.env.CEREBRAS_PRIMARY_MODEL || roles.resolve('tier2c_cerebras') || 'llama-3.3-70b';
const FALLBACK = process.env.CEREBRAS_FALLBACK_MODEL || roles.resolve('tier2c_cerebras', 'fallback_model') || 'llama-3.1-8b';

const RETRY_STATUSES = new Set([429, 502, 503, 504]);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function callCerebras({ system, prompt, model, temperature, max_tokens, timeout, retries } = {}) {
  if (!KEY) throw new Error('CEREBRAS_API_KEY missing');
  if (!prompt && !system) throw new Error('callCerebras: prompt or system required');

  const useModel = model || PRIMARY;
  const inputSize = (system?.length || 0) + (prompt?.length || 0);
  // Cerebras is very fast; keep a generous but lower cap than Fireworks.
  const autoTimeout = Math.min(180000, 90000 + Math.floor(inputSize / 1000) * 1000);
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
        const err = new Error(`Cerebras HTTP ${res.status}: ${errText.slice(0, 300)}`);
        err.status = res.status;
        if (RETRY_STATUSES.has(res.status) && attempt < maxRetries) {
          await sleep(1500 * Math.pow(2, attempt));
          attempt++;
          lastErr = err;
          continue;
        }
        logSoftFailure('cerebras-client', err, { model: useModel, status: res.status });
        throw err;
      }

      const data = await res.json();
      // Some thinking-style models on Cerebras leave `content` empty and put the
      // output in a separate reasoning field — fall back to it so tiny
      // max_tokens don't yield an empty string.
      const msg = data?.choices?.[0]?.message || {};
      const text = msg.content || msg.reasoning_content || msg.reasoning || '';

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
      logSoftFailure('cerebras-client', e, { model: useModel });
      throw e;
    }
  }

  throw lastErr || new Error('Cerebras: retries exhausted with no captured error');
}

async function probeHealth() {
  if (!KEY) return { ok: false, reason: 'CEREBRAS_API_KEY missing' };
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

module.exports = { callCerebras, probeHealth, PRIMARY, FALLBACK, BASE };
