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
import { liveBuildAccessPlan, liveBuildMemberAssets, liveBuildsProduct } from "../src/data/liveBuilds.js";

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
const streamLinkKeys = [
  ["twitch", "Twitch", "STREAM_TWITCH_URL"],
  ["kick", "Kick", "STREAM_KICK_URL"],
  ["youtube", "YouTube", "STREAM_YOUTUBE_URL"],
];
const memberAssets = [
  {
    key: "quickstart",
    title: "Quickstart Map",
    kind: "Setup",
    description: "The first 60 minutes: folders, accounts, tracker, prompt capture, and proof habits.",
    fileName: "future-proof-method-quickstart.md",
    downloadName: "future-proof-method-quickstart.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "daily-operator-checklist",
    title: "Daily Operator Checklist",
    kind: "Workflow",
    description: "A repeatable morning, live-build, clip, recap, and shutdown checklist.",
    fileName: "daily-operator-checklist.md",
    downloadName: "daily-operator-checklist.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "launch-day-runbook",
    title: "Launch Day Runbook",
    kind: "Launch",
    description: "Day 0 and Day 1 checklist for baseline cutover, OBS, commands, receipts, and shutdown.",
    fileName: "launch-day-runbook.md",
    downloadName: "future-proof-method-launch-day-runbook.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "launch-copy-pack",
    title: "Launch Copy Pack",
    kind: "Copy",
    description: "Pinned chat commands, stream scripts, kit CTAs, recap captions, email copy, and buyer follow-up language.",
    fileName: "launch-copy-pack.md",
    downloadName: "future-proof-method-launch-copy-pack.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "day-0-7-stream-run-sheet",
    title: "Day 0-7 Stream Run Sheet",
    kind: "Content",
    description: "First-week show loop, daily proof targets, clip hooks, CTAs, and shutdown checklist.",
    fileName: "day-0-7-stream-run-sheet.md",
    downloadName: "future-proof-method-day-0-7-stream-run-sheet.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "prompt-workflows",
    title: "Prompt Workflow Pack",
    kind: "Prompts",
    description: "Prompts for finding business problems, mapping workflows, building offers, and QA.",
    fileName: "prompt-workflows.md",
    downloadName: "prompt-workflows.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "proof-receipts-template",
    title: "Proof Receipts Template",
    kind: "Proof",
    description: "Daily receipt format for before/after proof, failures, lessons, and Day 60 recap slides.",
    fileName: "proof-receipts-template.md",
    downloadName: "proof-receipts-template.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "module-roadmap",
    title: "Module Roadmap",
    kind: "Modules",
    description: "Five-module path with to-do lists, done criteria, and proof outputs for the $47 kit.",
    fileName: "module-roadmap.md",
    downloadName: "future-proof-method-module-roadmap.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "module-field-guide",
    title: "Module Field Guide",
    kind: "Lessons",
    description: "Module-by-module worksheets with operating questions, prompts, proof receipts, and exit criteria.",
    fileName: "module-field-guide.md",
    downloadName: "future-proof-method-module-field-guide.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "premium-course-workbook",
    title: "Premium Course Workbook",
    kind: "Lessons",
    description: "Full five-module course body with frameworks, teaching notes, workshops, examples, scripts, and quality bars.",
    fileName: "premium-course-workbook.md",
    downloadName: "future-proof-method-premium-course-workbook.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "lesson-scripts",
    title: "Lesson Scripts",
    kind: "Scripts",
    description: "Talking points for stream segments, recorded lessons, buyer onboarding videos, and workshop sessions.",
    fileName: "lesson-scripts.md",
    downloadName: "future-proof-method-lesson-scripts.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "course-completion-kit",
    title: "Course Completion Kit",
    kind: "Capstone",
    description:
      "Final proof sprint, completion criteria, certificate language, and Day 60 receipt prompts.",
    fileName: "course-completion-kit.md",
    downloadName: "future-proof-method-course-completion-kit.md",
    mimeType: "text/markdown; charset=utf-8",
  },
  {
    key: "proof-to-offer-canvas",
    title: "Proof To Offer Canvas",
    kind: "Offer",
    description: "Worksheet for turning one build receipt into a clear buyer, promise, CTA, objection bank, and follow-up list.",
    fileName: "proof-to-offer-canvas.md",
    downloadName: "future-proof-method-proof-to-offer-canvas.md",
    mimeType: "text/markdown; charset=utf-8",
  },
];

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
      key: liveBuildsProduct.key,
      name: liveBuildsProduct.name,
      subtitle: liveBuildsProduct.subtitle,
      priceCents: liveBuildsProduct.priceCents,
      priceEnvKey: "STRIPE_LIVE_BUILDS_PRICE_ID",
      successPath: "/live-builds",
      cancelPath: "/live-builds",
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
        name: "New Wave Live Builds",
        href: "/live-builds",
        status: "Founding waitlist",
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
      { command: "!builds", label: "New Wave Live Builds", href: "/live-builds" },
      { command: "!members", label: "Member login", href: "/members" },
      { command: "!runbook", label: "Launch runbook", href: "/members" },
    ],
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

  const items = (data || []).map(toTaskProgress);
  return { items, summary: summarizeTaskProgress(items) };
}

async function getMemberAccess(user) {
  const profile = await ensureProfile(user);
  const [{ data: entitlements, error: entitlementsError }, { data: purchases, error: purchasesError }] =
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
    ]);

  if (entitlementsError) throw entitlementsError;
  if (purchasesError) throw purchasesError;

  return {
    profile,
    entitlements: entitlements || [],
    purchases: purchases || [],
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
    liveBuilds: {
      key: liveBuildsProduct.key,
      name: liveBuildsProduct.name,
      subtitle: liveBuildsProduct.subtitle,
      status: liveBuildsProduct.status,
      price_cents: liveBuildsProduct.priceCents,
      accessPlan: liveBuildAccessPlan,
      assets: liveBuildMemberAssets.map(publicAsset),
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
  return hasActiveProductEntitlement(userId, productKey);
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
        source: "Twitch EventSub first; TikTok/Instagram likely polling",
        status: "connector-needed",
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

function getEnvNumber(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== "") return Number(value || 0);
  }
  return null;
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

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signTwitchOAuthState() {
  const config = getTwitchConfig();
  if (!config.stateSecret) {
    const error = new Error("twitch_oauth_state_secret_missing");
    error.status = 503;
    throw error;
  }

  const payload = Buffer.from(
    JSON.stringify({
      provider: twitchProviderKey,
      createdAt: Date.now(),
      nonce: crypto.randomUUID(),
    }),
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", config.stateSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyTwitchOAuthState(state) {
  const config = getTwitchConfig();
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature || !config.stateSecret) {
    const error = new Error("invalid_twitch_oauth_state");
    error.status = 400;
    throw error;
  }

  const expected = crypto.createHmac("sha256", config.stateSecret).update(payload).digest("base64url");
  if (!timingSafeEqualString(signature, expected)) {
    const error = new Error("invalid_twitch_oauth_state");
    error.status = 400;
    throw error;
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const ageMs = Date.now() - Number(decoded.createdAt || 0);
  if (decoded.provider !== twitchProviderKey || ageMs < 0 || ageMs > 10 * 60 * 1000) {
    const error = new Error("expired_twitch_oauth_state");
    error.status = 400;
    throw error;
  }

  return decoded;
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

  return { token: data || null, missingTable: false };
}

async function storeIntegrationToken(provider, values) {
  if (!supabaseAdmin) {
    const error = new Error("supabase_not_configured");
    error.status = 503;
    throw error;
  }

  const { data, error } = await supabaseAdmin
    .from("integration_tokens")
    .upsert({ provider, ...values }, { onConflict: "provider" })
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

  return data;
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
  const sourceRow = await getDailyLogForSnapshot();
  if (!sourceRow) return { applied: false, reason: "daily_log_not_found" };

  const currentLog = toDailyLog(sourceRow);
  const nextFollowers = {
    ...(currentLog.followers || {}),
    twitch: Number(currentLog.followers?.twitch || 0) + 1,
  };
  const followerName = event.user_name || event.user_login || "new Twitch follower";
  const updatedLog = {
    ...currentLog,
    followers: nextFollowers,
    bestMoment: currentLog.bestMoment || `Twitch follow logged from ${followerName}.`,
  };

  if (!validateDailyLog(updatedLog)) {
    const error = new Error("generated_daily_log_invalid");
    error.status = 500;
    throw error;
  }

  const { error } = await supabaseAdmin
    .from("daily_logs")
    .upsert([toDailyLogRow(updatedLog)], { onConflict: "day" })
    .select("day");
  if (error) throw error;

  await updateStoredIntegrationMetadata(twitchProviderKey, (metadata) => ({
    ...metadata,
    lastFollowEvent: {
      userId: event.user_id || null,
      userLogin: event.user_login || null,
      userName: event.user_name || null,
      followedAt: event.followed_at || new Date().toISOString(),
      appliedAt: new Date().toISOString(),
      day: updatedLog.day,
      twitchFollowers: nextFollowers.twitch,
    },
  }));

  return { applied: true, updatedLog };
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

async function fetchTwitchFollowerCount() {
  const config = getTwitchConfig();
  const { token } = await getUsableTwitchToken();
  const clientId = config.clientId;
  const accessToken = token?.access_token || readPublicUrlEnv("TWITCH_ACCESS_TOKEN");
  const broadcasterId =
    token?.broadcaster_user_id || token?.provider_user_id || readPublicUrlEnv("TWITCH_BROADCASTER_ID");
  if (!clientId || !accessToken || !broadcasterId) return null;

  const response = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": clientId,
      },
    },
  );
  if (!response.ok) throw new Error(`twitch_followers_${response.status}`);
  const data = await response.json();
  return Number(data.total || 0);
}

async function fetchTikTokFollowerCount() {
  const accessToken = readPublicUrlEnv("TIKTOK_ACCESS_TOKEN");
  if (!accessToken) return null;

  const response = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,username", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`tiktok_followers_${response.status}`);
  const data = await response.json();
  return Number(data?.data?.user?.follower_count || 0);
}

async function getFollowerConnectorCount(source) {
  if (source.key === "twitch") return fetchTwitchFollowerCount();
  if (source.key === "tiktok") return fetchTikTokFollowerCount();
  return null;
}

async function buildLiveFollowerTicker() {
  let twitchStoredToken = null;
  try {
    twitchStoredToken = (await getUsableTwitchToken()).token;
  } catch (error) {
    console.error("[twitch-token-fallback]", error.message);
  }
  const twitchEnvReady = Boolean(
    process.env.TWITCH_CLIENT_ID && process.env.TWITCH_ACCESS_TOKEN && process.env.TWITCH_BROADCASTER_ID,
  );
  const twitchStoredReady = Boolean(
    getTwitchConfig().clientId &&
      twitchStoredToken?.access_token &&
      (twitchStoredToken.broadcaster_user_id || twitchStoredToken.provider_user_id),
  );
  const { data, error } = await supabaseAdmin
    .from("daily_logs")
    .select("day,followers,updated_at")
    .order("day", { ascending: false })
    .limit(1);
  if (error) throw error;

  const latestLog = data?.[0] || null;
  const fallbackFollowers = latestLog?.followers || {};
  const sources = [
    {
      key: "twitch",
      label: "Twitch",
      platformMetric: "followers",
      mode: "EventSub + Helix reconciliation",
      cadence: "instant after OAuth; API fallback on refresh",
      configured: twitchEnvReady || twitchStoredReady,
      eventDriven: true,
    },
    {
      key: "tiktok",
      label: "TikTok",
      platformMetric: "followers",
      mode: "Display API polling",
      cadence: "polling after app approval",
      configured: Boolean(process.env.TIKTOK_ACCESS_TOKEN),
      eventDriven: false,
    },
    {
      key: "instagram",
      label: "Instagram",
      platformMetric: "followers",
      mode: "Meta Graph API polling",
      cadence: "polling after Meta app approval",
      configured: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID),
      eventDriven: false,
    },
    {
      key: "youtube",
      label: "YouTube",
      platformMetric: "subscribers",
      mode: "YouTube Data API polling",
      cadence: "polling after live access opens",
      configured: Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
      eventDriven: false,
    },
  ];

  const resolvedSources = await Promise.all(
    sources.map(async (source) => {
      const manualEnvCount = getEnvNumber(
        `FOLLOWER_${source.key.toUpperCase()}_COUNT`,
        `${source.key.toUpperCase()}_FOLLOWER_COUNT`,
      );
      const fallbackCount = Number(manualEnvCount ?? fallbackFollowers[source.key] ?? 0);
      let count = fallbackCount;
      let status = source.configured ? "connector-ready" : "daily-log-fallback";
      let detail = source.configured
        ? "Connector credentials are present; live count can replace the daily log fallback."
        : "Using the latest approved daily log until platform access is connected.";

      if (source.configured && ["twitch", "tiktok"].includes(source.key)) {
        try {
          const connectorCount = await getFollowerConnectorCount(source);
          if (Number.isFinite(connectorCount)) {
            count = connectorCount;
            status = "live";
            detail = "Live connector count returned successfully.";
          }
        } catch (error) {
          status = "connector-error";
          detail = `Connector needs attention: ${error.message}`;
        }
      }

      return {
        ...source,
        count,
        status,
        detail,
        lastUpdatedAt: status === "live" ? new Date().toISOString() : latestLog?.updated_at || null,
      };
    }),
  );

  return {
    ok: true,
    mode: "live-follower-ticker",
    total: resolvedSources.reduce((sum, source) => sum + Number(source.count || 0), 0),
    sources: resolvedSources,
    sourceDay: latestLog?.day || null,
    refreshMs: Number(process.env.FOLLOWER_TICKER_REFRESH_MS || 15000),
    checkedAt: new Date().toISOString(),
  };
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
  if (productConfig?.key === liveBuildsProduct.key) {
    return {
      subject: "Your New Wave Live Builds ticket is confirmed",
      text: [
        "Your founding ticket is confirmed.",
        "",
        `Open the live-build page: ${siteUrl}/live-builds`,
        "What happens next:",
        "- Watch for the room topic, date, and access notes.",
        "- Bring one workflow you want to understand better.",
        "- After the session, use the replay, prompts, proof receipt, and implementation checklist.",
        `Open the public dashboard: ${siteUrl}/60`,
      ].join("\n"),
      html: baseEmailTemplate({
        preheader: "Your New Wave Live Builds ticket is confirmed.",
        title: "Your live-build ticket is confirmed.",
        intro:
          "Your profile now has a New Wave Live Builds founding ticket. This is the paid room where the AI operator loop happens live on a real workflow.",
        bullets: [
          "The room topic, date, and access notes can be assigned from the launch plan.",
          "The session ends with replay access, prompts, a proof receipt, and implementation notes.",
          "Use the $47 kit first if you want the operating system before the live room.",
        ],
        primaryUrl: `${siteUrl}/live-builds`,
        primaryLabel: "Open live-build page",
        footer: `This confirmation was sent by AI with Murda after Stripe confirmed ${liveBuildsProduct.name}.`,
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

  const progressUsers = new Set((progressRows || []).map((row) => row.user_id));
  const completedKeys = new Set((progressRows || []).map((row) => `${row.module_key}:${row.task_key}:${row.user_id}`));
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
  for (const row of progressRows || []) {
    const current = progressByUserId.get(row.user_id) || [];
    current.push(row);
    progressByUserId.set(row.user_id, current);
  }
  const moduleSummaries = productModules.map((module) => {
    const moduleRows = (progressRows || []).filter((row) => row.module_key === module.key);
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
      assets: productConfig.key === liveBuildsProduct.key ? liveBuildMemberAssets.length : memberAssets.length,
      tasks: productConfig.key === productKey ? productTaskTotal : 0,
    };
  });
  const members = (entitlements || []).map((entitlement) => {
    const profile = profilesById.get(entitlement.user_id);
    const purchase = purchasesByUserId.get(`${entitlement.user_id}:${entitlement.product_key}`);
    const userProgressRows = progressByUserId.get(entitlement.user_id) || [];
    const completedTaskKeys = new Set(userProgressRows.map((row) => `${row.module_key}:${row.task_key}`));
    const isFutureMethod = entitlement.product_key === productKey;
    const currentModule = isFutureMethod
      ? completedTaskKeys.size >= productTaskTotal
        ? null
        : productModules.find((module) => module.todos.some((todo) => !completedTaskKeys.has(`${module.key}:${todo.key}`)))
      : {
          key: "new-wave-room-001",
          title: "Live-build ticket active",
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
      completedTasks: isFutureMethod ? completedTaskKeys.size : 0,
      totalTasks: isFutureMethod ? productTaskTotal : 0,
      progressPercent: isFutureMethod && productTaskTotal ? Math.round((completedTaskKeys.size / productTaskTotal) * 100) : 0,
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

function automationStatus({ configured, live = false, pendingLabel = "Waiting" }) {
  if (live) return "live";
  return configured ? "configured" : pendingLabel;
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
  ]);

  for (const result of [latestSubscribers, latestPurchases, latestEntitlements, latestLogs]) {
    if (result.error) throw result.error;
  }

  const latestLog = latestLogs.data?.[0] || null;
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
    {
      key: "twitch-followers",
      label: "Twitch followers",
      status: automationStatus({
        configured: Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET),
        pendingLabel: "needs-oauth",
      }),
      mode: "EventSub + API reconciliation",
      metric: "Not connected",
      detail: "Real-time follow events after Twitch app OAuth is connected.",
      next: "Create Twitch app, authorize channel, then subscribe to channel.follow.",
    },
    {
      key: "youtube-subscribers",
      label: "YouTube subscribers",
      status: automationStatus({
        configured: Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
        pendingLabel: "waiting-access",
      }),
      mode: "YouTube Data API polling",
      metric: "Pending",
      detail: "Live access unlocks about 24 hours after YouTube approval request.",
      next: "After access opens, connect OAuth and poll channel statistics.",
    },
    {
      key: "tiktok-followers",
      label: "TikTok followers",
      status: automationStatus({
        configured: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
        pendingLabel: "needs-app-review",
      }),
      mode: "TikTok Display API polling",
      metric: "Pending",
      detail: "Follower count is available through user.info.stats after OAuth approval.",
      next: "Create TikTok developer app, request user.info.stats, then poll follower_count.",
    },
    {
      key: "instagram-followers",
      label: "Instagram followers",
      status: automationStatus({
        configured: Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET),
        pendingLabel: "needs-meta-app",
      }),
      mode: "Meta Graph API polling",
      metric: "Pending",
      detail: "Follower total should be reconciled on a schedule; follower-by-follower webhooks are not the safe assumption.",
      next: "Connect a professional Instagram account through a Meta app and poll account insights.",
    },
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
      "Twitch OAuth + EventSub follow listener",
      "TikTok Display API follower_count poller",
      "Instagram Graph API follower-count poller",
      "YouTube OAuth + statistics poller",
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

  const { data: entitlement, error: entitlementError } = await supabaseAdmin
    .from("entitlements")
    .upsert(
      {
        user_id: userId,
        product_key: productConfig.key,
        source_purchase_id: purchase.id,
        status: "active",
        revoked_at: null,
      },
      { onConflict: "user_id,product_key" },
    )
    .select("id,product_key,status,granted_at")
    .single();

  if (entitlementError) throw entitlementError;
  return entitlement;
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
        await grantEntitlement({
          userId: session.metadata?.supabase_user_id,
          email: session.customer_details?.email,
          session,
          productConfig,
        });

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
    res.json(await buildLiveFollowerTicker());
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
  res.flushHeaders?.();

  let closed = false;
  let timer = null;

  async function sendTicker() {
    if (closed) return;
    try {
      const ticker = await buildLiveFollowerTicker();
      res.write(`event: followers\n`);
      res.write(`data: ${JSON.stringify(ticker)}\n\n`);
      const refreshMs = Math.max(5000, Number(ticker.refreshMs || 15000));
      timer = setTimeout(sendTicker, refreshMs);
    } catch (error) {
      res.write(`event: ticker-error\n`);
      res.write(`data: ${JSON.stringify({ error: "followers_stream_tick_failed", message: error.message })}\n\n`);
      timer = setTimeout(sendTicker, 30000);
    }
  }

  req.on("close", () => {
    closed = true;
    if (timer) clearTimeout(timer);
  });

  await sendTicker();
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

app.get(twitchCallbackPath, async (req, res) => {
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  if (req.query.error) {
    res
      .status(400)
      .send(
        renderTwitchCallbackHtml({
          success: false,
          title: "Twitch was not connected",
          message: String(req.query.error_description || req.query.error || "Twitch returned an authorization error."),
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
        title: "Missing Twitch callback data",
        message: "Twitch did not return the code and state needed to finish this connection.",
      }),
    );
    return;
  }

  try {
    verifyTwitchOAuthState(state);
    const token = await exchangeTwitchCode(code);
    const validation = await validateTwitchAccessToken(token.access_token);
    const scopes = normalizeTwitchScopes(token.scope || validation.scopes);
    const missingScope = twitchOAuthScopes.find((scope) => !scopes.includes(scope));
    if (missingScope) {
      const error = new Error(`missing_twitch_scope_${missingScope}`);
      error.status = 400;
      throw error;
    }

    await storeIntegrationToken(twitchProviderKey, {
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      token_type: token.token_type || "bearer",
      scope: scopes,
      expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
      provider_user_id: validation.user_id || null,
      provider_user_login: validation.login || null,
      provider_user_name: validation.login || null,
      broadcaster_user_id: validation.user_id || null,
      metadata: {
        connectedAt: new Date().toISOString(),
        validation,
      },
    });

    res.send(
      renderTwitchCallbackHtml({
        title: "Twitch connected",
        message:
          "The channel authorization is saved server-side. Return to Settings and press Subscribe EventSub to turn on instant follow events.",
      }),
    );
  } catch (error) {
    console.error("[twitch-oauth-callback]", error);
    res.status(error.status || 500).send(
      renderTwitchCallbackHtml({
        success: false,
        title: "Twitch connection failed",
        message: error.message || "The Twitch OAuth callback could not be completed.",
      }),
    );
  }
});

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
      productConfig: checkoutProducts.get(liveBuildsProduct.key),
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("[live-builds-checkout]", error);
    res.status(500).json({ error: "live_builds_checkout_create_failed" });
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

    const entitlement = await grantEntitlement({
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
    const asset = liveBuildMemberAssets.find((item) => item.key === req.params.assetKey);
    if (!asset) {
      res.status(404).json({ error: "asset_not_found" });
      return;
    }

    if (!(await hasActiveProductEntitlement(req.user.id, liveBuildsProduct.key))) {
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

app.use(express.static(distDir));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`AI with Murda server listening on ${port}`);
});
