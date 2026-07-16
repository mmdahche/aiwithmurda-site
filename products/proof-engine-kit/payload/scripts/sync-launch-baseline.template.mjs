#!/usr/bin/env node
/**
 * Baseline reset CLI — copy to scripts/sync-launch-baseline.mjs
 * Usage: node sync-launch-baseline.mjs [--push] [env-file]
 */
import fs from "node:fs";
import path from "node:path";

const configPath = process.env.SPRINT_CONFIG || path.join(process.cwd(), "src/data/sprint-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const shouldPush = process.argv.includes("--push");
const siteUrl = process.env.SITE_URL || process.env.SMOKE_SITE_URL;
const adminToken = process.env.ADMIN_API_TOKEN;

function createLaunchBaseline(followers = {}) {
  const followerCounts = Object.fromEntries(
    config.platforms.map((platform) => [platform, Number(followers[platform] || 0)]),
  );
  return [
    {
      day: 1,
      date: config.startDate,
      mainGoal: "Launch the sprint and set the public baseline",
      status: "planned",
      followers: { ...followerCounts, _baseline: followerCounts },
      emailSubscribers: 0,
      revenueCollected: 0,
      revenuePipeline: 0,
      hoursStreamed: 0,
      clipsPosted: 0,
      outreachSent: 0,
      callsBooked: 0,
      productsSold: 0,
      buildsShipped: 0,
      dailyLessons: 0,
      shippedItems: [],
      bestMoment: "",
      biggestFailure: "",
      lessonLearned: "",
      tomorrowPromise: "",
      spikeCause: "",
      proofAssets: [],
    },
  ];
}

let followerBaseline = {};
if (shouldPush && siteUrl) {
  const res = await fetch(`${siteUrl}/api/followers/live`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.sources)) {
    throw new Error(`Unable to capture follower baseline: ${res.status}`);
  }
  followerBaseline = Object.fromEntries(
    data.sources
      .filter((s) => s.connected && Number.isFinite(Number(s.count)))
      .map((s) => [s.key, Number(s.count)]),
  );
}

const logs = createLaunchBaseline(followerBaseline);

if (!shouldPush) {
  console.log(JSON.stringify({ ok: true, dryRun: true, siteUrl: siteUrl || null, logs }, null, 2));
  process.exit(0);
}

if (!siteUrl || !adminToken) throw new Error("SITE_URL and ADMIN_API_TOKEN required for --push");

const response = await fetch(`${siteUrl}/api/admin/daily-logs`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({ logs, replace: true }),
});
const data = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(data)}`);

console.log(JSON.stringify({ ok: true, replaced: data.replace === true, synced: data.logs?.length || 0 }, null, 2));
