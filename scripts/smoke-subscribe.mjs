import { createClient } from "@supabase/supabase-js";
import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const supabaseUrl = requireEnv(env, "SUPABASE_URL");
const serviceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
const adminToken = requireEnv(env, "ADMIN_API_TOKEN");
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `aiwm-subscribe-smoke+${Date.now()}@example.com`;
let adminSummary = null;

try {
  const subscribed = await fetchJson(`${siteUrl}/api/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name: "Smoke", source: "smoke" }),
  });

  if (!subscribed.response.ok || subscribed.data?.ok !== true) {
    throw new Error(`Subscribe failed: ${subscribed.response.status} ${JSON.stringify(subscribed.data)}`);
  }

  const { data, error } = await admin.from("subscribers").select("email,first_name,source").eq("email", email).single();
  if (error || data?.source !== "smoke") {
    throw error || new Error(`Subscriber row missing or incorrect: ${JSON.stringify(data)}`);
  }

  adminSummary = await fetchJson(`${siteUrl}/api/admin/subscribers/summary`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!adminSummary.response.ok || adminSummary.data?.ok !== true) {
    throw new Error(`Subscriber summary failed: ${adminSummary.response.status} ${JSON.stringify(adminSummary.data)}`);
  }

  const latestSources = (adminSummary.data.summary?.latest || []).map((row) => row.source);
  if (!latestSources.includes("smoke")) {
    throw new Error(`Subscriber summary did not include smoke source: ${JSON.stringify(adminSummary.data.summary)}`);
  }
} finally {
  await admin.from("subscribers").delete().eq("email", email);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      siteUrl,
      checks: {
        subscribeEndpoint: true,
        subscriberPersisted: true,
        adminSummaryReadable: true,
        smokeSubscriberCleanedUp: true,
      },
      summary: {
        active: adminSummary?.data?.summary?.active,
        last24h: adminSummary?.data?.summary?.last24h,
        last7d: adminSummary?.data?.summary?.last7d,
      },
    },
    null,
    2,
  ),
);
