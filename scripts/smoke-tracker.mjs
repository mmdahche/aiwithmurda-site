import { getSiteUrl, loadEnv } from "./env-loader.mjs";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const env = loadEnv();
const siteUrl = getSiteUrl(env);

const publicLogs = await fetchJson(`${siteUrl}/api/daily-logs`);
if (!publicLogs.response.ok || !Array.isArray(publicLogs.data?.logs)) {
  throw new Error(`Public daily logs failed: ${publicLogs.response.status} ${JSON.stringify(publicLogs.data)}`);
}

const blockedWrite = await fetchJson(`${siteUrl}/api/admin/daily-logs`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ logs: [] }),
});
if (blockedWrite.response.status !== 401 || blockedWrite.data?.error !== "invalid_admin_token") {
  throw new Error(`Admin guard failed: ${blockedWrite.response.status} ${JSON.stringify(blockedWrite.data)}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      siteUrl,
      checks: {
        publicLogsReadable: true,
        adminWritesBlockedWithoutToken: true,
      },
      logs: {
        count: publicLogs.data.logs.length,
        firstDay: publicLogs.data.logs[0]?.day || null,
        latestDay: publicLogs.data.logs.at(-1)?.day || null,
      },
    },
    null,
    2,
  ),
);
