// redact.cjs — fail-closed egress scrub for cloud-tier prompts.
//
// Scope: secrets + obvious PII. Scrubs LLM prompts on their way OUT to any
// cheap-tier cloud provider (e.g. Groq, Fireworks, Cerebras) before they leave
// the local process.
//
// Contract:
//   redact(text)        -> { clean: string, hits: Array<{name, count}> }
//   verifyClean(text)   -> bool   true iff no secret-shaped tokens detected
//
// FAIL-CLOSED principle: treat a redactor error as "do NOT emit the content."
// Callers must handle the throw and escalate or abort — NEVER fall through to
// a cloud send.
//
// Pure stdlib. No network. No eval. Compatible with Node >= 18.

'use strict';

const PLACEHOLDER = '<REDACTED>';

// Single source of truth for secret + PII shapes. Order matters: longer /
// more specific patterns first so e.g. `sk-ant-...` is captured by the
// anthropic rule before the generic `inline_secret_assignment` rule fires.
//
// Each entry: { name, pattern, replacement? }. Default replacement = PLACEHOLDER.
//
// Regex sources use character classes / alternations to avoid embedding
// contiguous secret-shaped literals in the file itself.
const PATTERNS = [
  // -- PEM private key block (DOTALL via [\s\S]) ---------------------------
  {
    name: 'private_key_block',
    pattern: /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/g,
  },
  // -- PEM begin marker alone (truncated key) — fail-closed flag ------------
  {
    name: 'private_key_marker',
    pattern: /-----BEGIN[A-Z ]*PRIVATE KEY-----/g,
  },
  // -- Provider keys --------------------------------------------------------
  { name: 'anthropic_key',   pattern: /sk-ant-[A-Za-z0-9_\-]{20,}/g },
  { name: 'openai_key',      pattern: /sk-(?:proj-)?[A-Za-z0-9_\-]{20,}/g },
  { name: 'stripe_key',      pattern: /[rs]k_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: 'stripe_webhook',  pattern: /\bwhsec_[A-Za-z0-9]{32,}\b/g },
  { name: 'github_pat',      pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g },
  { name: 'github_fine_pat', pattern: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g },
  { name: 'gitlab_pat',      pattern: /\bglpat-[A-Za-z0-9_\-]{20,}\b/g },
  { name: 'aws_akid',        pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: 'slack_token',     pattern: /\bxox[baprs]-[A-Za-z0-9\-]{10,}\b/g },
  { name: 'google_api_key',  pattern: /\bAIza[0-9A-Za-z_\-]{35}\b/g },
  { name: 'google_oauth',    pattern: /\bya29\.[A-Za-z0-9_\-]{20,}/g },
  // JWT: three base64url chunks separated by dots; leading `eyJ` is the standard
  // header start.
  { name: 'jwt',             pattern: /\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/g },
  // -- Bearer / Basic auth --------------------------------------------------
  // Capture the whole `Bearer xxx` substring (header value AND the token).
  { name: 'bearer_token',    pattern: /(?:^|(?<=[\s,;]))[Bb]earer\s+[A-Za-z0-9._~+\/=\-]{20,}/g },
  { name: 'basic_auth',      pattern: /(?:^|(?<=[\s,;]))[Bb]asic\s+[A-Za-z0-9+\/]{16,}={0,2}/g },
  // -- URL credentials (scheme://user:pass@host) ----------------------------
  { name: 'url_creds',       pattern: /:\/\/[^\/\s:@]+:[^\/\s@]+@/g },
  // -- Supabase / Twilio / SendGrid / DO / npm / PyPI / Shopify ------------
  { name: 'supabase_key',    pattern: /\bsb_(?:publishable|secret)_[A-Za-z0-9]{8,}\b/g },
  { name: 'twilio',          pattern: /\b(?:AC|SK)[0-9a-fA-F]{32}\b/g },
  { name: 'sendgrid',        pattern: /\bSG\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\b/g },
  { name: 'digitalocean',    pattern: /\bdop_v1_[0-9a-f]{64}\b/g },
  { name: 'npm_token',       pattern: /\bnpm_[A-Za-z0-9]{36}\b/g },
  // -- Generic assignment of an api_key / password / secret / token ---------
  // Matches `api_key = "..."`, `password: 'hunter2...'`, `token=abcdef123456`.
  // The value charset excludes whitespace, quotes, and most punctuation;
  // minimum 8 chars to avoid false positives on placeholders like `your_key`.
  // We only replace the captured VALUE, keeping the assignment skeleton.
  {
    name: 'inline_secret_assignment',
    // (key_name)(separator+quote?)(value)
    // value: must NOT look like a placeholder (we re-check post-match).
    pattern: /\b((?:api[_-]?key|access[_-]?key|secret[_-]?key|client[_-]?secret|private[_-]?key|auth[_-]?token|password|passwd|secret|token|credential))\s*([:=])\s*(["']?)([^\s"',;<>{}\[\]]{8,})\3/gi,
    // Custom replacer: keep skeleton, redact value, but skip obvious placeholders.
    replacer: (m, key, sep, quote, value) => {
      if (looksLikePlaceholder(value)) return m;
      return `${key}${sep}${quote || ''}${PLACEHOLDER}${quote || ''}`;
    },
  },
  // -- Email (obvious PII) — keep allowlisted boilerplate -------------------
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    replacer: (m) => (EMAIL_ALLOW.has(m.toLowerCase()) ? m : '<EMAIL>'),
  },
];

const EMAIL_ALLOW = new Set([
  'noreply@anthropic.com',
  'support@anthropic.com',
  'example@example.com',
  'no-reply@example.com',
]);

const PLACEHOLDER_VALUES = new Set([
  'redacted', 'your-key-here', 'your_key_here', 'your_api_key', 'your-api-key',
  'changeme', 'change-me', 'example', 'placeholder', 'xxxxxxxx', 'todo',
  'none', 'null', 'true', 'false', '...', '<your_key>', '<token>', '<secret>',
]);

function looksLikePlaceholder(value) {
  if (!value) return true;
  const v = String(value).trim().toLowerCase().replace(/^["']|["']$/g, '');
  if (!v) return true;
  if (PLACEHOLDER_VALUES.has(v)) return true;
  // pure fill (xxxx, ----, ****, 0000, ...)
  if (/^[x*.\-_0]+$/.test(v)) return true;
  // `${ENV_VAR}` / `$ENV_VAR`
  if (/^\$\{[A-Za-z0-9_]+\}$/.test(v)) return true;
  if (/^\$[A-Z][A-Z0-9_]{1,30}$/.test(v)) return true;
  // `<slug>` placeholder — only clear known vocabulary
  const slugMatch = v.match(/^<([a-z0-9_\- ]+)>$/);
  if (slugMatch && PLACEHOLDER_VALUES.has(slugMatch[1].trim())) return true;
  // `${env.X}` / `process.env.X` accessors are not values
  if (/^(?:process\.env|os\.environ|os\.getenv|getenv|deno\.env)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/i.test(v)) return true;
  // *_here / -here trailing convention (docs install lines)
  if (/^[a-z]+(?:[_\-][a-z]+)*(?:_here|-here)$/.test(v)) return true;
  return false;
}

/**
 * Scrub `text` of secret + PII shapes.
 *
 * @param {string|null|undefined} text
 * @returns {{ clean: string, hits: Array<{name: string, count: number}> }}
 *
 * Throws on non-string, non-null inputs (fail-closed: caller must NOT emit
 * an unscrubbed value just because the type was wrong).
 */
function redact(text) {
  if (text === null || text === undefined) return { clean: '', hits: [] };
  if (typeof text !== 'string') {
    throw new TypeError(`redact: expected string, got ${typeof text}`);
  }
  let clean = text;
  const hits = [];
  for (const { name, pattern, replacer } of PATTERNS) {
    // re-arm: regex literals declared with /g are stateful; clone for safety
    const re = new RegExp(pattern.source, pattern.flags);
    let count = 0;
    if (replacer) {
      clean = clean.replace(re, (...args) => {
        const out = replacer(...args);
        if (out !== args[0]) count++;
        return out;
      });
    } else {
      clean = clean.replace(re, () => { count++; return PLACEHOLDER; });
    }
    if (count > 0) hits.push({ name, count });
  }
  return { clean, hits };
}

/**
 * Return true iff `text` is free of detectable secrets / PII.
 *
 * Used post-scrub to confirm the scrubbed text is safe to emit. If this
 * returns false AFTER a redact() pass, the caller MUST fail closed — a
 * pattern wasn't strong enough to fully remove the value.
 *
 * @param {string|null|undefined} text
 * @returns {boolean}
 */
function verifyClean(text) {
  if (text === null || text === undefined || text === '') return true;
  if (typeof text !== 'string') {
    // a non-string here is structurally unsafe — caller will fail-closed
    return false;
  }
  for (const { name, pattern } of PATTERNS) {
    // Skip the generic assignment rule on the post-scrub check — its
    // replacement is the SKELETON (`api_key=<REDACTED>`), which still
    // contains the keyword `api_key=` and would re-match infinitely.
    if (name === 'inline_secret_assignment') continue;
    const re = new RegExp(pattern.source, pattern.flags);
    if (re.test(text)) return false;
  }
  return true;
}

module.exports = {
  redact,
  verifyClean,
  PATTERNS,
  PLACEHOLDER,
  // exported for tests
  _looksLikePlaceholder: looksLikePlaceholder,
};
