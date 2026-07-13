// tiered-ask.test.cjs — integration coverage with mocked cloud clients.
// NO real network calls.
// Run: node --test test/tiered-ask.test.cjs
//
// Example "secrets" below are constructed at runtime via string concatenation
// so this test file itself contains no secret-shaped contiguous literals.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

// ------- Runtime-assembled example values (no secret-shaped literals here) --
const AWS_EXAMPLE = 'AKIA' + 'IOSFODNN7EXAMPLE';
const GH_PAT      = 'ghp' + '_AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIj';
// ---------------------------------------------------------------------------

// ------------------------------------------------------------------
// Helper: load a FRESH copy of tiered-ask.cjs with mocked sibling
// clients injected via require.cache. Each test gets isolated state
// and can record what was actually sent to each cloud client.
// ------------------------------------------------------------------

function loadTieredAskWithMocks({
  ollamaImpl,
  groqImpl,
  fireworksImpl,
  anthropicImpl,
  env = {},
} = {}) {
  // Save and override env
  const envBackup = {};
  for (const k of Object.keys(env)) {
    envBackup[k] = process.env[k];
    if (env[k] === null || env[k] === undefined) delete process.env[k];
    else process.env[k] = String(env[k]);
  }
  // Dummy API keys so client modules don't refuse to load with "key missing" early.
  for (const k of ['GROQ_API_KEY', 'FIREWORKS_API_KEY', 'ANTHROPIC_API_KEY']) {
    if (!process.env[k]) {
      envBackup[k] = envBackup[k] === undefined ? process.env[k] : envBackup[k];
      process.env[k] = 'test-key';
    }
  }

  const libDir = path.resolve(__dirname, '..', 'lib');
  const paths = {
    ollama:    path.join(libDir, 'ollama-client.cjs'),
    groq:      path.join(libDir, 'groq-client.cjs'),
    fireworks: path.join(libDir, 'fireworks-client.cjs'),
    anthropic: path.join(libDir, 'anthropic-client.cjs'),
    tieredAsk: path.join(libDir, 'tiered-ask.cjs'),
    redact:    path.join(libDir, 'redact.cjs'),
    confGate:  path.join(libDir, 'confidence-gate.cjs'),
  };

  // Wipe relevant entries from cache so we get a fresh load
  for (const p of Object.values(paths)) delete require.cache[p];

  // Build mocks. Calls list lets each test inspect what was sent.
  const calls = { ollama: [], groq: [], fireworks: [], anthropic: [] };

  const mkMockModule = (recordKey, impl, defaults = {}) => {
    const mod = new Module(paths[recordKey === 'ollama' ? 'ollama' : `${recordKey}`], null);
    mod.filename = paths[recordKey === 'ollama' ? 'ollama' : `${recordKey}`];
    mod.loaded = true;
    mod.exports = {
      ...defaults,
      [recordKey === 'ollama' ? 'callOllama'
       : recordKey === 'groq' ? 'callGroq'
       : recordKey === 'fireworks' ? 'callFireworks'
       : 'callAnthropic']: async (args) => {
        calls[recordKey].push(args);
        if (typeof impl === 'function') return impl(args);
        return { text: `mock-${recordKey}`, model: `mock-${recordKey}-model`, latency_ms: 1, usage: {} };
      },
      probeHealth: async () => ({ ok: true }),
    };
    return mod;
  };

  // Defaults for required constants the clients export
  const ollamaDefaults = { MODEL: 'mock-ollama', BASE: 'http://mock', ENABLED: true };
  const groqDefaults = { PRIMARY: 'mock-groq-primary', FALLBACK: 'mock-groq-fallback', BASE: 'http://mock' };
  const fwDefaults = { PRIMARY: 'mock-fw-primary', FALLBACK: 'mock-fw-fallback', BASE: 'http://mock' };
  const anthDefaults = { MODEL: 'mock-anthropic', BASE: 'http://mock' };

  require.cache[paths.ollama] = mkMockModule('ollama', ollamaImpl, ollamaDefaults);
  require.cache[paths.groq] = mkMockModule('groq', groqImpl, groqDefaults);
  require.cache[paths.fireworks] = mkMockModule('fireworks', fireworksImpl, fwDefaults);
  require.cache[paths.anthropic] = mkMockModule('anthropic', anthropicImpl, anthDefaults);

  const tieredAsk = require(paths.tieredAsk);

  function restore() {
    for (const k of Object.keys(envBackup)) {
      if (envBackup[k] === undefined) delete process.env[k];
      else process.env[k] = envBackup[k];
    }
    for (const p of Object.values(paths)) delete require.cache[p];
  }

  return { tieredAsk, calls, restore };
}

// ------------------------------------------------------------------
// Helpers for env defaults
// ------------------------------------------------------------------

const os = require('node:os');
const fs = require('node:fs');

// Per-process isolated usage log so quota rerouting doesn't fire on the real
// production tier-usage.jsonl while tests run.
const TEST_USAGE_LOG = path.join(
  os.tmpdir(),
  `tiered-ask-test-${process.pid}-${Date.now()}.jsonl`
);

const CLEAN_ENV = {
  ROUTER_REDACT_ENABLED: '1',
  ROUTER_REDACT_FAIL_MODE: 'escalate',
  ROUTER_CONFIDENCE_GATE_ENABLED: '0',
  LOCAL_OLLAMA_ENABLED: '0', // default off so unrelated tests don't try ollama
  QUOTA_WINDOW_SIZE: '50',
  ROUTER_USAGE_LOG: TEST_USAGE_LOG,
};

// Ensure the test log file does not exist between tests
function freshUsageLog() {
  try { fs.unlinkSync(TEST_USAGE_LOG); } catch (_) { /* ok */ }
}

// ============================================================
// 1) Existing behavior preservation
// ============================================================

test('existing: classifyTask still routes greeting -> chat (when ollama enabled)', () => {
  const { tieredAsk, restore } = loadTieredAskWithMocks({ env: { ...CLEAN_ENV, LOCAL_OLLAMA_ENABLED: '1' } });
  try {
    assert.equal(tieredAsk.classifyTask({ purpose: 'greeting', prompt: 'hi' }), 'chat');
  } finally { restore(); }
});

test('existing: hard-floor purpose -> precision', () => {
  const { tieredAsk, restore } = loadTieredAskWithMocks({ env: CLEAN_ENV });
  try {
    assert.equal(tieredAsk.classifyTask({ purpose: 'identity_audit', prompt: 'x' }), 'precision');
  } finally { restore(); }
});

test('existing: benign cheap-tier ask reaches Groq with unmodified prompt', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: CLEAN_ENV,
    groqImpl: async ({ prompt }) => ({ text: 'ok', model: 'mock-groq', latency_ms: 1, usage: {} }),
  });
  try {
    const benign = 'How does React useState work?';
    const r = await tieredAsk.ask({ purpose: 'summarize', prompt: benign });
    assert.equal(r.text, 'ok');
    assert.equal(calls.groq.length, 1);
    // Benign prompt should be UNCHANGED by the scrub
    assert.equal(calls.groq[0].prompt, benign);
    assert.equal(calls.groq[0].system, undefined);
  } finally { restore(); }
});

test('existing: precision tier still receives prompt unscrubbed', async () => {
  // Anthropic is the escalation target and is NOT in the scrub scope.
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: CLEAN_ENV,
    anthropicImpl: async ({ prompt }) => ({ text: 'precise', model: 'mock-claude', latency_ms: 1, usage: {} }),
  });
  try {
    const prompt = 'Architect a system for X';  // classifyTask routes unknown purpose to precision
    const r = await tieredAsk.ask({ purpose: 'architectural_decision', prompt });
    assert.equal(r.text, 'precise');
    assert.equal(calls.anthropic.length, 1);
    assert.equal(calls.anthropic[0].prompt, prompt);
  } finally { restore(); }
});

// ============================================================
// 2) Redaction firewall: secrets get scrubbed before cloud send
// ============================================================

test('redact: anthropic key in prompt is SCRUBBED before reaching Groq', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: CLEAN_ENV,
    groqImpl: async ({ prompt }) => ({ text: 'ok', model: 'mock-groq', latency_ms: 1, usage: {} }),
  });
  try {
    const dirty = 'My key is sk-' + 'ant-AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGh — summarize this for me';
    await tieredAsk.ask({ purpose: 'summarize', prompt: dirty });
    assert.equal(calls.groq.length, 1);
    assert.ok(!/sk-ant/.test(calls.groq[0].prompt), 'sk-ant must not leak to Groq');
    assert.match(calls.groq[0].prompt, /<REDACTED>/);
  } finally { restore(); }
});

test('redact: secret in system prompt is also scrubbed', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: CLEAN_ENV,
    groqImpl: async ({ prompt }) => ({ text: 'ok', model: 'mock-groq', latency_ms: 1, usage: {} }),
  });
  try {
    await tieredAsk.ask({
      purpose: 'summarize',
      system: `You have access to ${AWS_EXAMPLE}`,
      prompt: 'hello',
    });
    assert.equal(calls.groq.length, 1);
    assert.ok(!/AKIA[0-9A-Z]{16}/.test(calls.groq[0].system), 'AWS access-key id must not leak in system');
  } finally { restore(); }
});

test('redact: scrubbed prompt is forwarded to Fireworks overflow too', async () => {
  // Force groq to fail so we cascade into fireworks
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: CLEAN_ENV,
    groqImpl: async () => { throw new Error('boom'); },
    fireworksImpl: async ({ prompt }) => ({ text: 'fw-ok', model: 'mock-fw', latency_ms: 1, usage: {} }),
  });
  try {
    const dirty = `github_pat ${GH_PAT} please rotate`;
    await tieredAsk.ask({ purpose: 'summarize', prompt: dirty });
    assert.equal(calls.fireworks.length, 1);
    assert.ok(!/ghp_[A-Za-z0-9]/.test(calls.fireworks[0].prompt), 'github PAT must not leak to Fireworks');
  } finally { restore(); }
});

test('redact disabled via ROUTER_REDACT_ENABLED=0 -> prompt sent raw', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: { ...CLEAN_ENV, ROUTER_REDACT_ENABLED: '0' },
    groqImpl: async () => ({ text: 'ok', model: 'mock', latency_ms: 1, usage: {} }),
  });
  try {
    const dirty = 'key: sk-' + 'ant-AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGh';
    await tieredAsk.ask({ purpose: 'summarize', prompt: dirty });
    assert.equal(calls.groq.length, 1);
    assert.equal(calls.groq[0].prompt, dirty, 'when disabled, prompt must be untouched');
  } finally { restore(); }
});

// ============================================================
// 3) Fail-closed semantics
// ============================================================

test('fail-closed escalate mode: scrub failure routes around Groq/Fireworks to Anthropic', async () => {
  // Force a redactor failure. We do this by stubbing redact AFTER the load.
  const envBackup = { ...process.env };
  process.env.ROUTER_REDACT_ENABLED = '1';
  process.env.ROUTER_REDACT_FAIL_MODE = 'escalate';
  process.env.GROQ_API_KEY = 'test';
  process.env.FIREWORKS_API_KEY = 'test';
  process.env.ANTHROPIC_API_KEY = 'test';
  process.env.ROUTER_USAGE_LOG = TEST_USAGE_LOG;
  freshUsageLog();

  const libDir = path.resolve(__dirname, '..', 'lib');
  const redactPath = path.join(libDir, 'redact.cjs');
  const tieredPath = path.join(libDir, 'tiered-ask.cjs');
  const ollamaPath = path.join(libDir, 'ollama-client.cjs');
  const groqPath = path.join(libDir, 'groq-client.cjs');
  const fwPath = path.join(libDir, 'fireworks-client.cjs');
  const anthPath = path.join(libDir, 'anthropic-client.cjs');
  const cgPath = path.join(libDir, 'confidence-gate.cjs');
  for (const p of [redactPath, tieredPath, ollamaPath, groqPath, fwPath, anthPath, cgPath]) delete require.cache[p];

  // Inject a redact mock that THROWS
  const fakeRedact = new Module(redactPath, null);
  fakeRedact.filename = redactPath;
  fakeRedact.loaded = true;
  fakeRedact.exports = {
    redact: () => { throw new Error('synthetic scrub failure'); },
    verifyClean: () => true,
    PATTERNS: [],
  };
  require.cache[redactPath] = fakeRedact;

  const calls = { groq: [], fireworks: [], anthropic: [] };
  const mkMock = (key, fnName, defaults) => {
    const p = key === 'groq' ? groqPath : key === 'fireworks' ? fwPath : key === 'anthropic' ? anthPath : ollamaPath;
    const m = new Module(p, null);
    m.filename = p;
    m.loaded = true;
    m.exports = {
      ...defaults,
      [fnName]: async (args) => {
        calls[key] = calls[key] || [];
        calls[key].push(args);
        return { text: `mock-${key}`, model: `mock-${key}-model`, latency_ms: 1, usage: {} };
      },
      probeHealth: async () => ({ ok: true }),
    };
    require.cache[p] = m;
  };
  mkMock('ollama', 'callOllama', { MODEL: 'mock', BASE: 'http://mock', ENABLED: false });
  mkMock('groq', 'callGroq', { PRIMARY: 'gp', FALLBACK: 'gf', BASE: 'http://mock' });
  mkMock('fireworks', 'callFireworks', { PRIMARY: 'fp', FALLBACK: 'ff', BASE: 'http://mock' });
  mkMock('anthropic', 'callAnthropic', { MODEL: 'mock-claude', BASE: 'http://mock' });

  try {
    const tieredAsk = require(tieredPath);
    const r = await tieredAsk.ask({ purpose: 'summarize', prompt: 'anything' });
    assert.equal(r.text, 'mock-anthropic', 'should escalate to anthropic when scrub fails');
    assert.equal((calls.groq || []).length, 0, 'Groq must NOT be called when scrub fails');
    assert.equal((calls.fireworks || []).length, 0, 'Fireworks must NOT be called when scrub fails');
    assert.equal(calls.anthropic.length, 1);
  } finally {
    for (const p of [redactPath, tieredPath, ollamaPath, groqPath, fwPath, anthPath, cgPath]) delete require.cache[p];
    for (const k of Object.keys(envBackup)) process.env[k] = envBackup[k];
  }
});

test('fail-closed abort mode: scrub failure throws, no cloud call', async () => {
  process.env.ROUTER_REDACT_ENABLED = '1';
  process.env.ROUTER_REDACT_FAIL_MODE = 'abort';
  process.env.GROQ_API_KEY = 'test';
  process.env.FIREWORKS_API_KEY = 'test';
  process.env.ANTHROPIC_API_KEY = 'test';
  process.env.ROUTER_USAGE_LOG = TEST_USAGE_LOG;
  freshUsageLog();

  const libDir = path.resolve(__dirname, '..', 'lib');
  const redactPath = path.join(libDir, 'redact.cjs');
  const tieredPath = path.join(libDir, 'tiered-ask.cjs');
  const ollamaPath = path.join(libDir, 'ollama-client.cjs');
  const groqPath = path.join(libDir, 'groq-client.cjs');
  const fwPath = path.join(libDir, 'fireworks-client.cjs');
  const anthPath = path.join(libDir, 'anthropic-client.cjs');
  const cgPath = path.join(libDir, 'confidence-gate.cjs');
  for (const p of [redactPath, tieredPath, ollamaPath, groqPath, fwPath, anthPath, cgPath]) delete require.cache[p];

  const fakeRedact = new Module(redactPath, null);
  fakeRedact.filename = redactPath;
  fakeRedact.loaded = true;
  fakeRedact.exports = {
    redact: () => { throw new Error('synthetic scrub failure'); },
    verifyClean: () => true,
    PATTERNS: [],
  };
  require.cache[redactPath] = fakeRedact;

  const calls = { groq: 0, fireworks: 0, anthropic: 0 };
  const mkMock = (key, fnName, defaults) => {
    const p = key === 'groq' ? groqPath : key === 'fireworks' ? fwPath : key === 'anthropic' ? anthPath : ollamaPath;
    const m = new Module(p, null);
    m.filename = p;
    m.loaded = true;
    m.exports = {
      ...defaults,
      [fnName]: async () => { calls[key]++; return { text: 'x', model: 'x', latency_ms: 1, usage: {} }; },
      probeHealth: async () => ({ ok: true }),
    };
    require.cache[p] = m;
  };
  mkMock('ollama', 'callOllama', { MODEL: 'mock', BASE: 'http://mock', ENABLED: false });
  mkMock('groq', 'callGroq', { PRIMARY: 'gp', FALLBACK: 'gf', BASE: 'http://mock' });
  mkMock('fireworks', 'callFireworks', { PRIMARY: 'fp', FALLBACK: 'ff', BASE: 'http://mock' });
  mkMock('anthropic', 'callAnthropic', { MODEL: 'mock', BASE: 'http://mock' });

  try {
    const tieredAsk = require(tieredPath);
    await assert.rejects(
      tieredAsk.ask({ purpose: 'summarize', prompt: 'anything' }),
      /scrub|redact/i,
    );
    assert.equal(calls.groq, 0);
    assert.equal(calls.fireworks, 0);
    assert.equal(calls.anthropic, 0, 'abort mode does not even reach Anthropic');
  } finally {
    for (const p of [redactPath, tieredPath, ollamaPath, groqPath, fwPath, anthPath, cgPath]) delete require.cache[p];
    delete process.env.ROUTER_REDACT_FAIL_MODE;
  }
});

test('fail-closed: verifyClean failure (post-scrub secret remains) blocks cloud-cheap', async () => {
  // redact returns "clean" text but verifyClean returns false — the secret slipped scrubbing.
  process.env.ROUTER_REDACT_ENABLED = '1';
  process.env.ROUTER_REDACT_FAIL_MODE = 'escalate';
  process.env.GROQ_API_KEY = 'test';
  process.env.FIREWORKS_API_KEY = 'test';
  process.env.ANTHROPIC_API_KEY = 'test';
  process.env.ROUTER_USAGE_LOG = TEST_USAGE_LOG;
  freshUsageLog();

  const libDir = path.resolve(__dirname, '..', 'lib');
  const redactPath = path.join(libDir, 'redact.cjs');
  const tieredPath = path.join(libDir, 'tiered-ask.cjs');
  const ollamaPath = path.join(libDir, 'ollama-client.cjs');
  const groqPath = path.join(libDir, 'groq-client.cjs');
  const fwPath = path.join(libDir, 'fireworks-client.cjs');
  const anthPath = path.join(libDir, 'anthropic-client.cjs');
  const cgPath = path.join(libDir, 'confidence-gate.cjs');
  for (const p of [redactPath, tieredPath, ollamaPath, groqPath, fwPath, anthPath, cgPath]) delete require.cache[p];

  const fakeRedact = new Module(redactPath, null);
  fakeRedact.filename = redactPath;
  fakeRedact.loaded = true;
  fakeRedact.exports = {
    redact: (t) => ({ clean: t, hits: [] }),
    verifyClean: () => false, // ALWAYS dirty
    PATTERNS: [],
  };
  require.cache[redactPath] = fakeRedact;

  const calls = { groq: 0, fireworks: 0, anthropic: 0 };
  const mkMock = (key, fnName, defaults) => {
    const p = key === 'groq' ? groqPath : key === 'fireworks' ? fwPath : key === 'anthropic' ? anthPath : ollamaPath;
    const m = new Module(p, null);
    m.filename = p;
    m.loaded = true;
    m.exports = {
      ...defaults,
      [fnName]: async () => { calls[key]++; return { text: `ok-${key}`, model: 'x', latency_ms: 1, usage: {} }; },
      probeHealth: async () => ({ ok: true }),
    };
    require.cache[p] = m;
  };
  mkMock('ollama', 'callOllama', { MODEL: 'mock', BASE: 'http://mock', ENABLED: false });
  mkMock('groq', 'callGroq', { PRIMARY: 'gp', FALLBACK: 'gf', BASE: 'http://mock' });
  mkMock('fireworks', 'callFireworks', { PRIMARY: 'fp', FALLBACK: 'ff', BASE: 'http://mock' });
  mkMock('anthropic', 'callAnthropic', { MODEL: 'mock', BASE: 'http://mock' });

  try {
    const tieredAsk = require(tieredPath);
    const r = await tieredAsk.ask({ purpose: 'summarize', prompt: 'x' });
    assert.equal(r.text, 'ok-anthropic');
    assert.equal(calls.groq, 0);
    assert.equal(calls.fireworks, 0);
    assert.equal(calls.anthropic, 1);
  } finally {
    for (const p of [redactPath, tieredPath, ollamaPath, groqPath, fwPath, anthPath, cgPath]) delete require.cache[p];
  }
});

// ============================================================
// 4) Confidence gate behavior
// ============================================================

test('confidence gate OFF (default): chat tier accepts unconditionally', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: { ...CLEAN_ENV, LOCAL_OLLAMA_ENABLED: '1' },
    ollamaImpl: async () => ({ text: 'hello (no confidence marker)', model: 'qwen', latency_ms: 1, usage: {} }),
  });
  try {
    const r = await tieredAsk.ask({ purpose: 'greeting', prompt: 'hi' });
    assert.equal(r.tier, 1);
    assert.equal(calls.ollama.length, 1);
    assert.equal(calls.groq.length, 0, 'must not escalate when gate is OFF');
  } finally { restore(); }
});

test('confidence gate ON: HIGH confidence -> accept, skip cheap', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: { ...CLEAN_ENV, LOCAL_OLLAMA_ENABLED: '1', ROUTER_CONFIDENCE_GATE_ENABLED: '1' },
    ollamaImpl: async () => ({ text: 'answer\nconfidence: 0.95', model: 'qwen', latency_ms: 1, usage: {} }),
  });
  try {
    const r = await tieredAsk.ask({ purpose: 'greeting', prompt: 'hi' });
    assert.equal(r.tier, 1);
    assert.equal(calls.ollama.length, 1);
    assert.equal(calls.groq.length, 0, 'HIGH conf must skip cheap');
  } finally { restore(); }
});

test('confidence gate ON: LOW confidence -> escalate to cheap', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: { ...CLEAN_ENV, LOCAL_OLLAMA_ENABLED: '1', ROUTER_CONFIDENCE_GATE_ENABLED: '1' },
    ollamaImpl: async () => ({ text: 'answer\nconfidence: 0.20', model: 'qwen', latency_ms: 1, usage: {} }),
    groqImpl: async () => ({ text: 'cheap-answer', model: 'mock-groq', latency_ms: 1, usage: {} }),
  });
  try {
    const r = await tieredAsk.ask({ purpose: 'greeting', prompt: 'hi' });
    assert.equal(r.tier, 2, 'escalated to cheap tier');
    assert.equal(calls.ollama.length, 1);
    assert.equal(calls.groq.length, 1, 'must escalate to Groq on LOW conf');
  } finally { restore(); }
});

test('confidence gate ON: missing marker -> escalate (default-safe)', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: { ...CLEAN_ENV, LOCAL_OLLAMA_ENABLED: '1', ROUTER_CONFIDENCE_GATE_ENABLED: '1' },
    ollamaImpl: async () => ({ text: 'just an answer, no marker', model: 'qwen', latency_ms: 1, usage: {} }),
    groqImpl: async () => ({ text: 'cheap-answer', model: 'mock-groq', latency_ms: 1, usage: {} }),
  });
  try {
    const r = await tieredAsk.ask({ purpose: 'greeting', prompt: 'hi' });
    assert.equal(r.tier, 2);
    assert.equal(calls.groq.length, 1, 'missing marker must escalate');
  } finally { restore(); }
});

test('confidence gate ON: hedge overrides HIGH marker -> escalate', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: { ...CLEAN_ENV, LOCAL_OLLAMA_ENABLED: '1', ROUTER_CONFIDENCE_GATE_ENABLED: '1' },
    ollamaImpl: async () => ({ text: "I'm not sure but confidence: 0.95", model: 'qwen', latency_ms: 1, usage: {} }),
    groqImpl: async () => ({ text: 'cheap-answer', model: 'mock-groq', latency_ms: 1, usage: {} }),
  });
  try {
    const r = await tieredAsk.ask({ purpose: 'greeting', prompt: 'hi' });
    assert.equal(r.tier, 2);
    assert.equal(calls.groq.length, 1);
  } finally { restore(); }
});

test('ollama is exempt from scrub (local lane stays on-machine)', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: { ...CLEAN_ENV, LOCAL_OLLAMA_ENABLED: '1' },
    ollamaImpl: async ({ prompt }) => ({ text: 'local-ok', model: 'qwen', latency_ms: 1, usage: {} }),
  });
  try {
    const dirty = 'sk-' + 'ant-AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGh hello';
    await tieredAsk.ask({ purpose: 'greeting', prompt: dirty });
    assert.equal(calls.ollama.length, 1);
    // Ollama got the ORIGINAL — local lane is not scrubbed
    assert.equal(calls.ollama[0].prompt, dirty, 'local tier must receive original prompt');
  } finally { restore(); }
});

// ============================================================
// 5) Precision -> cheap downward fallback (live behavior)
//    Guards the applied feature in lib/tiered-ask.cjs:
//    when precision (Anthropic) fails and the purpose is NOT
//    hard-floor, dispatch cascades to Groq/Fireworks and returns
//    class:'precision_fallback_cheap'. HARD_FLOOR_PURPOSES must
//    keep throwing (never silently demote for identity/security).
// ============================================================

test('precision_fallback_cheap: non-hard-floor precision + Anthropic fails + Groq healthy -> falls back to Groq', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: CLEAN_ENV,
    anthropicImpl: async () => { throw new Error('stub anthropic credit exhausted'); },
    groqImpl: async () => ({ text: 'groq-fallback-answer', model: 'mock-groq-primary', latency_ms: 1, usage: {} }),
    fireworksImpl: async () => ({ text: 'fw-answer', model: 'mock-fw-primary', latency_ms: 1, usage: {} }),
  });
  try {
    // Unknown purpose + non-trivial prompt -> classifyTask returns 'precision'
    // (see lib/tiered-ask.cjs classifyTask "safe default" branch). NOT hard-floor.
    const r = await tieredAsk.ask({
      purpose: 'unknown_purpose_forces_precision',
      prompt: 'Why does the ocean look blue from orbit and green from the shore? Explain the optics.',
    });
    assert.equal(r.class, 'precision_fallback_cheap', "class must be 'precision_fallback_cheap'");
    assert.equal(r.text, 'groq-fallback-answer', 'response body must come from Groq stub');
    assert.equal(calls.anthropic.length, 1, 'anthropic was attempted first');
    assert.ok(calls.groq.length >= 1, 'groq was invoked as fallback');
    assert.equal(calls.fireworks.length, 0, 'fireworks must not be reached when groq succeeds');
  } finally { restore(); }
});

test('precision_fallback_cheap: HARD-FLOOR (identity_audit) + Anthropic fails -> throws, cheap NEVER called', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: CLEAN_ENV,
    anthropicImpl: async () => { throw new Error('stub anthropic credit exhausted'); },
    groqImpl: async () => ({ text: 'should-never-run', model: 'mock-groq', latency_ms: 1, usage: {} }),
    fireworksImpl: async () => ({ text: 'should-never-run', model: 'mock-fw', latency_ms: 1, usage: {} }),
  });
  try {
    await assert.rejects(
      tieredAsk.ask({ purpose: 'identity_audit', prompt: 'Audit my identity model.' }),
      (e) => /All tiers failed/.test(e.message),
      "must throw with 'All tiers failed' and never demote hard-floor to cheap",
    );
    assert.equal(calls.anthropic.length, 1, 'anthropic was attempted');
    assert.equal(calls.groq.length, 0, 'groq must NEVER be invoked for hard-floor');
    assert.equal(calls.fireworks.length, 0, 'fireworks must NEVER be invoked for hard-floor');
  } finally { restore(); }
});

test('precision_fallback_cheap: non-hard-floor + Anthropic AND all cheap tiers fail -> throws All tiers failed', async () => {
  freshUsageLog();
  const { tieredAsk, calls, restore } = loadTieredAskWithMocks({
    env: CLEAN_ENV,
    anthropicImpl: async () => { throw new Error('stub anthropic credit exhausted'); },
    groqImpl: async () => { throw new Error('stub groq down'); },
    fireworksImpl: async () => { throw new Error('stub fireworks down'); },
  });
  try {
    await assert.rejects(
      tieredAsk.ask({
        purpose: 'unknown_purpose_forces_precision',
        prompt: 'Why does the ocean look blue from orbit and green from the shore? Explain the optics.',
      }),
      (e) => /All tiers failed/.test(e.message),
      "must throw with 'All tiers failed' when every tier fails",
    );
    assert.equal(calls.anthropic.length, 1, 'anthropic was attempted');
    assert.ok(calls.groq.length >= 1, 'groq was attempted (primary at minimum)');
    assert.ok(calls.fireworks.length >= 1, 'fireworks was attempted as final cheap fallback');
  } finally { restore(); }
});

// ============================================================
// 6) Public ping() still works
// ============================================================

test('ping() returns overall health summary (mocked clients)', async () => {
  const { tieredAsk, restore } = loadTieredAskWithMocks({ env: CLEAN_ENV });
  try {
    const r = await tieredAsk.ping();
    assert.equal(typeof r, 'object');
    assert.ok('overall_ok' in r);
    assert.ok('tier1' in r);
    assert.ok('tier2' in r);
    assert.ok('tier2b_fireworks' in r);
    assert.ok('tier3' in r);
  } finally { restore(); }
});
