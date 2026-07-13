// capacity-ledger.cjs — optional pool-headroom tracker.
//
// Tracks capacity across named "pools" (subscription plans, API budgets, or
// arbitrary resource pools) so an orchestrator can pick the least-hot lane
// before dispatching a task. Independent from tiered-ask.cjs — this is a
// standalone reporting utility that consumes the router's tier-usage log
// and any manual/event-based pool inputs.
//
// State layout (all under $ROUTER_HOME/capacity/):
//   state.json         — current computed pool status (rewritten each refresh)
//   events.jsonl       — append-only event log (dispatch/complete)
//   thresholds.json    — per-pool max/overflow config (user-managed)
//
// Public API:
//   getPoolStatus()       → { pools, recommended_lane, updated_at }
//   isAvailable(pool)     → boolean
//   logEvent(event)       → append to events.jsonl + refresh state
//   refreshState()        → recompute state.json from events + manual inputs
//   routerFactors()       → structured booleans for a caller-side decision
//
// CLI:
//   node lib/capacity-ledger.cjs report
//   node lib/capacity-ledger.cjs refresh
//   node lib/capacity-ledger.cjs log-dispatch --pool codex --task-id X --project Y
//   node lib/capacity-ledger.cjs log-complete --pool codex --task-id X
//   node lib/capacity-ledger.cjs set-claude --pct 42
//   node lib/capacity-ledger.cjs set-cursor-api --usd 87
//   node lib/capacity-ledger.cjs factors   → JSON

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function routerHome() {
  return process.env.ROUTER_HOME || path.join(os.homedir(), '.router');
}

function capacityDir()   { return path.join(routerHome(), 'capacity'); }
function statePath()     { return path.join(capacityDir(), 'state.json'); }
function eventsPath()    { return path.join(capacityDir(), 'events.jsonl'); }
function thresholdsPath(){ return path.join(capacityDir(), 'thresholds.json'); }
function tierUsageLog()  {
  return process.env.ROUTER_USAGE_LOG || path.join(routerHome(), 'memory', 'tier-usage.jsonl');
}

function readJson(fp, fallback) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(fp, obj) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

function appendEvent(event) {
  fs.mkdirSync(capacityDir(), { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
  fs.appendFileSync(eventsPath(), `${line}\n`, 'utf8');
}

function loadEvents(sinceMs) {
  const fp = eventsPath();
  if (!fs.existsSync(fp)) return [];
  const cutoff = Date.now() - sinceMs;
  return fs.readFileSync(fp, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l); } catch (_) { return null; }
    })
    .filter(Boolean)
    .filter((e) => new Date(e.ts).getTime() >= cutoff);
}

function countCodexDispatches(windowHours) {
  const events = loadEvents(windowHours * 60 * 60 * 1000);
  return events.filter((e) =>
    e.type === 'dispatch' && (e.pool === 'codex' || e.pool === 'codex_background')
  ).length;
}

function meteredStats(windowSize) {
  const fp = tierUsageLog();
  if (!fs.existsSync(fp)) {
    return { calls: 0, precision_pct: 0 };
  }
  const lines = fs.readFileSync(fp, 'utf8').trim().split('\n').filter(Boolean);
  const window = lines.slice(-windowSize).map((l) => {
    try { return JSON.parse(l); } catch (_) { return null; }
  }).filter(Boolean);
  const precision = window.filter((e) =>
    e.class === 'precision' || e.quota_routed_to === 'precision'
  ).length;
  const precisionPct = window.length ? Math.round((precision / window.length) * 100) : 0;
  return { calls: window.length, precision_pct: precisionPct };
}

function computeHeadroom(used, max, overflowPct) {
  const pct = max > 0 ? Math.round((used / max) * 100) : 0;
  const headroom = Math.max(0, 100 - pct);
  let status = 'OK';
  if (pct >= 100) status = 'EXHAUSTED';
  else if (pct >= overflowPct) status = 'HOT';
  return { used_pct: pct, headroom_pct: headroom, status };
}

function refreshState(manual = {}) {
  const thresholds = readJson(thresholdsPath(), {});
  const prev = readJson(statePath(), { pools: {} });

  const claudePct = manual.claude_pct ?? prev.pools?.claude_max?.used_pct ?? 0;
  const claudeOverflow = thresholds.claude_max?.overflow_pct ?? 60;
  const claudeHeadroom = computeHeadroom(claudePct, 100, claudeOverflow);

  const codexMax = thresholds.codex?.max_tasks_conservative ?? 240;
  const codexWindow = thresholds.codex?.window_hours ?? 5;
  const codexTasks = countCodexDispatches(codexWindow);
  const codexOverflow = thresholds.codex?.overflow_pct ?? 80;
  const codexHeadroom = computeHeadroom(codexTasks, codexMax, codexOverflow);

  const cursorBudget = thresholds.cursor_api?.monthly_budget_usd ?? 400;
  const cursorUsed = manual.cursor_usd ?? prev.pools?.cursor_api?.used_usd ?? 0;
  const cursorOverflow = thresholds.cursor_api?.overflow_pct ?? 75;
  const cursorHeadroom = computeHeadroom(cursorUsed, cursorBudget, cursorOverflow);

  const meteredWindow = thresholds.metered?.window_size ?? 50;
  const metered = meteredStats(meteredWindow);
  const meteredHeadroom = computeHeadroom(metered.precision_pct, 100, 40);

  const state = {
    updated_at: new Date().toISOString(),
    pools: {
      claude_max: {
        used_pct: claudePct,
        headroom_pct: claudeHeadroom.headroom_pct,
        status: claudeHeadroom.status,
        source: manual.claude_pct != null ? 'manual' : (prev.pools?.claude_max?.source || 'default'),
      },
      codex: {
        tasks_in_window: codexTasks,
        max_tasks: codexMax,
        window_hours: codexWindow,
        headroom_pct: codexHeadroom.headroom_pct,
        status: codexHeadroom.status,
        source: 'events',
      },
      cursor_api: {
        used_usd: cursorUsed,
        budget_usd: cursorBudget,
        headroom_pct: cursorHeadroom.headroom_pct,
        status: cursorHeadroom.status,
        source: manual.cursor_usd != null ? 'manual' : 'manual',
      },
      cursor_auto: {
        status: cursorHeadroom.status === 'EXHAUSTED' ? 'OK' : 'OK',
        note: 'Generous separate pool — prefer for routine UI tasks',
      },
      metered: {
        calls_in_window: metered.calls,
        precision_pct: metered.precision_pct,
        window_size: meteredWindow,
        headroom_pct: meteredHeadroom.headroom_pct,
        status: metered.precision_pct >= 40 ? 'HOT' : 'OK',
        source: 'tier-usage.jsonl',
      },
    },
    recommended_lane: pickRecommendedLane({
      claude: claudeHeadroom,
      codex: codexHeadroom,
      cursor: cursorHeadroom,
    }),
  };

  writeJson(statePath(), state);
  return state;
}

function pickRecommendedLane({ claude, codex, cursor }) {
  if (claude.status === 'OK') return 'claude_max';
  if (codex.status === 'OK') return 'codex';
  if (cursor.status === 'OK') return 'cursor_auto';
  return 'metered';
}

function getPoolStatus() {
  refreshState();
  return readJson(statePath(), {});
}

function isAvailable(pool) {
  const state = getPoolStatus();
  const p = state.pools?.[pool];
  if (!p) return false;
  if (pool === 'cursor_auto') return true;
  return p.status === 'OK' || p.status === 'HOT';
}

function logEvent(event) {
  appendEvent(event);
  return refreshState();
}

function routerFactors() {
  const state = getPoolStatus();
  const p = state.pools || {};
  const thresholds = readJson(thresholdsPath(), {});
  return {
    quota_high: (p.claude_max?.used_pct ?? 0) >= (thresholds.claude_max?.overflow_pct ?? 60),
    codex_available: isAvailable('codex'),
    cursor_available: isAvailable('cursor_api') || isAvailable('cursor_auto'),
    recommended_lane: state.recommended_lane,
    pools: p,
  };
}

function pad(s, n) {
  s = String(s);
  return s + ' '.repeat(Math.max(0, n - s.length));
}

function formatReport(state) {
  const lines = [];
  lines.push('Capacity Report');
  lines.push(`Updated: ${state.updated_at || 'never'}`);
  lines.push(`Recommended lane: ${state.recommended_lane || 'unknown'}`);
  lines.push('');
  lines.push(`${pad('Pool', 14)} ${pad('Used', 16)} ${pad('Headroom', 10)} Status`);
  lines.push('-'.repeat(56));

  const p = state.pools || {};
  if (p.claude_max) {
    lines.push(`${pad('Claude Max', 14)} ${pad(`${p.claude_max.used_pct}%`, 16)} ${pad(`${p.claude_max.headroom_pct}%`, 10)} ${p.claude_max.status}`);
  }
  if (p.codex) {
    lines.push(`${pad('Codex', 14)} ${pad(`${p.codex.tasks_in_window}/${p.codex.max_tasks}`, 16)} ${pad(`${p.codex.headroom_pct}%`, 10)} ${p.codex.status}`);
  }
  if (p.cursor_api) {
    lines.push(`${pad('Cursor API', 14)} ${pad(`$${p.cursor_api.used_usd}/$${p.cursor_api.budget_usd}`, 16)} ${pad(`${p.cursor_api.headroom_pct}%`, 10)} ${p.cursor_api.status}`);
  }
  if (p.cursor_auto) {
    lines.push(`${pad('Cursor Auto', 14)} ${pad('generous', 16)} ${pad('—', 10)} ${p.cursor_auto.status}`);
  }
  if (p.metered) {
    const used = `${p.metered.precision_pct || 0}% prec`;
    lines.push(`${pad('Metered', 14)} ${pad(used, 16)} ${pad(`${p.metered.headroom_pct}%`, 10)} ${p.metered.status}`);
  }

  return lines.join('\n');
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'report';

  switch (cmd) {
    case 'report':
      console.log(formatReport(getPoolStatus()));
      break;

    case 'refresh':
      console.log(JSON.stringify(refreshState(), null, 2));
      break;

    case 'factors':
      console.log(JSON.stringify(routerFactors(), null, 2));
      break;

    case 'log-dispatch': {
      const pool = args.pool || args._[1];
      if (!pool) {
        console.error('Usage: log-dispatch --pool <pool> [--task-id X] [--project Y] [--title T]');
        process.exit(1);
      }
      logEvent({
        type: 'dispatch',
        pool,
        task_id: args['task-id'] || args.task_id || `task-${Date.now()}`,
        project: args.project || null,
        title: args.title || null,
        lane: args.lane || pool,
      });
      console.log('logged dispatch');
      break;
    }

    case 'log-complete': {
      logEvent({
        type: 'complete',
        pool: args.pool || args._[1] || 'unknown',
        task_id: args['task-id'] || args.task_id || null,
        pr_url: args['pr-url'] || args.pr_url || null,
        branch: args.branch || null,
      });
      console.log('logged complete');
      break;
    }

    case 'set-claude': {
      const pct = parseFloat(args.pct || args._[1]);
      if (Number.isNaN(pct)) {
        console.error('Usage: set-claude --pct <0-100>');
        process.exit(1);
      }
      const prev = readJson(statePath(), { pools: {} });
      console.log(JSON.stringify(refreshState({
        claude_pct: pct,
        cursor_usd: prev.pools?.cursor_api?.used_usd,
      }), null, 2));
      break;
    }

    case 'set-cursor-api': {
      const usd = parseFloat(args.usd || args._[1]);
      if (Number.isNaN(usd)) {
        console.error('Usage: set-cursor-api --usd <number>');
        process.exit(1);
      }
      const prev = readJson(statePath(), { pools: {} });
      console.log(JSON.stringify(refreshState({
        claude_pct: prev.pools?.claude_max?.used_pct ?? 0,
        cursor_usd: usd,
      }), null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getPoolStatus,
  isAvailable,
  logEvent,
  refreshState,
  routerFactors,
  formatReport,
  capacityDir,
  statePath,
  eventsPath,
};
