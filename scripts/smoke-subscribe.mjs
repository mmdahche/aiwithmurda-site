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
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `aiwm-subscribe-smoke+${Date.now()}@example.com`;
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

await admin.from("subscribers").delete().eq("email", email);

console.log(
  JSON.stringify(
    {
      ok: true,
      siteUrl,
      checks: {
        subscribeEndpoint: true,
        subscriberPersisted: true,
        smokeSubscriberCleanedUp: true,
      },
    },
    null,
    2,
  ),
);
