import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const app = express();
const siteUrl = process.env.SITE_URL || "http://127.0.0.1:5173";
const productKey = "future_proof_method";
const productName = "The Future Proof Method";
const productSubtitle = "New Wave Operator Kit";
const productPriceCents = 4700;

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
    const profile = await ensureProfile(req.user);
    const [{ data: entitlements }, { data: purchases }] = await Promise.all([
      supabaseAdmin
        .from("entitlements")
        .select("product_key,status,granted_at")
        .eq("user_id", req.user.id)
        .eq("status", "active"),
      supabaseAdmin
        .from("purchases")
        .select("product_key,status,amount_total,currency,purchased_at")
        .eq("user_id", req.user.id)
        .order("purchased_at", { ascending: false }),
    ]);

    res.json({
      profile,
      entitlements: entitlements || [],
      purchases: purchases || [],
      product: {
        key: productKey,
        name: productName,
        subtitle: productSubtitle,
        price_cents: productPriceCents,
      },
    });
  } catch (error) {
    console.error("[me]", error);
    res.status(500).json({ error: "profile_lookup_failed" });
  }
});

app.post("/api/checkout/future-proof-method", requireUser, async (req, res) => {
  if (!requireConfigured(res, stripe, "stripe")) return;

  try {
    const profile = await ensureProfile(req.user);
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
      customer_email: profile.email,
      allow_promotion_codes: true,
      line_items: [lineItem],
      success_url: `${siteUrl}/members?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/kit?checkout=cancel`,
      metadata: {
        product_key: productKey,
        supabase_user_id: req.user.id,
      },
    });

    res.json({ url: session.url });
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

    if (session.metadata?.product_key !== productKey || session.payment_status !== "paid") {
      res.status(403).json({ error: "checkout_not_paid" });
      return;
    }

    if (sessionUserId !== req.user.id) {
      res.status(403).json({ error: "checkout_user_mismatch" });
      return;
    }

    const entitlement = await grantEntitlement({
      userId: req.user.id,
      email: req.user.email,
      session,
    });

    res.json({ ok: true, entitlement });
  } catch (error) {
    console.error("[access-session]", error);
    res.status(500).json({ error: "access_verification_failed" });
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
