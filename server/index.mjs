import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Stripe from "stripe";
import {
  buyerOnboardingEmails,
  productKey,
  productModules,
  productName,
  productPriceCents,
  productSubtitle,
} from "../src/data/product.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const assetDir = path.join(rootDir, "server", "member-assets");

const app = express();
const siteUrl = process.env.SITE_URL || "http://127.0.0.1:5173";
const defaultEmailFrom = "AI with Murda <murad@aiwithmurda.com>";
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
    ],
    commands: [
      { command: "!dashboard", label: "Public scoreboard", href: "/60" },
      { command: "!start", label: "Build log signup", href: "/start" },
      { command: "!kit", label: "Founding product", href: "/kit" },
      { command: "!members", label: "Member login", href: "/members" },
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
  if (!requireConfigured(res, supabaseAdmin, "supabase")) return;

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "missing_bearer_token" });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "invalid_session" });
    return;
  }

  req.user = data.user;
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
    lesson: module.lesson,
    todos: module.todos.map((todo) => ({ key: todo.key, label: todo.label })),
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
    },
  };
}

async function hasActiveEntitlement(userId) {
  const { data, error } = await supabaseAdmin
    .from("entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("product_key", productKey)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
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

function buildAccessEmail() {
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

async function getOfferOpsSummary() {
  const [
    { data: entitlements, count: activeMembers, error: entitlementError },
    { data: purchases, count: paidPurchases, error: purchasesError },
    { data: progressRows, error: progressError },
  ] = await Promise.all([
    supabaseAdmin
      .from("entitlements")
      .select("user_id,status,granted_at", { count: "exact" })
      .eq("product_key", productKey)
      .eq("status", "active")
      .order("granted_at", { ascending: false })
      .limit(8),
    supabaseAdmin
      .from("purchases")
      .select("user_id,amount_total,currency,status,purchased_at", { count: "exact" })
      .eq("product_key", productKey)
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
    const existing = purchasesByUserId.get(purchase.user_id);
    if (!existing || new Date(purchase.purchased_at).getTime() > new Date(existing.purchased_at).getTime()) {
      purchasesByUserId.set(purchase.user_id, purchase);
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
  const members = (entitlements || []).map((entitlement) => {
    const profile = profilesById.get(entitlement.user_id);
    const purchase = purchasesByUserId.get(entitlement.user_id);
    const userProgressRows = progressByUserId.get(entitlement.user_id) || [];
    const completedTaskKeys = new Set(userProgressRows.map((row) => `${row.module_key}:${row.task_key}`));
    const currentModule =
      completedTaskKeys.size >= productTaskTotal
        ? null
        : productModules.find((module) => module.todos.some((todo) => !completedTaskKeys.has(`${module.key}:${todo.key}`)));
    const lastProgressAt = userProgressRows
      .map((row) => row.completed_at || row.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1);

    return {
      userId: entitlement.user_id,
      email: profile?.email || "unknown",
      fullName: profile?.full_name || null,
      status: entitlement.status,
      grantedAt: entitlement.granted_at,
      purchasedAt: purchase?.purchased_at || null,
      amountTotal: Number(purchase?.amount_total || 0),
      currency: purchase?.currency || "usd",
      completedTasks: completedTaskKeys.size,
      totalTasks: productTaskTotal,
      progressPercent: productTaskTotal ? Math.round((completedTaskKeys.size / productTaskTotal) * 100) : 0,
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
    sales: {
      activeMembers: Number(activeMembers || 0),
      paidPurchases: Number(paidPurchases || 0),
      revenueCents,
      currency: purchases?.[0]?.currency || "usd",
    },
    progress: {
      usersStarted: progressUsers.size,
      completedTasks: completedKeys.size,
      totalPossibleTasks: Number(activeMembers || 0) * productTaskTotal,
      moduleSummaries,
    },
    members,
    checkedAt: new Date().toISOString(),
  };
}

async function grantEntitlement({ userId, email, session }) {
  if (!supabaseAdmin || !userId || !session?.id) return null;

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const amountTotal = Number(session.amount_total || productPriceCents);
  const currency = String(session.currency || "usd").toLowerCase();

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
        product_key: productKey,
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
        product_key: productKey,
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
      if (session.metadata?.product_key === productKey && session.payment_status === "paid") {
        await grantEntitlement({
          userId: session.metadata?.supabase_user_id,
          email: session.customer_details?.email,
          session,
        });

        if (resend && session.customer_details?.email) {
          const accessEmail = buildAccessEmail();
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

app.get("/api/admin/system/status", requireAdmin, (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : stripeKey.startsWith("sk_test_") ? "test" : "unknown";

  res.json({
    ok: true,
    status: {
      siteUrl,
      supabase: Boolean(supabaseAdmin),
      stripe: Boolean(stripe),
      stripeMode,
      resend: Boolean(resend),
      renderCommit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || null,
      nodeEnv: process.env.NODE_ENV || "development",
      checkedAt: new Date().toISOString(),
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
    const profile = await ensureProfile(req.user);
    const customerTarget = profile.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: profile.email };
    const lineItem = process.env.STRIPE_FUTURE_METHOD_PRICE_ID
      ? { price: process.env.STRIPE_FUTURE_METHOD_PRICE_ID, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            unit_amount: productPriceCents,
            product_data: {
              name: productName,
              description: productSubtitle,
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...customerTarget,
      allow_promotion_codes: true,
      client_reference_id: req.user.id,
      line_items: [lineItem],
      success_url: `${siteUrl}/members?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/kit?checkout=cancel`,
      metadata: {
        product_key: productKey,
        supabase_user_id: req.user.id,
      },
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("[checkout]", error);
    res.status(500).json({ error: "checkout_create_failed" });
  }
});

app.get("/api/access/session/:sessionId", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const sessionUserId = session.metadata?.supabase_user_id;

    if (session.metadata?.product_key !== productKey) {
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
    });

    res.json({
      ok: true,
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

app.use(express.static(distDir));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`AI with Murda server listening on ${port}`);
});
