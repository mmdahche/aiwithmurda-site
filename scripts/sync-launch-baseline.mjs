import { createClient } from "@supabase/supabase-js";
import { sprintConfig } from "../src/data/seed.js";
import { defaultEnvPath, getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

function createLaunchBaseline(followers = {}) {
  const followerCounts = Object.fromEntries(
    sprintConfig.platforms.map((platform) => [platform, Number(followers[platform] || 0)]),
  );
  return [
    {
      day: 1,
      date: sprintConfig.startDate,
      mainGoal: "Launch the first official AI with Murda stream and establish the Day 1 baseline",
      status: "planned",
      followers: {
        ...followerCounts,
        _baseline: followerCounts,
        _campaignStartedAt: new Date(sprintConfig.startAt).toISOString(),
      },
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
      workItems: [],
    },
  ];
}

const envPath = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const env = loadEnv(envPath || defaultEnvPath);
const siteUrl = getSiteUrl(env);
const shouldPush = process.argv.includes("--push");
let followerBaseline = {};

if (shouldPush) {
  const followerResponse = await fetch(`${siteUrl}/api/followers/live`);
  const followerData = await followerResponse.json().catch(() => ({}));
  if (!followerResponse.ok || !Array.isArray(followerData.sources)) {
    throw new Error(`Unable to capture follower baseline: ${followerResponse.status} ${JSON.stringify(followerData)}`);
  }
  followerBaseline = Object.fromEntries(
    followerData.sources
      .filter((source) => source.connected && Number.isFinite(Number(source.count)))
      .map((source) => [source.key, Number(source.count)]),
  );
}

const logs = createLaunchBaseline(followerBaseline);

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
const supabaseUrl = requireEnv(env, "SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const campaignStatusResponse = await fetch(`${siteUrl}/api/campaign/status`);
const campaignStatus = await campaignStatusResponse.json().catch(() => ({}));
if (!campaignStatusResponse.ok || campaignStatus?.stream?.live) {
  throw new Error("Refusing launch reset while the production stream is live or its status is unavailable.");
}

const { data: resetStreamSessions, error: streamResetError } = await supabaseAdmin
  .from("stream_sessions")
  .update({ counts_toward_campaign: false, counted_seconds: 0 })
  .or("counts_toward_campaign.eq.true,counted_seconds.gt.0")
  .select("id");
if (streamResetError) throw streamResetError;

const { data: resetClipEvents, error: clipResetError } = await supabaseAdmin
  .from("clip_events")
  .update({ counts_toward_campaign: false, campaign_day: null })
  .eq("counts_toward_campaign", true)
  .select("id");
if (clipResetError) throw clipResetError;

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
      resetStreamSessions: resetStreamSessions?.length || 0,
      resetClipEvents: resetClipEvents?.length || 0,
    },
    null,
    2,
  ),
);
