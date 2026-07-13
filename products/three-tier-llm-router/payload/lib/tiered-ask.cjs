// tiered-ask.cjs — the 3-tier router.
// classify -> apply quota -> dispatch -> log -> return
//
// Public API:
//   ask({ purpose, prompt, system, flags, agent, ...passthrough })
//   ping()  // returns health for local, cheap, overflow, and precision tiers
//
// CLI:
//   node lib/tiered-ask.cjs ping
//   node lib/tiered-ask.cjs ask "<prompt>" [--agent <name>]

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function routerHome() {
  return process.env.ROUTER_HOME || path.join(os.homedir(), '.router');
}

// Per-agent model override: reads `model: <id>` from YAML frontmatter of an
// agent-definition markdown file. Directory is configurable via
// ROUTER_AGENTS_DIR; default is $ROUTER_HOME/agents.
function agentsDir() {
  return process.env.ROUTER_AGENTS_DIR || path.join(routerHome(), 'agents');
}

function parseAgentModel(agentName) {
  const dir = agentsDir();
  const candidates = [
    path.join(dir, `${agentName}.md`),
    // strip a leading "gsd-" prefix to accommodate scoped agent names
    path.join(dir, `${agentName.replace(/^gsd-/, '')}.md`),
  ];
  for (const fp of candidates) {
    try {
      const raw = fs.readFileSync(fp, 'utf8');
      const m = raw.match(/^model:\s*(.+)$/m);
      if (m) return m[1].trim();
    } catch (_) { /* file not found, try next */ }
  }
  return null;
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
  } catch (_) { /* optional */ }
})();

const ollama = require('./ollama-client.cjs');
const groq = require('./groq-client.cjs');
const fireworks = require('./fireworks-client.cjs');
const cerebras = require('./cerebras-client.cjs');
const anthropic = require('./anthropic-client.cjs');
const { verifyResponse } = require('./groq-verify.cjs');
const { logSoftFailure } = require('./soft-failure.cjs');
const redactLib = require('./redact.cjs');
const confidenceGate = require('./confidence-gate.cjs');

// ---------- egress redaction (fail-closed) ----------
//
// Before any cloud-tier send (Groq / Fireworks / Cerebras) we scrub the
// outbound prompt + system text. If the scrub throws OR verifyClean() still
// finds a secret, we MUST NOT send to the cheap-tier cloud. Control via env:
//   ROUTER_REDACT_ENABLED        '0'|'false'|'no' to disable (default: ON)
//   ROUTER_REDACT_FAIL_MODE      'escalate' (default) -> bubble up to precision
//                                'abort'              -> throw, no cloud send
//
// The LOCAL (Ollama) tier is exempt — it stays on-machine, no scrub needed.

const REDACT_ENABLED = !/^(0|false|no|off)$/i.test(process.env.ROUTER_REDACT_ENABLED || '1');
const REDACT_FAIL_MODE = (process.env.ROUTER_REDACT_FAIL_MODE || 'escalate').toLowerCase();

class RedactionFailure extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RedactionFailure';
    this.details = details;
  }
}

/**
 * Scrub outbound text for a cloud-tier call. Returns the scrubbed text.
 * Throws RedactionFailure if the scrub fails OR if verifyClean still finds a
 * secret after the scrub — caller MUST NOT send the original to the cloud.
 */
function scrubForEgress(text, label) {
  if (!REDACT_ENABLED) return text;
  if (text === null || text === undefined || text === '') return text;
  let scrubbed;
  let hits;
  try {
    const r = redactLib.redact(text);
    scrubbed = r.clean;
    hits = r.hits;
  } catch (e) {
    throw new RedactionFailure(`scrub threw on ${label}: ${e.message}`, { label, cause: e.message });
  }
  if (!redactLib.verifyClean(scrubbed)) {
    throw new RedactionFailure(
      `secret detected in ${label} AFTER scrub — cannot send to cheap tier`,
      { label, hits }
    );
  }
  return scrubbed;
}

// Confidence gate is OPT-IN to preserve current chat-tier behavior. Set
// ROUTER_CONFIDENCE_GATE_ENABLED=1 to turn on the local-tier early-exit check.
// When OFF, Ollama success is accepted unconditionally (current behavior).
// When ON, a non-HIGH local response escalates to the cheap tier — default-safe.
const CONFIDENCE_GATE_ENABLED = /^(1|true|yes|on)$/i.test(
  process.env.ROUTER_CONFIDENCE_GATE_ENABLED || ''
);

// USAGE_LOG path — overridable via env for tests / alternate deploys.
// Default: $ROUTER_HOME/memory/tier-usage.jsonl.
const USAGE_LOG = process.env.ROUTER_USAGE_LOG ||
  path.join(routerHome(), 'memory', 'tier-usage.jsonl');

const HARD_FLOOR_PURPOSES = new Set([
  'identity_audit',
  'self_modification',
  'phenomenology',
  'architectural_decision',
  'author_voice',
  'high_stakes_review',
]);

const CHAT_PURPOSES = new Set([
  'greeting',
  'echo',
  'classify',
  'label',
  'json_reformat',
  'template_slot_fill',
  'dedup',
  'hash_match',
]);

const CHEAP_PURPOSES = new Set([
  'summarize',
  'summary',
  'enrich',
  'reflexion_first_pass',
  'kg_titling',
  'embedding_title',
  'compact_memory',
  'long_context_analysis',
  'codebase_analysis',
  'research_synthesis',
]);

const CHAT_FLAGS = new Set(['chat', 'light', 'cheap', 'mechanical']);
const CHEAP_FLAGS = new Set(['deepseek', 'cheap_reasoning', 'long_context', 'groq']);

const QUOTA_WINDOW_SIZE = parseInt(process.env.QUOTA_WINDOW_SIZE || '50', 10);
const QUOTA_TARGET_CHAT = parseFloat(process.env.QUOTA_TARGET_CHAT || '0.30');
const QUOTA_TARGET_CHEAP = parseFloat(process.env.QUOTA_TARGET_CHEAP || '0.40');
const QUOTA_TARGET_PRECISION = parseFloat(process.env.QUOTA_TARGET_PRECISION || '0.30');
const QUOTA_TOLERANCE = parseFloat(process.env.QUOTA_TOLERANCE || '0.10');

function normalizeClass(cls) {
  if (cls === 1 || cls === '1') return ollama.ENABLED ? 'chat' : 'cheap';
  if (cls === 2 || cls === '2') return 'cheap';
  if (cls === 3 || cls === '3') return 'precision';
  if (cls === 'deepseek' || cls === 'cheap_overflow') return 'cheap';
  if (cls === 'chat' && !ollama.ENABLED) return 'cheap';
  return cls;
}

function quotaTargets() {
  if (ollama.ENABLED) {
    return {
      chat: QUOTA_TARGET_CHAT,
      cheap: QUOTA_TARGET_CHEAP,
      precision: QUOTA_TARGET_PRECISION,
    };
  }
  return {
    chat: 0,
    cheap: QUOTA_TARGET_CHAT + QUOTA_TARGET_CHEAP,
    precision: QUOTA_TARGET_PRECISION,
  };
}

// ---------- classify ----------

function classifyTask({ purpose, prompt, flags }) {
  const purposeKey = (purpose || '').toLowerCase();

  if (HARD_FLOOR_PURPOSES.has(purposeKey)) return 'precision';

  // explicit flags
  if (flags && typeof flags === 'object') {
    for (const f of Object.keys(flags)) {
      if (!flags[f]) continue;
      const fk = f.toLowerCase();
      if (CHAT_FLAGS.has(fk)) return 'chat';
      if (CHEAP_FLAGS.has(fk)) return 'cheap';
    }
  }

  if (CHAT_PURPOSES.has(purposeKey)) return 'chat';
  if (CHEAP_PURPOSES.has(purposeKey)) return 'cheap';

  // short-greeting heuristic
  const text = (prompt || '').trim();
  if (text.length > 0 && text.length <= 24 && !/[?]|design|explain|architect|tradeoff|why|how/i.test(text)) {
    return 'chat';
  }

  // unknown purpose + non-trivial prompt → precision (safe default)
  return 'precision';
}

// ---------- quota ----------

function readWindow() {
  try {
    if (!fs.existsSync(USAGE_LOG)) return [];
    const raw = fs.readFileSync(USAGE_LOG, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const last = lines.slice(-QUOTA_WINDOW_SIZE);
    return last.map((l) => {
      try { return JSON.parse(l); } catch (_) { return null; }
    }).filter(Boolean);
  } catch (_) { return []; }
}

function applyQuota(classified, isHardFloor) {
  if (isHardFloor) return classified;

  const window = readWindow();
  if (window.length < 10) return classified;

  const counts = { chat: 0, cheap: 0, precision: 0 };
  for (const e of window) {
    const cls = normalizeClass(e.class || e.tier);
    if (counts[cls] !== undefined) counts[cls]++;
  }
  const total = window.length;
  const ratios = {
    chat: counts.chat / total,
    cheap: counts.cheap / total,
    precision: counts.precision / total,
  };
  const targets = quotaTargets();
  const routed = normalizeClass(classified);

  const overshoot = ratios[routed] - targets[routed];
  if (overshoot <= QUOTA_TOLERANCE) return routed;

  // route to most-underweight tier
  let best = routed;
  let bestDeficit = -Infinity;
  for (const t of ['chat', 'cheap', 'precision']) {
    if (targets[t] <= 0) continue;
    const deficit = targets[t] - ratios[t];
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      best = t;
    }
  }
  return best;
}

// ---------- dispatch ----------

// Infer provider from model ID prefix. Used to skip cascading an explicit
// --model override to providers that don't have it (which caused 404s in
// older versions).
function inferProvider(model) {
  if (!model) return null;
  if (/^claude-/i.test(model)) return 'anthropic';
  if (/^accounts\/fireworks\//.test(model)) return 'fireworks';
  if (/^accounts\/deepseek-ai\//.test(model)) return 'fireworks';
  // Anything else (llama-*, qwen*, gemma*, mixtral*) defaults to Groq.
  // NOTE: Cerebras shares model IDs with Groq (llama-3.3-70b, qwen-3-32b), so it is
  // NOT inferable from the model ID — reach it explicitly via the `cerebras` flag.
  return 'groq';
}

async function dispatch(cls, system, prompt, opts) {
  const fallback = [];
  cls = normalizeClass(cls);

  // Pin to specific provider if --model is set and unambiguous
  const pinnedProvider = opts.model ? inferProvider(opts.model) : null;
  const skip = (provider) => pinnedProvider && pinnedProvider !== provider;

  // ----- Egress scrub for cloud tiers (Groq + Fireworks + Cerebras) -----
  // Local (Ollama) and precision (Anthropic) are NOT scrubbed here:
  //  - Ollama stays on-machine (Tier 1).
  //  - Anthropic is the escalation target when scrub fails (fail-mode='escalate'),
  //    so scrubbing it would defeat the escape hatch.
  // Scrubbed once at the top so chat -> cheap fallback uses the same scrubbed text.
  let cloudSystem = system;
  let cloudPrompt = prompt;
  let cloudBlocked = false;
  let redactErr = null;
  try {
    cloudSystem = scrubForEgress(system, 'system');
    cloudPrompt = scrubForEgress(prompt, 'prompt');
  } catch (e) {
    if (e instanceof RedactionFailure) {
      redactErr = e;
      if (REDACT_FAIL_MODE === 'abort') {
        logSoftFailure('tiered-ask:redact', e, { mode: REDACT_FAIL_MODE });
        throw e;  // fail-closed: never silently send the original
      }
      cloudBlocked = true;
      console.error(`[tiered-ask] redaction failed on ${e.details?.label}: ${e.message}; cloud-cheap tiers blocked, will escalate to precision`);
    } else {
      throw e;
    }
  }

  if (cls === 'chat') {
    try {
      const r = await ollama.callOllama({ system, prompt, ...opts });
      // Optional confidence early-exit gate. OPT-IN — when disabled, all
      // successful local responses are accepted (current behavior).
      if (CONFIDENCE_GATE_ENABLED) {
        const verdict = confidenceGate.evaluate(r.text);
        if (verdict.decision === 'accept') {
          return {
            result: r, tier: 1, class: 'chat', model: r.model, fallback_chain: fallback,
            confidence_gate: verdict,
          };
        }
        // LOW / missing / unparseable -> escalate (default-safe).
        fallback.push({ tier: 1, model: ollama.MODEL, error: `confidence-gate escalate: ${verdict.reason}` });
        cls = 'cheap';
      } else {
        return { result: r, tier: 1, class: 'chat', model: r.model, fallback_chain: fallback };
      }
    } catch (e) {
      fallback.push({ tier: 1, model: ollama.MODEL, error: e.message });
      cls = 'cheap';
    }
  }

  // cerebras flag → Cerebras Inference (T2c, ultra-fast) directly.
  // Cerebras is a cloud tier, so it obeys the same egress-scrub gate as Groq/Fireworks.
  if (opts.flags?.cerebras && !cloudBlocked) {
    try {
      const r = await cerebras.callCerebras({ system: cloudSystem, prompt: cloudPrompt, model: opts.model || cerebras.PRIMARY, ...opts });
      return { result: r, tier: 2, class: 'cerebras', model: r.model, fallback_chain: fallback };
    } catch (e) {
      fallback.push({ tier: 2, model: opts.model || cerebras.PRIMARY, error: e.message });
    }
  } else if (opts.flags?.cerebras && cloudBlocked) {
    fallback.push({ tier: 2, model: opts.model || cerebras.PRIMARY, error: `cloud blocked by redaction: ${redactErr?.message}` });
  }

  // deepseek flag → Fireworks DeepSeek directly (skip if model pinned to non-fireworks)
  if (opts.flags?.deepseek && !skip('fireworks') && !cloudBlocked) {
    try {
      const r = await fireworks.callFireworks({ system: cloudSystem, prompt: cloudPrompt, model: opts.model || fireworks.PRIMARY, ...opts });
      return { result: r, tier: 2, class: 'deepseek', model: r.model, fallback_chain: fallback };
    } catch (e) {
      fallback.push({ tier: 2, model: opts.model || fireworks.PRIMARY, error: e.message });
    }
  } else if (opts.flags?.deepseek && cloudBlocked) {
    fallback.push({ tier: 2, model: opts.model || fireworks.PRIMARY, error: `cloud blocked by redaction: ${redactErr?.message}` });
  }

  if (cls === 'cheap') {
    if (cloudBlocked) {
      // Skip Groq + Fireworks entirely — both are cheap-tier cloud, both unsafe.
      fallback.push({ tier: 2, model: 'groq+fireworks', error: `cloud blocked by redaction: ${redactErr?.message}` });
    } else {
      if (!skip('groq')) {
        try {
          const r = await groq.callGroq({ system: cloudSystem, prompt: cloudPrompt, model: opts.model || groq.PRIMARY, ...opts });
          const verification_flags = verifyResponse(r.text);
          return { result: r, tier: 2, class: 'cheap', model: r.model, fallback_chain: fallback, verification_flags };
        } catch (e1) {
          fallback.push({ tier: 2, model: opts.model || groq.PRIMARY, error: e1.message });
          // Only try Groq fallback model when no explicit pin
          if (!pinnedProvider) {
            try {
              const r = await groq.callGroq({ system: cloudSystem, prompt: cloudPrompt, model: groq.FALLBACK, ...opts });
              const verification_flags = verifyResponse(r.text);
              return { result: r, tier: 2, class: 'cheap', model: r.model, fallback_chain: fallback, verification_flags };
            } catch (e2) {
              fallback.push({ tier: 2, model: groq.FALLBACK, error: e2.message });
            }
          }
        }
      }
      // Groq exhausted/skipped — try Fireworks before escalating to Claude
      if (!skip('fireworks')) {
        try {
          // If pinned to fireworks, use opts.model. If groq was skipped but fireworks is the pin, also use opts.model.
          // Otherwise (no pin, normal overflow), let fireworks use its own PRIMARY (don't propagate a Groq model name).
          const optsForFw = pinnedProvider === 'fireworks' ? opts : { ...opts, model: undefined };
          const r = await fireworks.callFireworks({ system: cloudSystem, prompt: cloudPrompt, ...optsForFw });
          return { result: r, tier: 2, class: 'cheap_overflow', model: r.model, fallback_chain: fallback };
        } catch (e3) {
          fallback.push({ tier: 2, model: fireworks.PRIMARY, error: e3.message });
        }
      }
    }
    cls = 'precision';
  }

  if (cls === 'precision') {
    if (skip('anthropic')) {
      // Cloud-cheap blocked by redaction AND user pinned to non-anthropic → we
      // have nowhere safe to send. Surface the original redaction failure so
      // the caller sees WHY this was refused.
      if (cloudBlocked && redactErr) {
        logSoftFailure('tiered-ask:redact-no-route', redactErr, { fallback });
        throw redactErr;
      }
      const final = new Error(`Model pinned to ${pinnedProvider} but all attempts failed. Chain: ${fallback.map((f) => `T${f.tier}=${f.error}`).join(' | ')}`);
      final.fallback_chain = fallback;
      throw final;
    }
    // Refuse to cascade --flag deepseek explicit calls to Anthropic when the original purpose wasn't hard-floor.
    // Intent of --flag deepseek is "I want cheap-tier compute, period." Cascading to Claude defeats cost-savings.
    if (opts.flags?.deepseek && !opts._isHardFloor) {
      const final = new Error(`--flag deepseek explicit but all cheap-tier attempts failed. Refusing to escalate to Anthropic (would defeat cost-savings intent). Chain: ${fallback.map((f) => `T${f.tier}=${f.error}`).join(' | ')}`);
      final.fallback_chain = fallback;
      throw final;
    }
    try {
      const r = await anthropic.callAnthropic({ system, prompt, ...opts });
      return { result: r, tier: 3, class: 'precision', model: r.model, fallback_chain: fallback };
    } catch (e) {
      fallback.push({ tier: 3, model: anthropic.MODEL, error: e.message });
      logSoftFailure('tiered-ask:precision', e, { fallback });
      // Downward fallback: if NOT hard-floor, try cheap tiers (Groq then Fireworks) as a last resort.
      // Hard-floor purposes (identity_audit, self_modification, etc.) MUST stay precision — never silently
      // demote to a cheap model for security/identity correctness. They keep the original throw behavior.
      if (!opts._isHardFloor && !cloudBlocked) {
        console.error(`[tiered-ask] precision failed (${anthropic.MODEL}: ${e.message}), falling back to cheap tier`);
        // Reuse the existing cheap-tier call path. Strip any anthropic-pinned model so Groq/Fireworks
        // use their own PRIMARY, and clear the deepseek flag block (already handled above; we wouldn't
        // be here if it tripped). pinnedProvider=anthropic implies the precision skip() check passed.
        if (!skip('groq')) {
          try {
            const r = await groq.callGroq({ system: cloudSystem, prompt: cloudPrompt, ...opts, model: groq.PRIMARY });
            const verification_flags = verifyResponse(r.text);
            return { result: r, tier: 2, class: 'precision_fallback_cheap', model: r.model, fallback_chain: fallback, verification_flags };
          } catch (e1) {
            fallback.push({ tier: 2, model: groq.PRIMARY, error: e1.message });
            try {
              const r = await groq.callGroq({ system: cloudSystem, prompt: cloudPrompt, ...opts, model: groq.FALLBACK });
              const verification_flags = verifyResponse(r.text);
              return { result: r, tier: 2, class: 'precision_fallback_cheap', model: r.model, fallback_chain: fallback, verification_flags };
            } catch (e2) {
              fallback.push({ tier: 2, model: groq.FALLBACK, error: e2.message });
            }
          }
        }
        if (!skip('fireworks')) {
          try {
            const r = await fireworks.callFireworks({ system: cloudSystem, prompt: cloudPrompt, ...opts, model: undefined });
            return { result: r, tier: 2, class: 'precision_fallback_cheap', model: r.model, fallback_chain: fallback };
          } catch (e3) {
            fallback.push({ tier: 2, model: fireworks.PRIMARY, error: e3.message });
          }
        }
      } else if (cloudBlocked && redactErr) {
        // Precision failed AND cloud-cheap is poisoned by an undetected secret.
        // Don't pretend cheap is a fallback — surface the redaction failure.
        fallback.push({ tier: 2, model: 'cheap-fallback', error: `cloud blocked by redaction: ${redactErr.message}` });
      }
      const final = new Error(`All tiers failed. Chain: ${fallback.map((f) => `T${f.tier}=${f.error}`).join(' | ')}`);
      final.fallback_chain = fallback;
      throw final;
    }
  }

  throw new Error(`Unreachable: classified='${cls}'`);
}

function appendUsage(entry) {
  try {
    fs.mkdirSync(path.dirname(USAGE_LOG), { recursive: true });
    fs.appendFileSync(USAGE_LOG, JSON.stringify(entry) + '\n');
  } catch (e) {
    logSoftFailure('tiered-ask:appendUsage', e);
  }
}

// ---------- public ----------

async function ask({ purpose, prompt, system, flags, agent, ...opts } = {}) {
  if (!prompt && !system) throw new Error('ask: prompt or system required');

  const purposeKey = (purpose || '').toLowerCase();
  const isHardFloor = HARD_FLOOR_PURPOSES.has(purposeKey);

  // agent override: read model from frontmatter, force precision, bypass quota
  const agentModel = agent ? parseAgentModel(agent) : null;
  if (agentModel) opts = { ...opts, model: agentModel };

  const classified = agentModel ? 'precision' : classifyTask({ purpose, prompt, flags });
  const finalClass = agentModel ? 'precision' : normalizeClass(applyQuota(classified, isHardFloor));

  const start = Date.now();
  let dispatched;
  let dispatchErr;
  try {
    dispatched = await dispatch(finalClass, system, prompt, { ...opts, flags, _isHardFloor: isHardFloor });
  } catch (e) {
    dispatchErr = e;
  }

  const entry = {
    ts: new Date().toISOString(),
    purpose: purpose || null,
    classified,
    quota_routed_to: finalClass,
    class: dispatched?.class || null,
    tier: dispatched?.tier || null,
    model: dispatched?.model || null,
    latency_ms: dispatched?.result?.latency_ms ?? (Date.now() - start),
    prompt_chars: (prompt || '').length + (system || '').length,
    usage: dispatched?.result?.usage || {},
    fallback: dispatched?.fallback_chain?.length ? dispatched.fallback_chain : undefined,
    verification_flags: dispatched?.verification_flags?.length ? dispatched.verification_flags : undefined,
    error: dispatchErr ? dispatchErr.message : undefined,
  };
  appendUsage(entry);

  if (dispatchErr) throw dispatchErr;

  return {
    text: dispatched.result.text,
    tier: dispatched.tier,
    model: dispatched.model,
    class: dispatched.class,
    classified,
    quota_routed_to: finalClass,
    latency_ms: dispatched.result.latency_ms,
    usage: dispatched.result.usage,
    fallback_chain: dispatched.fallback_chain,
    verification_flags: dispatched.verification_flags,
  };
}

async function ping() {
  const [tier1, tier2, tier2b, tier2c, tier3] = await Promise.all([
    ollama.probeHealth().catch((e) => ({ ok: false, reason: e.message })),
    groq.probeHealth().catch((e) => ({ ok: false, reason: e.message })),
    fireworks.probeHealth().catch((e) => ({ ok: false, reason: e.message })),
    cerebras.probeHealth().catch((e) => ({ ok: false, reason: e.message })),
    anthropic.probeHealth().catch((e) => ({ ok: false, reason: e.message })),
  ]);
  // tier2c (Cerebras) is an optional fast lane — it doesn't gate overall health
  // (no key set = expected until wired), so cheap_ok stays Groq-or-Fireworks.
  const cheap_ok = !!(tier2.ok || tier2b.ok);
  const overall_ok = !!(tier1.ok && cheap_ok && tier3.ok);
  return { overall_ok, tier1, tier2, tier2b_fireworks: tier2b, tier2c_cerebras: tier2c, tier3 };
}

module.exports = {
  ask,
  ping,
  classifyTask,
  applyQuota,
  normalizeClass,
  HARD_FLOOR_PURPOSES,
  // exposed for tests / introspection
  scrubForEgress,
  RedactionFailure,
  REDACT_ENABLED,
  REDACT_FAIL_MODE,
  CONFIDENCE_GATE_ENABLED,
};

// ---------- CLI ----------

if (require.main === module) {
  const [, , cmd, ...rest] = process.argv;

  if (cmd === 'ping') {
    ping().then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.overall_ok ? 0 : 1);
    }).catch((e) => {
      console.error('ping error:', e.message);
      process.exit(2);
    });
  } else if (cmd === 'ask') {
    const args = { agent: null, purpose: null, system: null, promptFile: null, flags: {}, model: null, maxTokens: null, stripThinking: false };
    const consumeFlag = (name, store) => {
      const idx = rest.indexOf(name);
      if (idx !== -1) { args[store] = rest[idx + 1]; rest.splice(idx, 2); return true; }
      return false;
    };
    const consumeBoolFlag = (name, store) => {
      const idx = rest.indexOf(name);
      if (idx !== -1) { args[store] = true; rest.splice(idx, 1); return true; }
      return false;
    };
    consumeFlag('--agent', 'agent');
    consumeFlag('--purpose', 'purpose');
    consumeFlag('--system', 'system');
    consumeFlag('--prompt-file', 'promptFile');
    consumeFlag('--model', 'model');
    consumeFlag('--max-tokens', 'maxTokens');
    consumeBoolFlag('--strip-thinking', 'stripThinking');
    consumeBoolFlag('--no-strip-thinking', 'noStripThinking');
    // Support multiple --flag <key> entries to set flags[key]=true
    while (true) {
      const idx = rest.indexOf('--flag');
      if (idx === -1) break;
      const key = rest[idx + 1];
      if (key) args.flags[key] = true;
      rest.splice(idx, 2);
    }

    let promptText = rest.join(' ');
    if (args.promptFile) {
      try { promptText = fs.readFileSync(args.promptFile, 'utf8'); }
      catch (e) { console.error(`ask: cannot read --prompt-file ${args.promptFile}: ${e.message}`); process.exit(2); }
    }

    if (!promptText && !args.system) {
      console.error('Usage: node lib/tiered-ask.cjs ask [--purpose <name>] [--system <text>] [--prompt-file <path>] [--flag <key>] [--model <id>] [--agent <name>] [--max-tokens <N>] [--strip-thinking] "<prompt>"');
      process.exit(2);
    }

    const opts = { prompt: promptText, agent: args.agent, purpose: args.purpose, system: args.system, flags: args.flags };
    if (args.model) opts.model = args.model;
    if (args.maxTokens) opts.max_tokens = parseInt(args.maxTokens, 10);

    ask(opts).then((r) => {
      console.log(`[tier ${r.tier} | ${r.model} | ${r.latency_ms}ms | classified=${r.classified}→${r.quota_routed_to}]`);
      let body = r.text;
      // Auto-strip <think>...</think> for known reasoning models (qwen3, deepseek-r1/r2).
      // Explicit --strip-thinking forces it on; --no-strip-thinking forces it off.
      const reasoningModelPattern = /qwen3|deepseek-r[12]/i;
      const shouldStrip = !args.noStripThinking && (args.stripThinking || reasoningModelPattern.test(r.model || ''));
      if (shouldStrip && /<think>/.test(body)) {
        body = body.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
      }
      console.log(body);
      process.exit(0);
    }).catch((e) => {
      console.error('ask error:', e.message);
      process.exit(1);
    });
  } else {
    console.error('Usage:\n  node lib/tiered-ask.cjs ping\n  node lib/tiered-ask.cjs ask [--purpose <name>] [--system <text>] [--prompt-file <path>] [--flag <key>] "<prompt>"');
    process.exit(2);
  }
}
