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

const checks = {
  streamConfigReadable: config.ok === true,
  primaryRoomPresent: Boolean(config.primary?.name),
  destinationsPresent: destinations.length >= 3,
  scoreboardLinked: destinations.some((item) => item.key === "scoreboard" && item.href === "/60"),
  commandsPresent: commands.some((item) => item.command === "!dashboard" && item.href === "/60"),
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
