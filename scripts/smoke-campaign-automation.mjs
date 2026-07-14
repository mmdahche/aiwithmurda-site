import { sprintConfig } from "../src/data/seed.js";
import {
  getCampaignDateForDay,
  getCampaignDayForTimestamp,
  getCampaignState,
} from "../src/lib/campaign.js";
import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(sprintConfig.startDate === "2026-07-28", "Campaign start date must remain July 28, 2026");
assert(getCampaignDateForDay(sprintConfig, 60) === "2026-09-25", "Day 60 must remain September 25, 2026");
assert(
  getCampaignState(sprintConfig, "2026-07-27T23:59:59-05:00").phase === "rehearsal",
  "The second before launch must be rehearsal mode",
);
assert(
  getCampaignState(sprintConfig, "2026-07-28T00:00:00-05:00").currentDay === 1,
  "Campaign must enter Day 1 exactly at midnight Central",
);
assert(
  getCampaignDayForTimestamp(sprintConfig, "2026-09-25T23:59:59-05:00") === 60,
  "The final second of Day 60 must still count",
);
assert(
  getCampaignState(sprintConfig, "2026-09-26T00:00:00-05:00").phase === "complete",
  "Campaign must complete after Day 60",
);

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const adminToken = requireEnv(env, "ADMIN_API_TOKEN");
const adminHeaders = { Authorization: `Bearer ${adminToken}` };

const publicStatus = await fetchJson(`${siteUrl}/api/campaign/status`);
assert(publicStatus.response.ok && publicStatus.data?.ok === true, "Public campaign status failed");
assert(publicStatus.data?.campaign?.startDate === "2026-07-28", "Production campaign start date drifted");
assert(publicStatus.data?.campaign?.endDate === "2026-09-25", "Production campaign end date drifted");
assert(publicStatus.data?.automation?.enabled === true, "Campaign worker is not enabled");

const blockedAdminStatus = await fetchJson(`${siteUrl}/api/admin/campaign/automation`);
assert(
  blockedAdminStatus.response.status === 401 && blockedAdminStatus.data?.error === "invalid_admin_token",
  "Campaign automation status is not admin-protected",
);

const adminStatus = await fetchJson(`${siteUrl}/api/admin/campaign/automation`, { headers: adminHeaders });
assert(adminStatus.response.ok && adminStatus.data?.ok === true, "Admin campaign automation status failed");
assert(adminStatus.data?.status?.worker?.enabled === true, "Campaign worker status is missing");
assert(adminStatus.data?.status?.stream?.authority === "twitch", "Twitch must remain the stream-hour authority");
assert(adminStatus.data?.status?.stream?.storageReady === true, "Stream telemetry migration is not ready");
assert(adminStatus.data?.status?.clips?.storageReady === true, "Clip event migration is not ready");

const blockedExport = await fetch(`${siteUrl}/api/admin/campaign/export/json`);
assert(blockedExport.status === 401, "Campaign exports are not admin-protected");

const jsonExport = await fetch(`${siteUrl}/api/admin/campaign/export/json`, { headers: adminHeaders });
const jsonPayload = await jsonExport.json().catch(() => ({}));
assert(jsonExport.ok && jsonPayload?.config?.startDate === "2026-07-28", "Campaign JSON export failed");
assert(Array.isArray(jsonPayload?.logs), "Campaign JSON export is missing logs");

const csvExport = await fetch(`${siteUrl}/api/admin/campaign/export/csv`, { headers: adminHeaders });
const csvPayload = await csvExport.text();
assert(csvExport.ok && csvPayload.startsWith("day,date,mainGoal"), "Campaign CSV export failed");

const htmlExport = await fetch(`${siteUrl}/api/admin/campaign/export/html`, { headers: adminHeaders });
const htmlPayload = await htmlExport.text();
assert(htmlExport.ok && htmlPayload.includes("Proof Deck Control Slide"), "Campaign proof-deck export failed");

console.log(
  JSON.stringify(
    {
      ok: true,
      siteUrl,
      campaign: publicStatus.data.campaign,
      automation: {
        streamStorageReady: adminStatus.data.status.stream.storageReady,
        clipStorageReady: adminStatus.data.status.clips.storageReady,
        streamAuthority: adminStatus.data.status.stream.authority,
        dailyLogCount: adminStatus.data.status.dailyLogs.count,
      },
      exports: ["json", "csv", "html"],
    },
    null,
    2,
  ),
);

