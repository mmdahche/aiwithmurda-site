import { getSiteUrl, loadEnv } from "./env-loader.mjs";

const env = loadEnv();
const siteUrl = getSiteUrl(env);

async function getJson(path) {
  const response = await fetch(`${siteUrl}${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${data.error || "unknown_error"}`);
  }
  return data;
}

const config = await getJson("/api/stream/config");
const destinations = Array.isArray(config.destinations) ? config.destinations : [];
const commands = Array.isArray(config.commands) ? config.commands : [];
const commandMap = new Map(commands.map((item) => [item.command, item.href]));

const checks = {
  streamConfigReadable: config.ok === true,
  primaryRoomPresent: Boolean(config.primary?.name),
  destinationsPresent: destinations.length >= 3,
  scoreboardLinked: destinations.some((item) => item.key === "scoreboard" && item.href === "/60"),
  liveBuildsLinked: destinations.some((item) => item.key === "live-builds" && item.href === "/live-builds"),
  scoreboardCommand: commandMap.get("!scoreboard") === "/60",
  dashboardAliasCommand: commandMap.get("!dashboard") === "/60",
  todayCommand: commandMap.get("!today") === "/day/1",
  dayOneCommand: commandMap.get("!day1") === "/day/1",
  liveCommand: commandMap.get("!live") === "/live",
  overlayCommand: commandMap.get("!overlay") === "/overlay",
  liveBuildsCommand: commandMap.get("!builds") === "/live-builds",
  runbookCommand: commandMap.get("!runbook") === "/members",
  rehearsalPlanPresent:
    config.rehearsal?.title === "Fake Stream Rehearsal" &&
    Array.isArray(config.rehearsal?.steps) &&
    config.rehearsal.steps.length >= 5,
  rehearsalObsStepPresent:
    Array.isArray(config.rehearsal?.steps) &&
    config.rehearsal.steps.some((step) => String(step.target || "").includes("/obs")),
  platformSetupPresent:
    Array.isArray(config.platformSetup) &&
    config.platformSetup.some((item) => item.key === "youtube" && item.envKey === "STREAM_YOUTUBE_URL") &&
    config.platformSetup.some((item) => item.key === "twitch" && item.envKey === "STREAM_TWITCH_URL") &&
    config.platformSetup.some((item) => item.key === "main" && item.envKey === "STREAM_PRIMARY_URL"),
  privacyGuardPresent:
    config.privacyGuard?.title === "Stream Privacy Guard" &&
    Array.isArray(config.privacyGuard?.rules) &&
    config.privacyGuard.rules.some((rule) => rule.key === "secret-screens") &&
    config.privacyGuard.rules.some((rule) => rule.key === "payment-blackout"),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

if (failed.length) {
  throw new Error(`Stream config smoke failed: ${failed.join(", ")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      siteUrl,
      checks,
      status: config.status,
      configuredDestinations: destinations.filter((item) => item.configured).length,
      commandCount: commands.length,
    },
    null,
    2,
  ),
);
