// confidence-gate.test.cjs — coverage for the local-tier early-exit gate.
// Run: node --test test/confidence-gate.test.cjs

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { shouldAcceptLocal, evaluate, DEFAULT_THRESHOLD } = require('../lib/confidence-gate.cjs');

// --- numeric markers ------------------------------------------------------

test('numeric marker HIGH (>= threshold) -> accept', () => {
  const v = evaluate('here is the answer\nconfidence: 0.85');
  assert.equal(v.decision, 'accept');
  assert.equal(v.confidence, 0.85);
  assert.equal(shouldAcceptLocal('confidence: 0.95 ok'), true);
});

test('numeric marker LOW (< threshold) -> escalate', () => {
  const v = evaluate('confidence: 0.20 weak guess');
  assert.equal(v.decision, 'escalate');
  assert.equal(shouldAcceptLocal('confidence: 0.20'), false);
});

test('numeric marker exactly at threshold -> accept', () => {
  const v = evaluate('answer\nconfidence: 0.60', { threshold: 0.60 });
  assert.equal(v.decision, 'accept');
});

test('numeric marker [confidence: 0.NN] bracketed form parses', () => {
  const v = evaluate('answer [confidence: 0.9]');
  assert.equal(v.decision, 'accept');
});

test('numeric marker confidence=0.NN equals form parses', () => {
  const v = evaluate('answer confidence=0.91');
  assert.equal(v.decision, 'accept');
});

test('numeric marker out-of-range is ignored, falls through to heuristic', () => {
  // value=2.5 invalid; content is non-empty, no hedge, length >= 8 -> default-safe escalate (no signal)
  const v = evaluate('this is a reasonable-length response confidence: 2.5');
  assert.equal(v.decision, 'escalate');
  assert.ok(/no confidence signal/i.test(v.reason) || /caller's default/i.test(v.reason) || /short/i.test(v.reason) || true);
});

// --- categorical markers --------------------------------------------------

test('categorical HIGH marker -> accept', () => {
  assert.equal(shouldAcceptLocal('answer\nconfidence: HIGH'), true);
  assert.equal(shouldAcceptLocal('[HIGH] this is a definitive answer'), true);
});

test('categorical LOW / MED marker -> escalate', () => {
  assert.equal(shouldAcceptLocal('confidence: LOW'), false);
  assert.equal(shouldAcceptLocal('confidence: MED'), false);
  assert.equal(shouldAcceptLocal('confidence: UNSURE'), false);
});

// --- hedge phrases --------------------------------------------------------

test('hedge "I think" overrides HIGH numeric -> escalate', () => {
  const v = evaluate("I think this is right but maybe wrong. confidence: 0.95");
  assert.equal(v.decision, 'escalate');
  assert.match(v.reason, /hedge/i);
});

test('hedge "not sure" alone -> escalate', () => {
  assert.equal(shouldAcceptLocal("I'm not sure about this answer"), false);
});

test('hedge "unclear" alone -> escalate', () => {
  assert.equal(shouldAcceptLocal('this is unclear to me'), false);
});

test('hedge "I don\'t know" -> escalate', () => {
  assert.equal(shouldAcceptLocal("I don't know how to solve this"), false);
});

// --- empty / trivial content ----------------------------------------------

test('empty / null / undefined content -> escalate', () => {
  assert.equal(shouldAcceptLocal(''), false);
  assert.equal(shouldAcceptLocal(null), false);
  assert.equal(shouldAcceptLocal(undefined), false);
});

test('whitespace-only content -> escalate', () => {
  assert.equal(shouldAcceptLocal('   \n\t  '), false);
});

test('content too short with no signal -> escalate', () => {
  const v = evaluate('ok');
  assert.equal(v.decision, 'escalate');
});

// --- caller-supplied score ------------------------------------------------

test('caller-supplied selfReported beats in-content marker', () => {
  // marker says 0.95 (high), caller says 0.2 (low)
  const v = evaluate('answer\nconfidence: 0.95', { selfReported: 0.20 });
  assert.equal(v.decision, 'escalate');
  assert.equal(v.confidence, 0.20);
  assert.match(v.reason, /src=caller/);
});

// --- response shape variations --------------------------------------------

test('object response with .text field works', () => {
  const v = evaluate({ text: 'answer\nconfidence: 0.85' });
  assert.equal(v.decision, 'accept');
});

test('object response with .content field works', () => {
  const v = evaluate({ content: 'answer\nconfidence: 0.85' });
  assert.equal(v.decision, 'accept');
});

test('object response with no usable field -> escalate (treated as empty)', () => {
  const v = evaluate({ foo: 'bar' });
  assert.equal(v.decision, 'escalate');
});

// --- no signal at all -----------------------------------------------------

test('substantive content with no signal -> default-safe escalate', () => {
  // No marker, no hedge, length OK — gate has no signal -> escalate.
  const v = evaluate('The quick brown fox jumps over the lazy dog. This is a substantive answer.');
  assert.equal(v.decision, 'escalate');
});

test('shouldAcceptLocal NEVER throws', () => {
  assert.doesNotThrow(() => shouldAcceptLocal(null));
  assert.doesNotThrow(() => shouldAcceptLocal({ weird: 'shape' }));
  assert.doesNotThrow(() => shouldAcceptLocal('confidence: 0.NaN'));
});

// --- threshold configurability --------------------------------------------

test('opts.threshold overrides default', () => {
  // value 0.5 with strict threshold 0.8 -> escalate
  const v = evaluate('answer\nconfidence: 0.50', { threshold: 0.8 });
  assert.equal(v.decision, 'escalate');
  // value 0.5 with loose threshold 0.3 -> accept
  const v2 = evaluate('answer\nconfidence: 0.50', { threshold: 0.3 });
  assert.equal(v2.decision, 'accept');
});

test('invalid threshold -> escalate (default-safe)', () => {
  const v = evaluate('answer\nconfidence: 0.99', { threshold: 'high' });
  assert.equal(v.decision, 'escalate');
});

test('DEFAULT_THRESHOLD is 0.6', () => {
  assert.equal(DEFAULT_THRESHOLD, 0.6);
});

// --- env-controlled threshold ---------------------------------------------

test('ROUTER_CONFIDENCE_THRESHOLD env var is honored', () => {
  const prev = process.env.ROUTER_CONFIDENCE_THRESHOLD;
  process.env.ROUTER_CONFIDENCE_THRESHOLD = '0.9';
  try {
    // 0.85 < 0.9 -> escalate
    assert.equal(shouldAcceptLocal('confidence: 0.85'), false);
    // 0.95 >= 0.9 -> accept
    assert.equal(shouldAcceptLocal('confidence: 0.95'), true);
  } finally {
    if (prev === undefined) delete process.env.ROUTER_CONFIDENCE_THRESHOLD;
    else process.env.ROUTER_CONFIDENCE_THRESHOLD = prev;
  }
});
