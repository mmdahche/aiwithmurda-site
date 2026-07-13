// confidence-gate.cjs — early-exit accept rule for the local (Tier 1) lane.
//
// Principle: if a local-tier response is HIGH-confidence, accept it and skip
// the cheap-tier escalation. If it's LOW / hedged / missing / unparseable,
// escalate. The ONLY safe direction for an opt-in early-exit is to skip
// escalation on a HIGH signal — LOW must NEVER skip escalation on a false-high.
//
// Two confidence sources, highest-priority first:
//   1. Self-reported numeric ([confidence: 0.NN] / `confidence=0.NN`) or
//      categorical (HIGH / MED / LOW marker).
//   2. Heuristic: hedge words ("not sure", "I think", "unclear", ...) force LOW;
//      empty / trivially short content forces LOW.
//
// Default-safe: a hedge contradicts ANY self-reported HIGH score (we never let
// "confidence: 0.95 ... but I'm not sure" slip past).
//
// shouldAcceptLocal(response, opts?) -> boolean
//   returns true ONLY when the gate observes a HIGH signal AND no contradicting
//   hedge. Returns false on LOW / unparseable / missing / empty — caller MUST
//   escalate. NEVER throws.
//
// evaluate(response, opts?) -> { decision, confidence, reason }
//   richer form for callers/tests. decision in {'accept','escalate'}.

'use strict';

const DECISION_ACCEPT = 'accept';
const DECISION_ESCALATE = 'escalate';

// Default threshold for self-reported numeric scores. Overridable per-call
// via opts.threshold or globally via ROUTER_CONFIDENCE_THRESHOLD.
const DEFAULT_THRESHOLD = 0.6;

// `confidence: 0.NN` / `confidence=0.NN` / `[confidence: 0.NN]` etc.
const CONF_MARKER_RE = /(?:^|[^A-Za-z0-9])(?:confidence|conf)\s*[:=]\s*\[?\s*(0?\.\d+|1(?:\.0+)?|0(?:\.0+)?)\s*\]?/i;

// HIGH / MED / LOW categorical marker (`confidence: HIGH`, `[HIGH]`).
const CONF_CATEGORICAL_RE = /(?:^|[^A-Za-z0-9])(?:confidence|conf)\s*[:=]\s*\[?\s*(HIGH|MED(?:IUM)?|LOW|UNSURE)\s*\]?/i;

// Bare `[HIGH]` / `[LOW]` tags at end-of-line are also accepted.
const CONF_BARE_TAG_RE = /(?:^|\s|\[)(HIGH|MED(?:IUM)?|LOW|UNSURE)\s*(?:\]|$)/i;

const HEDGE_PATTERNS = [
  /\bi['’]?m\s+not\s+sure\b/i,
  /\bnot\s+sure\b/i,
  /\bi\s+don['’]?t\s+know\b/i,
  /\bdo\s+not\s+know\b/i,
  /\bunsure\b/i,
  /\bunclear\b/i,
  /\bi\s+guess\b/i,
  /\bi\s+think\b/i,
  /\bmaybe\b/i,
  /\bcannot\s+(?:answer|tell|determine)\b/i,
];

function extractContent(response) {
  if (response === null || response === undefined) return '';
  if (typeof response === 'string') return response;
  if (typeof response === 'object') {
    if (typeof response.text === 'string') return response.text;
    if (typeof response.content === 'string') return response.content;
  }
  return '';
}

function findHedge(content) {
  if (!content) return null;
  for (const p of HEDGE_PATTERNS) {
    const m = content.match(p);
    if (m) return m[0].toLowerCase();
  }
  return null;
}

function extractNumericConfidence(content) {
  if (!content) return null;
  const m = content.match(CONF_MARKER_RE);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!Number.isFinite(v) || v < 0 || v > 1) return null;
  return v;
}

function extractCategoricalConfidence(content) {
  if (!content) return null;
  const m = content.match(CONF_CATEGORICAL_RE) || content.match(CONF_BARE_TAG_RE);
  if (!m) return null;
  const tag = m[1].toUpperCase();
  if (tag === 'HIGH') return 'HIGH';
  if (tag.startsWith('MED')) return 'MED';
  if (tag === 'LOW' || tag === 'UNSURE') return 'LOW';
  return null;
}

/**
 * @param {string|object} response   raw model response (string or {text})
 * @param {object} [opts]
 * @param {number} [opts.threshold]  numeric cutoff in [0,1] (default 0.6)
 * @param {number} [opts.selfReported]  caller-supplied numeric score (overrides marker)
 * @returns {{decision: 'accept'|'escalate', confidence: number|null, reason: string}}
 */
function evaluate(response, opts = {}) {
  let threshold = opts.threshold;
  if (threshold === undefined || threshold === null) {
    const envT = parseFloat(process.env.ROUTER_CONFIDENCE_THRESHOLD || '');
    threshold = Number.isFinite(envT) ? envT : DEFAULT_THRESHOLD;
  }
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    return { decision: DECISION_ESCALATE, confidence: null, reason: `invalid threshold ${opts.threshold}` };
  }

  const content = extractContent(response);
  if (!content || !content.trim()) {
    return { decision: DECISION_ESCALATE, confidence: 0, reason: 'empty content' };
  }

  // 1) caller-supplied numeric overrides everything
  let value = null;
  let src = null;
  if (Number.isFinite(opts.selfReported) && opts.selfReported >= 0 && opts.selfReported <= 1) {
    value = opts.selfReported;
    src = 'caller';
  } else {
    const v = extractNumericConfidence(content);
    if (v !== null) { value = v; src = 'marker'; }
  }

  const hedge = findHedge(content);

  // 2) numeric path
  if (value !== null) {
    if (hedge) {
      return {
        decision: DECISION_ESCALATE,
        confidence: value,
        reason: `hedge "${hedge}" contradicts self-reported ${value.toFixed(2)}`,
      };
    }
    if (value >= threshold) {
      return {
        decision: DECISION_ACCEPT,
        confidence: value,
        reason: `self-reported ${value.toFixed(2)} >= threshold ${threshold.toFixed(2)} (src=${src})`,
      };
    }
    return {
      decision: DECISION_ESCALATE,
      confidence: value,
      reason: `self-reported ${value.toFixed(2)} < threshold ${threshold.toFixed(2)} (src=${src})`,
    };
  }

  // 3) categorical marker
  const cat = extractCategoricalConfidence(content);
  if (cat) {
    if (hedge && cat === 'HIGH') {
      return { decision: DECISION_ESCALATE, confidence: 0.5, reason: `hedge "${hedge}" contradicts HIGH marker` };
    }
    if (cat === 'HIGH') {
      return { decision: DECISION_ACCEPT, confidence: 0.85, reason: 'HIGH categorical marker' };
    }
    return { decision: DECISION_ESCALATE, confidence: cat === 'MED' ? 0.5 : 0.2, reason: `${cat} categorical marker` };
  }

  // 4) heuristic fall-through — default-safe ESCALATE on no signal
  if (hedge) {
    return { decision: DECISION_ESCALATE, confidence: 0.2, reason: `hedge "${hedge}" -> low confidence` };
  }
  if (content.trim().length < 8) {
    return { decision: DECISION_ESCALATE, confidence: 0.2, reason: 'content too short' };
  }
  return { decision: DECISION_ESCALATE, confidence: null, reason: 'no confidence signal -> default-safe escalate' };
}

/**
 * Convenience: true iff the local-tier response should be accepted as-is.
 * Default-safe: any non-HIGH signal returns false (caller escalates).
 *
 * @param {string|object} response
 * @param {object} [opts]
 * @returns {boolean}
 */
function shouldAcceptLocal(response, opts = {}) {
  try {
    return evaluate(response, opts).decision === DECISION_ACCEPT;
  } catch (_) {
    // never throw — fail to "escalate"
    return false;
  }
}

module.exports = {
  shouldAcceptLocal,
  evaluate,
  DEFAULT_THRESHOLD,
  DECISION_ACCEPT,
  DECISION_ESCALATE,
};
