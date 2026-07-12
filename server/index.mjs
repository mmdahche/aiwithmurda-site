import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Stripe from "stripe";
import {
  buyerOnboardingEmails,
  courseCompletion,
  productKey,
  productModules,
  productName,
  productPriceCents,
  productSubtitle,
} from "../src/data/product.js";
import {
  coreMemberAssets,
  operatorBundleAssets,
  operatorToolkitAssets,
  operatorUpdateAssets,
} from "../src/data/memberAssets.js";
import { operatorBundleAccessPlan, operatorBundleProduct } from "../src/data/operatorBundle.js";
import {
  operatorToolkitAccessPlan,
  operatorToolkitProduct,
  operatorToolkitReleases,
  operatorUpdatesProduct,
} from "../src/data/operatorToolkit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const assetDir = path.join(rootDir, "server", "member-assets");

const app = express();
const siteUrl = process.env.SITE_URL || "http://127.0.0.1:5173";
const defaultEmailFrom = "AI with Murda <murad@aiwithmurda.com>";
const twitchProviderKey = "twitch";
const twitchOAuthScopes = ["moderator:read:followers"];
const twitchCallbackPath = "/api/integrations/twitch/callback";
const twitchEventSubPath = "/api/integrations/twitch/eventsub";
const socialCallbackPaths = {
  twitch: twitchCallbackPath,
  tiktok: "/api/integrations/tiktok/callback",
  instagram: "/api/integrations/instagram/callback",
  youtube: "/api/integrations/youtube/callback",
};
const socialProviderCatalog = [
  {
    key: "twitch",
    label: "Twitch",
    metricName: "followers",
    precision: "exact",
    mode: "EventSub + Helix",
    cadence: "Instant follow events; 30 second reconciliation",
    pollMs: 30_000,
    eventDriven: true,
  },
  {
    key: "tiktok",
    label: "TikTok",
    metricName: "followers",
    precision: "exact",
    mode: "TikTok Display API",
    cadence: "Approximately every 60 seconds",
    pollMs: 60_000,
    eventDriven: false,
  },
  {
    key: "instagram",
    label: "Instagram",
    metricName: "followers",
    precision: "exact",
    mode: "Instagram Graph API",
    cadence: "Approximately every 60 seconds",
    pollMs: 60_000,
    eventDriven: false,
  },
  {
    key: "youtube",
    label: "YouTube",
    metricName: "subscribers",
    precision: "rounded",
    mode: "YouTube Data API",
    cadence: "Approximately every 60 seconds",
    pollMs: 60_000,
    eventDriven: false,
  },
  {
    key: "x",
    label: "X",
    metricName: "followers",
    precision: "exact",
    mode: "X API public metrics",
    cadence: "Approximately every 5 minutes",
    pollMs: 300_000,
    eventDriven: false,
  },
];
const socialProviderByKey = new Map(socialProviderCatalog.map((provider) => [provider.key, provider]));
const socialMetricHeartbeatMs = 15 * 60 * 1000;
const followerTickerRefreshMs = Math.max(5_000, Number(process.env.FOLLOWER_TICKER_REFRESH_MS || 15_000));
const followerStreamClients = new Set();
const providerLastPollAt = new Map();
let followerTickerCache = null;
let followerRefreshPromise = null;
let followerRefreshTimer = null;
const streamLinkKeys = [
  ["twitch", "Twitch", "STREAM_TWITCH_URL"],
  ["kick", "Kick", "STREAM_KICK_URL"],
  ["youtube", "YouTube", "STREAM_YOUTUBE_URL"],
];
const streamRehearsalPlan = {
  title: "Fake Stream Rehearsal",
  goal: "Prove the stream stack without going public: live hub, OBS browser sources, dashboard, follower ticker, commands, and checkout links.",
  duration: "35-45 min",
  proof: "A short recording or screenshot set showing OBS, overlay, dashboard, command links, and one test checkout path.",
  steps: [
    {
      key: "open-live-hub",
      title: "Open the live hub",
      target: "/live",
      check: "Room status, destination cards, and stream command shelf are visible.",
    },
    {
      key: "load-obs-overlay",
      title: "Load OBS overlays",
      target: "/obs and /obs/followers",
      check: "Scoreboard overlay and follower ticker fit without covering code, chat, or private data.",
    },
    {
      key: "run-command-clicks",
      title: "Click the command deck",
      target: "!scoreboard, !today, !kit, !builds, !members",
      check: "Every public command lands on the expected route and can be read on stream.",
    },
    {
      key: "simulate-proof-loop",
      title: "Simulate one proof loop",
      target: "Daily Log plus public dashboard",
      check: "Update one rehearsal metric, sync it, and confirm the public dashboard changes.",
    },
    {
      key: "test-money-path",
      title: "Run the money path",
      target: "$2 test purchase or Stripe test session",
      check: "Checkout redirects back to member access and the client portal still unlocks.",
    },
  ],
};
const streamPlatformSetup = [
  {
    key: "twitch",
    name: "Twitch",
    envKey: "STREAM_TWITCH_URL",
    status: "Account connection later",
    steps: [
      "Create or confirm the AI with Murda Twitch channel.",
      "Run one unlisted/private OBS test or a short public test stream when ready.",
      "Copy the public channel or live URL into STREAM_TWITCH_URL on Render.",
      "Connect Twitch OAuth in admin when the app credentials are ready.",
    ],
    proof: "The Twitch destination card on /live opens the right channel and the admin Twitch connector reports configured OAuth env.",
  },
  {
    key: "youtube",
    name: "YouTube",
    envKey: "STREAM_YOUTUBE_URL",
    status: "Live access unlock dependent",
    steps: [
      "Wait for live streaming access if YouTube shows the countdown gate.",
      "Create the first scheduled live or use the channel live URL after access unlocks.",
      "Copy that URL into STREAM_YOUTUBE_URL on Render.",
      "Rerun stream smoke and click !live from the command deck.",
    ],
    proof: "The YouTube destination card opens the right channel or scheduled live without showing the unlock gate.",
  },
  {
    key: "kick",
    name: "Kick",
    envKey: "STREAM_KICK_URL",
    status: "Optional destination",
    steps: [
      "Create or confirm the Kick channel.",
      "Add the Kick stream key to OBS or the multistream tool if used.",
      "Copy the public channel URL into STREAM_KICK_URL on Render.",
      "Use the fake stream rehearsal to confirm the destination card and command deck.",
    ],
    proof: "The Kick destination card opens the correct channel from /live.",
  },
  {
    key: "main",
    name: "Main room",
    envKey: "STREAM_PRIMARY_URL",
    status: "Choose primary before launch",
    steps: [
      "Choose the main audience home for Day 1.",
      "Set STREAM_PRIMARY_URL to the main watch URL.",
      "Set STREAM_STATUS=ready and STREAM_STATUS_LABEL to the visible launch state when final.",
      "Set STREAM_MESSAGE to the pinned live-room note for viewers.",
    ],
    proof: "The main /live button opens the chosen room and all fallback destination cards still work.",
  },
];
const streamPrivacyGuard = {
  title: "Stream Privacy Guard",
  status: "Required before fake stream",
  goal: "Keep private data off the public stream while still making the work visible and entertaining.",
  rules: [
    {
      key: "scene-discipline",
      title: "Use scene discipline",
      body: "Keep separate OBS scenes for public build, dashboard, browser, break screen, and privacy mode.",
    },
    {
      key: "secret-screens",
      title: "Never show secret screens",
      body: "Stripe keys, Supabase service role, Render env vars, Cloudflare DNS edits, email inboxes, and customer data stay off stream.",
    },
    {
      key: "browser-clean-room",
      title: "Use a clean browser profile",
      body: "Use a stream-only browser window with no personal tabs, saved accounts, family bookmarks, or private extensions visible.",
    },
    {
      key: "payment-blackout",
      title: "Black out payment/admin moments",
      body: "Switch to privacy mode before logging into Stripe, Render, Supabase, GoDaddy, Cloudflare, banking, or email.",
    },
    {
      key: "family-boundary",
      title: "Protect family time",
      body: "Calls, kid updates, travel logistics, private addresses, and family messages are not stream content.",
    },
  ],
  proof: "Fake stream recording shows the privacy scene switch works before opening any sensitive admin or payment screen.",
};
const memberAssets = coreMemberAssets;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" })
  : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const checkoutProducts = new Map(
  [
    {
      key: productKey,
      name: productName,
      subtitle: productSubtitle,
      priceCents: productPriceCents,
      priceEnvKey: "STRIPE_FUTURE_METHOD_PRICE_ID",
      successPath: "/members",
      cancelPath: "/kit",
    },
    {
      key: operatorBundleProduct.key,
      name: operatorBundleProduct.name,
      subtitle: operatorBundleProduct.subtitle,
      priceCents: operatorBundleProduct.priceCents,
      priceEnvKey: "STRIPE_LIVE_BUILDS_PRICE_ID",
      successPath: "/live-builds",
      cancelPath: "/live-builds",
    },
    {
      key: operatorToolkitProduct.key,
      name: operatorToolkitProduct.name,
      subtitle: operatorToolkitProduct.subtitle,
      priceCents: operatorToolkitProduct.priceCents,
      priceEnvKey: "STRIPE_OPERATOR_TOOLKIT_PRICE_ID",
      recurringPriceEnvKey: "STRIPE_OPERATOR_UPDATES_PRICE_ID",
      successPath: "/members",
      cancelPath: "/operator-toolkit",
      billing: "mixed_subscription",
    },
    {
      key: operatorUpdatesProduct.key,
      name: operatorUpdatesProduct.name,
      subtitle: operatorUpdatesProduct.subtitle,
      priceCents: operatorUpdatesProduct.priceCents,
      priceEnvKey: "STRIPE_OPERATOR_UPDATES_PRICE_ID",
      billing: "subscription_entitlement",
    },
  ].map((item) => [item.key, item]),
);

function readPublicUrlEnv(key) {
  const value = String(process.env[key] || "").trim();
  return value || null;
}

function buildStreamConfig() {
  const primaryUrl = readPublicUrlEnv("STREAM_PRIMARY_URL");
  const primaryEmbedUrl = readPublicUrlEnv("STREAM_PRIMARY_EMBED_URL");
  const chatUrl = readPublicUrlEnv("STREAM_CHAT_URL");
  const streamLinks = streamLinkKeys.map(([key, name, envKey]) => {
    const href = readPublicUrlEnv(envKey);
    return {
      key,
      name,
      href,
      status: href ? "Configured" : "Waiting for link",
      configured: Boolean(href),
      external: Boolean(href),
    };
  });

  return {
    ok: true,
    status: process.env.STREAM_STATUS || "prelaunch",
    statusLabel: process.env.STREAM_STATUS_LABEL || (primaryUrl ? "Live room ready" : "Prelaunch room"),
    message:
      process.env.STREAM_MESSAGE ||
      "Live links, pinned chat commands, and embeds get added here before July 28.",
    primary: {
      name: "Main live room",
      href: primaryUrl,
      embedUrl: primaryEmbedUrl,
      chatUrl,
      status: primaryUrl ? "Configured" : "Link drops before Day 1",
      configured: Boolean(primaryUrl),
      external: Boolean(primaryUrl),
    },
    destinations: [
      {
        key: "main",
        name: "Main live room",
        href: primaryUrl,
        status: primaryUrl ? "Configured" : "Link drops before Day 1",
        configured: Boolean(primaryUrl),
        external: Boolean(primaryUrl),
      },
      ...streamLinks,
      { key: "scoreboard", name: "Public scoreboard", href: "/60", status: "Live now", configured: true, external: false },
      { key: "kit", name: "First paid drop", href: "/kit", status: "Founding product", configured: true, external: false },
      {
        key: "live-builds",
        name: operatorBundleProduct.name,
        href: "/live-builds",
        status: operatorBundleProduct.status,
        configured: true,
        external: false,
      },
    ],
    commands: [
      { command: "!scoreboard", label: "Public scoreboard", href: "/60" },
      { command: "!dashboard", label: "Public scoreboard", href: "/60" },
      { command: "!today", label: "Current daily receipt", href: "/day/1" },
      { command: "!day1", label: "First daily receipt", href: "/day/1" },
      { command: "!live", label: "Live hub", href: "/live" },
      { command: "!overlay", label: "OBS overlay", href: "/overlay" },
      { command: "!start", label: "Build log signup", href: "/start" },
      { command: "!kit", label: "Founding product", href: "/kit" },
      { command: "!builds", label: operatorBundleProduct.name, href: "/live-builds" },
      { command: "!members", label: "Member login", href: "/members" },
      { command: "!runbook", label: "Launch runbook", href: "/members" },
    ],
    rehearsal: streamRehearsalPlan,
    platformSetup: streamPlatformSetup,
    privacyGuard: streamPrivacyGuard,
    checkedAt: new Date().toISOString(),
  };
}

function requireConfigured(res, service, name) {
  if (service) return true;
  res.status(503).json({ error: `${name}_not_configured` });
  return false;
}

function getBearerToken(req) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

function getAdminAllowedEmails() {
  return String(process.env.ADMIN_EMAILS || process.env.ADMIN_ALLOWED_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function getAuthenticatedUser(req, res) {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return null;

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "missing_bearer_token" });
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "invalid_session" });
    return null;
  }

  return data.user;
}

function requireAdmin(req, res, next) {
  const configuredToken = process.env.ADMIN_API_TOKEN;
  if (!configuredToken) {
    res.status(503).json({ error: "admin_api_not_configured" });
    return;
  }

  const token = req.get("x-admin-token") || getBearerToken(req);
  if (!token || token !== configuredToken) {
    res.status(401).json({ error: "invalid_admin_token" });
    return;
  }

  next();
}

async function requireUser(req, res, next) {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  req.user = user;
  next();
}

async function requireAdminSession(req, res, next) {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  const allowedEmails = getAdminAllowedEmails();
  if (!allowedEmails.length) {
    res.status(503).json({ error: "admin_email_allowlist_missing" });
    return;
  }

  const email = String(user.email || "").trim().toLowerCase();
  if (!email || !allowedEmails.includes(email)) {
    res.status(403).json({ error: "admin_email_not_allowed" });
    return;
  }

  req.user = user;
  next();
}

async function ensureProfile(user, stripeCustomerId = null) {
  if (!supabaseAdmin || !user?.id) return null;

  const payload = {
    id: user.id,
    email: user.email || "",
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
  };

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id,email,full_name,stripe_customer_id")
    .single();

  if (error) throw error;
  return data;
}

function publicAsset(asset) {
  const { fileName, mimeType, ...safeAsset } = asset;
  return safeAsset;
}

function publicModule(module) {
  return {
    key: module.key,
    title: module.title,
    body: module.body,
    premium: module.premium,
    lesson: module.lesson,
    operatorBrief: module.operatorBrief,
    actionKit: module.actionKit,
    todos: module.todos.map((todo) => ({ key: todo.key, label: todo.label, proof: todo.proof })),
    done: module.done,
  };
}

const productModuleMap = new Map(productModules.map((module) => [module.key, module]));
const productTaskTotal = productModules.reduce((total, module) => total + module.todos.length, 0);

function findProductTask(moduleKey, taskKey) {
  const module = productModuleMap.get(moduleKey);
  if (!module) return null;
  const task = module.todos.find((todo) => todo.key === taskKey);
  return task ? { module, task } : null;
}

function toTaskProgress(row) {
  return {
    moduleKey: row.module_key,
    taskKey: row.task_key,
    completed: Boolean(row.completed),
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function summarizeTaskProgress(items) {
  const completed = items.filter((item) => item.completed).length;
  return {
    completed,
    total: productTaskTotal,
    percent: productTaskTotal ? Math.round((completed / productTaskTotal) * 100) : 0,
  };
}

async function getMemberTaskProgress(userId) {
  const { data, error } = await supabaseAdmin
    .from("member_task_progress")
    .select("module_key,task_key,completed,completed_at,updated_at")
    .eq("user_id", userId)
    .eq("product_key", productKey)
    .order("module_key", { ascending: true })
    .order("task_key", { ascending: true });

  if (error) throw error;

  const items = (data || [])
    .map(toTaskProgress)
    .filter((item) => findProductTask(item.moduleKey, item.taskKey));
  return { items, summary: summarizeTaskProgress(items) };
}

async function getMemberAccess(user) {
  const profile = await ensureProfile(user);
  const [
    { data: entitlements, error: entitlementsError },
    { data: purchases, error: purchasesError },
    { data: subscriptions, error: subscriptionsError },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("entitlements")
        .select("product_key,status,granted_at")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabaseAdmin
        .from("purchases")
        .select("product_key,status,amount_total,currency,purchased_at")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false }),
      supabaseAdmin
        .from("subscriptions")
        .select("product_key,status,cancel_at_period_end,current_period_end,created_at,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

  if (entitlementsError) throw entitlementsError;
  if (purchasesError) throw purchasesError;
  if (subscriptionsError) throw subscriptionsError;

  return {
    profile,
    entitlements: entitlements || [],
    purchases: purchases || [],
    subscriptions: subscriptions || [],
    product: {
      key: productKey,
      name: productName,
      subtitle: productSubtitle,
      price_cents: productPriceCents,
      modules: productModules.map(publicModule),
      assets: memberAssets.map(publicAsset),
      onboardingEmails: buyerOnboardingEmails,
      courseCompletion,
    },
    operatorBundle: {
      key: operatorBundleProduct.key,
      name: operatorBundleProduct.name,
      subtitle: operatorBundleProduct.subtitle,
      status: operatorBundleProduct.status,
      price_cents: operatorBundleProduct.priceCents,
      accessPlan: operatorBundleAccessPlan,
      assets: operatorBundleAssets.map(publicAsset),
    },
    operatorToolkit: {
      key: operatorToolkitProduct.key,
      name: operatorToolkitProduct.name,
      subtitle: operatorToolkitProduct.subtitle,
      status: operatorToolkitProduct.status,
      price_cents: operatorToolkitProduct.priceCents,
      monthly_price_cents: operatorToolkitProduct.monthlyPriceCents,
      initial_total_cents: operatorToolkitProduct.initialTotalCents,
      accessPlan: operatorToolkitAccessPlan,
      assets: operatorToolkitAssets.map(publicAsset),
      updateProduct: {
        key: operatorUpdatesProduct.key,
        name: operatorUpdatesProduct.name,
        price_cents: operatorUpdatesProduct.priceCents,
      },
      updateAssets: operatorUpdateAssets.map(publicAsset),
      releases: operatorToolkitReleases,
    },
  };
}

async function hasActiveProductEntitlement(userId, entitlementProductKey) {
  const { data, error } = await supabaseAdmin
    .from("entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("product_key", entitlementProductKey)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

async function hasActiveEntitlement(userId) {
  const [starterAccess, bundleAccess, toolkitAccess] = await Promise.all([
    hasActiveProductEntitlement(userId, productKey),
    hasActiveProductEntitlement(userId, operatorBundleProduct.key),
    hasActiveProductEntitlement(userId, operatorToolkitProduct.key),
  ]);
  return starterAccess || bundleAccess || toolkitAccess;
}

function toDailyLog(row) {
  return {
    day: Number(row.day),
    date: row.date,
    mainGoal: row.main_goal,
    status: row.status,
    followers: row.followers || {},
    emailSubscribers: Number(row.email_subscribers || 0),
    revenueCollected: Number(row.revenue_collected || 0),
    revenuePipeline: Number(row.revenue_pipeline || 0),
    hoursStreamed: Number(row.hours_streamed || 0),
    clipsPosted: Number(row.clips_posted || 0),
    outreachSent: Number(row.outreach_sent || 0),
    callsBooked: Number(row.calls_booked || 0),
    productsSold: Number(row.products_sold || 0),
    buildsShipped: Number(row.builds_shipped || 0),
    dailyLessons: Number(row.daily_lessons || 0),
    shippedItems: row.shipped_items || [],
    bestMoment: row.best_moment || "",
    biggestFailure: row.biggest_failure || "",
    lessonLearned: row.lesson_learned || "",
    tomorrowPromise: row.tomorrow_promise || "",
    spikeCause: row.spike_cause || "",
    proofAssets: row.proof_assets || [],
  };
}

function toDailyLogRow(log) {
  return {
    day: Number(log.day),
    date: String(log.date || ""),
    main_goal: String(log.mainGoal || ""),
    status: String(log.status || "planned"),
    followers: log.followers && typeof log.followers === "object" ? log.followers : {},
    email_subscribers: Number(log.emailSubscribers || 0),
    revenue_collected: Number(log.revenueCollected || 0),
    revenue_pipeline: Number(log.revenuePipeline || 0),
    hours_streamed: Number(log.hoursStreamed || 0),
    clips_posted: Number(log.clipsPosted || 0),
    outreach_sent: Number(log.outreachSent || 0),
    calls_booked: Number(log.callsBooked || 0),
    products_sold: Number(log.productsSold || 0),
    builds_shipped: Number(log.buildsShipped || 0),
    daily_lessons: Number(log.dailyLessons || 0),
    shipped_items: Array.isArray(log.shippedItems) ? log.shippedItems.map(String) : [],
    best_moment: String(log.bestMoment || ""),
    biggest_failure: String(log.biggestFailure || ""),
    lesson_learned: String(log.lessonLearned || ""),
    tomorrow_promise: String(log.tomorrowPromise || ""),
    spike_cause: String(log.spikeCause || ""),
    proof_assets: Array.isArray(log.proofAssets) ? log.proofAssets.map(String) : [],
  };
}

function validateDailyLog(log) {
  const day = Number(log?.day);
  if (!Number.isInteger(day) || day < 1 || day > 60) return false;
  if (!String(log?.date || "").match(/^\d{4}-\d{2}-\d{2}$/)) return false;
  if (!String(log?.mainGoal || "").trim()) return false;
  return true;
}

function formatSnapshotValue(value, kind = "number") {
  if (kind === "currency") return `$${Number(value || 0).toFixed(2)}`;
  return formatNumberForApi(value);
}

function buildSnapshotChanges(currentLog, proposedLog) {
  const trackedFields = [
    {
      key: "emailSubscribers",
      label: "Email subscribers",
      kind: "number",
      source: "Supabase subscribers",
    },
    {
      key: "revenueCollected",
      label: "Revenue collected",
      kind: "currency",
      source: "Stripe paid purchases",
    },
    {
      key: "productsSold",
      label: "Products sold",
      kind: "number",
      source: "Stripe paid purchases",
    },
    {
      key: "clipsPosted",
      label: "Clips posted",
      kind: "number",
      source: "Daily dashboard until clip webhook is connected",
    },
    {
      key: "hoursStreamed",
      label: "Hours streamed",
      kind: "number",
      source: "Daily dashboard until stream telemetry is connected",
    },
  ];

  return trackedFields
    .filter((field) => Number(currentLog[field.key] || 0) !== Number(proposedLog[field.key] || 0))
    .map((field) => ({
      key: field.key,
      label: field.label,
      from: currentLog[field.key] || 0,
      to: proposedLog[field.key] || 0,
      displayFrom: formatSnapshotValue(currentLog[field.key], field.kind),
      displayTo: formatSnapshotValue(proposedLog[field.key], field.kind),
      source: field.source,
    }));
}

async function getDailyLogForSnapshot(day = null) {
  if (day) {
    const { data, error } = await supabaseAdmin.from("daily_logs").select("*").eq("day", day).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  const { data, error } = await supabaseAdmin.from("daily_logs").select("*").order("day", { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function getAllDailyLogs() {
  const { data, error } = await supabaseAdmin.from("daily_logs").select("*").order("day", { ascending: true });
  if (error) throw error;
  return (data || []).map(toDailyLog);
}

async function buildAutomatedDailySnapshot({ day = null } = {}) {
  const targetDay = day ? Number(day) : null;
  if (targetDay && (!Number.isInteger(targetDay) || targetDay < 1 || targetDay > 60)) {
    const error = new Error("valid_day_required");
    error.status = 400;
    throw error;
  }

  const [sourceRow, metricsSummary] = await Promise.all([
    getDailyLogForSnapshot(targetDay),
    getMetricsAutomationSummary(),
  ]);

  if (!sourceRow) {
    const error = new Error("daily_log_not_found");
    error.status = 404;
    throw error;
  }

  const currentLog = toDailyLog(sourceRow);
  const snapshot = metricsSummary.snapshot || {};
  const proposedLog = {
    ...currentLog,
    emailSubscribers: Number(snapshot.emailSubscribers || 0),
    revenueCollected: Number(((snapshot.revenueCents || 0) / 100).toFixed(2)),
    productsSold: Number(snapshot.paidPurchases || 0),
    clipsPosted: Number(snapshot.clipsPosted || currentLog.clipsPosted || 0),
    hoursStreamed: Number(snapshot.hoursStreamed || currentLog.hoursStreamed || 0),
  };

  return {
    targetDay: proposedLog.day,
    checkedAt: new Date().toISOString(),
    currentLog,
    proposedLog,
    changes: buildSnapshotChanges(currentLog, proposedLog),
    appliedSources: [
      {
        key: "emailSubscribers",
        label: "Email subscribers",
        source: "Supabase subscribers",
        status: "live",
      },
      {
        key: "revenueCollected",
        label: "Revenue collected",
        source: "Stripe paid purchases",
        status: "live",
      },
      {
        key: "productsSold",
        label: "Products sold",
        source: "Stripe paid purchases",
        status: "live",
      },
    ],
    pendingSources: [
      {
        key: "followers",
        label: "Follower ticker",
        source: "Connected social accounts write directly to the current daily log",
        status: "managed-separately",
      },
      {
        key: "clipsPosted",
        label: "Clips posted",
        source: "n8n or upload webhook",
        status: "connector-needed",
      },
      {
        key: "hoursStreamed",
        label: "Hours streamed",
        source: "OBS or stream platform session telemetry",
        status: "connector-needed",
      },
    ],
  };
}

function absoluteSiteUrl(pathname) {
  const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  return new URL(pathname, base).toString();
}

function getTwitchConfig() {
  const clientId = readPublicUrlEnv("TWITCH_CLIENT_ID");
  const clientSecret = readPublicUrlEnv("TWITCH_CLIENT_SECRET");
  const redirectUri = readPublicUrlEnv("TWITCH_REDIRECT_URI") || absoluteSiteUrl(twitchCallbackPath);
  const eventSubCallbackUrl =
    readPublicUrlEnv("TWITCH_EVENTSUB_CALLBACK_URL") || absoluteSiteUrl(twitchEventSubPath);
  const eventSubSecret = readPublicUrlEnv("TWITCH_EVENTSUB_SECRET");
  const stateSecret = readPublicUrlEnv("TWITCH_OAUTH_STATE_SECRET") || readPublicUrlEnv("ADMIN_API_TOKEN");

  return {
    clientId,
    clientSecret,
    redirectUri,
    eventSubCallbackUrl,
    eventSubSecret,
    stateSecret,
    configured: Boolean(clientId && clientSecret),
    webhookConfigured: Boolean(clientId && clientSecret && eventSubSecret),
  };
}

function getSocialOAuthStateSecret() {
  return (
    readPublicUrlEnv("SOCIAL_OAUTH_STATE_SECRET") ||
    readPublicUrlEnv("TWITCH_OAUTH_STATE_SECRET") ||
    readPublicUrlEnv("ADMIN_API_TOKEN")
  );
}

function getTikTokConfig() {
  const clientKey = readPublicUrlEnv("TIKTOK_CLIENT_KEY");
  const clientSecret = readPublicUrlEnv("TIKTOK_CLIENT_SECRET");
  return {
    clientKey,
    clientSecret,
    redirectUri: readPublicUrlEnv("TIKTOK_REDIRECT_URI") || absoluteSiteUrl(socialCallbackPaths.tiktok),
    configured: Boolean(clientKey && clientSecret),
  };
}

function getInstagramConfig() {
  const appId = readPublicUrlEnv("INSTAGRAM_APP_ID");
  const appSecret = readPublicUrlEnv("INSTAGRAM_APP_SECRET");
  const requestedVersion =
    readPublicUrlEnv("INSTAGRAM_GRAPH_VERSION") || readPublicUrlEnv("META_GRAPH_VERSION") || "v25.0";
  const graphVersion = /^v\d+\.\d+$/.test(requestedVersion) ? requestedVersion : "v25.0";
  return {
    appId,
    appSecret,
    graphVersion,
    redirectUri: readPublicUrlEnv("INSTAGRAM_REDIRECT_URI") || absoluteSiteUrl(socialCallbackPaths.instagram),
    configured: Boolean(appId && appSecret),
  };
}

function getYouTubeConfig() {
  const clientId = readPublicUrlEnv("YOUTUBE_CLIENT_ID");
  const clientSecret = readPublicUrlEnv("YOUTUBE_CLIENT_SECRET");
  return {
    clientId,
    clientSecret,
    redirectUri: readPublicUrlEnv("YOUTUBE_REDIRECT_URI") || absoluteSiteUrl(socialCallbackPaths.youtube),
    configured: Boolean(clientId && clientSecret),
  };
}

function getXConfig() {
  const bearerToken = readPublicUrlEnv("X_BEARER_TOKEN");
  const username = readPublicUrlEnv("X_USERNAME");
  return {
    bearerToken,
    username,
    configured: Boolean(bearerToken && username),
  };
}

function getSocialProviderConfig(provider) {
  if (provider === "twitch") return getTwitchConfig();
  if (provider === "tiktok") return getTikTokConfig();
  if (provider === "instagram") return getInstagramConfig();
  if (provider === "youtube") return getYouTubeConfig();
  if (provider === "x") return getXConfig();
  return { configured: false };
}

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signSocialOAuthState(provider) {
  if (!socialProviderByKey.has(provider) || !socialCallbackPaths[provider]) {
    const error = new Error("unsupported_social_provider");
    error.status = 400;
    throw error;
  }

  const stateSecret = getSocialOAuthStateSecret();
  if (!stateSecret) {
    const error = new Error("social_oauth_state_secret_missing");
    error.status = 503;
    throw error;
  }

  const payload = Buffer.from(
    JSON.stringify({
      provider,
      createdAt: Date.now(),
      nonce: crypto.randomUUID(),
    }),
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", stateSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySocialOAuthState(state, expectedProvider) {
  const stateSecret = getSocialOAuthStateSecret();
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature || !stateSecret) {
    const error = new Error("invalid_social_oauth_state");
    error.status = 400;
    throw error;
  }

  const expected = crypto.createHmac("sha256", stateSecret).update(payload).digest("base64url");
  if (!timingSafeEqualString(signature, expected)) {
    const error = new Error("invalid_social_oauth_state");
    error.status = 400;
    throw error;
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    const error = new Error("invalid_social_oauth_state");
    error.status = 400;
    throw error;
  }
  const ageMs = Date.now() - Number(decoded.createdAt || 0);
  if (decoded.provider !== expectedProvider || ageMs < 0 || ageMs > 10 * 60 * 1000) {
    const error = new Error("expired_social_oauth_state");
    error.status = 400;
    throw error;
  }

  return decoded;
}

function signTwitchOAuthState() {
  return signSocialOAuthState(twitchProviderKey);
}

function isMissingIntegrationStorageError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "42P01" || message.includes("integration_tokens") || message.includes("integration_events");
}

function normalizeTwitchScopes(scope) {
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSocialTokenEncryptionKey() {
  const raw = readPublicUrlEnv("SOCIAL_TOKEN_ENCRYPTION_KEY");
  if (!raw) return null;
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex");

  try {
    const decoded = Buffer.from(raw, "base64");
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
}

function encryptIntegrationSecret(value) {
  if (value === null || value === undefined || value === "") return value || null;
  const stringValue = String(value);
  if (stringValue.startsWith("enc:v1:")) return stringValue;

  const key = getSocialTokenEncryptionKey();
  if (!key) {
    const error = new Error("social_token_encryption_key_missing");
    error.status = 503;
    throw error;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(stringValue, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptIntegrationSecret(value) {
  if (!value || !String(value).startsWith("enc:v1:")) return value || null;
  const key = getSocialTokenEncryptionKey();
  if (!key) {
    const error = new Error("social_token_encryption_key_missing");
    error.status = 503;
    throw error;
  }

  const [, version, ivValue, tagValue, encryptedValue] = String(value).split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    const error = new Error("invalid_encrypted_integration_token");
    error.status = 500;
    throw error;
  }

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    const error = new Error("integration_token_decryption_failed");
    error.status = 500;
    throw error;
  }
}

function decryptIntegrationToken(token) {
  if (!token) return null;
  return {
    ...token,
    access_token: decryptIntegrationSecret(token.access_token),
    refresh_token: decryptIntegrationSecret(token.refresh_token),
  };
}

async function getStoredIntegrationToken(provider) {
  if (!supabaseAdmin) return { token: null, missingTable: false };

  const { data, error } = await supabaseAdmin
    .from("integration_tokens")
    .select("*")
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    if (isMissingIntegrationStorageError(error)) return { token: null, missingTable: true };
    throw error;
  }

  const token = decryptIntegrationToken(data || null);
  if (
    token &&
    getSocialTokenEncryptionKey() &&
    data.access_token &&
    !String(data.access_token).startsWith("enc:v1:")
  ) {
    const { error: migrationError } = await supabaseAdmin
      .from("integration_tokens")
      .update({
        access_token: encryptIntegrationSecret(token.access_token),
        refresh_token: encryptIntegrationSecret(token.refresh_token),
      })
      .eq("provider", provider);
    if (migrationError) throw migrationError;
  }
  return { token, missingTable: false };
}

async function storeIntegrationToken(provider, values) {
  if (!supabaseAdmin) {
    const error = new Error("supabase_not_configured");
    error.status = 503;
    throw error;
  }

  const encryptedValues = {
    ...values,
    access_token: encryptIntegrationSecret(values.access_token),
    refresh_token: encryptIntegrationSecret(values.refresh_token),
  };
  const { data, error } = await supabaseAdmin
    .from("integration_tokens")
    .upsert({ provider, ...encryptedValues }, { onConflict: "provider" })
    .select("*")
    .single();

  if (error) {
    if (isMissingIntegrationStorageError(error)) {
      const migrationError = new Error("integration_tokens_migration_required");
      migrationError.status = 503;
      throw migrationError;
    }
    throw error;
  }

  return decryptIntegrationToken(data);
}

async function updateStoredIntegrationMetadata(provider, updater) {
  const { token, missingTable } = await getStoredIntegrationToken(provider);
  if (!token || missingTable) return null;

  const metadata = typeof token.metadata === "object" && token.metadata ? token.metadata : {};
  const nextMetadata = updater(metadata);
  const { data, error } = await supabaseAdmin
    .from("integration_tokens")
    .update({ metadata: nextMetadata })
    .eq("provider", provider)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function exchangeTwitchCode(code) {
  const config = getTwitchConfig();
  if (!config.configured) {
    const error = new Error("twitch_oauth_not_configured");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `twitch_token_exchange_${response.status}`);
    error.status = 502;
    error.data = data;
    throw error;
  }

  return data;
}

async function validateTwitchAccessToken(accessToken) {
  const response = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `twitch_token_validate_${response.status}`);
    error.status = 502;
    error.data = data;
    throw error;
  }
  return data;
}

async function refreshTwitchStoredTokenIfNeeded(token) {
  if (!token?.refresh_token) return token;

  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - Date.now() > 5 * 60 * 1000) return token;

  const config = getTwitchConfig();
  if (!config.configured) return token;

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `twitch_token_refresh_${response.status}`);

  const validation = await validateTwitchAccessToken(data.access_token);
  return storeIntegrationToken(twitchProviderKey, {
    access_token: data.access_token,
    refresh_token: data.refresh_token || token.refresh_token,
    token_type: data.token_type || token.token_type || "bearer",
    scope: normalizeTwitchScopes(data.scope || validation.scopes || token.scope),
    expires_at: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString() : null,
    provider_user_id: validation.user_id || token.provider_user_id,
    provider_user_login: validation.login || token.provider_user_login,
    provider_user_name: validation.login || token.provider_user_name,
    broadcaster_user_id: validation.user_id || token.broadcaster_user_id,
    metadata: {
      ...(typeof token.metadata === "object" && token.metadata ? token.metadata : {}),
      refreshedAt: new Date().toISOString(),
      validation,
    },
  });
}

async function getUsableTwitchToken() {
  const stored = await getStoredIntegrationToken(twitchProviderKey);
  if (!stored.token) return stored;
  return {
    token: await refreshTwitchStoredTokenIfNeeded(stored.token),
    missingTable: false,
  };
}

async function exchangeTikTokCode(code) {
  const config = getTikTokConfig();
  if (!config.configured) {
    const error = new Error("tiktok_oauth_not_configured");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(data.error_description || data.message || data.error || `tiktok_token_exchange_${response.status}`);
    error.status = 502;
    error.data = data;
    throw error;
  }
  return data;
}

async function refreshTikTokStoredTokenIfNeeded(token) {
  if (!token?.refresh_token) return token;
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - Date.now() > 5 * 60 * 1000) return token;

  const config = getTikTokConfig();
  if (!config.configured) return token;
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.message || data.error || `tiktok_token_refresh_${response.status}`);
  }

  return storeIntegrationToken("tiktok", {
    access_token: data.access_token,
    refresh_token: data.refresh_token || token.refresh_token,
    token_type: data.token_type || token.token_type || "bearer",
    scope: normalizeTwitchScopes(data.scope || token.scope),
    expires_at: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString() : null,
    provider_user_id: data.open_id || token.provider_user_id,
    provider_user_login: token.provider_user_login,
    provider_user_name: token.provider_user_name,
    broadcaster_user_id: null,
    metadata: {
      ...(typeof token.metadata === "object" && token.metadata ? token.metadata : {}),
      refreshExpiresIn: data.refresh_expires_in || token.metadata?.refreshExpiresIn || null,
      refreshedAt: new Date().toISOString(),
    },
  });
}

async function exchangeYouTubeCode(code) {
  const config = getYouTubeConfig();
  if (!config.configured) {
    const error = new Error("youtube_oauth_not_configured");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(data.error_description || data.error || `youtube_token_exchange_${response.status}`);
    error.status = 502;
    error.data = data;
    throw error;
  }
  return data;
}

async function refreshYouTubeStoredTokenIfNeeded(token) {
  if (!token?.refresh_token) return token;
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - Date.now() > 5 * 60 * 1000) return token;

  const config = getYouTubeConfig();
  if (!config.configured) return token;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `youtube_token_refresh_${response.status}`);
  }

  return storeIntegrationToken("youtube", {
    access_token: data.access_token,
    refresh_token: token.refresh_token,
    token_type: data.token_type || token.token_type || "bearer",
    scope: normalizeTwitchScopes(data.scope || token.scope),
    expires_at: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString() : null,
    provider_user_id: token.provider_user_id,
    provider_user_login: token.provider_user_login,
    provider_user_name: token.provider_user_name,
    broadcaster_user_id: null,
    metadata: {
      ...(typeof token.metadata === "object" && token.metadata ? token.metadata : {}),
      refreshedAt: new Date().toISOString(),
    },
  });
}

async function exchangeInstagramCode(code) {
  const config = getInstagramConfig();
  if (!config.configured) {
    const error = new Error("instagram_oauth_not_configured");
    error.status = 503;
    throw error;
  }

  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code,
  });
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const payload = await response.json().catch(() => ({}));
  const data = Array.isArray(payload.data) ? payload.data[0] || {} : payload;
  if (!response.ok || !data.access_token) {
    const error = new Error(payload.error?.message || payload.error_message || `instagram_token_exchange_${response.status}`);
    error.status = 502;
    error.data = payload;
    throw error;
  }
  return data;
}

async function exchangeInstagramLongLivedToken(accessToken) {
  const config = getInstagramConfig();
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: config.appSecret,
    access_token: accessToken,
  });
  const response = await fetch(`https://graph.instagram.com/access_token?${params}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(data.error?.message || `instagram_long_token_${response.status}`);
    error.status = 502;
    error.data = data;
    throw error;
  }
  return data;
}

async function refreshInstagramLongLivedToken(accessToken) {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });
  const response = await fetch(`https://graph.instagram.com/refresh_access_token?${params}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(data.error?.message || `instagram_token_refresh_${response.status}`);
    error.status = 502;
    error.data = data;
    throw error;
  }
  return data;
}

async function fetchInstagramProfile(accessToken) {
  const config = getInstagramConfig();
  const fields = "id,user_id,username,name,account_type,followers_count,profile_picture_url";
  const response = await fetch(
    `https://graph.instagram.com/${config.graphVersion}/me?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`,
  );
  const payload = await response.json().catch(() => ({}));
  const profile = Array.isArray(payload.data) ? payload.data[0] || {} : payload;
  if (!response.ok) {
    const error = new Error(payload.error?.message || `instagram_profile_${response.status}`);
    error.status = 502;
    error.data = payload;
    throw error;
  }
  if (!profile.id && !profile.user_id) throw new Error("instagram_profile_missing");
  return profile;
}

async function refreshInstagramStoredTokenIfNeeded(token) {
  if (!token?.refresh_token) return token;
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - Date.now() > 7 * 24 * 60 * 60 * 1000) return token;

  const longToken = await refreshInstagramLongLivedToken(token.refresh_token);
  const profile = await fetchInstagramProfile(longToken.access_token);
  return storeIntegrationToken("instagram", {
    access_token: longToken.access_token,
    refresh_token: longToken.access_token,
    token_type: "bearer",
    scope: token.scope,
    expires_at: longToken.expires_in
      ? new Date(Date.now() + Number(longToken.expires_in) * 1000).toISOString()
      : token.expires_at,
    provider_user_id: profile.user_id || profile.id || token.provider_user_id,
    provider_user_login: profile.username || token.provider_user_login,
    provider_user_name: profile.name || profile.username || token.provider_user_name,
    broadcaster_user_id: null,
    metadata: {
      ...(typeof token.metadata === "object" && token.metadata ? token.metadata : {}),
      accountType: profile.account_type || token.metadata?.accountType || null,
      refreshedAt: new Date().toISOString(),
    },
  });
}

async function getUsableSocialToken(provider) {
  if (provider === "twitch") return getUsableTwitchToken();
  const stored = await getStoredIntegrationToken(provider);
  if (!stored.token) return stored;
  if (provider === "tiktok") {
    return { token: await refreshTikTokStoredTokenIfNeeded(stored.token), missingTable: false };
  }
  if (provider === "youtube") {
    return { token: await refreshYouTubeStoredTokenIfNeeded(stored.token), missingTable: false };
  }
  if (provider === "instagram") {
    return { token: await refreshInstagramStoredTokenIfNeeded(stored.token), missingTable: false };
  }
  return stored;
}

async function getTwitchAppAccessToken() {
  const config = getTwitchConfig();
  if (!config.configured) {
    const error = new Error("twitch_oauth_not_configured");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `twitch_app_token_${response.status}`);
    error.status = 502;
    error.data = data;
    throw error;
  }
  return data.access_token;
}

async function createTwitchFollowSubscription() {
  const config = getTwitchConfig();
  if (!config.configured) {
    const error = new Error("twitch_oauth_not_configured");
    error.status = 503;
    throw error;
  }
  if (!config.eventSubSecret) {
    const error = new Error("twitch_eventsub_secret_missing");
    error.status = 503;
    throw error;
  }

  const { token, missingTable } = await getUsableTwitchToken();
  if (missingTable) {
    const error = new Error("integration_tokens_migration_required");
    error.status = 503;
    throw error;
  }
  if (!token?.access_token) {
    const error = new Error("twitch_account_not_connected");
    error.status = 409;
    throw error;
  }

  const broadcasterUserId = token.broadcaster_user_id || token.provider_user_id || readPublicUrlEnv("TWITCH_BROADCASTER_ID");
  const moderatorUserId = readPublicUrlEnv("TWITCH_MODERATOR_USER_ID") || broadcasterUserId;
  if (!broadcasterUserId || !moderatorUserId) {
    const error = new Error("twitch_broadcaster_id_missing");
    error.status = 409;
    throw error;
  }

  const appAccessToken = await getTwitchAppAccessToken();
  const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appAccessToken}`,
      "Client-Id": config.clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "channel.follow",
      version: "2",
      condition: {
        broadcaster_user_id: broadcasterUserId,
        moderator_user_id: moderatorUserId,
      },
      transport: {
        method: "webhook",
        callback: config.eventSubCallbackUrl,
        secret: config.eventSubSecret,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `twitch_eventsub_subscribe_${response.status}`);
    error.status = response.status === 409 ? 409 : 502;
    error.data = data;
    throw error;
  }

  const subscription = data.data?.[0] || null;
  await updateStoredIntegrationMetadata(twitchProviderKey, (metadata) => ({
    ...metadata,
    eventSub: {
      subscriptionId: subscription?.id || null,
      status: subscription?.status || "pending",
      type: "channel.follow",
      version: "2",
      callback: config.eventSubCallbackUrl,
      createdAt: new Date().toISOString(),
      broadcasterUserId,
      moderatorUserId,
    },
  }));

  return {
    callbackUrl: config.eventSubCallbackUrl,
    subscription,
  };
}

async function recordIntegrationEvent({ provider, eventId, eventType, payload }) {
  if (!supabaseAdmin || !eventId) return { duplicate: false, missingTable: false };

  const { error } = await supabaseAdmin.from("integration_events").insert({
    provider,
    event_id: eventId,
    event_type: eventType,
    payload,
  });

  if (!error) return { duplicate: false, missingTable: false };
  if (error.code === "23505") return { duplicate: true, missingTable: false };
  if (isMissingIntegrationStorageError(error)) return { duplicate: false, missingTable: true };
  throw error;
}

async function applyTwitchFollowEvent(event = {}) {
  const followerName = event.user_name || event.user_login || "new Twitch follower";
  const { account, missingTable } = await getSocialAccount(twitchProviderKey);
  if (missingTable) {
    const error = new Error("social_metrics_migration_required");
    error.status = 503;
    throw error;
  }

  let updatedAccount;
  if (Number.isFinite(Number(account?.follower_count))) {
    updatedAccount = await writeSocialMetric(
      twitchProviderKey,
      {
        followerCount: Number(account.follower_count) + 1,
        providerUserId: account.provider_user_id,
        username: account.username,
        displayName: account.display_name,
        profileUrl: account.profile_url,
        precision: "exact",
        snapshotMetadata: {
          followerUserId: event.user_id || null,
          followerLogin: event.user_login || null,
          followerName,
        },
      },
      { source: "twitch-eventsub" },
    );
  } else {
    updatedAccount = await syncSocialProvider(twitchProviderKey, { force: true, source: "twitch-eventsub" });
  }

  await updateStoredIntegrationMetadata(twitchProviderKey, (metadata) => ({
    ...metadata,
    lastFollowEvent: {
      userId: event.user_id || null,
      userLogin: event.user_login || null,
      userName: event.user_name || null,
      followedAt: event.followed_at || new Date().toISOString(),
      appliedAt: new Date().toISOString(),
      twitchFollowers: updatedAccount?.follower_count || null,
    },
  }));

  const ticker = await readLiveFollowerTicker();
  followerTickerCache = ticker;
  broadcastFollowerTicker(ticker);
  setTimeout(() => {
    syncSocialProvider(twitchProviderKey, { force: true, source: "helix-reconciliation" })
      .then(async () => {
        const reconciledTicker = await readLiveFollowerTicker();
        followerTickerCache = reconciledTicker;
        broadcastFollowerTicker(reconciledTicker);
      })
      .catch((error) => console.error("[twitch-follow-reconciliation]", error.message));
  }, 1500).unref?.();

  return { applied: true, updatedAccount };
}

async function getTwitchIntegrationStatus() {
  const config = getTwitchConfig();
  const { token, missingTable } = await getUsableTwitchToken();
  const metadata = typeof token?.metadata === "object" && token.metadata ? token.metadata : {};

  return {
    configured: config.configured,
    webhookConfigured: config.webhookConfigured,
    callbackUrl: config.redirectUri,
    eventSubCallbackUrl: config.eventSubCallbackUrl,
    requiredScopes: twitchOAuthScopes,
    connection: {
      connected: Boolean(token?.access_token),
      missingTable,
      providerUserId: token?.provider_user_id || null,
      login: token?.provider_user_login || null,
      displayName: token?.provider_user_name || token?.provider_user_login || null,
      broadcasterUserId: token?.broadcaster_user_id || null,
      scopes: token?.scope || [],
      expiresAt: token?.expires_at || null,
      updatedAt: token?.updated_at || null,
    },
    eventSub: metadata.eventSub || null,
    lastFollowEvent: metadata.lastFollowEvent || null,
    checkedAt: new Date().toISOString(),
  };
}

function buildTwitchAuthorizationUrl() {
  const config = getTwitchConfig();
  if (!config.configured) {
    const error = new Error("twitch_oauth_not_configured");
    error.status = 503;
    throw error;
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: twitchOAuthScopes.join(" "),
    state: signTwitchOAuthState(),
    force_verify: "true",
  });

  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

function buildTikTokAuthorizationUrl() {
  const config = getTikTokConfig();
  if (!config.configured) {
    const error = new Error("tiktok_oauth_not_configured");
    error.status = 503;
    throw error;
  }
  const params = new URLSearchParams({
    client_key: config.clientKey,
    response_type: "code",
    scope: "user.info.basic,user.info.profile,user.info.stats",
    redirect_uri: config.redirectUri,
    state: signSocialOAuthState("tiktok"),
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

function buildInstagramAuthorizationUrl() {
  const config = getInstagramConfig();
  if (!config.configured) {
    const error = new Error("instagram_oauth_not_configured");
    error.status = 503;
    throw error;
  }
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "instagram_business_basic",
    state: signSocialOAuthState("instagram"),
    enable_fb_login: "false",
    force_reauth: "true",
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

function buildYouTubeAuthorizationUrl() {
  const config = getYouTubeConfig();
  if (!config.configured) {
    const error = new Error("youtube_oauth_not_configured");
    error.status = 503;
    throw error;
  }
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.readonly",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: signSocialOAuthState("youtube"),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function buildSocialAuthorizationUrl(provider) {
  if (provider === "twitch") return buildTwitchAuthorizationUrl();
  if (provider === "tiktok") return buildTikTokAuthorizationUrl();
  if (provider === "instagram") return buildInstagramAuthorizationUrl();
  if (provider === "youtube") return buildYouTubeAuthorizationUrl();
  const error = new Error(provider === "x" ? "x_uses_server_credentials" : "unsupported_social_provider");
  error.status = 400;
  throw error;
}

async function completeSocialOAuthConnection(provider, code) {
  if (provider === "twitch") {
    const token = await exchangeTwitchCode(code);
    const validation = await validateTwitchAccessToken(token.access_token);
    const scopes = normalizeTwitchScopes(token.scope || validation.scopes);
    const missingScope = twitchOAuthScopes.find((scope) => !scopes.includes(scope));
    if (missingScope) {
      const error = new Error(`missing_twitch_scope_${missingScope}`);
      error.status = 400;
      throw error;
    }
    await storeIntegrationToken(provider, {
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      token_type: token.token_type || "bearer",
      scope: scopes,
      expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
      provider_user_id: validation.user_id || null,
      provider_user_login: validation.login || null,
      provider_user_name: validation.login || null,
      broadcaster_user_id: validation.user_id || null,
      metadata: { connectedAt: new Date().toISOString(), validation },
    });
  } else if (provider === "tiktok") {
    const token = await exchangeTikTokCode(code);
    const stored = await storeIntegrationToken(provider, {
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      token_type: token.token_type || "bearer",
      scope: normalizeTwitchScopes(token.scope),
      expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
      provider_user_id: token.open_id || null,
      provider_user_login: null,
      provider_user_name: null,
      broadcaster_user_id: null,
      metadata: {
        connectedAt: new Date().toISOString(),
        refreshExpiresIn: token.refresh_expires_in || null,
      },
    });
    const metric = await fetchTikTokSocialMetric(stored);
    await storeIntegrationToken(provider, {
      ...stored,
      provider_user_id: metric.providerUserId,
      provider_user_login: metric.username,
      provider_user_name: metric.displayName,
    });
  } else if (provider === "youtube") {
    const token = await exchangeYouTubeCode(code);
    const stored = await storeIntegrationToken(provider, {
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      token_type: token.token_type || "bearer",
      scope: normalizeTwitchScopes(token.scope || "https://www.googleapis.com/auth/youtube.readonly"),
      expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
      provider_user_id: null,
      provider_user_login: null,
      provider_user_name: null,
      broadcaster_user_id: null,
      metadata: { connectedAt: new Date().toISOString() },
    });
    const metric = await fetchYouTubeSocialMetric(stored);
    await storeIntegrationToken(provider, {
      ...stored,
      provider_user_id: metric.providerUserId,
      provider_user_login: metric.username,
      provider_user_name: metric.displayName,
    });
  } else if (provider === "instagram") {
    const shortToken = await exchangeInstagramCode(code);
    const longToken = await exchangeInstagramLongLivedToken(shortToken.access_token);
    const profile = await fetchInstagramProfile(longToken.access_token);
    await storeIntegrationToken(provider, {
      access_token: longToken.access_token,
      refresh_token: longToken.access_token,
      token_type: "bearer",
      scope: normalizeTwitchScopes(shortToken.permissions || "instagram_business_basic"),
      expires_at: longToken.expires_in
        ? new Date(Date.now() + Number(longToken.expires_in) * 1000).toISOString()
        : null,
      provider_user_id: profile.user_id || profile.id || shortToken.user_id || null,
      provider_user_login: profile.username || null,
      provider_user_name: profile.name || profile.username || null,
      broadcaster_user_id: null,
      metadata: {
        connectedAt: new Date().toISOString(),
        accountType: profile.account_type || null,
      },
    });
  } else {
    const error = new Error("unsupported_social_provider");
    error.status = 400;
    throw error;
  }

  const account = await syncSocialProvider(provider, { force: true, source: "oauth-connect" });
  if (provider === "twitch" && getTwitchConfig().webhookConfigured) {
    createTwitchFollowSubscription().catch((error) => {
      if (error.status !== 409) console.error("[twitch-eventsub-auto-subscribe]", error.message);
    });
  }
  const ticker = await readLiveFollowerTicker();
  followerTickerCache = ticker;
  broadcastFollowerTicker(ticker);
  return account;
}

function getSocialProviderSetup(provider) {
  if (provider === "twitch") {
    return {
      oauthSupported: true,
      callbackUrl: getTwitchConfig().redirectUri,
      requiredScopes: twitchOAuthScopes,
      envKeys: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_EVENTSUB_SECRET"],
    };
  }
  if (provider === "tiktok") {
    return {
      oauthSupported: true,
      callbackUrl: getTikTokConfig().redirectUri,
      requiredScopes: ["user.info.basic", "user.info.profile", "user.info.stats"],
      envKeys: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    };
  }
  if (provider === "instagram") {
    return {
      oauthSupported: true,
      callbackUrl: getInstagramConfig().redirectUri,
      requiredScopes: ["instagram_business_basic"],
      envKeys: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET", "INSTAGRAM_GRAPH_VERSION"],
    };
  }
  if (provider === "youtube") {
    return {
      oauthSupported: true,
      callbackUrl: getYouTubeConfig().redirectUri,
      requiredScopes: ["youtube.readonly"],
      envKeys: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
    };
  }
  return {
    oauthSupported: false,
    callbackUrl: null,
    requiredScopes: [],
    envKeys: ["X_BEARER_TOKEN", "X_USERNAME"],
  };
}

async function getSocialIntegrationStatus() {
  const { accounts, missingTable } = await getSocialAccounts();
  const accountByProvider = new Map(accounts.map((account) => [account.provider, account]));
  const tokenResults = await Promise.all(
    socialProviderCatalog.map(async (definition) => {
      if (definition.key === "x") return [definition.key, null];
      try {
        const stored = await getStoredIntegrationToken(definition.key);
        return [definition.key, stored.token];
      } catch (error) {
        return [definition.key, { tokenError: error.message }];
      }
    }),
  );
  const tokenByProvider = new Map(tokenResults);

  return {
    storageReady: !missingTable,
    encryptionReady: Boolean(getSocialTokenEncryptionKey()),
    providers: socialProviderCatalog.map((definition) => {
      const config = getSocialProviderConfig(definition.key);
      const setup = getSocialProviderSetup(definition.key);
      const account = accountByProvider.get(definition.key) || null;
      const token = tokenByProvider.get(definition.key) || null;
      const connected = definition.key === "x"
        ? Boolean(config.configured && ["connected", "stale"].includes(account?.status))
        : Boolean(token?.access_token && account?.status !== "disconnected");
      return {
        key: definition.key,
        label: definition.label,
        appConfigured: Boolean(config.configured),
        connected,
        status: account?.status || "disconnected",
        count: Number.isFinite(Number(account?.follower_count)) ? Number(account.follower_count) : null,
        username: account?.username || token?.provider_user_login || null,
        displayName: account?.display_name || token?.provider_user_name || null,
        profileUrl: account?.profile_url || null,
        precision: account?.precision || definition.precision,
        lastSyncedAt: account?.last_synced_at || null,
        lastChangedAt: account?.last_changed_at || null,
        lastError: account?.last_error || token?.tokenError || null,
        expiresAt: token?.expires_at || null,
        eventSub: definition.key === "twitch" ? token?.metadata?.eventSub || null : null,
        mode: definition.mode,
        cadence: definition.cadence,
        ...setup,
      };
    }),
    checkedAt: new Date().toISOString(),
  };
}

async function disconnectSocialProvider(provider) {
  if (!socialProviderByKey.has(provider)) {
    const error = new Error("unsupported_social_provider");
    error.status = 400;
    throw error;
  }
  if (provider !== "x") {
    const { error: tokenError } = await supabaseAdmin.from("integration_tokens").delete().eq("provider", provider);
    if (tokenError && !isMissingIntegrationStorageError(tokenError)) throw tokenError;
  }
  const definition = socialProviderByKey.get(provider);
  const { error } = await supabaseAdmin.from("social_accounts").upsert(
    {
      provider,
      status: "disconnected",
      provider_user_id: null,
      username: null,
      display_name: null,
      profile_url: null,
      follower_count: null,
      previous_follower_count: null,
      delta: 0,
      metric_name: definition.metricName,
      precision: definition.precision,
      connected_at: null,
      last_synced_at: null,
      last_changed_at: null,
      last_error: null,
      metadata: {},
    },
    { onConflict: "provider" },
  );
  if (error) throw error;
  providerLastPollAt.delete(provider);
  followerTickerCache = await readLiveFollowerTicker();
  broadcastFollowerTicker(followerTickerCache);
  return followerTickerCache;
}

function verifyTwitchEventSubSignature(req, rawBody) {
  const config = getTwitchConfig();
  if (!config.eventSubSecret) return false;

  const messageId = req.get("twitch-eventsub-message-id");
  const timestamp = req.get("twitch-eventsub-message-timestamp");
  const signature = req.get("twitch-eventsub-message-signature");
  if (!messageId || !timestamp || !signature) return false;

  const messageAgeMs = Math.abs(Date.now() - new Date(timestamp).getTime());
  if (!Number.isFinite(messageAgeMs) || messageAgeMs > 10 * 60 * 1000) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", config.eventSubSecret)
    .update(messageId)
    .update(timestamp)
    .update(rawBody)
    .digest("hex")}`;
  return timingSafeEqualString(signature, expected);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTwitchCallbackHtml({ title, message, success = true }) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const accent = success ? "#61e36d" : "#ff6961";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #061008; color: #f4fbf6; font-family: Inter, Arial, sans-serif; }
      main { width: min(560px, calc(100vw - 40px)); padding: 34px; border: 1px solid rgba(97, 227, 109, .22); border-radius: 8px; background: #0d1311; }
      span { color: ${accent}; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
      h1 { margin: 16px 0 0; font-size: 44px; line-height: 1; }
      p { margin: 16px 0 0; color: #bfd0c7; line-height: 1.6; }
      a { display: inline-flex; margin-top: 24px; padding: 14px 18px; color: #061008; border-radius: 7px; background: ${accent}; font-weight: 900; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <span>AI with Murda</span>
      <h1>${safeTitle}</h1>
      <p>${safeMessage}</p>
      <a href="/admin?view=settings">Return to Settings</a>
    </main>
  </body>
</html>`;
}

function isMissingSocialMetricsStorageError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "42P01" || message.includes("social_accounts") || message.includes("social_metric_snapshots");
}

async function getSocialAccounts() {
  const { data, error } = await supabaseAdmin.from("social_accounts").select("*").order("provider");
  if (error) {
    if (isMissingSocialMetricsStorageError(error)) return { accounts: [], missingTable: true };
    throw error;
  }
  return { accounts: data || [], missingTable: false };
}

async function getSocialAccount(provider) {
  const { data, error } = await supabaseAdmin
    .from("social_accounts")
    .select("*")
    .eq("provider", provider)
    .maybeSingle();
  if (error) {
    if (isMissingSocialMetricsStorageError(error)) return { account: null, missingTable: true };
    throw error;
  }
  return { account: data || null, missingTable: false };
}

async function syncLatestDailyLogFollower(provider, followerCount) {
  const sourceRow = await getDailyLogForSnapshot();
  if (!sourceRow) return null;
  const currentFollowers = sourceRow.followers && typeof sourceRow.followers === "object" ? sourceRow.followers : {};
  if (Number(currentFollowers[provider]) === Number(followerCount)) return sourceRow;

  const followers = { ...currentFollowers, [provider]: Number(followerCount) };
  const { data, error } = await supabaseAdmin
    .from("daily_logs")
    .update({ followers })
    .eq("day", sourceRow.day)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function writeSocialMetric(provider, metric, { source = "api-poll" } = {}) {
  const definition = socialProviderByKey.get(provider);
  if (!definition) {
    const error = new Error("unsupported_social_provider");
    error.status = 400;
    throw error;
  }

  const followerCount = Number(metric.followerCount);
  if (!Number.isFinite(followerCount) || followerCount < 0) {
    const error = new Error("invalid_social_follower_count");
    error.status = 502;
    throw error;
  }

  const { account: existing, missingTable } = await getSocialAccount(provider);
  if (missingTable) {
    const error = new Error("social_metrics_migration_required");
    error.status = 503;
    throw error;
  }

  const now = new Date().toISOString();
  const previousCount = Number.isFinite(Number(existing?.follower_count)) ? Number(existing.follower_count) : null;
  const delta = previousCount === null ? 0 : followerCount - previousCount;
  const existingMetadata = existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
  const lastSnapshotAt = existingMetadata.lastSnapshotAt ? new Date(existingMetadata.lastSnapshotAt).getTime() : 0;
  const shouldSnapshot = previousCount === null || delta !== 0 || Date.now() - lastSnapshotAt >= socialMetricHeartbeatMs;
  const metadata = {
    ...existingMetadata,
    ...(metric.metadata && typeof metric.metadata === "object" ? metric.metadata : {}),
    lastSource: source,
    lastSnapshotAt: shouldSnapshot ? now : existingMetadata.lastSnapshotAt || null,
    lastChangeDelta: delta !== 0 ? delta : existingMetadata.lastChangeDelta || 0,
  };

  const row = {
    provider,
    status: "connected",
    provider_user_id: metric.providerUserId || existing?.provider_user_id || null,
    username: metric.username || existing?.username || null,
    display_name: metric.displayName || metric.username || existing?.display_name || null,
    profile_url: metric.profileUrl || existing?.profile_url || null,
    follower_count: followerCount,
    previous_follower_count: previousCount,
    delta,
    metric_name: definition.metricName,
    precision: metric.precision || definition.precision,
    connected_at: existing?.connected_at || now,
    last_synced_at: now,
    last_changed_at: delta !== 0 || previousCount === null ? now : existing?.last_changed_at || null,
    last_error: null,
    metadata,
  };
  const { data, error } = await supabaseAdmin
    .from("social_accounts")
    .upsert(row, { onConflict: "provider" })
    .select("*")
    .single();
  if (error) throw error;

  if (shouldSnapshot) {
    const { error: snapshotError } = await supabaseAdmin.from("social_metric_snapshots").insert({
      provider,
      follower_count: followerCount,
      delta,
      observed_at: now,
      source,
      metadata: metric.snapshotMetadata || {},
    });
    if (snapshotError) throw snapshotError;
  }

  await syncLatestDailyLogFollower(provider, followerCount);
  return data;
}

async function markSocialAccountError(provider, error) {
  const { account, missingTable } = await getSocialAccount(provider);
  if (missingTable) return null;
  const hasLastKnownCount = Number.isFinite(Number(account?.follower_count));
  const { data, error: updateError } = await supabaseAdmin
    .from("social_accounts")
    .upsert(
      {
        provider,
        status: hasLastKnownCount ? "stale" : "error",
        follower_count: hasLastKnownCount ? Number(account.follower_count) : null,
        previous_follower_count: account?.previous_follower_count ?? null,
        delta: 0,
        metric_name: socialProviderByKey.get(provider)?.metricName || "followers",
        precision: account?.precision || socialProviderByKey.get(provider)?.precision || "exact",
        connected_at: account?.connected_at || null,
        last_synced_at: account?.last_synced_at || null,
        last_changed_at: account?.last_changed_at || null,
        last_error: String(error?.message || error || "social_sync_failed").slice(0, 500),
        metadata: account?.metadata || {},
      },
      { onConflict: "provider" },
    )
    .select("*")
    .single();
  if (updateError) throw updateError;
  return data;
}

async function fetchTwitchSocialMetric(token) {
  const config = getTwitchConfig();
  const accessToken = token?.access_token || readPublicUrlEnv("TWITCH_ACCESS_TOKEN");
  const broadcasterId =
    token?.broadcaster_user_id || token?.provider_user_id || readPublicUrlEnv("TWITCH_BROADCASTER_ID");
  if (!config.clientId || !accessToken || !broadcasterId) throw new Error("twitch_account_not_connected");

  const response = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=1`,
    { headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": config.clientId } },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `twitch_followers_${response.status}`);
  const username = token?.provider_user_login || null;
  return {
    followerCount: Number(data.total || 0),
    providerUserId: broadcasterId,
    username,
    displayName: token?.provider_user_name || username,
    profileUrl: username ? `https://www.twitch.tv/${encodeURIComponent(username)}` : null,
    precision: "exact",
  };
}

async function fetchTikTokSocialMetric(token) {
  if (!token?.access_token) throw new Error("tiktok_account_not_connected");
  const fields = "open_id,union_id,avatar_url,display_name,username,profile_deep_link,follower_count";
  const response = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.error?.code && data.error.code !== "ok")) {
    throw new Error(data.error?.message || `tiktok_followers_${response.status}`);
  }
  const user = data?.data?.user || {};
  return {
    followerCount: Number(user.follower_count || 0),
    providerUserId: user.open_id || token.provider_user_id,
    username: user.username || token.provider_user_login,
    displayName: user.display_name || user.username || token.provider_user_name,
    profileUrl: user.profile_deep_link || null,
    precision: "exact",
    metadata: { avatarUrl: user.avatar_url || null },
  };
}

async function fetchInstagramSocialMetric(token) {
  if (!token?.access_token) throw new Error("instagram_account_not_connected");
  const data = await fetchInstagramProfile(token.access_token);
  return {
    followerCount: Number(data.followers_count || 0),
    providerUserId: data.user_id || data.id || token.provider_user_id,
    username: data.username || token.provider_user_login,
    displayName: data.name || data.username || token.provider_user_name,
    profileUrl: data.username ? `https://www.instagram.com/${encodeURIComponent(data.username)}/` : null,
    precision: "exact",
    metadata: {
      profilePictureUrl: data.profile_picture_url || null,
      accountType: data.account_type || null,
    },
  };
}

async function fetchYouTubeSocialMetric(token) {
  if (!token?.access_token) throw new Error("youtube_account_not_connected");
  const response = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `youtube_subscribers_${response.status}`);
  const channel = data.items?.[0];
  if (!channel) throw new Error("youtube_channel_not_found");
  if (channel.statistics?.hiddenSubscriberCount && channel.statistics?.subscriberCount === undefined) {
    throw new Error("youtube_subscriber_count_hidden");
  }
  return {
    followerCount: Number(channel.statistics?.subscriberCount || 0),
    providerUserId: channel.id,
    username: channel.snippet?.customUrl || token.provider_user_login,
    displayName: channel.snippet?.title || token.provider_user_name,
    profileUrl: `https://www.youtube.com/channel/${encodeURIComponent(channel.id)}`,
    precision: "rounded",
    metadata: {
      hiddenSubscriberCount: Boolean(channel.statistics?.hiddenSubscriberCount),
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
    },
  };
}

async function fetchXSocialMetric() {
  const config = getXConfig();
  if (!config.configured) throw new Error("x_api_not_configured");
  const response = await fetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(config.username)}?user.fields=id,name,username,profile_image_url,public_metrics`,
    { headers: { Authorization: `Bearer ${config.bearerToken}` } },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.data) throw new Error(data.detail || data.title || `x_followers_${response.status}`);
  return {
    followerCount: Number(data.data.public_metrics?.followers_count || 0),
    providerUserId: data.data.id,
    username: data.data.username,
    displayName: data.data.name || data.data.username,
    profileUrl: `https://x.com/${encodeURIComponent(data.data.username)}`,
    precision: "exact",
    metadata: { profileImageUrl: data.data.profile_image_url || null },
  };
}

async function fetchSocialProviderMetric(provider, token) {
  if (provider === "twitch") return fetchTwitchSocialMetric(token);
  if (provider === "tiktok") return fetchTikTokSocialMetric(token);
  if (provider === "instagram") return fetchInstagramSocialMetric(token);
  if (provider === "youtube") return fetchYouTubeSocialMetric(token);
  if (provider === "x") return fetchXSocialMetric();
  throw new Error("unsupported_social_provider");
}

async function syncSocialProvider(provider, { force = false, source = "api-poll" } = {}) {
  const definition = socialProviderByKey.get(provider);
  if (!definition) {
    const error = new Error("unsupported_social_provider");
    error.status = 400;
    throw error;
  }
  const config = getSocialProviderConfig(provider);
  if (!config.configured) {
    const error = new Error(`${provider}_oauth_not_configured`);
    error.status = 503;
    throw error;
  }

  const lastPollAt = providerLastPollAt.get(provider) || 0;
  if (!force && Date.now() - lastPollAt < definition.pollMs) return null;
  providerLastPollAt.set(provider, Date.now());

  try {
    let token = null;
    if (provider !== "x") {
      const stored = await getUsableSocialToken(provider);
      if (stored.missingTable) {
        const error = new Error("integration_tokens_migration_required");
        error.status = 503;
        throw error;
      }
      token = stored.token;
      if (!token?.access_token) {
        if (!force) return null;
        const error = new Error(`${provider}_account_not_connected`);
        error.status = 409;
        throw error;
      }
    }

    const metric = await fetchSocialProviderMetric(provider, token);
    return await writeSocialMetric(provider, metric, { source });
  } catch (error) {
    if (!String(error.message || "").endsWith("_account_not_connected")) {
      await markSocialAccountError(provider, error).catch(() => null);
    }
    throw error;
  }
}

function formatSocialSource(definition, account, missingTable) {
  const config = getSocialProviderConfig(definition.key);
  const hasCount = Number.isFinite(Number(account?.follower_count));
  const connected = Boolean(account && ["connected", "stale"].includes(account.status) && hasCount);
  let status = "not-connected";
  let detail = "This account is not connected and is excluded from the total.";

  if (missingTable) {
    status = "migration-required";
    detail = "The social metrics migration must be applied before this account can connect.";
  } else if (account?.status === "connected" && hasCount) {
    status = "live";
    detail = definition.eventDriven ? "Event feed active with API reconciliation." : "Official API count is connected.";
  } else if (account?.status === "stale" && hasCount) {
    status = "stale";
    detail = `Showing the last verified count. ${account.last_error || "The latest refresh failed."}`;
  } else if (account?.status === "error") {
    status = "connector-error";
    detail = account.last_error || "The connector needs attention.";
  } else if (config.configured) {
    status = "ready-to-connect";
    detail = "App credentials are ready. Authorize this account in Admin settings.";
  }

  return {
    key: definition.key,
    label: definition.label,
    platformMetric: definition.metricName,
    mode: definition.mode,
    cadence: definition.cadence,
    configured: Boolean(config.configured),
    connected,
    eventDriven: definition.eventDriven,
    count: connected ? Number(account.follower_count) : null,
    previousCount: connected && account.previous_follower_count !== null ? Number(account.previous_follower_count) : null,
    delta: connected ? Number(account.delta || 0) : 0,
    lastChangeDelta: connected ? Number(account.metadata?.lastChangeDelta || 0) : 0,
    status,
    detail,
    precision: account?.precision || definition.precision,
    username: account?.username || null,
    displayName: account?.display_name || account?.username || null,
    profileUrl: account?.profile_url || null,
    lastUpdatedAt: account?.last_synced_at || null,
    lastChangedAt: account?.last_changed_at || null,
  };
}

async function readLiveFollowerTicker() {
  const { accounts, missingTable } = await getSocialAccounts();
  const accountByProvider = new Map(accounts.map((account) => [account.provider, account]));
  const sources = socialProviderCatalog.map((definition) =>
    formatSocialSource(definition, accountByProvider.get(definition.key) || null, missingTable),
  );
  const connectedSources = sources.filter((source) => source.connected && Number.isFinite(source.count));
  const lastChangedSource = [...connectedSources]
    .filter((source) => source.lastChangedAt)
    .sort((left, right) => new Date(right.lastChangedAt) - new Date(left.lastChangedAt))[0];

  return {
    ok: true,
    mode: "verified-social-metrics",
    total: connectedSources.reduce((sum, source) => sum + source.count, 0),
    connectedSourceCount: connectedSources.length,
    sources,
    storageReady: !missingTable,
    lastChange: lastChangedSource
      ? {
          provider: lastChangedSource.key,
          label: lastChangedSource.label,
          delta: lastChangedSource.lastChangeDelta,
          observedAt: lastChangedSource.lastChangedAt,
        }
      : null,
    refreshMs: followerTickerRefreshMs,
    checkedAt: new Date().toISOString(),
  };
}

function sendFollowerTickerFrame(res, ticker) {
  res.write("event: followers\n");
  res.write(`data: ${JSON.stringify(ticker)}\n\n`);
}

function broadcastFollowerTicker(ticker) {
  for (const client of followerStreamClients) {
    try {
      sendFollowerTickerFrame(client, ticker);
    } catch {
      followerStreamClients.delete(client);
    }
  }
}

async function refreshDueSocialMetrics({ force = false, providers = null } = {}) {
  if (followerRefreshPromise) return followerRefreshPromise;
  followerRefreshPromise = (async () => {
    const selectedProviders = (providers || socialProviderCatalog.map((provider) => provider.key)).filter((provider) =>
      socialProviderByKey.has(provider),
    );
    const results = await Promise.allSettled(
      selectedProviders.map((provider) => syncSocialProvider(provider, { force })),
    );
    const ticker = await readLiveFollowerTicker();
    followerTickerCache = ticker;
    broadcastFollowerTicker(ticker);
    return {
      ticker,
      results: results.map((result, index) => ({
        provider: selectedProviders[index],
        ok: result.status === "fulfilled",
        skipped: result.status === "fulfilled" && result.value === null,
        error: result.status === "rejected" ? result.reason?.message || "social_sync_failed" : null,
      })),
    };
  })();

  try {
    return await followerRefreshPromise;
  } finally {
    followerRefreshPromise = null;
  }
}

function ensureFollowerRefreshLoop() {
  if (followerRefreshTimer) return;
  followerRefreshTimer = setInterval(() => {
    refreshDueSocialMetrics().catch((error) => console.error("[social-refresh-loop]", error.message));
  }, followerTickerRefreshMs);
  followerRefreshTimer.unref?.();
}

async function buildLiveFollowerTicker({ refreshDue = true } = {}) {
  if (refreshDue) {
    try {
      return (await refreshDueSocialMetrics()).ticker;
    } catch (error) {
      console.error("[social-refresh]", error.message);
    }
  }
  if (followerTickerCache) return { ...followerTickerCache, checkedAt: new Date().toISOString() };
  followerTickerCache = await readLiveFollowerTicker();
  return followerTickerCache;
}

function normalizeClipSubmission(body = {}) {
  const day = Number(body.day);
  if (!Number.isInteger(day) || day < 1 || day > 60) {
    const error = new Error("valid_day_required");
    error.status = 400;
    throw error;
  }

  const count = Math.max(1, Math.min(20, Number(body.count || 1)));
  const platform = String(body.platform || "clip").trim().slice(0, 40) || "clip";
  const title = String(body.title || "Clip posted").trim().slice(0, 140) || "Clip posted";
  const url = String(body.url || "").trim().slice(0, 500);
  const postedAt = String(body.postedAt || new Date().toISOString()).trim();
  return {
    day,
    count,
    platform,
    title,
    url,
    postedAt,
  };
}

function formatClipProofAsset(clip) {
  const prefix = `${clip.platform}: ${clip.title}`;
  return clip.url ? `${prefix} - ${clip.url}` : prefix;
}

function normalizeFollowerCountSubmission(body = {}) {
  const rawPlatform = String(body.platform || "").trim().toLowerCase();
  const platform = rawPlatform.replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  if (!platform) {
    const error = new Error("valid_platform_required");
    error.status = 400;
    throw error;
  }

  const count = Number(body.count);
  if (!Number.isFinite(count) || count < 0 || count > 100000000) {
    const error = new Error("valid_count_required");
    error.status = 400;
    throw error;
  }

  const day = body.day === undefined || body.day === null || body.day === "" ? null : Number(body.day);
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 60)) {
    const error = new Error("valid_day_required");
    error.status = 400;
    throw error;
  }

  return {
    day,
    platform,
    count: Math.floor(count),
    source: String(body.source || "automation").trim().slice(0, 80) || "automation",
    observedAt: String(body.observedAt || new Date().toISOString()).trim(),
    addProof: body.addProof === true,
  };
}

function formatFollowerCountProofAsset(update) {
  return `${update.platform}: ${formatNumberForApi(update.count)} followers via ${update.source}`;
}

function shouldSendEmail(email) {
  const domain = email.split("@").at(-1);
  return !["example.com", "example.org", "example.net", "test.invalid"].includes(domain);
}

function baseEmailTemplate({ preheader, title, intro, bullets = [], primaryUrl, primaryLabel, footer }) {
  const bulletMarkup = bullets.length
    ? `<ul style="margin:24px 0;padding:0;list-style:none;">${bullets
        .map(
          (item) =>
            `<li style="margin:0 0 12px;padding:14px 16px;border:1px solid #24402c;border-radius:8px;background:#0f1914;color:#dff5e5;">${item}</li>`,
        )
        .join("")}</ul>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#060a09;color:#f4fbf6;font-family:Inter,Arial,sans-serif;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060a09;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border:1px solid #26352f;border-radius:8px;background:#0d1311;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 0;">
                <p style="margin:0 0 18px;color:#61e36d;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">AI with Murda</p>
                <h1 style="margin:0;color:#f4fbf6;font-size:36px;line-height:1.02;letter-spacing:0;">${title}</h1>
                <p style="margin:18px 0 0;color:#bfd0c7;font-size:16px;line-height:1.6;">${intro}</p>
                ${bulletMarkup}
                <a href="${primaryUrl}" style="display:inline-block;margin:4px 0 26px;padding:14px 18px;border-radius:7px;background:#61e36d;color:#061008;font-weight:900;text-decoration:none;">${primaryLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px;border-top:1px solid #26352f;color:#9dafac;font-size:13px;line-height:1.5;">
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildWelcomeEmail() {
  return {
    subject: "You are on the 60-day build log",
    text: [
      "You are in.",
      "",
      "I will send the daily receipts: scoreboard movement, the best clip, what shipped, what broke, and tomorrow's promise.",
      "",
      `Open the public dashboard: ${siteUrl}/60`,
      `Preview the first drop: ${siteUrl}/kit`,
    ].join("\n"),
    html: baseEmailTemplate({
      preheader: "Daily receipts from the 60-day AI operator sprint.",
      title: "You are on the build log.",
      intro:
        "The sprint starts with the Day 0 setup, then turns into a daily receipt: what moved, what shipped, what broke, and what I am doing tomorrow.",
      bullets: [
        "Scoreboard movement: revenue, followers, emails, clips, builds, calls.",
        "Best clip or proof asset from the day.",
        "The honest lesson from whatever worked or failed.",
      ],
      primaryUrl: `${siteUrl}/60`,
      primaryLabel: "Open the scoreboard",
      footer: `You joined from aiwithmurda.com. The first paid drop is <a href="${siteUrl}/kit" style="color:#61e36d;">${productName}</a>.`,
    }),
  };
}

function buildAccessEmail(productConfig = checkoutProducts.get(productKey)) {
  if (productConfig?.key === operatorToolkitProduct.key) {
    return {
      subject: "Your Operator Toolkit is ready",
      text: [
        "Your permanent Operator Toolkit launch edition and monthly update channel are active.",
        "",
        `Open your member workspace: ${siteUrl}/members`,
        "Start in this order:",
        "- Audit the environment before installing anything.",
        "- Generate the project command center from verified facts.",
        "- Install only the skill collections tied to your current work.",
        "- Run one build through builder, reviewer, user-path test, and handoff.",
        "",
        "Billing: $297 one-time setup plus $30/month for Operator System Updates.",
        "The launch-edition toolkit remains yours if you cancel future updates.",
      ].join("\n"),
      html: baseEmailTemplate({
        preheader: "Your permanent Operator Toolkit and update channel are active.",
        title: "Your full operator system is ready.",
        intro:
          "Your profile now owns the launch-edition Operator Toolkit and has active access to versioned monthly system updates.",
        bullets: [
          "Begin with the environment audit and command-center setup.",
          "Install skill collections deliberately instead of copying everything into every project.",
          "Use the second agent as an independent reviewer and record a verified setup receipt.",
          "The $297 launch edition remains yours; the $30/month update channel can be managed separately.",
        ],
        primaryUrl: `${siteUrl}/members`,
        primaryLabel: "Open Operator Toolkit",
        footer: `This confirmation was sent after Stripe activated ${operatorToolkitProduct.name} and ${operatorUpdatesProduct.name}.`,
      }),
    };
  }

  if (productConfig?.key === operatorUpdatesProduct.key) {
    return {
      subject: "Your Operator System Updates are active",
      text: [
        "Your $30/month Operator System Updates membership is active.",
        "",
        `Open the update channel: ${siteUrl}/members?product=operator-toolkit`,
        "Your permanent Operator Toolkit remains attached to your profile.",
        "Use Manage billing in the member area to view invoices or cancel future renewals.",
      ].join("\n"),
      html: baseEmailTemplate({
        preheader: "Your Operator System update channel is active.",
        title: "The update channel is active.",
        intro:
          "Your profile can access versioned skills, compatibility notes, migrations, verification receipts, and future Operator System releases.",
        bullets: [
          "Read the changelog before applying a release.",
          "Preserve customized files and a restore point.",
          "Your permanent launch-edition toolkit is unaffected by future cancellation.",
        ],
        primaryUrl: `${siteUrl}/members?product=operator-toolkit`,
        primaryLabel: "Open update channel",
        footer: `Operator System Updates renew at ${operatorUpdatesProduct.priceLabel} until canceled.`,
      }),
    };
  }

  if (productConfig?.key === operatorBundleProduct.key) {
    return {
      subject: "Your New Wave Operator Bundle is ready",
      text: [
        "Your Operator Bundle is unlocked.",
        "",
        `Open your member workspace: ${siteUrl}/members`,
        "Start in this order:",
        "- Complete the core setup path if this is your first AI-assisted build.",
        "- Choose one repeated workflow before installing an advanced skill.",
        "- Use the dual-agent review loop on your next real change.",
        `Open the bundle overview: ${siteUrl}/live-builds`,
      ].join("\n"),
      html: baseEmailTemplate({
        preheader: "Your New Wave Operator Bundle is unlocked.",
        title: "Your advanced operator vault is ready.",
        intro:
          "Your profile now has the complete Future Proof Method plus the advanced skill, script, review, debug, deployment, and blueprint vault.",
        bullets: [
          "Finish the beginner foundation before adding advanced automation.",
          "Install skills only when they solve a repeated workflow.",
          "Use one agent to build and the other to review the proof.",
        ],
        primaryUrl: `${siteUrl}/members`,
        primaryLabel: "Open member workspace",
        footer: `This confirmation was sent by AI with Murda after Stripe confirmed ${operatorBundleProduct.name}.`,
      }),
    };
  }

  const accessSteps = buyerOnboardingEmails[0]?.bullets || [];
  return {
    subject: "Your Future Proof Method access is ready",
    text: [
      "Your member profile is unlocked.",
      "",
      `Open the member hub: ${siteUrl}/members`,
      "Start with the activation path:",
      ...accessSteps.map((item) => `- ${item}`),
      `Open the public dashboard: ${siteUrl}/60`,
    ].join("\n"),
    html: baseEmailTemplate({
      preheader: "Your member profile is unlocked.",
      title: "Your operator kit is unlocked.",
      intro:
        "Your profile now has access to the first version of The Future Proof Method. Start with the activation path so the kit turns into work immediately.",
      bullets: [
        ...accessSteps,
        "Then use the trackable module checklist to keep moving.",
      ],
      primaryUrl: `${siteUrl}/members`,
      primaryLabel: "Open member hub",
      footer: `This access email was sent by AI with Murda after Stripe confirmed ${productName}.`,
    }),
  };
}

async function countSubscribersSince(isoDate = null) {
  let query = supabaseAdmin
    .from("subscribers")
    .select("email", { count: "exact", head: true })
    .is("unsubscribed_at", null);

  if (isoDate) {
    query = query.gte("subscribed_at", isoDate);
  }

  const { count, error } = await query;
  if (error) throw error;
  return Number(count || 0);
}

function formatNumberForApi(value) {
  return Number(value || 0).toLocaleString("en-US");
}

async function getOfferOpsSummary() {
  const productConfigs = [...checkoutProducts.values()];
  const productKeys = productConfigs.map((item) => item.key);
  const [
    { data: entitlements, error: entitlementError },
    { data: purchases, error: purchasesError },
    { data: progressRows, error: progressError },
  ] = await Promise.all([
    supabaseAdmin
      .from("entitlements")
      .select("user_id,product_key,status,granted_at")
      .in("product_key", productKeys)
      .eq("status", "active")
      .order("granted_at", { ascending: false }),
    supabaseAdmin
      .from("purchases")
      .select("user_id,product_key,amount_total,currency,status,purchased_at")
      .in("product_key", productKeys)
      .eq("status", "paid"),
    supabaseAdmin
      .from("member_task_progress")
      .select("user_id,module_key,task_key,completed,updated_at,completed_at")
      .eq("product_key", productKey)
      .eq("completed", true),
  ]);

  if (entitlementError) throw entitlementError;
  if (purchasesError) throw purchasesError;
  if (progressError) throw progressError;

  const validProgressRows = (progressRows || []).filter((row) => findProductTask(row.module_key, row.task_key));
  const progressUsers = new Set(validProgressRows.map((row) => row.user_id));
  const completedKeys = new Set(validProgressRows.map((row) => `${row.module_key}:${row.task_key}:${row.user_id}`));
  const revenueCents = (purchases || []).reduce((total, purchase) => total + Number(purchase.amount_total || 0), 0);
  const memberUserIds = [...new Set((entitlements || []).map((row) => row.user_id).filter(Boolean))];
  const activeMembers = new Set(memberUserIds).size;
  const profilesById = new Map();
  if (memberUserIds.length) {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,created_at")
      .in("id", memberUserIds);
    if (profilesError) throw profilesError;
    for (const profile of profiles || []) {
      profilesById.set(profile.id, profile);
    }
  }
  const purchasesByUserId = new Map();
  for (const purchase of purchases || []) {
    const purchaseKey = `${purchase.user_id}:${purchase.product_key}`;
    const existing = purchasesByUserId.get(purchaseKey);
    if (!existing || new Date(purchase.purchased_at).getTime() > new Date(existing.purchased_at).getTime()) {
      purchasesByUserId.set(purchaseKey, purchase);
    }
  }
  const progressByUserId = new Map();
  for (const row of validProgressRows) {
    const current = progressByUserId.get(row.user_id) || [];
    current.push(row);
    progressByUserId.set(row.user_id, current);
  }
  const assetCountByProduct = new Map([
    [productKey, memberAssets.length],
    [operatorBundleProduct.key, operatorBundleAssets.length],
    [operatorToolkitProduct.key, operatorToolkitAssets.length],
    [operatorUpdatesProduct.key, operatorUpdateAssets.length],
  ]);
  const moduleSummaries = productModules.map((module) => {
    const moduleRows = validProgressRows.filter((row) => row.module_key === module.key);
    return {
      key: module.key,
      title: module.title,
      tasks: module.todos.length,
      completedTasks: moduleRows.length,
      activeUsers: new Set(moduleRows.map((row) => row.user_id)).size,
    };
  });
  const productBreakdown = productConfigs.map((productConfig) => {
    const productEntitlements = (entitlements || []).filter((row) => row.product_key === productConfig.key);
    const productPurchases = (purchases || []).filter((row) => row.product_key === productConfig.key);
    const productRevenueCents = productPurchases.reduce(
      (total, purchase) => total + Number(purchase.amount_total || 0),
      0,
    );
    return {
      key: productConfig.key,
      name: productConfig.name,
      priceCents: productConfig.priceCents,
      activeMembers: new Set(productEntitlements.map((row) => row.user_id)).size,
      paidPurchases: productPurchases.length,
      revenueCents: productRevenueCents,
      currency: productPurchases[0]?.currency || "usd",
      assets: assetCountByProduct.get(productConfig.key) || 0,
      tasks: productConfig.key === productKey ? productTaskTotal : 0,
    };
  });
  const members = (entitlements || []).map((entitlement) => {
    const profile = profilesById.get(entitlement.user_id);
    const purchase = purchasesByUserId.get(`${entitlement.user_id}:${entitlement.product_key}`);
    const userProgressRows = progressByUserId.get(entitlement.user_id) || [];
    const completedTaskKeys = new Set(userProgressRows.map((row) => `${row.module_key}:${row.task_key}`));
    const includesStarterCourse = [productKey, operatorBundleProduct.key, operatorToolkitProduct.key].includes(
      entitlement.product_key,
    );
    const currentModule = includesStarterCourse
      ? completedTaskKeys.size >= productTaskTotal
        ? null
        : productModules.find((module) => module.todos.some((todo) => !completedTaskKeys.has(`${module.key}:${todo.key}`)))
      : entitlement.product_key === operatorUpdatesProduct.key
        ? {
            key: "operator-updates",
            title: "Operator update channel active",
          }
        : {
            key: "operator-vault",
            title: "Operator vault unlocked",
          };
    const lastProgressAt = userProgressRows
      .map((row) => row.completed_at || row.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1);

    return {
      userId: entitlement.user_id,
      email: profile?.email || "unknown",
      fullName: profile?.full_name || null,
      productKey: entitlement.product_key,
      productName: checkoutProducts.get(entitlement.product_key)?.name || entitlement.product_key,
      status: entitlement.status,
      grantedAt: entitlement.granted_at,
      purchasedAt: purchase?.purchased_at || null,
      amountTotal: Number(purchase?.amount_total || 0),
      currency: purchase?.currency || "usd",
      completedTasks: includesStarterCourse ? completedTaskKeys.size : 0,
      totalTasks: includesStarterCourse ? productTaskTotal : 0,
      progressPercent:
        includesStarterCourse && productTaskTotal ? Math.round((completedTaskKeys.size / productTaskTotal) * 100) : 0,
      currentModule: currentModule
        ? {
            key: currentModule.key,
            title: currentModule.title,
          }
        : null,
      lastProgressAt: lastProgressAt || null,
    };
  });

  return {
    product: {
      key: productKey,
      name: productName,
      priceCents: productPriceCents,
      modules: productModules.length,
      tasks: productTaskTotal,
      assets: memberAssets.length,
    },
    products: productBreakdown,
    sales: {
      activeMembers,
      paidPurchases: (purchases || []).length,
      revenueCents,
      currency: purchases?.[0]?.currency || "usd",
    },
    progress: {
      usersStarted: progressUsers.size,
      completedTasks: completedKeys.size,
      totalPossibleTasks: Number(productBreakdown.find((item) => item.key === productKey)?.activeMembers || 0) * productTaskTotal,
      moduleSummaries,
    },
    members,
    checkedAt: new Date().toISOString(),
  };
}

async function getMetricsAutomationSummary() {
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    activeSubscribers,
    subscriber24h,
    subscriber7d,
    latestSubscribers,
    offerSummary,
    latestPurchases,
    latestEntitlements,
    latestLogs,
    liveFollowerTicker,
  ] = await Promise.all([
    countSubscribersSince(),
    countSubscribersSince(since24h),
    countSubscribersSince(since7d),
    supabaseAdmin
      .from("subscribers")
      .select("email,source,subscribed_at,last_seen_at")
      .is("unsubscribed_at", null)
      .order("subscribed_at", { ascending: false })
      .limit(6),
    getOfferOpsSummary(),
    supabaseAdmin
      .from("purchases")
      .select("user_id,product_key,amount_total,currency,status,purchased_at")
      .eq("status", "paid")
      .order("purchased_at", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("entitlements")
      .select("user_id,product_key,status,granted_at")
      .eq("status", "active")
      .order("granted_at", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("daily_logs")
      .select("day,date,email_subscribers,revenue_collected,products_sold,clips_posted,hours_streamed,updated_at")
      .order("day", { ascending: false })
      .limit(1),
    buildLiveFollowerTicker({ refreshDue: false }),
  ]);

  for (const result of [latestSubscribers, latestPurchases, latestEntitlements, latestLogs]) {
    if (result.error) throw result.error;
  }

  const latestLog = latestLogs.data?.[0] || null;
  const socialAutomationSources = (liveFollowerTicker.sources || []).map((source) => ({
    key: `${source.key}-${source.platformMetric}`,
    label: `${source.label} ${source.platformMetric}`,
    status: source.status,
    mode: source.mode,
    metric: source.count === null ? "Not connected" : formatNumberForApi(source.count),
    detail: source.detail,
    next: source.connected ? `Last verified ${source.lastUpdatedAt || "just now"}.` : "Connect the account in Social Accounts.",
  }));
  const liveSources = [
    {
      key: "email-subscribers",
      label: "Email subscribers",
      status: "live",
      mode: "Supabase capture",
      metric: formatNumberForApi(activeSubscribers),
      detail: `+${formatNumberForApi(subscriber24h)} in 24h · +${formatNumberForApi(subscriber7d)} in 7d`,
      next: "Auto-counts from /api/subscribe and Resend-backed signup forms.",
    },
    {
      key: "stripe-sales",
      label: "Stripe purchases",
      status: "live",
      mode: "Stripe webhook",
      metric: `$${(offerSummary.sales.revenueCents / 100).toFixed(2)}`,
      detail: `${formatNumberForApi(offerSummary.sales.paidPurchases)} paid order${offerSummary.sales.paidPurchases === 1 ? "" : "s"}`,
      next: "Webhook writes purchases and unlocks entitlements automatically.",
    },
    {
      key: "member-access",
      label: "Member access",
      status: "live",
      mode: "Supabase entitlements",
      metric: formatNumberForApi(offerSummary.sales.activeMembers),
      detail: `${formatNumberForApi(offerSummary.progress.completedTasks)} completed checklist task${offerSummary.progress.completedTasks === 1 ? "" : "s"}`,
      next: "Member portal activity updates from the gated hub.",
    },
    {
      key: "daily-dashboard",
      label: "Daily dashboard",
      status: "live",
      mode: "Admin reviewed automation",
      metric: latestLog ? `Day ${latestLog.day}` : "No live day",
      detail: latestLog ? `${latestLog.date} · ${formatNumberForApi(latestLog.clips_posted)} clips logged` : "Waiting for Day 1 baseline",
      next: "Snapshot writer can apply Stripe, email, and member metrics into daily_logs.",
    },
    ...socialAutomationSources,
    {
      key: "clip-pipeline",
      label: "Clips posted",
      status: "planned",
      mode: "Upload workflow / n8n",
      metric: latestLog ? formatNumberForApi(latestLog.clips_posted) : "0",
      detail: "Manual today; can become automatic when clips are posted through our pipeline.",
      next: "Add a clip submission webhook and count every accepted clip event.",
    },
  ];

  const events = [
    ...(latestSubscribers.data || []).map((row) => ({
      type: "subscriber",
      label: row.email,
      detail: row.source || "unknown source",
      at: row.subscribed_at,
    })),
    ...(latestPurchases.data || []).map((row) => ({
      type: "purchase",
      label: `$${(Number(row.amount_total || 0) / 100).toFixed(2)} ${row.currency || "usd"}`,
      detail: row.product_key,
      at: row.purchased_at,
    })),
    ...(latestEntitlements.data || []).map((row) => ({
      type: "entitlement",
      label: row.product_key,
      detail: row.user_id,
      at: row.granted_at,
    })),
  ]
    .filter((event) => event.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  return {
    snapshot: {
      emailSubscribers: activeSubscribers,
      emailSubscribers24h: subscriber24h,
      emailSubscribers7d: subscriber7d,
      revenueCents: offerSummary.sales.revenueCents,
      paidPurchases: offerSummary.sales.paidPurchases,
      activeMembers: offerSummary.sales.activeMembers,
      completedMemberTasks: offerSummary.progress.completedTasks,
      latestSyncedDay: latestLog?.day || null,
      clipsPosted: Number(latestLog?.clips_posted || 0),
      hoursStreamed: Number(latestLog?.hours_streamed || 0),
    },
    sources: liveSources,
    events,
    nextBuilds: [
      "Authorize the Twitch channel and confirm EventSub delivery",
      "Authorize TikTok with user.info.stats",
      "Connect the professional Instagram account through Meta",
      "Authorize the YouTube channel and verify rounded subscriber precision",
      "Clip submission webhook for n8n/short-form pipeline",
    ],
    checkedAt: new Date().toISOString(),
  };
}

async function ensureProductRecord(productConfig) {
  if (!supabaseAdmin || !productConfig?.key) return;

  await supabaseAdmin
    .from("products")
    .upsert(
      {
        key: productConfig.key,
        name: productConfig.name,
        subtitle: productConfig.subtitle,
        price_cents: productConfig.priceCents,
        currency: "usd",
        active: true,
      },
      { onConflict: "key" },
    )
    .throwOnError();
}

async function upsertProductEntitlement({ userId, productConfig, sourcePurchaseId = null, active = true }) {
  await ensureProductRecord(productConfig);
  const payload = {
    user_id: userId,
    product_key: productConfig.key,
    status: active ? "active" : "revoked",
    revoked_at: active ? null : new Date().toISOString(),
  };
  if (sourcePurchaseId) payload.source_purchase_id = sourcePurchaseId;

  const { data, error } = await supabaseAdmin
    .from("entitlements")
    .upsert(payload, { onConflict: "user_id,product_key" })
    .select("id,product_key,status,granted_at,revoked_at")
    .single();

  if (error) throw error;
  return data;
}

async function grantEntitlement({ userId, email, session, productConfig = checkoutProducts.get(productKey) }) {
  if (!supabaseAdmin || !userId || !session?.id) return null;
  if (!productConfig?.key || !checkoutProducts.has(productConfig.key)) {
    throw new Error("unknown_product_entitlement");
  }

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const amountTotal = Number(session.amount_total || productConfig.priceCents);
  const currency = String(session.currency || "usd").toLowerCase();

  await ensureProductRecord(productConfig);

  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: email || session.customer_details?.email || "",
        stripe_customer_id: stripeCustomerId,
      },
      { onConflict: "id" },
    )
    .throwOnError();

  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .upsert(
      {
        user_id: userId,
        product_key: productConfig.key,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: stripeCustomerId,
        amount_total: amountTotal,
        currency,
        status: "paid",
        purchased_at: new Date().toISOString(),
      },
      { onConflict: "stripe_checkout_session_id" },
    )
    .select("id")
    .single();

  if (purchaseError) throw purchaseError;

  return upsertProductEntitlement({
    userId,
    productConfig,
    sourcePurchaseId: purchase.id,
    active: true,
  });
}

const updateAccessStatuses = new Set(["active", "trialing", "past_due"]);

function getSubscriptionPeriodEnd(subscription) {
  const direct = Number(subscription?.current_period_end || 0);
  const itemEnds = (subscription?.items?.data || []).map((item) => Number(item.current_period_end || 0));
  const timestamp = Math.max(direct, ...itemEnds, 0);
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function getInvoiceSubscriptionReference(invoice) {
  return invoice?.subscription || invoice?.parent?.subscription_details?.subscription || null;
}

function getInvoiceSubscriptionId(invoice) {
  const reference = getInvoiceSubscriptionReference(invoice);
  return typeof reference === "string" ? reference : reference?.id || null;
}

async function resolveSubscriptionUserId(subscription) {
  const metadataUserId = String(subscription?.metadata?.supabase_user_id || "").trim();
  if (metadataUserId) return metadataUserId;

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (error) throw error;
  return data?.user_id || null;
}

async function syncOperatorUpdateSubscription(
  subscription,
  { userId = null, checkoutSessionId = null, sourcePurchaseId = null } = {},
) {
  if (!subscription?.id) throw new Error("stripe_subscription_required");
  const resolvedUserId = userId || (await resolveSubscriptionUserId(subscription));
  if (!resolvedUserId) throw new Error("subscription_user_missing");

  const status = String(subscription.status || "unknown");
  const active = updateAccessStatuses.has(status);
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || null;
  const subscriptionPayload = {
    user_id: resolvedUserId,
    product_key: operatorUpdatesProduct.key,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: stripeCustomerId,
    status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_end: getSubscriptionPeriodEnd(subscription),
  };
  if (checkoutSessionId) subscriptionPayload.stripe_checkout_session_id = checkoutSessionId;

  await ensureProductRecord(checkoutProducts.get(operatorUpdatesProduct.key));
  const { data: subscriptionRow, error: subscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .upsert(subscriptionPayload, { onConflict: "user_id,product_key" })
    .select("product_key,status,cancel_at_period_end,current_period_end,created_at,updated_at")
    .single();
  if (subscriptionError) throw subscriptionError;

  const entitlement = await upsertProductEntitlement({
    userId: resolvedUserId,
    productConfig: checkoutProducts.get(operatorUpdatesProduct.key),
    sourcePurchaseId,
    active,
  });

  return { userId: resolvedUserId, subscription: subscriptionRow, entitlement };
}

async function recordOperatorUpdateInvoicePayment({ invoice, userId }) {
  if (!invoice?.id || !userId || invoice.billing_reason !== "subscription_cycle") return null;
  const amountPaid = Number(invoice.amount_paid || 0);
  if (amountPaid <= 0) return null;

  const updatesConfig = checkoutProducts.get(operatorUpdatesProduct.key);
  await ensureProductRecord(updatesConfig);
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
  const paidTimestamp = Number(invoice.status_transitions?.paid_at || invoice.created || 0);
  const { data, error } = await supabaseAdmin
    .from("purchases")
    .upsert(
      {
        user_id: userId,
        product_key: operatorUpdatesProduct.key,
        stripe_checkout_session_id: `invoice:${invoice.id}`,
        stripe_customer_id: stripeCustomerId,
        amount_total: amountPaid,
        currency: String(invoice.currency || "usd").toLowerCase(),
        status: "paid",
        purchased_at: paidTimestamp ? new Date(paidTimestamp * 1000).toISOString() : new Date().toISOString(),
      },
      { onConflict: "stripe_checkout_session_id" },
    )
    .select("id,product_key,amount_total,currency,purchased_at")
    .single();
  if (error) throw error;
  return data;
}

async function grantOperatorToolkitAccess({ userId, email, session }) {
  const toolkitConfig = checkoutProducts.get(operatorToolkitProduct.key);
  const permanentEntitlement = await grantEntitlement({ userId, email, session, productConfig: toolkitConfig });
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .single();
  if (purchaseError) throw purchaseError;

  let subscription = session.subscription;
  if (typeof subscription === "string") {
    subscription = await stripe.subscriptions.retrieve(subscription);
  }
  if (!subscription?.id) throw new Error("operator_update_subscription_missing");

  const updates = await syncOperatorUpdateSubscription(subscription, {
    userId,
    checkoutSessionId: session.id,
    sourcePurchaseId: purchase.id,
  });

  return { permanentEntitlement, updates };
}

async function grantOperatorUpdateOnlyAccess({ userId, email, session }) {
  const updatesConfig = checkoutProducts.get(operatorUpdatesProduct.key);
  const updateEntitlement = await grantEntitlement({ userId, email, session, productConfig: updatesConfig });
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .single();
  if (purchaseError) throw purchaseError;

  let subscription = session.subscription;
  if (typeof subscription === "string") subscription = await stripe.subscriptions.retrieve(subscription);
  if (!subscription?.id) throw new Error("operator_update_subscription_missing");

  const updates = await syncOperatorUpdateSubscription(subscription, {
    userId,
    checkoutSessionId: session.id,
    sourcePurchaseId: purchase.id,
  });
  return { updateEntitlement, updates };
}

async function createCheckoutSessionForProduct({ req, productConfig }) {
  await ensureProductRecord(productConfig);

  const profile = await ensureProfile(req.user);
  const customerTarget = profile.stripe_customer_id
    ? { customer: profile.stripe_customer_id }
    : { customer_email: profile.email };
  const stripePriceId = productConfig.priceEnvKey ? process.env[productConfig.priceEnvKey] : null;
  const lineItem = stripePriceId
    ? { price: stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: "usd",
          unit_amount: productConfig.priceCents,
          product_data: {
            name: productConfig.name,
            description: productConfig.subtitle,
          },
        },
        quantity: 1,
      };

  return stripe.checkout.sessions.create({
    mode: "payment",
    ...customerTarget,
    allow_promotion_codes: true,
    client_reference_id: req.user.id,
    line_items: [lineItem],
    success_url: `${siteUrl}${productConfig.successPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}${productConfig.cancelPath}?checkout=cancel`,
    metadata: {
      product_key: productConfig.key,
      supabase_user_id: req.user.id,
    },
  });
}

async function createOperatorToolkitCheckoutSession(req) {
  const toolkitConfig = checkoutProducts.get(operatorToolkitProduct.key);
  const updatesConfig = checkoutProducts.get(operatorUpdatesProduct.key);
  await Promise.all([ensureProductRecord(toolkitConfig), ensureProductRecord(updatesConfig)]);

  const profile = await ensureProfile(req.user);
  const customerTarget = profile.stripe_customer_id
    ? { customer: profile.stripe_customer_id }
    : { customer_email: profile.email };
  const toolkitPriceId = process.env.STRIPE_OPERATOR_TOOLKIT_PRICE_ID;
  const updatesPriceId = process.env.STRIPE_OPERATOR_UPDATES_PRICE_ID;
  const setupLineItem = toolkitPriceId
    ? { price: toolkitPriceId, quantity: 1 }
    : {
        price_data: {
          currency: "usd",
          unit_amount: operatorToolkitProduct.priceCents,
          product_data: {
            name: operatorToolkitProduct.name,
            description: "Permanent launch-edition setup and customer-safe operating system.",
          },
        },
        quantity: 1,
      };
  const updateLineItem = updatesPriceId
    ? { price: updatesPriceId, quantity: 1 }
    : {
        price_data: {
          currency: "usd",
          unit_amount: operatorUpdatesProduct.priceCents,
          recurring: { interval: "month" },
          product_data: {
            name: operatorUpdatesProduct.name,
            description: operatorUpdatesProduct.subtitle,
          },
        },
        quantity: 1,
      };

  return stripe.checkout.sessions.create({
    mode: "subscription",
    ...customerTarget,
    allow_promotion_codes: true,
    client_reference_id: req.user.id,
    line_items: [setupLineItem, updateLineItem],
    success_url: `${siteUrl}/members?checkout=success&product=operator-toolkit&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/operator-toolkit?checkout=cancel`,
    metadata: {
      product_key: operatorToolkitProduct.key,
      update_product_key: operatorUpdatesProduct.key,
      supabase_user_id: req.user.id,
      billing_model: "297_setup_plus_30_monthly",
    },
    subscription_data: {
      metadata: {
        product_key: operatorUpdatesProduct.key,
        permanent_product_key: operatorToolkitProduct.key,
        supabase_user_id: req.user.id,
      },
    },
  });
}

async function createOperatorUpdatesCheckoutSession(req) {
  const updatesConfig = checkoutProducts.get(operatorUpdatesProduct.key);
  await ensureProductRecord(updatesConfig);
  const profile = await ensureProfile(req.user);
  const customerTarget = profile.stripe_customer_id
    ? { customer: profile.stripe_customer_id }
    : { customer_email: profile.email };
  const updatesPriceId = process.env.STRIPE_OPERATOR_UPDATES_PRICE_ID;
  const updateLineItem = updatesPriceId
    ? { price: updatesPriceId, quantity: 1 }
    : {
        price_data: {
          currency: "usd",
          unit_amount: operatorUpdatesProduct.priceCents,
          recurring: { interval: "month" },
          product_data: {
            name: operatorUpdatesProduct.name,
            description: operatorUpdatesProduct.subtitle,
          },
        },
        quantity: 1,
      };

  return stripe.checkout.sessions.create({
    mode: "subscription",
    ...customerTarget,
    allow_promotion_codes: true,
    client_reference_id: req.user.id,
    line_items: [updateLineItem],
    success_url: `${siteUrl}/members?checkout=success&product=operator-toolkit&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/members?product=operator-toolkit&checkout=cancel`,
    metadata: {
      product_key: operatorUpdatesProduct.key,
      supabase_user_id: req.user.id,
      billing_model: "30_monthly_reactivation",
    },
    subscription_data: {
      metadata: {
        product_key: operatorUpdatesProduct.key,
        permanent_product_key: operatorToolkitProduct.key,
        supabase_user_id: req.user.id,
      },
    },
  });
}

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: "stripe_webhook_not_configured" });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const productConfig = checkoutProducts.get(session.metadata?.product_key);
      if (productConfig && session.payment_status === "paid") {
        if (productConfig.key === operatorToolkitProduct.key) {
          await grantOperatorToolkitAccess({
            userId: session.metadata?.supabase_user_id,
            email: session.customer_details?.email,
            session,
          });
        } else if (productConfig.key === operatorUpdatesProduct.key) {
          await grantOperatorUpdateOnlyAccess({
            userId: session.metadata?.supabase_user_id,
            email: session.customer_details?.email,
            session,
          });
        } else {
          await grantEntitlement({
            userId: session.metadata?.supabase_user_id,
            email: session.customer_details?.email,
            session,
            productConfig,
          });
        }

        if (resend && session.customer_details?.email) {
          const accessEmail = buildAccessEmail(productConfig);
          await resend.emails.send({
            from: process.env.RESEND_FROM || defaultEmailFrom,
            to: session.customer_details.email,
            subject: accessEmail.subject,
            text: accessEmail.text,
            html: accessEmail.html,
          });
        }
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object;
      if (subscription.metadata?.product_key === operatorUpdatesProduct.key) {
        await syncOperatorUpdateSubscription(subscription);
      }
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const subscriptionId = getInvoiceSubscriptionId(invoice);
      if (subscriptionId) {
        const reference = getInvoiceSubscriptionReference(invoice);
        const subscription =
          typeof reference === "object" && reference?.metadata?.product_key
            ? reference
            : await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.metadata?.product_key === operatorUpdatesProduct.key) {
          const synced = await syncOperatorUpdateSubscription(subscription);
          if (event.type === "invoice.paid") {
            await recordOperatorUpdateInvoicePayment({ invoice, userId: synced.userId });
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook]", error);
    res.status(500).json({ error: "webhook_processing_failed" });
  }
});

app.post(twitchEventSubPath, express.raw({ type: "application/json" }), async (req, res) => {
  const config = getTwitchConfig();
  if (!config.webhookConfigured) {
    res.status(503).json({ error: "twitch_eventsub_not_configured" });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
  if (!verifyTwitchEventSubSignature(req, rawBody)) {
    res.status(403).json({ error: "invalid_twitch_eventsub_signature" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ error: "invalid_twitch_eventsub_payload" });
    return;
  }

  const messageType = req.get("twitch-eventsub-message-type");
  const eventId = req.get("twitch-eventsub-message-id");
  const subscriptionType = payload?.subscription?.type || "unknown";

  try {
    if (messageType === "webhook_callback_verification") {
      res.type("text/plain").send(payload.challenge || "");
      return;
    }

    const recorded = await recordIntegrationEvent({
      provider: twitchProviderKey,
      eventId,
      eventType: `${messageType || "unknown"}:${subscriptionType}`,
      payload,
    });
    if (recorded.duplicate) {
      res.status(204).send();
      return;
    }

    if (messageType === "notification" && subscriptionType === "channel.follow") {
      await applyTwitchFollowEvent(payload.event || {});
    }

    if (messageType === "revocation") {
      await updateStoredIntegrationMetadata(twitchProviderKey, (metadata) => ({
        ...metadata,
        eventSubRevocation: {
          status: payload?.subscription?.status || null,
          type: subscriptionType,
          reason: payload?.subscription?.status || "revoked",
          receivedAt: new Date().toISOString(),
        },
      }));
    }

    res.status(204).send();
  } catch (error) {
    console.error("[twitch-eventsub]", error);
    res.status(error.status || 500).json({ error: error.message || "twitch_eventsub_processing_failed" });
  }
});

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    supabase: Boolean(supabaseAdmin),
    stripe: Boolean(stripe),
    resend: Boolean(resend),
  });
});

app.get("/api/stream/config", (req, res) => {
  res.json(buildStreamConfig());
});

app.get("/api/daily-logs", async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    const { data, error } = await supabaseAdmin.from("daily_logs").select("*").order("day", { ascending: true });
    if (error) throw error;
    res.json({ logs: (data || []).map(toDailyLog) });
  } catch (error) {
    console.error("[daily-logs]", error);
    res.status(500).json({ error: "daily_logs_lookup_failed" });
  }
});

app.get("/api/followers/live", async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await buildLiveFollowerTicker({ refreshDue: true }));
  } catch (error) {
    console.error("[followers-live]", error);
    res.status(500).json({ error: "followers_live_lookup_failed" });
  }
});

app.get("/api/followers/stream", async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  followerStreamClients.add(res);
  ensureFollowerRefreshLoop();
  const heartbeat = setInterval(() => res.write(": keepalive\n\n"), 25_000);
  heartbeat.unref?.();

  req.on("close", () => {
    clearInterval(heartbeat);
    followerStreamClients.delete(res);
  });

  try {
    sendFollowerTickerFrame(res, await buildLiveFollowerTicker({ refreshDue: true }));
  } catch (error) {
    res.write("event: ticker-error\n");
    res.write(`data: ${JSON.stringify({ error: "followers_stream_tick_failed", message: error.message })}\n\n`);
  }
});

app.get("/api/admin/integrations/social/status", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;
  try {
    res.json({ ok: true, status: await getSocialIntegrationStatus() });
  } catch (error) {
    console.error("[admin-social-status]", error);
    res.status(error.status || 500).json({ error: error.message || "social_status_failed" });
  }
});

app.post("/api/admin/integrations/social/sync", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;
  try {
    const result = await refreshDueSocialMetrics({ force: req.body?.force === true });
    res.json({ ok: true, ...result, status: await getSocialIntegrationStatus() });
  } catch (error) {
    console.error("[admin-social-sync-all]", error);
    res.status(error.status || 500).json({ error: error.message || "social_sync_failed" });
  }
});

app.post("/api/admin/integrations/social/:provider/oauth/start", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;
  const provider = String(req.params.provider || "").toLowerCase();
  try {
    res.json({ ok: true, provider, url: buildSocialAuthorizationUrl(provider) });
  } catch (error) {
    console.error("[admin-social-oauth-start]", provider, error.message);
    res.status(error.status || 500).json({ error: error.message || "social_oauth_start_failed" });
  }
});

app.post("/api/admin/integrations/social/:provider/sync", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;
  const provider = String(req.params.provider || "").toLowerCase();
  try {
    const account = await syncSocialProvider(provider, { force: true, source: "admin-sync" });
    const ticker = await readLiveFollowerTicker();
    followerTickerCache = ticker;
    broadcastFollowerTicker(ticker);
    res.json({ ok: true, provider, account, ticker, status: await getSocialIntegrationStatus() });
  } catch (error) {
    console.error("[admin-social-sync]", provider, error.message);
    res.status(error.status || 500).json({ error: error.message || "social_sync_failed" });
  }
});

app.delete("/api/admin/integrations/social/:provider", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;
  const provider = String(req.params.provider || "").toLowerCase();
  try {
    const ticker = await disconnectSocialProvider(provider);
    res.json({ ok: true, provider, ticker, status: await getSocialIntegrationStatus() });
  } catch (error) {
    console.error("[admin-social-disconnect]", provider, error.message);
    res.status(error.status || 500).json({ error: error.message || "social_disconnect_failed" });
  }
});

app.get("/api/admin/integrations/twitch/status", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    res.json({
      ok: true,
      status: await getTwitchIntegrationStatus(),
    });
  } catch (error) {
    console.error("[admin-twitch-status]", error);
    res.status(error.status || 500).json({ error: error.message || "twitch_status_failed" });
  }
});

app.post("/api/admin/integrations/twitch/oauth/start", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    res.json({
      ok: true,
      url: buildTwitchAuthorizationUrl(),
      status: await getTwitchIntegrationStatus(),
    });
  } catch (error) {
    console.error("[admin-twitch-oauth-start]", error);
    res.status(error.status || 500).json({ error: error.message || "twitch_oauth_start_failed" });
  }
});

app.post("/api/admin/integrations/twitch/eventsub/subscribe", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    const eventSub = await createTwitchFollowSubscription();
    res.json({
      ok: true,
      eventSub,
      status: await getTwitchIntegrationStatus(),
    });
  } catch (error) {
    console.error("[admin-twitch-eventsub-subscribe]", error);
    res.status(error.status || 500).json({
      error: error.message || "twitch_eventsub_subscribe_failed",
      detail: error.data || null,
    });
  }
});

async function handleSocialOAuthCallback(req, res, provider) {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;
  const definition = socialProviderByKey.get(provider);
  const providerLabel = definition?.label || provider;

  if (req.query.error) {
    res
      .status(400)
      .send(
        renderTwitchCallbackHtml({
          success: false,
          title: `${providerLabel} was not connected`,
          message: String(
            req.query.error_description || req.query.error_message || req.query.error || `${providerLabel} returned an authorization error.`,
          ),
        }),
      );
    return;
  }

  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  if (!code || !state) {
    res.status(400).send(
      renderTwitchCallbackHtml({
        success: false,
        title: `Missing ${providerLabel} callback data`,
        message: `${providerLabel} did not return the code and state needed to finish this connection.`,
      }),
    );
    return;
  }

  try {
    verifySocialOAuthState(state, provider);
    const account = await completeSocialOAuthConnection(provider, code);

    res.send(
      renderTwitchCallbackHtml({
        title: `${providerLabel} connected`,
        message: `${account?.display_name || account?.username || providerLabel} is now feeding verified ${definition?.metricName || "follower"} data into the dashboard and combined OBS total.`,
      }),
    );
  } catch (error) {
    console.error("[social-oauth-callback]", provider, error);
    res.status(error.status || 500).send(
      renderTwitchCallbackHtml({
        success: false,
        title: `${providerLabel} connection failed`,
        message: error.message || `The ${providerLabel} OAuth callback could not be completed.`,
      }),
    );
  }
}

app.get(twitchCallbackPath, (req, res) => handleSocialOAuthCallback(req, res, twitchProviderKey));
app.get(socialCallbackPaths.tiktok, (req, res) => handleSocialOAuthCallback(req, res, "tiktok"));
app.get(socialCallbackPaths.instagram, (req, res) => handleSocialOAuthCallback(req, res, "instagram"));
app.get(socialCallbackPaths.youtube, (req, res) => handleSocialOAuthCallback(req, res, "youtube"));

app.put("/api/admin/daily-logs", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  const logs = Array.isArray(req.body?.logs) ? req.body.logs : null;
  const replace = req.body?.replace === true;
  if (!logs?.length || logs.some((log) => !validateDailyLog(log))) {
    res.status(400).json({ error: "valid_logs_required" });
    return;
  }

  try {
    const rows = logs.map(toDailyLogRow);
    const { error } = await supabaseAdmin
      .from("daily_logs")
      .upsert(rows, { onConflict: "day" })
      .select("day");

    if (error) throw error;

    if (replace) {
      const keepDays = rows.map((row) => row.day).sort((a, b) => a - b);
      const { error: deleteError } = await supabaseAdmin
        .from("daily_logs")
        .delete()
        .not("day", "in", `(${keepDays.join(",")})`);
      if (deleteError) throw deleteError;
    }

    const { data: syncedLogs, error: lookupError } = await supabaseAdmin
      .from("daily_logs")
      .select("*")
      .order("day", { ascending: true });

    if (lookupError) throw lookupError;
    res.json({ ok: true, replace, logs: (syncedLogs || []).map(toDailyLog) });
  } catch (error) {
    console.error("[admin-daily-logs]", error);
    res.status(500).json({ error: "daily_logs_sync_failed" });
  }
});

app.get("/api/admin/subscribers/summary", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [active, last24h, last7d, latestResult] = await Promise.all([
      countSubscribersSince(),
      countSubscribersSince(since24h),
      countSubscribersSince(since7d),
      supabaseAdmin
        .from("subscribers")
        .select("source,subscribed_at,last_seen_at")
        .is("unsubscribed_at", null)
        .order("subscribed_at", { ascending: false })
        .limit(5),
    ]);

    if (latestResult.error) throw latestResult.error;

    res.json({
      ok: true,
      summary: {
        active,
        last24h,
        last7d,
        latest: (latestResult.data || []).map((row) => ({
          source: row.source || "unknown",
          subscribedAt: row.subscribed_at,
          lastSeenAt: row.last_seen_at,
        })),
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[admin-subscribers-summary]", error);
    res.status(500).json({ error: "subscribers_summary_failed" });
  }
});

app.get("/api/admin/offer/summary", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    res.json({
      ok: true,
      summary: await getOfferOpsSummary(),
    });
  } catch (error) {
    console.error("[admin-offer-summary]", error);
    res.status(500).json({ error: "offer_summary_failed" });
  }
});

app.get("/api/admin/metrics/automation", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    res.json({
      ok: true,
      summary: await getMetricsAutomationSummary(),
    });
  } catch (error) {
    console.error("[admin-metrics-automation]", error);
    res.status(500).json({ error: "metrics_automation_summary_failed" });
  }
});

app.get("/api/admin/metrics/daily-snapshot", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  const day = req.query.day ? Number(req.query.day) : null;
  try {
    res.json({
      ok: true,
      snapshot: await buildAutomatedDailySnapshot({ day }),
    });
  } catch (error) {
    console.error("[admin-metrics-daily-snapshot]", error);
    res.status(error.status || 500).json({ error: error.message || "daily_snapshot_failed" });
  }
});

app.post("/api/admin/metrics/daily-snapshot", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  const day = req.body?.day ? Number(req.body.day) : null;
  try {
    const snapshot = await buildAutomatedDailySnapshot({ day });
    if (!validateDailyLog(snapshot.proposedLog)) {
      res.status(500).json({ error: "generated_daily_log_invalid" });
      return;
    }

    const { error } = await supabaseAdmin
      .from("daily_logs")
      .upsert([toDailyLogRow(snapshot.proposedLog)], { onConflict: "day" })
      .select("day");

    if (error) throw error;

    res.json({
      ok: true,
      applied: true,
      snapshot,
      logs: await getAllDailyLogs(),
    });
  } catch (error) {
    console.error("[admin-metrics-daily-snapshot-apply]", error);
    res.status(error.status || 500).json({ error: error.message || "daily_snapshot_apply_failed" });
  }
});

app.post("/api/admin/clips/intake", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    const clip = normalizeClipSubmission(req.body || {});
    const sourceRow = await getDailyLogForSnapshot(clip.day);
    if (!sourceRow) {
      res.status(404).json({ error: "daily_log_not_found" });
      return;
    }

    const currentLog = toDailyLog(sourceRow);
    const proofAsset = formatClipProofAsset(clip);
    const proofAssets = currentLog.proofAssets.includes(proofAsset)
      ? currentLog.proofAssets
      : [...currentLog.proofAssets, proofAsset];
    const updatedLog = {
      ...currentLog,
      clipsPosted: Number(currentLog.clipsPosted || 0) + clip.count,
      proofAssets,
      bestMoment: currentLog.bestMoment || `First ${clip.platform} clip logged through automation.`,
    };

    if (!validateDailyLog(updatedLog)) {
      res.status(500).json({ error: "generated_daily_log_invalid" });
      return;
    }

    const { error } = await supabaseAdmin
      .from("daily_logs")
      .upsert([toDailyLogRow(updatedLog)], { onConflict: "day" })
      .select("day");
    if (error) throw error;

    res.json({
      ok: true,
      clip,
      updatedLog,
      logs: await getAllDailyLogs(),
    });
  } catch (error) {
    console.error("[admin-clips-intake]", error);
    res.status(error.status || 500).json({ error: error.message || "clip_intake_failed" });
  }
});

app.post("/api/admin/followers/intake", requireAdmin, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  try {
    const update = normalizeFollowerCountSubmission(req.body || {});
    const sourceRow = await getDailyLogForSnapshot(update.day);
    if (!sourceRow) {
      res.status(404).json({ error: "daily_log_not_found" });
      return;
    }

    const currentLog = toDailyLog(sourceRow);
    const proofAsset = formatFollowerCountProofAsset(update);
    const proofAssets =
      update.addProof && !currentLog.proofAssets.includes(proofAsset)
        ? [...currentLog.proofAssets, proofAsset]
        : currentLog.proofAssets;
    const updatedLog = {
      ...currentLog,
      followers: {
        ...(currentLog.followers || {}),
        [update.platform]: update.count,
      },
      proofAssets,
      bestMoment: currentLog.bestMoment || `${update.platform} follower count started updating through automation.`,
    };

    if (!validateDailyLog(updatedLog)) {
      res.status(500).json({ error: "generated_daily_log_invalid" });
      return;
    }

    const { error } = await supabaseAdmin
      .from("daily_logs")
      .upsert([toDailyLogRow(updatedLog)], { onConflict: "day" })
      .select("day");
    if (error) throw error;

    res.json({
      ok: true,
      update,
      updatedLog,
      liveFollowers: await buildLiveFollowerTicker(),
      logs: await getAllDailyLogs(),
    });
  } catch (error) {
    console.error("[admin-followers-intake]", error);
    res.status(error.status || 500).json({ error: error.message || "followers_intake_failed" });
  }
});

app.get("/api/admin/system/status", requireAdmin, (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : stripeKey.startsWith("sk_test_") ? "test" : "unknown";
  const adminEmails = getAdminAllowedEmails();

  res.json({
    ok: true,
    status: {
      siteUrl,
      supabase: Boolean(supabaseAdmin),
      stripe: Boolean(stripe),
      stripeMode,
      resend: Boolean(resend),
      adminLogin: Boolean(adminEmails.length),
      renderCommit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || null,
      nodeEnv: process.env.NODE_ENV || "development",
      checkedAt: new Date().toISOString(),
    },
  });
});

app.get("/api/admin/session", requireAdminSession, (req, res) => {
  res.json({
    ok: true,
    admin: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

app.post("/api/subscribe", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim();
  const source = String(req.body?.source || "start").trim().slice(0, 80) || "start";

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "valid_email_required" });
    return;
  }

  if (supabaseAdmin) {
    try {
      await supabaseAdmin
        .from("subscribers")
        .upsert(
          {
            email,
            first_name: name || null,
            source,
            last_seen_at: new Date().toISOString(),
            unsubscribed_at: null,
            metadata: {
              user_agent: req.get("user-agent") || null,
              referer: req.get("referer") || null,
            },
          },
          { onConflict: "email" },
        )
        .throwOnError();
    } catch (error) {
      console.error("[subscribe-db]", error);
      res.status(500).json({ error: "subscriber_capture_failed" });
      return;
    }
  }

  if (resend && (process.env.RESEND_SEGMENT_ID || process.env.RESEND_AUDIENCE_ID)) {
    try {
      const contactPayload = {
        email,
        firstName: name || undefined,
        unsubscribed: false,
      };

      if (process.env.RESEND_SEGMENT_ID) {
        contactPayload.segments = [{ id: process.env.RESEND_SEGMENT_ID }];
      } else {
        contactPayload.audienceId = process.env.RESEND_AUDIENCE_ID;
      }

      await resend.contacts.create(contactPayload);
    } catch (error) {
      if (!String(error?.message || "").toLowerCase().includes("already")) {
        throw error;
      }
    }
  }

  if (resend && shouldSendEmail(email)) {
    const welcomeEmail = buildWelcomeEmail();
    await resend.emails.send({
      from: process.env.RESEND_FROM || defaultEmailFrom,
      to: email,
      subject: welcomeEmail.subject,
      text: welcomeEmail.text,
      html: welcomeEmail.html,
    });
  }

  res.json({ ok: true });
});

app.get("/api/me", requireUser, async (req, res) => {
  try {
    res.json(await getMemberAccess(req.user));
  } catch (error) {
    console.error("[me]", error);
    res.status(500).json({ error: "profile_lookup_failed" });
  }
});

app.get("/api/member-progress/future-proof-method", requireUser, async (req, res) => {
  try {
    if (!(await hasActiveEntitlement(req.user.id))) {
      res.status(403).json({ error: "entitlement_required" });
      return;
    }

    res.json({
      ok: true,
      progress: await getMemberTaskProgress(req.user.id),
    });
  } catch (error) {
    console.error("[member-progress]", error);
    res.status(500).json({ error: "member_progress_lookup_failed" });
  }
});

app.put("/api/member-progress/future-proof-method", requireUser, async (req, res) => {
  try {
    if (!(await hasActiveEntitlement(req.user.id))) {
      res.status(403).json({ error: "entitlement_required" });
      return;
    }

    const moduleKey = String(req.body?.moduleKey || "").trim();
    const taskKey = String(req.body?.taskKey || "").trim();
    const completed = req.body?.completed === true;
    const task = findProductTask(moduleKey, taskKey);

    if (!task) {
      res.status(400).json({ error: "valid_module_task_required" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("member_task_progress")
      .upsert(
        {
          user_id: req.user.id,
          product_key: productKey,
          module_key: moduleKey,
          task_key: taskKey,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,product_key,module_key,task_key" },
      )
      .select("module_key,task_key,completed,completed_at,updated_at")
      .single();

    if (error) throw error;

    res.json({
      ok: true,
      item: toTaskProgress(data),
      progress: await getMemberTaskProgress(req.user.id),
    });
  } catch (error) {
    console.error("[member-progress-update]", error);
    res.status(500).json({ error: "member_progress_update_failed" });
  }
});

app.post("/api/checkout/future-proof-method", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    const session = await createCheckoutSessionForProduct({
      req,
      productConfig: checkoutProducts.get(productKey),
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("[checkout]", error);
    res.status(500).json({ error: "checkout_create_failed" });
  }
});

app.post("/api/checkout/live-builds", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    const session = await createCheckoutSessionForProduct({
      req,
      productConfig: checkoutProducts.get(operatorBundleProduct.key),
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("[live-builds-checkout]", error);
    res.status(500).json({ error: "live_builds_checkout_create_failed" });
  }
});

app.post("/api/checkout/operator-toolkit", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    const session = await createOperatorToolkitCheckoutSession(req);
    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("[operator-toolkit-checkout]", error);
    res.status(500).json({ error: "operator_toolkit_checkout_create_failed" });
  }
});

app.post("/api/checkout/operator-updates", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    if (!(await hasActiveProductEntitlement(req.user.id, operatorToolkitProduct.key))) {
      res.status(403).json({ error: "operator_toolkit_required" });
      return;
    }
    if (await hasActiveProductEntitlement(req.user.id, operatorUpdatesProduct.key)) {
      res.status(409).json({ error: "operator_updates_already_active" });
      return;
    }

    const session = await createOperatorUpdatesCheckoutSession(req);
    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("[operator-updates-checkout]", error);
    res.status(500).json({ error: "operator_updates_checkout_create_failed" });
  }
});

app.post("/api/billing/portal", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    const profile = await ensureProfile(req.user);
    if (!profile?.stripe_customer_id) {
      res.status(409).json({ error: "stripe_customer_missing" });
      return;
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/members`,
      ...(process.env.STRIPE_PORTAL_CONFIGURATION_ID
        ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID }
        : {}),
    });
    res.json({ url: portalSession.url });
  } catch (error) {
    console.error("[billing-portal]", error);
    res.status(500).json({ error: "billing_portal_create_failed" });
  }
});

app.post("/api/checkout/test-purchase", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    const profile = await ensureProfile(req.user);
    const customerTarget = profile.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: profile.email };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...customerTarget,
      client_reference_id: req.user.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 200,
            product_data: {
              name: "AI with Murda Live Test Purchase",
              description: "Confirms Backbone Stripe checkout, webhook delivery, and member portal access.",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/members?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/admin?checkout=test-cancel`,
      metadata: {
        product_key: productKey,
        supabase_user_id: req.user.id,
        checkout_kind: "live_test_purchase",
      },
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("[test-checkout]", error);
    res.status(500).json({ error: "test_checkout_create_failed" });
  }
});

app.get("/api/access/session/:sessionId", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const sessionUserId = session.metadata?.supabase_user_id;
    const productConfig = checkoutProducts.get(session.metadata?.product_key);

    if (!productConfig) {
      res.status(403).json({ error: "checkout_product_mismatch" });
      return;
    }

    if (sessionUserId !== req.user.id) {
      res.status(403).json({ error: "checkout_user_mismatch" });
      return;
    }

    if (session.payment_status !== "paid") {
      res.status(409).json({
        error: "checkout_not_paid",
        checkout_status: session.status,
        payment_status: session.payment_status,
      });
      return;
    }

    const entitlement =
      productConfig.key === operatorToolkitProduct.key
        ? await grantOperatorToolkitAccess({
            userId: req.user.id,
            email: req.user.email,
            session,
          })
        : productConfig.key === operatorUpdatesProduct.key
          ? await grantOperatorUpdateOnlyAccess({
              userId: req.user.id,
              email: req.user.email,
              session,
            })
        : await grantEntitlement({
            userId: req.user.id,
            email: req.user.email,
            session,
            productConfig,
          });

    res.json({
      ok: true,
      product_key: productConfig.key,
      checkout_status: session.status,
      payment_status: session.payment_status,
      entitlement,
      access: await getMemberAccess(req.user),
    });
  } catch (error) {
    console.error("[access-session]", error);
    res.status(500).json({ error: "access_verification_failed" });
  }
});

app.get("/api/member-assets/future-proof-method/:assetKey", requireUser, async (req, res) => {
  try {
    const asset = memberAssets.find((item) => item.key === req.params.assetKey);
    if (!asset) {
      res.status(404).json({ error: "asset_not_found" });
      return;
    }

    if (!(await hasActiveEntitlement(req.user.id))) {
      res.status(403).json({ error: "entitlement_required" });
      return;
    }

    const filePath = path.join(assetDir, asset.fileName);
    const file = await fs.readFile(filePath);
    res.setHeader("Content-Type", asset.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${asset.downloadName}"`);
    res.send(file);
  } catch (error) {
    console.error("[member-asset]", error);
    res.status(500).json({ error: "asset_download_failed" });
  }
});

app.get("/api/member-assets/new-wave-live-builds/:assetKey", requireUser, async (req, res) => {
  try {
    const asset = operatorBundleAssets.find((item) => item.key === req.params.assetKey);
    if (!asset) {
      res.status(404).json({ error: "asset_not_found" });
      return;
    }

    const [bundleAccess, toolkitAccess] = await Promise.all([
      hasActiveProductEntitlement(req.user.id, operatorBundleProduct.key),
      hasActiveProductEntitlement(req.user.id, operatorToolkitProduct.key),
    ]);
    if (!bundleAccess && !toolkitAccess) {
      res.status(403).json({ error: "entitlement_required" });
      return;
    }

    const filePath = path.join(assetDir, asset.fileName);
    const file = await fs.readFile(filePath);
    res.setHeader("Content-Type", asset.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${asset.downloadName}"`);
    res.send(file);
  } catch (error) {
    console.error("[live-build-member-asset]", error);
    res.status(500).json({ error: "asset_download_failed" });
  }
});

app.get("/api/member-assets/operator-toolkit/:assetKey", requireUser, async (req, res) => {
  try {
    const asset = operatorToolkitAssets.find((item) => item.key === req.params.assetKey);
    if (!asset) {
      res.status(404).json({ error: "asset_not_found" });
      return;
    }

    if (!(await hasActiveProductEntitlement(req.user.id, operatorToolkitProduct.key))) {
      res.status(403).json({ error: "entitlement_required" });
      return;
    }

    const filePath = path.join(assetDir, asset.fileName);
    const file = await fs.readFile(filePath);
    res.setHeader("Content-Type", asset.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${asset.downloadName}"`);
    res.send(file);
  } catch (error) {
    console.error("[operator-toolkit-member-asset]", error);
    res.status(500).json({ error: "asset_download_failed" });
  }
});

app.get("/api/member-assets/operator-updates/:assetKey", requireUser, async (req, res) => {
  try {
    const asset = operatorUpdateAssets.find((item) => item.key === req.params.assetKey);
    if (!asset) {
      res.status(404).json({ error: "asset_not_found" });
      return;
    }

    if (!(await hasActiveProductEntitlement(req.user.id, operatorUpdatesProduct.key))) {
      res.status(403).json({ error: "active_subscription_required" });
      return;
    }

    const filePath = path.join(assetDir, asset.fileName);
    const file = await fs.readFile(filePath);
    res.setHeader("Content-Type", asset.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${asset.downloadName}"`);
    res.send(file);
  } catch (error) {
    console.error("[operator-update-member-asset]", error);
    res.status(500).json({ error: "asset_download_failed" });
  }
});

app.use(express.static(distDir));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const server = app.listen(port, host);
server.on("listening", () => {
  console.log(`AI with Murda server listening on ${host}:${port}`);
  ensureFollowerRefreshLoop();
  refreshDueSocialMetrics().catch((error) => console.error("[social-startup-refresh]", error.message));
});
server.on("error", (error) => {
  console.error("[server-listen]", error);
  process.exitCode = 1;
});
