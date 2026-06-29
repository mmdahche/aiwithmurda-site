import { spawn } from "node:child_process";
import path from "node:path";

const envFile = process.argv[2] ? path.resolve(process.argv[2]) : null;

const checks = [
  { name: "tracker", script: "scripts/smoke-tracker.mjs" },
  { name: "deck", script: "scripts/smoke-deck.mjs" },
  { name: "stream", script: "scripts/smoke-stream-config.mjs" },
  { name: "subscribe", script: "scripts/smoke-subscribe.mjs" },
  { name: "funnel", script: "scripts/smoke-funnel.mjs" },
];

function runCheck(check) {
  const startedAt = Date.now();
  const args = [check.script];
  if (envFile) args.push(envFile);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (code === 0) {
        resolve({ name: check.name, durationSeconds });
        return;
      }
      reject(new Error(`${check.name} smoke failed with exit code ${code}`));
    });
  });
}

const results = [];
for (const check of checks) {
  console.log(`\n== ${check.name} smoke ==`);
  results.push(await runCheck(check));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: results,
      envFile: envFile || "default",
      completedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
