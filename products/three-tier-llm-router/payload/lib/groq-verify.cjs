// groq-verify.cjs — generic hallucination guard for Tier 2 (cheap) responses.
// Scans a model response for claim patterns and returns an array of failures
// (empty = clean). Failures are advisory — logged on the call entry, the
// response is still returned to the caller.
//
// Patterns:
//   1. file_path  — absolute or repo-relative paths; verified via fs.existsSync
//                    against $ROUTER_VERIFY_ROOT (default $ROUTER_HOME).
//   2. commit_sha — 7-40 char hex; flagged but not verified.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function routerHome() {
  return process.env.ROUTER_HOME || path.join(os.homedir(), '.router');
}

function verifyRoot() {
  return process.env.ROUTER_VERIFY_ROOT || routerHome();
}

const FILE_PATH_RE = /(?:^|[\s`'"(])((?:\/[\w.\-]+)+\.[a-zA-Z0-9]{1,8})/g;
const SHA_RE = /\b([0-9a-f]{7,40})\b/g;

function verifyFilePath(p) {
  try {
    if (path.isAbsolute(p)) return fs.existsSync(p);
    return fs.existsSync(path.join(verifyRoot(), p));
  } catch (_) { return false; }
}

function verifyResponse(text) {
  if (!text || typeof text !== 'string') return [];
  const failures = [];
  const seen = new Set();

  let m;

  while ((m = FILE_PATH_RE.exec(text)) !== null) {
    const claim = m[1];
    if (claim.length < 4) continue;
    const key = `file:${claim}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!verifyFilePath(claim)) {
      failures.push({ type: 'file_path', claim, verified: false, reason: 'path does not exist' });
    }
  }

  while ((m = SHA_RE.exec(text)) !== null) {
    const claim = m[1];
    // skip if obviously a hash inside a longer non-sha context — leave to the caller
    if (/[g-z]/i.test(claim)) continue;
    if (claim.length < 7) continue;
    const key = `sha:${claim}`;
    if (seen.has(key)) continue;
    seen.add(key);
    failures.push({ type: 'commit_sha', claim, verified: null, reason: 'not verified — flagged only' });
  }

  return failures;
}

module.exports = { verifyResponse };
