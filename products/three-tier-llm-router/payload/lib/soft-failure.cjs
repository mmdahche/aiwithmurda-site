// soft-failure.cjs — error logger that never crashes.
// Appends a JSONL line to $ROUTER_HOME/memory/soft-failures.jsonl. Swallows write
// errors silently so a logging failure can't take down a router call.
//
// ROUTER_HOME env var overrides the default location ($HOME/.router). The
// memory/ subdirectory is auto-created on the first append.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function routerHome() {
  return process.env.ROUTER_HOME || path.join(os.homedir(), '.router');
}

function logPath() {
  return path.join(routerHome(), 'memory', 'soft-failures.jsonl');
}

function logSoftFailure(source, error, context = {}) {
  let entry;
  try {
    entry = {
      ts: new Date().toISOString(),
      source: String(source || 'unknown'),
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error),
      context,
    };
  } catch (_) {
    return; // shape failure — don't try to recover
  }

  try {
    const fp = logPath();
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.appendFileSync(fp, JSON.stringify(entry) + '\n');
  } catch (_) {
    // disk full / permissions / dir gone — swallow
  }
}

module.exports = { logSoftFailure };
