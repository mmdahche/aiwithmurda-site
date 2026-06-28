import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const assetDir = path.join(rootDir, "server", "member-assets");

const app = express();
const siteUrl = process.env.SITE_URL || "http://127.0.0.1:5173";
const productKey = "future_proof_method";
const productName = "The Future Proof Method";
const productSubtitle = "New Wave Operator Kit";
const productPriceCents = 4700;
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
      assets: memberAssets.map(publicAsset),
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
          await resend.emails.send({
            from: process.env.RESEND_FROM || "AI with Murda <murad@aiwithmurda.com>",
            to: session.customer_details.email,
            subject: "Your Future Proof Method access is ready",
            html: `<p>Your member profile is unlocked.</p><p><a href="${siteUrl}/members">Open the member hub</a></p>`,
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
  if (!logs || logs.some((log) => !validateDailyLog(log))) {
    res.status(400).json({ error: "valid_logs_required" });
    return;
  }

  try {
    const rows = logs.map(toDailyLogRow);
    const { data, error } = await supabaseAdmin
      .from("daily_logs")
      .upsert(rows, { onConflict: "day" })
      .select("*")
      .order("day", { ascending: true });

    if (error) throw error;
    res.json({ ok: true, logs: (data || []).map(toDailyLog) });
  } catch (error) {
    console.error("[admin-daily-logs]", error);
    res.status(500).json({ error: "daily_logs_sync_failed" });
  }
});

app.post("/api/subscribe", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim();

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "valid_email_required" });
    return;
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

  if (resend) {
    await resend.emails.send({
      from: process.env.RESEND_FROM || "AI with Murda <murad@aiwithmurda.com>",
      to: email,
      subject: "You are on the 60-day build log",
      html: `<p>You are in. I will send the daily receipts, scoreboard movement, best clip, and what broke.</p><p><a href="${siteUrl}/60">Open the public dashboard</a></p>`,
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
