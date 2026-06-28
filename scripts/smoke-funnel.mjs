import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const rootDir = path.resolve(import.meta.dirname, "..");
const defaultEnvPath = path.join(rootDir, ".secrets", "aiwithmurda.render.env");
const envPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultEnvPath;

function parseEnvFile(filePath) {
  const env = {};
  const text = fs.readFileSync(filePath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function requireEnv(env, key) {
  if (env[key]) return env[key];
  throw new Error(`Missing ${key} in ${envPath}`);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const env = { ...process.env, ...parseEnvFile(envPath) };
const siteUrl = (env.SMOKE_SITE_URL || env.SITE_URL || "https://aiwithmurda.com").replace(/\/+$/, "");
const supabaseUrl = requireEnv(env, "SUPABASE_URL");
const supabaseAnonKey = requireEnv(env, "VITE_SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = requireEnv(env, "STRIPE_SECRET_KEY");

const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });

const runId = Date.now();
const email = `aiwm-smoke+${runId}@example.com`;
const password = `Smoke-${runId}-${Math.random().toString(36).slice(2)}!`;
let userId = null;
let checkoutSessionId = null;

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "AI with Murda Smoke Test" },
  });
  if (created.error || !created.data?.user) throw created.error || new Error("User creation failed");
  userId = created.data.user.id;

  const signedIn = await publicClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data?.session?.access_token) {
    throw signedIn.error || new Error("Smoke user sign-in failed");
  }

  const token = signedIn.data.session.access_token;
  const checkout = await fetchJson(`${siteUrl}/api/checkout/future-proof-method`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!checkout.response.ok || !checkout.data?.session_id || !checkout.data?.url) {
    throw new Error(`Checkout creation failed: ${JSON.stringify(checkout.data)}`);
  }
  checkoutSessionId = checkout.data.session_id;

  const access = await fetchJson(`${siteUrl}/api/access/session/${encodeURIComponent(checkoutSessionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (access.response.status !== 409 || access.data?.error !== "checkout_not_paid") {
    throw new Error(`Expected unpaid checkout guard, got ${access.response.status}: ${JSON.stringify(access.data)}`);
  }

  const profile = await fetchJson(`${siteUrl}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!profile.response.ok || profile.data?.profile?.email !== email) {
    throw new Error(`Profile lookup failed: ${JSON.stringify(profile.data)}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        siteUrl,
        checks: {
          authProfileCreated: true,
          checkoutSessionCreated: true,
          unpaidAccessGuard: true,
          profileLookup: true,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (checkoutSessionId) {
    await stripe.checkout.sessions.expire(checkoutSessionId).catch(() => {});
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}
