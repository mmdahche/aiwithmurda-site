import { sprintConfig } from "../src/data/seed.js";
import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

function createLaunchBaseline() {
  return [
    {
      day: 1,
      date: sprintConfig.startDate,
      mainGoal: "Launch the sprint and set the public baseline",
      status: "planned",
      followers: Object.fromEntries(sprintConfig.platforms.map((platform) => [platform, 0])),
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

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const shouldPush = process.argv.includes("--push");
const logs = createLaunchBaseline();

if (!shouldPush) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: true,
        siteUrl,
        message: "Dry run only. Re-run with --push to replace production daily logs with this launch baseline.",
        logs,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const adminToken = requireEnv(env, "ADMIN_API_TOKEN");
const response = await fetch(`${siteUrl}/api/admin/daily-logs`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ logs, replace: true }),
});

const data = await response.json().catch(() => ({}));
if (!response.ok) {
  throw new Error(`${response.status} ${JSON.stringify(data)}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      siteUrl,
      replaced: data.replace === true,
      synced: data.logs?.length || 0,
      firstDay: data.logs?.[0]?.day || null,
      latestDay: data.logs?.at(-1)?.day || null,
    },
    null,
    2,
  ),
);
