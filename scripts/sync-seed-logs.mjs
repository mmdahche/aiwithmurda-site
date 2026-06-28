import { seedLogs } from "../src/data/seed.js";
import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const adminToken = requireEnv(env, "ADMIN_API_TOKEN");

const response = await fetch(`${siteUrl}/api/admin/daily-logs`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ logs: seedLogs }),
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
      synced: data.logs?.length || 0,
      firstDay: data.logs?.[0]?.day || null,
      latestDay: data.logs?.at(-1)?.day || null,
    },
    null,
    2,
  ),
);
