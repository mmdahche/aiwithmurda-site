import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  Check,
  Download,
  ExternalLink,
  FileCheck2,
  FolderDown,
  House,
  Layers3,
  LogOut,
  Menu,
  PackageCheck,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import {
  buyerOnboardingEmails,
  courseCompletion,
  firstBuildTracks,
  memberOnboardingSteps,
  productKey,
  productModules,
  productName,
  productSubtitle,
  productTaskCount,
} from "./data/product.js";
import {
  operatorBundleAccessPlan,
  operatorBundleCollections,
  operatorBundleDeliverables,
  operatorBundleFaq,
  operatorBundleOutcomes,
  operatorBundlePath,
  operatorBundleProduct,
} from "./data/operatorBundle.js";
import {
  operatorToolkitAccessPlan,
  operatorToolkitCollections,
  operatorToolkitFaq,
  operatorToolkitOutcomes,
  operatorToolkitPath,
  operatorToolkitProduct,
  operatorToolkitReleases,
  operatorUpdatesProduct,
} from "./data/operatorToolkit.js";
import { ReceiptPreview } from "./components/public/ControlRoom.jsx";
import { BroadcastTicker, ExperienceHero } from "./components/public/ExperienceHero.jsx";
import { InteractiveProofline } from "./components/public/Proofline.jsx";
import { CheckoutButton } from "./components/checkout/CheckoutButton.jsx";
import { KitPage } from "./pages/KitPage.jsx";
import { StorePage } from "./pages/StorePage.jsx";
import { seedLogs, sprintConfig } from "./data/seed.js";
import {
  applyDailySnapshot,
  createBillingPortal,
  createOperatorToolkitCheckout,
  createOperatorUpdatesCheckout,
  createOperatorBundleCheckout,
  createTestPurchaseCheckout,
  disconnectSocialAccount,
  downloadOperatorBundleAsset,
  downloadOperatorToolkitAsset,
  downloadOperatorUpdateAsset,
  downloadMemberAsset,
  getDailyLogs,
  getLiveFollowers,
  getMetricsAutomationSummary,
  getMemberProfile,
  getMemberProgress,
  getOfferOpsSummary,
  getSubscriberSummary,
  getStreamConfig,
  getSystemStatus,
  getSocialIntegrationStatus,
  previewDailySnapshot,
  startSocialOAuth,
  submitClipIntake,
  submitFollowerCountIntake,
  subscribeTwitchEventSub,
  syncAllSocialAccounts,
  syncSocialAccount,
  subscribeBuildLog,
  syncDailyLogs,
  updateMemberTaskProgress,
  verifyAdminSession,
  verifyCheckoutSession,
} from "./lib/api.js";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase.js";
import { getCampaignState } from "./lib/campaign.js";
import {
  buildDeckHtml,
  buildDeckSummary,
  buildProgressItems,
  daysRemaining,
  detectSpike,
  downloadFile,
  formatCurrency,
  formatNumber,
  getDayGains,
  getLatestRecord,
  loadLogs,
  percent,
  resetLogs,
  saveLogs,
  toCsv,
  totalFollowers,
  weeklySummaries,
} from "./lib/tracker.js";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "home" },
  { key: "daily-log", label: "Daily Log", icon: "calendar" },
  { key: "overlay", label: "Overlay", icon: "monitor" },
  { key: "deck", label: "Deck", icon: "deck" },
  { key: "settings", label: "Settings", icon: "settings" },
];

const followerOverlayRoutes = new Set(["/overlay/followers", "/obs/followers"]);
const directOverlayRoutes = new Set(["/overlay", "/obs", ...followerOverlayRoutes]);
const completionDraftStorageKey = "aiwithmurda:future-proof-completion:v1";

const numericFields = new Set([
  "emailSubscribers",
  "revenueCollected",
  "revenuePipeline",
  "hoursStreamed",
  "clipsPosted",
  "outreachSent",
  "callsBooked",
  "productsSold",
  "buildsShipped",
  "dailyLessons",
]);

const adminTokenStorageKey = "aiwithmurda:admin-api-token";

function isPrelaunch(config) {
  return getCampaignState(config).isRehearsal;
}

function getPublicDataMode(config) {
  if (!isPrelaunch(config)) {
    return {
      label: "Live sprint",
      title: "Live scoreboard",
      body: "These are the active public numbers for the 60-day AI operator sprint.",
    };
  }

  return {
    label: config.prelaunchLabel || "Prelaunch preview",
    title: "Preview data is showing",
    body:
      config.prelaunchCopy ||
      `The dashboard is wired to production, but these numbers are rehearsal data until ${config.startDate}.`,
  };
}

function createEmptyCompletionDraft() {
  return Object.fromEntries(courseCompletion.finalReceiptSections.map((section) => [section.title, ""]));
}

function getCompletionDraftStorageKey(email) {
  const owner = String(email || "member").trim().toLowerCase() || "member";
  return `${completionDraftStorageKey}:${owner}`;
}

function loadCompletionDraft(email) {
  const emptyDraft = createEmptyCompletionDraft();
  if (typeof window === "undefined") return emptyDraft;

  try {
    const saved = window.localStorage.getItem(getCompletionDraftStorageKey(email));
    if (!saved) return emptyDraft;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return emptyDraft;
    return Object.fromEntries(
      courseCompletion.finalReceiptSections.map((section) => [
        section.title,
        typeof parsed[section.title] === "string" ? parsed[section.title] : "",
      ]),
    );
  } catch {
    return emptyDraft;
  }
}

function escapeCertificateHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const buildLogReceipts = [
  "Scoreboard movement",
  "Best clip of the day",
  "What shipped",
  "What broke",
  "Tomorrow's promise",
];

const startPageProof = [
  {
    title: "The numbers",
    body: "Revenue, followers, email list, clips, calls, shipped builds, and daily lessons.",
  },
  {
    title: "The build notes",
    body: "The prompts, decisions, failures, and fixes behind each AI-assisted build.",
  },
  {
    title: "The drops",
    body: "First look at product releases, live-build sessions, and member asset updates.",
  },
];

const liveRunOfShow = [
  {
    title: "Scoreboard check",
    body: "Open the day with public numbers: revenue, followers, email list, output, and the one metric that needs pressure.",
  },
  {
    title: "Build block",
    body: "Ship one visible thing with Claude Code, Codex, Backbone, or the tool stack that fits the day.",
  },
  {
    title: "Clip pull",
    body: "Turn the strongest moment into a short-form angle before the lesson gets cold.",
  },
  {
    title: "Receipt close",
    body: "Log what shipped, what broke, what changed, and tomorrow's promise.",
  },
];

const firstWeekStreamArc = [
  {
    day: "Day 0",
    title: "System proof",
    proof: "Routes, commands, OBS overlay, and launch smoke pass before the sprint starts.",
    cta: "!start",
  },
  {
    day: "Day 1",
    title: "Baseline receipt",
    proof: "Clean scoreboard baseline, first daily receipt, and first visible setup proof.",
    cta: "!today",
  },
  {
    day: "Day 2",
    title: "Problem pick",
    proof: "One workflow scored by pain, proof speed, viewer clarity, and money path.",
    cta: "!kit",
  },
  {
    day: "Day 3",
    title: "Narrow build",
    proof: "One AI-assisted working slice tested on the real user path.",
    cta: "!scoreboard",
  },
  {
    day: "Day 4",
    title: "Proof package",
    proof: "Before/after receipt, clip hook, and one public asset.",
    cta: "!start",
  },
  {
    day: "Day 5",
    title: "Offer tighten",
    proof: "One stronger CTA, one objection answer, and one follow-up message.",
    cta: "!kit",
  },
  {
    day: "Day 7",
    title: "Weekly verdict",
    proof: "Best proof, biggest jump, biggest miss, offer change, and next weekly bet.",
    cta: "!scoreboard",
  },
];

const firstWeekDailyRunSheets = {
  1: {
    theme: "Baseline receipt",
    goal: "Launch the sprint and publish the first clean baseline receipt.",
    streamBeat: "Open with the family-overseas premise, the 60-day rules, and the scoreboard baseline.",
    proofTarget: "One clean Day 1 dashboard row, first daily receipt page, and first visible setup proof.",
    cta: "!start for daily receipts, then !scoreboard when numbers are on screen.",
    shutdown: [
      "Sync Day 1 to the public dashboard.",
      "Open /day/1 and confirm the receipt reads correctly.",
      "Export the proof deck after the first slide updates.",
    ],
  },
  2: {
    theme: "Problem pick",
    goal: "Pick the first painful workflow that can become proof quickly.",
    streamBeat: "Score candidate workflows live so viewers see why the first build is chosen.",
    proofTarget: "One workflow scored by proof speed, buyer pain, viewer clarity, and money path.",
    cta: "!kit when the workflow connects to the Future Proof Method.",
    shutdown: [
      "Save the scored workflow list.",
      "Write the before-state receipt.",
      "Name tomorrow's smallest build slice.",
    ],
  },
  3: {
    theme: "Narrow build",
    goal: "Ship one visible AI-assisted improvement without expanding scope.",
    streamBeat: "Show the before state, let AI inspect, build one slice, and test the real path.",
    proofTarget: "Working slice, tested user path, and one save point another AI can resume.",
    cta: "!scoreboard after the tested path works.",
    shutdown: [
      "Commit or save the working version.",
      "Capture the before/after proof.",
      "Log the bug or mistake that made the lesson believable.",
    ],
  },
  4: {
    theme: "Proof package",
    goal: "Turn the build into a receipt, clip hook, and one public asset.",
    streamBeat: "Make the stream about packaging the best moment, not pretending the build is the whole job.",
    proofTarget: "Daily receipt, clip hook, recap note, and one public asset.",
    cta: "!today after the receipt is live, then !start for daily receipts.",
    shutdown: [
      "Publish or schedule one asset.",
      "Update shipped items and proof assets.",
      "Export the deck so the daily slide is captured.",
    ],
  },
  5: {
    theme: "Offer tighten",
    goal: "Use the strongest receipt to improve one offer promise or CTA.",
    streamBeat: "Explain how proof changes the pitch, objection, and next ask.",
    proofTarget: "Improved CTA, answered objection, sent follow-up, and logged commercial result.",
    cta: "!kit during offer review and after any buyer objection gets answered.",
    shutdown: [
      "Log revenue, pipeline, replies, or objections.",
      "Save the before/after offer copy.",
      "Pick one warm follow-up for tomorrow.",
    ],
  },
  6: {
    theme: "Distribution day",
    goal: "Push the best proof into clips, posts, email, and follow-up.",
    streamBeat: "Show the receipt becoming distribution assets instead of another hidden note.",
    proofTarget: "One clip, one recap, one email or post, and one follow-up sent.",
    cta: "!start for daily receipts and !kit after the proof-to-offer explanation.",
    shutdown: [
      "Add links to proof assets.",
      "Record what distribution channel moved.",
      "Name the strongest asset for weekly review.",
    ],
  },
  7: {
    theme: "Weekly verdict",
    goal: "Review the first week and choose what gets doubled down.",
    streamBeat: "Run the scoreboard, best proof, biggest miss, best jump, and next weekly bet.",
    proofTarget: "Best proof, biggest jump, biggest miss, offer change, and next-week bet.",
    cta: "!scoreboard for the review, then !kit for the operating system behind it.",
    shutdown: [
      "Export the proof deck.",
      "Log the weekly verdict in tomorrow's promise.",
      "Choose the next week's first build lane.",
    ],
  },
};

const weeklyDailyRunSheetPattern = [
  {
    theme: "Weekly setup",
    goal: "Set the week's bet and clean the operating surface.",
    streamBeat: "Open the week with what changed, what still matters, and the first proof target.",
    proofTarget: "One weekly bet, one baseline row, and one specific proof target.",
    cta: "!scoreboard for the baseline, then !start for receipts.",
  },
  {
    theme: "Problem selection",
    goal: "Choose the next painful workflow or bottleneck.",
    streamBeat: "Score options live and let the audience understand the tradeoff.",
    proofTarget: "One selected workflow with buyer pain, proof speed, and money path.",
    cta: "!kit when the method explains the decision.",
  },
  {
    theme: "Build slice",
    goal: "Ship one narrow working improvement.",
    streamBeat: "Move from before state to tested after state without hiding the stuck point.",
    proofTarget: "Working slice, tested path, and saved handoff or commit.",
    cta: "!today when the receipt exists.",
  },
  {
    theme: "Proof packaging",
    goal: "Turn the work into a daily receipt and public asset.",
    streamBeat: "Package the best moment, failure, and lesson before shutdown.",
    proofTarget: "Daily receipt, clip hook, recap note, and one public asset.",
    cta: "!start for daily receipts.",
  },
  {
    theme: "Offer move",
    goal: "Connect the strongest proof to a clearer offer or follow-up.",
    streamBeat: "Show how the receipt changes the pitch or objection answer.",
    proofTarget: "Improved CTA, answered objection, and one commercial result logged.",
    cta: "!kit after the offer loop is clear.",
  },
  {
    theme: "Distribution push",
    goal: "Send the best proof into clips, posts, email, and outreach.",
    streamBeat: "Turn proof into distribution while tracking what actually moves.",
    proofTarget: "At least one asset published or scheduled and one follow-up sent.",
    cta: "!today for the receipt and !scoreboard for movement.",
  },
  {
    theme: "Weekly verdict",
    goal: "Review the scoreboard and decide what gets doubled down.",
    streamBeat: "Run best proof, biggest jump, biggest miss, offer change, and next bet.",
    proofTarget: "Weekly verdict captured in the proof deck and next-day promise.",
    cta: "!scoreboard during the review.",
  },
];

const fallbackStreamConfig = {
  status: "prelaunch",
  statusLabel: "Prelaunch room",
  message: "Live links, pinned chat commands, and embeds get added here before July 28.",
  primary: {
    name: "Main live room",
    href: null,
    status: "Link drops before Day 1",
    configured: false,
  },
  destinations: [
    { key: "main", name: "Main live room", href: null, status: "Link drops before Day 1", configured: false },
    { key: "twitch", name: "Twitch", href: null, status: "Waiting for link", configured: false },
    { key: "kick", name: "Kick", href: null, status: "Waiting for link", configured: false },
    { key: "youtube", name: "YouTube", href: null, status: "Waiting for link", configured: false },
    { key: "scoreboard", name: "Public scoreboard", href: "/60", status: "Live now", configured: true },
    { key: "kit", name: "First paid drop", href: "/kit", status: "Founding product", configured: true },
    { key: "live-builds", name: operatorBundleProduct.name, href: "/live-builds", status: operatorBundleProduct.status, configured: true },
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
  rehearsal: {
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
  },
  platformSetup: [
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
  ],
  privacyGuard: {
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
  },
};

const launchChecklistItems = [
  {
    title: "Domain, DNS, and Render",
    status: "done",
    owner: "System",
    signal: "aiwithmurda.com is live",
    body: "Cloudflare points to the Render web service and the production app responds on HTTPS.",
  },
  {
    title: "Audience capture",
    status: "done",
    owner: "System",
    signal: "Supabase subscribers",
    body: "The start page stores subscribers, sends the welcome email, and exposes admin audience counts.",
  },
  {
    title: "Paid kit path",
    status: "done",
    owner: "System",
    signal: "Backbone Stripe only",
    body: "Checkout, webhooks, gated member access, and asset downloads are wired under Backbone Stripe.",
  },
  {
    title: "Member activation path",
    status: "done",
    owner: "System",
    signal: "Start here flow",
    body: "The member hub now points buyers through Quickstart, Module Field Guide, Module 1, and the first tracked task.",
  },
  {
    title: "Module lesson depth",
    status: "done",
    owner: "System",
    signal: "Deliverables + proof questions",
    body: "Each paid module now has outputs, to-do lists, deliverables, proof questions, and traps to avoid.",
  },
  {
    title: "Generated member assets",
    status: "done",
    owner: "System",
    signal: "Roadmap + field guide",
    body: "The Module Roadmap and Module Field Guide are generated from the product module source so downloads stay aligned.",
  },
  {
    title: "Proof receipt builder",
    status: "done",
    owner: "System",
    signal: "Module-linked export",
    body: "Members can turn module work into a markdown receipt with progress, completed tasks, proof, lesson, and next move.",
  },
  {
    title: "Buyer onboarding sequence",
    status: "done",
    owner: "System",
    signal: "Day 0 / 1 / 3 / 7",
    body: "The product has a buyer email sequence and the access email sends buyers into the activation path.",
  },
  {
    title: "Offer Ops roster",
    status: "done",
    owner: "System",
    signal: "Members + module progress",
    body: "Admin settings show active members, current module, completion percentage, and offer progress health.",
  },
  {
    title: "Command shelf and receipts",
    status: "done",
    owner: "System",
    signal: "/tools + /day/:day",
    body: "Viewers can reach the scoreboard, live hub, daily receipts, overlay, kit, and member hub from public command links.",
  },
  {
    title: "Core prompt scripts",
    status: "done",
    owner: "System",
    signal: "10 guided scripts",
    body: "Members get copy-ready inspect, plan, build, verify, review, debug, recovery, and handoff scripts.",
  },
  {
    title: "Starter skill pack",
    status: "done",
    owner: "System",
    signal: "3 dual-agent skills",
    body: "The starter course includes Project Map, Build One Slice, and Verify Before Done skills for Claude Code and Codex.",
  },
  {
    title: "OBS browser routes",
    status: "done",
    owner: "System",
    signal: "/overlay + /obs",
    body: "The stream overlay has direct browser-source URLs with production route smoke coverage.",
  },
  {
    title: "Fake stream rehearsal runbook",
    status: "done",
    owner: "System",
    signal: "Dry-run sequence",
    body: "Settings includes a copyable rehearsal path for /live, /obs, command clicks, dashboard sync, and the money path.",
  },
  {
    title: "Stream platform setup deck",
    status: "done",
    owner: "System",
    signal: "Render env map",
    body: "Settings maps Twitch, YouTube, Kick, and the primary room to the exact env vars and proof checks needed before launch.",
  },
  {
    title: "Stream privacy guard",
    status: "done",
    owner: "System",
    signal: "Privacy preflight",
    body: "Settings includes stream scene discipline, secret-screen blackout, clean browser, payment/admin blackout, and family boundaries.",
  },
  {
    title: "Public discovery and identity",
    status: "done",
    owner: "System",
    signal: "SEO + browser assets",
    body: "The site has robots, sitemap, favicon, web manifest, and social metadata for the public launch domain.",
  },
  {
    title: "Launch verification loop",
    status: "done",
    owner: "System",
    signal: "smoke:launch",
    body: "One command now checks public routes, stream commands, signup, and the paid member funnel before launch.",
  },
  {
    title: "Day 1 baseline",
    status: "queued",
    owner: "RubyX",
    signal: "Launch-day command",
    body: "Run the baseline push only when the sprint starts so preview data becomes clean Day 1 data.",
    nextAction: "On launch day, run the dry run, inspect the Day 1 payload, then run the push command once.",
    proof: "The public scoreboard shows one clean Day 1 baseline row and no preview-history confusion.",
  },
  {
    title: "Live room links",
    status: "manual",
    owner: "Murad",
    signal: "Channel decision",
    body: "Add the final Twitch, Kick, YouTube, or multistream links to the live hub before promotion.",
    nextAction: "Choose the primary room, add the stream URL environment variables in Render, then rerun the stream smoke.",
    proof: "/live opens the real room, command links point to the right platforms, and the admin Stream Links card shows configured destinations.",
  },
  {
    title: "OBS overlay rehearsal",
    status: "manual",
    owner: "Murad",
    signal: "Needs stream scene",
    body: "Load the overlay in OBS, confirm safe cropping, and test screen-share readability.",
    nextAction: "Add https://aiwithmurda.com/obs as a browser source, rehearse over the real desktop scene, and record a short test.",
    proof: "A rehearsal clip or screenshot shows the overlay readable without covering code, dashboards, chat, or private data.",
  },
  {
    title: "Real purchase test",
    status: "manual",
    owner: "Murad + RubyX",
    signal: "Requires real charge",
    body: "Run one live Backbone Stripe purchase, verify entitlement, and refund only if needed.",
    nextAction: "Create or use a buyer profile, complete one live $47 Backbone Stripe checkout, and open the returned member hub.",
    proof: "Stripe shows the payment under Backbone, Supabase has the entitlement, and the buyer can download a gated asset.",
  },
];

const readinessMeta = {
  "Domain, DNS, and Render": { category: "website", weight: 2 },
  "Audience capture": { category: "audience", weight: 1.2 },
  "Paid kit path": { category: "offer", weight: 1.6 },
  "Member activation path": { category: "product", weight: 1.4 },
  "Module lesson depth": { category: "product", weight: 1.2 },
  "Generated member assets": { category: "product", weight: 1 },
  "Proof receipt builder": { category: "product", weight: 1 },
  "Buyer onboarding sequence": { category: "audience", weight: 1 },
  "Offer Ops roster": { category: "dashboard", weight: 1 },
  "Command shelf and receipts": { category: "stream", weight: 1 },
  "Launch copy pack": { category: "offer", weight: 1 },
  "Day 0-7 stream run sheet": { category: "stream", weight: 1.2 },
  "OBS browser routes": { category: "stream", weight: 1 },
  "Fake stream rehearsal runbook": { category: "stream", weight: 1 },
  "Stream platform setup deck": { category: "stream", weight: 1 },
  "Stream privacy guard": { category: "stream", weight: 1.2 },
  "Public discovery and identity": { category: "website", weight: 1 },
  "Launch verification loop": { category: "qa", weight: 1.4 },
  "Day 1 baseline": { category: "dashboard", weight: 1.3 },
  "Live room links": { category: "stream", weight: 1.6 },
  "OBS overlay rehearsal": { category: "stream", weight: 1.6 },
  "Real purchase test": { category: "offer", weight: 2 },
};

const readinessCategoryLabels = {
  website: "Website",
  dashboard: "Dashboard",
  stream: "Stream",
  product: "Modules",
  offer: "Offer",
  audience: "Audience",
  qa: "QA",
};

const readinessStatusScores = {
  done: 1,
  queued: 0.55,
  manual: 0,
};

function buildLaunchReadiness(items) {
  const categories = new Map();
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const item of items) {
    const meta = readinessMeta[item.title] || { category: "qa", weight: 1 };
    const score = readinessStatusScores[item.status] ?? 0;
    const category = categories.get(meta.category) || {
      key: meta.category,
      label: readinessCategoryLabels[meta.category] || meta.category,
      total: 0,
      earned: 0,
      items: 0,
    };

    category.total += meta.weight;
    category.earned += meta.weight * score;
    category.items += 1;
    categories.set(meta.category, category);

    totalWeight += meta.weight;
    earnedWeight += meta.weight * score;
  }

  const blockers = items
    .filter((item) => item.status !== "done")
    .map((item) => ({ ...item, ...(readinessMeta[item.title] || { category: "qa", weight: 1 }) }))
    .sort((a, b) => {
      const statusPriority = { manual: 0, queued: 1 };
      return (statusPriority[a.status] ?? 2) - (statusPriority[b.status] ?? 2) || b.weight - a.weight;
    });

  return {
    percent: totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : 0,
    categories: [...categories.values()].map((category) => ({
      ...category,
      percent: category.total ? Math.round((category.earned / category.total) * 100) : 0,
    })),
    blockers,
  };
}

function getRoute() {
  const normalized = window.location.pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function getDayRouteDay(route) {
  const match = route.match(/^\/day\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function getMemberModuleRouteKey(route) {
  const match = route.match(/^\/members\/module\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function App() {
  const [logs, setLogs] = useState(() => loadLogs(seedLogs));
  const [authSession, setAuthSession] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
  const [remoteLogStatus, setRemoteLogStatus] = useState("local");
  const [remoteLogMeta, setRemoteLogMeta] = useState({ count: 0, latestDay: null, loadedAt: null });
  const [liveFollowers, setLiveFollowers] = useState(null);
  const [dirtyDays, setDirtyDays] = useState([]);
  const [adminToken, setAdminToken] = useState(() => window.localStorage.getItem(adminTokenStorageKey) || "");
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [subscriberSummary, setSubscriberSummary] = useState(null);
  const [subscriberStatus, setSubscriberStatus] = useState("idle");
  const [subscriberMessage, setSubscriberMessage] = useState("");
  const [offerOpsSummary, setOfferOpsSummary] = useState(null);
  const [offerOpsStatus, setOfferOpsStatus] = useState("idle");
  const [offerOpsMessage, setOfferOpsMessage] = useState("");
  const [metricsAutomationSummary, setMetricsAutomationSummary] = useState(null);
  const [metricsAutomationStatus, setMetricsAutomationStatus] = useState("idle");
  const [metricsAutomationMessage, setMetricsAutomationMessage] = useState("");
  const [systemStatus, setSystemStatus] = useState(null);
  const [systemStatusState, setSystemStatusState] = useState("idle");
  const [systemStatusMessage, setSystemStatusMessage] = useState("");
  const [socialIntegrationStatus, setSocialIntegrationStatus] = useState(null);
  const [socialIntegrationState, setSocialIntegrationState] = useState("idle");
  const [socialIntegrationMessage, setSocialIntegrationMessage] = useState("");
  const [streamConfig, setStreamConfig] = useState(fallbackStreamConfig);
  const [streamConfigStatus, setStreamConfigStatus] = useState("idle");
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get("view");
    if (requestedView === "overlay") return "overlay-only";
    if (navItems.some((item) => item.key === requestedView)) return requestedView;
    return "dashboard";
  });
  const latest = useMemo(() => getLatestRecord(logs), [logs]);
  const [selectedDay, setSelectedDay] = useState(latest?.day || 1);

  const refreshLiveFollowers = useCallback(async () => {
    const data = await getLiveFollowers();
    setLiveFollowers(data);
    return data;
  }, []);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  useEffect(() => {
    let mounted = true;

    async function loadStreamConfig() {
      setStreamConfigStatus("loading");
      try {
        const data = await getStreamConfig();
        if (!mounted) return;
        setStreamConfig({ ...fallbackStreamConfig, ...data });
        setStreamConfigStatus("success");
      } catch {
        if (!mounted) return;
        setStreamConfig(fallbackStreamConfig);
        setStreamConfigStatus("local");
      }
    }

    loadStreamConfig();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadRemoteLogs() {
      try {
        const data = await getDailyLogs();
        if (!mounted) return;
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs(data.logs);
          setRemoteLogStatus("live");
          setRemoteLogMeta({
            count: data.logs.length,
            latestDay: data.logs.at(-1)?.day || null,
            loadedAt: new Date().toISOString(),
          });
        } else {
          setRemoteLogStatus("empty");
          setRemoteLogMeta({ count: 0, latestDay: null, loadedAt: new Date().toISOString() });
        }
      } catch {
        if (mounted) setRemoteLogStatus("local");
      }
    }

    loadRemoteLogs();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer = null;
    let eventSource = null;

    async function pollLiveFollowers() {
      try {
        const data = await refreshLiveFollowers();
        if (!mounted) return;
        const refreshMs = Math.max(5000, Number(data.refreshMs || 15000));
        timer = window.setTimeout(pollLiveFollowers, refreshMs);
      } catch {
        if (mounted) timer = window.setTimeout(pollLiveFollowers, 30000);
      }
    }

    if ("EventSource" in window) {
      eventSource = new EventSource("/api/followers/stream");
      eventSource.addEventListener("followers", (event) => {
        try {
          setLiveFollowers(JSON.parse(event.data));
        } catch {
          // Ignore malformed stream frames and let the next tick correct state.
        }
      });
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!timer) pollLiveFollowers();
      };
    } else {
      pollLiveFollowers();
    }

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
      eventSource?.close();
    };
  }, [refreshLiveFollowers]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthSession(data.session || null);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session || null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!logs.some((record) => record.day === selectedDay) && latest) {
      setSelectedDay(latest.day);
    }
  }, [latest, logs, selectedDay]);

  const selectedRecord = logs.find((record) => record.day === selectedDay) || latest;
  const weeks = useMemo(() => weeklySummaries(logs), [logs]);
  const route = getRoute();
  const overlayOnly = activeView === "overlay-only" || directOverlayRoutes.has(route);

  useEffect(() => {
    document.body.classList.toggle("overlay-body", overlayOnly);
    return () => {
      document.body.classList.remove("overlay-body");
    };
  }, [overlayOnly]);

  function updateRemoteMeta(dataLogs) {
    setRemoteLogMeta({
      count: dataLogs.length,
      latestDay: dataLogs.at(-1)?.day || null,
      loadedAt: new Date().toISOString(),
    });
  }

  async function refreshRemoteLogMeta() {
    const data = await getDailyLogs();
    updateRemoteMeta(Array.isArray(data.logs) ? data.logs : []);
  }

  function markDayDirty(day) {
    setDirtyDays((current) => (current.includes(day) ? current : [...current, day].sort((a, b) => a - b)));
  }

  function clearDirtyDays(days) {
    const clearSet = new Set(days);
    setDirtyDays((current) => current.filter((day) => !clearSet.has(day)));
  }

  function updateAdminToken(value) {
    setAdminToken(value);
    setSubscriberSummary(null);
    setSubscriberStatus("idle");
    setSubscriberMessage("");
    setOfferOpsSummary(null);
    setOfferOpsStatus("idle");
    setOfferOpsMessage("");
    setMetricsAutomationSummary(null);
    setMetricsAutomationStatus("idle");
    setMetricsAutomationMessage("");
    setSystemStatus(null);
    setSystemStatusState("idle");
    setSystemStatusMessage("");
    setTwitchIntegrationStatus(null);
    setTwitchIntegrationState("idle");
    setTwitchIntegrationMessage("");
    if (value) {
      window.localStorage.setItem(adminTokenStorageKey, value);
    } else {
      window.localStorage.removeItem(adminTokenStorageKey);
    }
  }

  const refreshSubscriberSummary = useCallback(async () => {
    if (!adminToken.trim()) {
      setSubscriberStatus("error");
      setSubscriberMessage("Add the admin token before checking audience numbers.");
      return;
    }

    setSubscriberStatus("loading");
    setSubscriberMessage("");
    try {
      const data = await getSubscriberSummary(adminToken.trim());
      setSubscriberSummary(data.summary || null);
      setSubscriberStatus("success");
    } catch (error) {
      setSubscriberStatus("error");
      setSubscriberMessage(error.message || "Could not load audience numbers.");
    }
  }, [adminToken]);

  useEffect(() => {
    if (activeView === "settings" && adminToken.trim() && subscriberStatus === "idle") {
      refreshSubscriberSummary();
    }
  }, [activeView, adminToken, refreshSubscriberSummary, subscriberStatus]);

  const refreshOfferOpsSummary = useCallback(async () => {
    if (!adminToken.trim()) {
      setOfferOpsStatus("error");
      setOfferOpsMessage("Add the admin token before checking offer ops.");
      return;
    }

    setOfferOpsStatus("loading");
    setOfferOpsMessage("");
    try {
      const data = await getOfferOpsSummary(adminToken.trim());
      setOfferOpsSummary(data.summary || null);
      setOfferOpsStatus("success");
    } catch (error) {
      setOfferOpsStatus("error");
      setOfferOpsMessage(error.message || "Could not load offer ops.");
    }
  }, [adminToken]);

  useEffect(() => {
    if (activeView === "settings" && adminToken.trim() && offerOpsStatus === "idle") {
      refreshOfferOpsSummary();
    }
  }, [activeView, adminToken, refreshOfferOpsSummary, offerOpsStatus]);

  const refreshMetricsAutomationSummary = useCallback(async () => {
    if (!adminToken.trim()) {
      setMetricsAutomationStatus("error");
      setMetricsAutomationMessage("Add the admin token before checking automation.");
      return;
    }

    setMetricsAutomationStatus("loading");
    setMetricsAutomationMessage("");
    try {
      const data = await getMetricsAutomationSummary(adminToken.trim());
      setMetricsAutomationSummary(data.summary || null);
      setMetricsAutomationStatus("success");
    } catch (error) {
      setMetricsAutomationStatus("error");
      setMetricsAutomationMessage(error.message || "Could not load automation summary.");
    }
  }, [adminToken]);

  useEffect(() => {
    if (activeView === "settings" && adminToken.trim() && metricsAutomationStatus === "idle") {
      refreshMetricsAutomationSummary();
    }
  }, [activeView, adminToken, metricsAutomationStatus, refreshMetricsAutomationSummary]);

  const refreshSystemStatus = useCallback(async () => {
    if (!adminToken.trim()) {
      setSystemStatusState("error");
      setSystemStatusMessage("Add the admin token before checking system status.");
      return;
    }

    setSystemStatusState("loading");
    setSystemStatusMessage("");
    try {
      const data = await getSystemStatus(adminToken.trim());
      setSystemStatus(data.status || null);
      setSystemStatusState("success");
    } catch (error) {
      setSystemStatusState("error");
      setSystemStatusMessage(error.message || "Could not load system status.");
    }
  }, [adminToken]);

  useEffect(() => {
    if (activeView === "settings" && adminToken.trim() && systemStatusState === "idle") {
      refreshSystemStatus();
    }
  }, [activeView, adminToken, refreshSystemStatus, systemStatusState]);

  const refreshSocialIntegrationStatus = useCallback(async () => {
    if (!adminToken.trim()) {
      setSocialIntegrationState("error");
      setSocialIntegrationMessage("Add the admin token before checking social accounts.");
      return null;
    }

    setSocialIntegrationState("loading");
    setSocialIntegrationMessage("");
    try {
      const data = await getSocialIntegrationStatus(adminToken.trim());
      setSocialIntegrationStatus(data.status || null);
      setSocialIntegrationState("success");
      return data.status || null;
    } catch (error) {
      setSocialIntegrationState("error");
      setSocialIntegrationMessage(error.message || "Could not load social account status.");
      return null;
    }
  }, [adminToken]);

  useEffect(() => {
    if (activeView === "settings" && adminToken.trim() && socialIntegrationState === "idle") {
      refreshSocialIntegrationStatus();
    }
  }, [activeView, adminToken, refreshSocialIntegrationStatus, socialIntegrationState]);

  async function syncLogsToPublic(targetLogs, label) {
    if (!adminToken.trim()) {
      setSyncStatus("error");
      setSyncMessage("Add the admin token in Settings before syncing.");
      return false;
    }

    setSyncStatus("loading");
    setSyncMessage("");
    try {
      const data = await syncDailyLogs(targetLogs, adminToken.trim());
      await refreshRemoteLogMeta();
      setRemoteLogStatus("live");
      clearDirtyDays(targetLogs.map((record) => record.day));
      setSyncStatus("success");
      setSyncMessage(`Synced ${label}: ${data.logs?.length || targetLogs.length} record${targetLogs.length === 1 ? "" : "s"}.`);
      return true;
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error.message || "Public sync failed.");
      return false;
    }
  }

  function handleSnapshotApplied(nextLogs) {
    if (!Array.isArray(nextLogs) || !nextLogs.length) return;
    setLogs(nextLogs);
    setRemoteLogStatus("live");
    updateRemoteMeta(nextLogs);
    clearDirtyDays(nextLogs.map((record) => record.day));
  }

  function updateRecord(day, field, value) {
    markDayDirty(day);
    setLogs((current) =>
      current.map((record) => {
        if (record.day !== day) return record;
        return {
          ...record,
          [field]: numericFields.has(field) ? Number(value || 0) : value,
        };
      }),
    );
  }

  function updateFollowers(day, platform, value) {
    markDayDirty(day);
    setLogs((current) =>
      current.map((record) => {
        if (record.day !== day) return record;
        return {
          ...record,
          followers: {
            ...record.followers,
            [platform]: Number(value || 0),
          },
        };
      }),
    );
  }

  function updateList(day, field, value) {
    const items = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    updateRecord(day, field, items);
  }

  function addNextDay() {
    const sorted = [...logs].sort((a, b) => a.day - b.day);
    const previous = sorted.at(-1);
    if (!previous || previous.day >= sprintConfig.totalDays) return;
    const nextDay = previous.day + 1;
    const nextRecord = {
      ...previous,
      day: nextDay,
      date: addDays(previous.date, 1),
      mainGoal: "Set today's sprint goal",
      status: "planned",
      shippedItems: [],
      bestMoment: "",
      biggestFailure: "",
      lessonLearned: "",
      tomorrowPromise: "",
      spikeCause: "",
      proofAssets: [],
    };
    setLogs((current) => [...current, nextRecord]);
    markDayDirty(nextDay);
    setSelectedDay(nextDay);
    setActiveView("daily-log");
  }

  function restoreSeedData() {
    resetLogs();
    setLogs(seedLogs);
    setDirtyDays(seedLogs.map((record) => record.day));
    setSelectedDay(seedLogs.at(-1).day);
  }

  if (overlayOnly) {
    return (
      <main className={`overlay-route ${followerOverlayRoutes.has(route) ? "follower-overlay-route" : ""}`}>
        {followerOverlayRoutes.has(route) ? (
          <FollowerOverlay liveFollowers={liveFollowers} latest={latest} />
        ) : (
          <CommandOverlay
            config={sprintConfig}
            latest={latest}
            logs={logs}
            compact
            preview={isPrelaunch(sprintConfig)}
            liveFollowers={liveFollowers}
          />
        )}
      </main>
    );
  }

  if (route !== "/admin") {
    return (
      <PublicSite
        route={route}
        config={sprintConfig}
        logs={logs}
        latest={latest}
        weeks={weeks}
        authSession={authSession}
        authReady={authReady}
        streamConfig={streamConfig}
        streamConfigStatus={streamConfigStatus}
        liveFollowers={liveFollowers}
      />
    );
  }

  return (
    <AdminGate authSession={authSession} authReady={authReady}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Icon name="code" />
            </div>
            <div>
              <strong>60-Day Build</strong>
              <span>In Public</span>
            </div>
          </div>

          <nav className="side-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeView === item.key ? "active" : ""}
                onClick={() => setActiveView(item.key)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <StatusPanel />
            <OperatorsPanel />
          </div>
        </aside>

        <main className="main-panel">
          <Header config={sprintConfig} latest={latest} />
          {activeView === "dashboard" && (
            <Dashboard
              config={sprintConfig}
              logs={logs}
              latest={latest}
              weeks={weeks}
              liveFollowers={liveFollowers}
              onGenerateSlide={() => setActiveView("deck")}
            />
          )}
          {activeView === "daily-log" && (
            <DailyLog
              config={sprintConfig}
              logs={logs}
              selectedDay={selectedDay}
              selectedRecord={selectedRecord}
              setSelectedDay={setSelectedDay}
              updateRecord={updateRecord}
              updateFollowers={updateFollowers}
              updateList={updateList}
              addNextDay={addNextDay}
              dirtyDays={dirtyDays}
              syncStatus={syncStatus}
              syncMessage={syncMessage}
              onSyncSelectedDay={() => syncLogsToPublic([selectedRecord], `Day ${selectedRecord.day}`)}
            />
          )}
          {activeView === "overlay" && <OverlayView config={sprintConfig} latest={latest} logs={logs} liveFollowers={liveFollowers} />}
          {activeView === "deck" && <DeckView config={sprintConfig} logs={logs} weeks={weeks} />}
          {activeView === "settings" && (
            <SettingsView
              authSession={authSession}
              config={sprintConfig}
              logs={logs}
              remoteLogStatus={remoteLogStatus}
              remoteLogMeta={remoteLogMeta}
              dirtyDays={dirtyDays}
              adminToken={adminToken}
              syncStatus={syncStatus}
              syncMessage={syncMessage}
              offerOpsSummary={offerOpsSummary}
              offerOpsStatus={offerOpsStatus}
              offerOpsMessage={offerOpsMessage}
              metricsAutomationSummary={metricsAutomationSummary}
              metricsAutomationStatus={metricsAutomationStatus}
              metricsAutomationMessage={metricsAutomationMessage}
              liveFollowers={liveFollowers}
              subscriberSummary={subscriberSummary}
              subscriberStatus={subscriberStatus}
              subscriberMessage={subscriberMessage}
              systemStatus={systemStatus}
              systemStatusState={systemStatusState}
              systemStatusMessage={systemStatusMessage}
              socialIntegrationStatus={socialIntegrationStatus}
              socialIntegrationState={socialIntegrationState}
              socialIntegrationMessage={socialIntegrationMessage}
              streamConfig={streamConfig}
              streamConfigStatus={streamConfigStatus}
              updateAdminToken={updateAdminToken}
              refreshSubscriberSummary={refreshSubscriberSummary}
              refreshOfferOpsSummary={refreshOfferOpsSummary}
              refreshMetricsAutomationSummary={refreshMetricsAutomationSummary}
              refreshLiveFollowers={refreshLiveFollowers}
              refreshSystemStatus={refreshSystemStatus}
              refreshSocialIntegrationStatus={refreshSocialIntegrationStatus}
              syncLogsToPublic={syncLogsToPublic}
              onSnapshotApplied={handleSnapshotApplied}
              restoreSeedData={restoreSeedData}
            />
          )}
        </main>
      </div>
    </AdminGate>
  );
}

function AdminGate({ authSession, authReady, children }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [accessStatus, setAccessStatus] = useState("idle");
  const [accessMessage, setAccessMessage] = useState("");
  const [adminIdentity, setAdminIdentity] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function checkAdminAccess() {
      if (!isSupabaseConfigured()) {
        setAccessStatus("error");
        setAccessMessage("Supabase login is not configured yet.");
        return;
      }

      if (!authReady) {
        setAccessStatus("checking");
        setAccessMessage("");
        return;
      }

      if (!authSession?.access_token) {
        setAdminIdentity(null);
        setAccessStatus("signed-out");
        setAccessMessage("");
        return;
      }

      setAccessStatus("checking");
      setAccessMessage("");
      try {
        const data = await verifyAdminSession(authSession.access_token);
        if (!mounted) return;
        setAdminIdentity(data.admin || null);
        setAccessStatus("authorized");
      } catch (error) {
        if (!mounted) return;
        setAdminIdentity(null);
        setAccessStatus("denied");
        if (error.data?.error === "admin_email_allowlist_missing") {
          setAccessMessage("Admin login needs ADMIN_EMAILS set on Render before the control room can open.");
        } else if (error.data?.error === "admin_email_not_allowed") {
          setAccessMessage("This Supabase profile is signed in, but it is not on the admin allowlist.");
        } else {
          setAccessMessage(error.message || "Admin access check failed.");
        }
      }
    }

    checkAdminAccess();
    return () => {
      mounted = false;
    };
  }, [authReady, authSession?.access_token]);

  async function handlePasswordLogin(event) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoginStatus("loading");
    setLoginMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginStatus("error");
      setLoginMessage(error.message);
      return;
    }

    setLoginStatus("success");
    setLoginMessage("Password accepted. Checking the admin allowlist...");
  }

  async function handleMagicLink() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (!email.trim()) {
      setLoginStatus("error");
      setLoginMessage("Enter the admin email first, then send the magic link.");
      return;
    }

    setLoginStatus("loading");
    setLoginMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin?view=settings&setup=password`,
      },
    });

    if (error) {
      setLoginStatus("error");
      setLoginMessage(error.message);
      return;
    }

    setLoginStatus("success");
    setLoginMessage("Magic link sent. Open it on this computer, then set your password in Settings.");
  }

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  if (accessStatus === "authorized") {
    return children;
  }

  const signedInEmail = authSession?.user?.email || adminIdentity?.email || "";

  return (
    <main className="admin-gate-shell">
      <section className="admin-gate-card">
        <div className="admin-gate-copy">
          <span className="public-label">Private control room</span>
          <h1>Admin login required</h1>
          <p>
            The public dashboard stays open. The control room now requires your Supabase profile and
            the server-side admin allowlist before anything renders.
          </p>
          <p className="admin-gate-note">
            Typing an email is not enough. The server only opens this page for the admin email
            allowlist configured on Render.
          </p>
          {signedInEmail && (
            <div className="admin-identity-chip">
              <span>Signed in</span>
              <strong>{signedInEmail}</strong>
            </div>
          )}
        </div>
        <div className="admin-gate-panel">
          {!authSession ? (
            <form className="auth-form" onSubmit={handlePasswordLogin}>
              <label className="field">
                <span>Admin email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  placeholder="Admin password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={!authReady || loginStatus === "loading"}>
                {loginStatus === "loading" ? "Checking..." : "Log in"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleMagicLink}
                disabled={!authReady || loginStatus === "loading"}
              >
                Send magic link backup
              </button>
              {loginMessage && <p className={`form-message ${loginStatus}`}>{loginMessage}</p>}
            </form>
          ) : (
            <div className="admin-denied-panel">
              <strong>{accessStatus === "checking" ? "Checking admin access..." : "Access not open yet"}</strong>
              <p>{accessMessage || "Waiting for the admin session check to finish."}</p>
              <button type="button" className="secondary-button" onClick={handleSignOut}>
                Sign out and try another email
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function PublicSite({ route, config, logs, latest, weeks, authSession, authReady, streamConfig, streamConfigStatus, liveFollowers }) {
  const dayRouteDay = getDayRouteDay(route);
  const memberModuleKey = getMemberModuleRouteKey(route);
  const knownRoute = dayRouteDay
    ? "/day"
    : memberModuleKey
      ? "/members"
      : ["/", "/60", "/live", "/tools", "/start", "/kit", "/store", "/live-builds", "/operator-toolkit", "/members", "/terms", "/privacy"].includes(route)
        ? route
        : "/";

  return (
    <div className="public-site">
      <PublicNav activeRoute={knownRoute} />
      {knownRoute === "/" && (
        <PublicHome config={config} logs={logs} latest={latest} liveFollowers={liveFollowers} />
      )}
      {knownRoute === "/60" && <PublicDashboard config={config} logs={logs} latest={latest} weeks={weeks} liveFollowers={liveFollowers} />}
      {knownRoute === "/day" && <DayReceiptPage config={config} logs={logs} day={dayRouteDay} />}
      {knownRoute === "/live" && (
        <LiveHub
          latest={latest}
          streamConfig={streamConfig}
          streamConfigStatus={streamConfigStatus}
          liveFollowers={liveFollowers}
        />
      )}
      {knownRoute === "/tools" && <ToolsPage latest={latest} />}
      {knownRoute === "/start" && <StartPage />}
      {knownRoute === "/kit" && <KitPage authSession={authSession} authReady={authReady} />}
      {knownRoute === "/store" && <StorePage />}
      {knownRoute === "/live-builds" && <OperatorBundlePage authSession={authSession} authReady={authReady} />}
      {knownRoute === "/operator-toolkit" && <OperatorToolkitPage authSession={authSession} authReady={authReady} />}
      {knownRoute === "/members" && (
        <MembersPage authSession={authSession} authReady={authReady} activeModuleKey={memberModuleKey} />
      )}
      {knownRoute === "/terms" && <LegalPage type="terms" />}
      {knownRoute === "/privacy" && <LegalPage type="privacy" />}
      <PublicFooter />
    </div>
  );
}

function PublicNav({ activeRoute }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: "/", label: "Home" },
    { href: "/60", label: "Dashboard" },
    { href: "/live", label: "Live" },
    { href: "/kit", label: "Kit" },
    { href: "/store", label: "Store" },
    { href: "/live-builds", label: "Operator Bundle" },
    { href: "/operator-toolkit", label: "Full System" },
    { href: "/tools", label: "Tools" },
    { href: "/start", label: "Start" },
  ];

  return (
    <header className="public-nav">
      <a className="public-brand" href="/">
        <span>
          <Icon name="code" />
        </span>
        <strong>AI with Murda</strong>
      </a>
      <button
        type="button"
        className="public-nav-toggle"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        aria-controls="public-navigation-links"
        title={menuOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setMenuOpen((current) => !current)}
      >
        {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>
      <nav id="public-navigation-links" className={menuOpen ? "open" : ""} aria-label="Public navigation">
        {links.map((link) => (
          <a key={link.href} className={activeRoute === link.href ? "active" : ""} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <a className="nav-cta" href="/60">
        View score
      </a>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <span>AI with Murda</span>
      <nav aria-label="Legal navigation">
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="mailto:murad@aiwithmurda.com">Contact</a>
      </nav>
    </footer>
  );
}

function LegalPage({ type }) {
  const isPrivacy = type === "privacy";

  return (
    <main className="legal-page">
      <header className="legal-page-header">
        <span>{isPrivacy ? "Data and account access" : "Service agreement"}</span>
        <h1>{isPrivacy ? "Privacy Policy" : "Terms of Service"}</h1>
        <p>Effective July 10, 2026</p>
      </header>

      {isPrivacy ? (
        <div className="legal-page-body">
          <section>
            <h2>Overview</h2>
            <p>
              AI with Murda operates public dashboards, streaming overlays, educational products, and
              member tools. This policy explains what information we collect and how it is used when
              you visit the site, join a product, or connect a social account.
            </p>
          </section>
          <section>
            <h2>Information we collect</h2>
            <p>
              We may collect contact information you submit, purchase and membership records, basic
              service usage data, and information you authorize through a connected platform. For a
              TikTok connection, this may include an account identifier, display name, username,
              avatar or profile link, and follower statistics covered by the scopes you approve.
            </p>
          </section>
          <section>
            <h2>How information is used</h2>
            <p>
              We use this information to operate the site, provide purchased access, display verified
              social metrics, maintain the combined follower ticker, prevent abuse, support users, and
              improve the service. We do not sell connected social account data.
            </p>
          </section>
          <section>
            <h2>Connected accounts and security</h2>
            <p>
              Social access tokens are stored server-side in encrypted form and are not exposed on the
              public dashboard. You can revoke a platform authorization through that platform or ask us
              to disconnect the account. Disconnecting removes the account from the combined total and
              stops future metric refreshes.
            </p>
          </section>
          <section>
            <h2>Service providers</h2>
            <p>
              We use infrastructure and payment providers such as Render, Supabase, Stripe, and Resend,
              plus the social platforms you choose to connect. These providers process information only
              as needed to deliver their services and are governed by their own terms and policies.
            </p>
          </section>
          <section>
            <h2>Retention and choices</h2>
            <p>
              We retain information while it is needed to provide the service, maintain transaction
              records, meet legal obligations, or resolve disputes. You may request access, correction,
              disconnection, or deletion by contacting us. Some transaction records may be retained when
              required by law.
            </p>
          </section>
          <section>
            <h2>Children and policy changes</h2>
            <p>
              The service is not directed to children under 13. We may update this policy as the service
              changes. Material updates will be posted here with a revised effective date.
            </p>
          </section>
          <section>
            <h2>Contact</h2>
            <p>Email privacy questions or requests to <a href="mailto:murad@aiwithmurda.com">murad@aiwithmurda.com</a>.</p>
          </section>
        </div>
      ) : (
        <div className="legal-page-body">
          <section>
            <h2>Agreement</h2>
            <p>
              By accessing AI with Murda, creating an account, purchasing a product, or connecting a
              social account, you agree to these terms. If you do not agree, do not use the service.
            </p>
          </section>
          <section>
            <h2>The service</h2>
            <p>
              AI with Murda provides public progress dashboards, streaming tools, educational material,
              downloadable resources, member workspaces, and optional social metric integrations.
              Features may change as the products and live build evolve.
            </p>
          </section>
          <section>
            <h2>Accounts and social authorization</h2>
            <p>
              You are responsible for your account credentials and for activity performed through your
              account. When you connect a social platform, you authorize only the permissions shown on
              that platform's consent screen. You may revoke that authorization at any time.
            </p>
          </section>
          <section>
            <h2>Purchases and access</h2>
            <p>
              Prices and billing terms are shown before checkout. Digital access is personal and may not
              be resold, shared, or redistributed unless the offer explicitly permits it. Subscription
              access continues until canceled under the terms shown at purchase.
            </p>
          </section>
          <section>
            <h2>Acceptable use</h2>
            <p>
              Do not misuse the service, interfere with its operation, attempt unauthorized access,
              scrape private areas, upload malicious material, impersonate others, or use the service in
              violation of law or another platform's rules.
            </p>
          </section>
          <section>
            <h2>Ownership</h2>
            <p>
              The site, course material, software, branding, and original resources remain the property
              of their respective owners. Purchasing access grants a limited, non-transferable right to
              use the included material for your own work.
            </p>
          </section>
          <section>
            <h2>Availability and responsibility</h2>
            <p>
              The service is provided as available. We do not guarantee uninterrupted operation,
              specific income, follower growth, or business results. To the extent allowed by law, AI
              with Murda is not liable for indirect or consequential losses arising from use of the
              service or third-party platforms.
            </p>
          </section>
          <section>
            <h2>Termination and changes</h2>
            <p>
              Access may be suspended for abuse, fraud, nonpayment, or material violations of these
              terms. We may update these terms as the service changes and will post the revised version
              here with a new effective date.
            </p>
          </section>
          <section>
            <h2>Contact</h2>
            <p>Questions about these terms can be sent to <a href="mailto:murad@aiwithmurda.com">murad@aiwithmurda.com</a>.</p>
          </section>
        </div>
      )}
    </main>
  );
}

function PublicHome({ config, logs, latest, liveFollowers }) {
  const mode = getPublicDataMode(config);
  const liveFollowerTotal = Number(liveFollowers?.total);
  const followerTotal = Number.isFinite(liveFollowerTotal) ? liveFollowerTotal : 0;
  const operatorLoop = [
    { step: "01", title: "Build", body: "Turn one real problem into a working AI-assisted product." },
    { step: "02", title: "Prove", body: "Capture the before, the failure, the working state, and the receipt." },
    { step: "03", title: "Broadcast", body: "Turn the work into streams, clips, daily recaps, and public pressure." },
    { step: "04", title: "Monetize", body: "Move the proof into an offer and let the scoreboard judge the result." },
  ];

  return (
    <main className="experience-page">
      <ExperienceHero
        activeDay={latest.day}
        totalDays={config.totalDays}
        phaseLabel={isPrelaunch(config) ? "Prelaunch" : "Live now"}
        dateLabel={isPrelaunch(config) ? `Live ${config.startDate}` : `Day ${latest.day} transmitting`}
        goalLabel={config.publicGoalLabel}
        followerLabel={formatNumber(followerTotal)}
        revenueLabel={formatCurrency(latest.revenueCollected)}
        primaryAction={{ href: "/live", label: isPrelaunch(config) ? "Enter the live room" : "Watch live" }}
        secondaryAction={{ href: "/60", label: "Inspect the scoreboard" }}
      />

      <InteractiveProofline
        logs={logs}
        latest={latest}
        totalDays={config.totalDays}
        preview={isPrelaunch(config)}
      />

      <section className="broadcast-manifesto">
        <div className="broadcast-manifesto-number" aria-hidden="true">
          <strong>60</strong>
          <span>DAYS<br />ON THE CLOCK</span>
        </div>
        <div className="broadcast-manifesto-copy">
          <span>The premise</span>
          <h2>My family gets the summer. I get sixty days to change the trajectory.</h2>
          <p>
            From the airport drop-off until they return, the work stays visible: the code, the ideas, the
            mistakes, the products, the sales, and the numbers that decide whether any of it mattered.
          </p>
          <blockquote>
            "The scoreboard is not here for motivation. It is here so the story cannot lie."
          </blockquote>
        </div>
      </section>

      <section className="operator-loop-section" aria-labelledby="operator-loop-title">
        <header>
          <span>THE ENGINE</span>
          <h2 id="operator-loop-title">Every day runs the same unforgiving loop.</h2>
          <p>{mode.body}</p>
        </header>
        <div className="operator-loop-track">
          {operatorLoop.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="experience-final-call">
        <span>THE NEXT INTERNET BOOM IS ALREADY MOVING</span>
        <h2>Do not watch from the sidelines.</h2>
        <div>
          <a className="experience-primary-action" href="/start">Join the build log <span aria-hidden="true">↗</span></a>
          <a className="experience-secondary-action" href="/kit">Open The Future Proof Method</a>
        </div>
      </section>
    </main>
  );
}

function PublicDashboard({ config, logs, latest, weeks, liveFollowers }) {
  const progressItems = buildProgressItems(config, latest, liveFollowers);
  const spike = detectSpike(logs, latest);
  const currentWeek = weeks.at(-1);
  const mode = getPublicDataMode(config);
  const metricBoardItems = progressItems.slice(0, 6).map((item) => ({
    label: item.label,
    value: item.display,
    progress: percent(item.value, item.goal),
    note: item.accent === "blue" ? "output signal" : "goal track",
  }));

  return (
    <main className="public-page control-room-page scoreboard-experience-page">
      <section className="scoreboard-arena">
        <div className="broadcast-ident">
          <span className="broadcast-live-state"><i />{isPrelaunch(config) ? "Prelaunch board" : "Live board"}</span>
          <span>{mode.label}</span>
          <span>Last receipt: Day {latest.day}</span>
        </div>
        <div className="scoreboard-arena-layout">
          <div>
            <span className="scoreboard-kicker">Public command center</span>
            <h1>The scoreboard has no mercy.</h1>
            <p>
              Every number, spike, failure, and shipped build stays attached to a daily receipt. The
              public record gets the final word.
            </p>
            <div className="experience-actions">
              <a className="experience-primary-action" href={`/day/${latest.day}`}>Open latest receipt <span aria-hidden="true">↗</span></a>
              <a className="experience-secondary-action" href="/live">Enter the live room</a>
            </div>
          </div>
          <div className="scoreboard-day-monument">
            <span>{isPrelaunch(config) ? "Preview day" : "Current day"}</span>
            <strong>{String(latest.day).padStart(2, "0")}</strong>
            <em>/ {String(config.totalDays).padStart(2, "0")}</em>
            <p>{config.publicGoalLabel}</p>
          </div>
        </div>
      </section>

      {isPrelaunch(config) && <PrelaunchBanner mode={mode} />}

      <section className="broadcast-metric-board" aria-label="Sprint metrics">
        {metricBoardItems.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <div aria-label={`${item.progress}% complete`}>
              <i style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} />
            </div>
            <em>{item.note}</em>
          </article>
        ))}
      </section>

      <PublicFollowerTicker liveFollowers={liveFollowers} latest={latest} />

      <InteractiveProofline
        logs={logs}
        latest={latest}
        totalDays={config.totalDays}
        preview={isPrelaunch(config)}
      />

      <section className="public-dashboard-grid">
        <article className="panel public-sprint-card">
          <PanelTitle icon="calendar" title="Today" right={`Day ${latest.day}`} />
          <h2>{latest.mainGoal}</h2>
          <p>{latest.lessonLearned}</p>
          <KeyValue label="Tomorrow" value={latest.tomorrowPromise} />
          <a className="text-link" href={`/day/${latest.day}`}>
            Open day receipt
          </a>
        </article>
        <ReceiptPreview
          label="Latest proof"
          title={latest.shippedItems?.[0] || "Receipt pending"}
          body={latest.proofAssets?.[0] || latest.bestMoment || "The next public proof item will attach to this day receipt."}
          href={`/day/${latest.day}`}
        />
        <article className={`panel spike-panel ${spike.isSpike ? "hot" : ""}`}>
          <PanelTitle icon="alert" title="Spike Detector" right="Latest" />
          <h2>{spike.isSpike ? "Spike detected" : "No major spike"}</h2>
          <p>
            Followers {signedNumber(spike.followerGain)} · Revenue {signedCurrency(spike.revenueGain)}
          </p>
          <span>Cause: {spike.cause || "Normal daily movement"}</span>
          <MiniTrend logs={logs} />
        </article>
        {currentWeek && (
          <article className="panel public-week-card">
            <PanelTitle icon="chart" title={currentWeek.label} />
            <WeeklyRecap week={currentWeek} />
          </article>
        )}
      </section>
    </main>
  );
}

function PublicFollowerTicker({ liveFollowers, latest }) {
  const sources = liveFollowers?.sources || [];
  const liveSourceCount = sources.filter((source) => source.connected).length;
  const staleSourceCount = sources.filter((source) => source.status === "stale").length;
  const total = Number.isFinite(Number(liveFollowers?.total)) ? Number(liveFollowers.total) : 0;

  return (
    <section className="public-follower-ticker">
      <div>
        <span className="public-label">Combined audience</span>
        <strong>{formatNumber(total)}</strong>
        <p>
          One verified total across every connected account. Open a platform below for its individual
          count, connection health, and latest change.
        </p>
      </div>
      <div className="follower-source-strip">
        {sources.length ? (
          sources.map((source) => {
            const content = (
              <>
                <div>
                  <span>{source.label}</span>
                  {source.username ? <small>@{source.username.replace(/^@/, "")}</small> : null}
                </div>
                <strong>{source.count === null ? "--" : formatNumber(source.count)}</strong>
                <em>
                  {source.connected
                    ? `${
                        source.status === "stale"
                          ? "Last verified"
                          : source.precision === "rounded"
                            ? "Rounded"
                            : "Verified"
                      }${source.lastChangeDelta > 0 ? ` · +${formatNumber(source.lastChangeDelta)}` : ""}`
                    : "Not connected"}
                </em>
              </>
            );
            return source.profileUrl ? (
              <a key={source.key} className={source.status} href={source.profileUrl} target="_blank" rel="noreferrer">
                {content}
              </a>
            ) : (
              <article key={source.key} className={source.status}>{content}</article>
            );
          })
        ) : (
          <article className="loading">
            <span>Social metrics</span>
            <strong>--</strong>
            <em>Connecting live feed</em>
          </article>
        )}
      </div>
      <small>
        {liveSourceCount
          ? `${liveSourceCount} connected source${liveSourceCount === 1 ? "" : "s"} included in the total${
              staleSourceCount
                ? ` · ${staleSourceCount} showing last verified data`
                : ""
            }`
          : "No social accounts connected yet. Demo counts are excluded."}
        {liveFollowers?.checkedAt ? ` · Checked ${new Date(liveFollowers.checkedAt).toLocaleTimeString()}` : ""}
      </small>
    </section>
  );
}

function DayReceiptPage({ config, logs, day }) {
  const sortedLogs = [...logs].sort((a, b) => a.day - b.day);
  const record = sortedLogs.find((item) => item.day === day);

  if (!record) {
    return (
      <main className="public-page">
        <section className="public-section day-empty-state">
          <div>
            <span className="public-label">Daily receipt</span>
            <h1>Day {day} is not logged yet.</h1>
            <p>The receipt page is ready, but this day does not have public data yet.</p>
          </div>
          <div className="hero-actions">
            <a className="primary-link" href="/60">
              Open dashboard
            </a>
            <a className="secondary-link" href="/start">
              Join build log
            </a>
          </div>
        </section>
      </main>
    );
  }

  const gains = getDayGains(logs, record);
  const dayLabel = isPrelaunch(config) ? "Preview Day" : "Day";
  const receiptMetrics = [
    { label: "Revenue", value: formatCurrency(record.revenueCollected), delta: signedCurrency(gains.revenue) },
    { label: "Followers", value: formatNumber(totalFollowers(record)), delta: signedNumber(gains.followers) },
    { label: "Email", value: formatNumber(record.emailSubscribers), delta: signedNumber(gains.emailSubscribers) },
    { label: "Hours live", value: formatNumber(record.hoursStreamed), delta: signedNumber(gains.hoursStreamed) },
    { label: "Clips", value: formatNumber(record.clipsPosted), delta: signedNumber(gains.clipsPosted) },
    { label: "Builds", value: formatNumber(record.buildsShipped), delta: signedNumber(gains.buildsShipped) },
  ];
  const receiptUrl = `${window.location.origin}/day/${record.day}`;
  const shareCopy = [
    `Day ${record.day} of the 60-day AI operator sprint: ${record.mainGoal}`,
    record.shippedItems?.[0] ? `Shipped: ${record.shippedItems[0]}` : null,
    record.lessonLearned ? `Lesson: ${record.lessonLearned}` : null,
    `Receipt: ${receiptUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="public-page day-receipt-page">
      <section className="day-receipt-hero">
        <div>
          <span className="public-label">Daily receipt</span>
          <h1>
            {dayLabel} {record.day}: {record.mainGoal}
          </h1>
          <p>
            {record.date} receipt for the 60-day AI operator sprint: what shipped, what moved,
            what failed, and the next promise.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="/60">
              Scoreboard
            </a>
            <a className="secondary-link" href={`/day/${Math.min(config.totalDays, record.day + 1)}`}>
              Next day
            </a>
          </div>
        </div>
        <aside className="day-receipt-score">
          <span>{dayLabel}</span>
          <strong>{record.day}</strong>
          <em>{record.status}</em>
        </aside>
      </section>

      <section className="day-receipt-metrics">
        {receiptMetrics.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <em>{item.delta}</em>
          </article>
        ))}
      </section>

      <section className="public-section day-receipt-grid">
        <article>
          <span className="public-label">What shipped</span>
          <h2>{record.shippedItems?.length ? `${record.shippedItems.length} receipt item${record.shippedItems.length === 1 ? "" : "s"}` : "No shipped items logged"}</h2>
          <ul>
            {(record.shippedItems?.length ? record.shippedItems : ["Receipt pending"]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article>
          <span className="public-label">Proof assets</span>
          <h2>{record.proofAssets?.length ? "Evidence trail" : "Proof pending"}</h2>
          <ul>
            {(record.proofAssets?.length ? record.proofAssets : ["No public proof asset logged yet"]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="public-section day-receipt-notes">
        <article>
          <span>Best moment</span>
          <p>{record.bestMoment || "Not logged yet."}</p>
        </article>
        <article>
          <span>Biggest failure</span>
          <p>{record.biggestFailure || "Not logged yet."}</p>
        </article>
        <article>
          <span>Lesson</span>
          <p>{record.lessonLearned || "Not logged yet."}</p>
        </article>
        <article>
          <span>Tomorrow</span>
          <p>{record.tomorrowPromise || "Not logged yet."}</p>
        </article>
      </section>

      <section className="public-section day-share-copy">
        <div>
          <span className="public-label">Clip caption seed</span>
          <h2>Turn the receipt into a post.</h2>
        </div>
        <pre>{shareCopy}</pre>
      </section>
    </main>
  );
}

function PrelaunchBanner({ mode }) {
  return (
    <section className="prelaunch-banner">
      <div>
        <span className="public-label">{mode.label}</span>
        <h2>{mode.title}</h2>
        <p>{mode.body}</p>
      </div>
      <strong>Day 0 ready</strong>
    </section>
  );
}

function LiveHub({ latest, streamConfig, streamConfigStatus, liveFollowers }) {
  const destinations = streamConfig?.destinations?.length ? streamConfig.destinations : fallbackStreamConfig.destinations;
  const baseCommands = streamConfig?.commands?.length ? streamConfig.commands : fallbackStreamConfig.commands;
  const commands = [{ command: "!today", label: `Day ${latest.day} receipt`, href: `/day/${latest.day}` }, ...baseCommands];
  const primaryHref = streamConfig?.primary?.href || "/start";
  const primaryLabel = streamConfig?.primary?.configured ? "Open live room" : "Join build log";

  return (
    <main className="public-page live-experience-page">
      <section className="live-broadcast-stage">
        <div className="live-broadcast-copy">
          <div className="broadcast-ident">
            <span className="broadcast-live-state"><i />{streamConfig?.statusLabel || "Prelaunch room"}</span>
            <span>Day {latest.day} transmission</span>
            <span>YouTube + Twitch</span>
          </div>
          <span className="scoreboard-kicker">Live hub</span>
          <h1>The stream is the show.</h1>
          <p>
            Not a webinar. Not a polished workshop. This is the live operating room: scoreboard pressure,
            AI-assisted builds, product drops, clip pulls, and honest resets when something breaks.
          </p>
          <div className="experience-actions">
            <a className="experience-primary-action" href={primaryHref} target={streamConfig?.primary?.external ? "_blank" : undefined} rel="noreferrer">
              {primaryLabel}
              <span aria-hidden="true">↗</span>
            </a>
            <a className="experience-secondary-action" href="/60">
              Inspect the scoreboard
            </a>
          </div>
        </div>
        <aside className="live-control-tower">
          <div>
            <span>Signal status</span>
            <em>{streamConfigStatus === "local" ? "Fallback source" : "Primary source"}</em>
          </div>
          <strong>{streamConfig?.statusLabel || "Prelaunch room"}</strong>
          <p>{streamConfig?.message || fallbackStreamConfig.message}</p>
          {streamConfigStatus === "local" && <p className="panel-note">Local stream fallback is showing.</p>}
          <div className="signal-list">
            {destinations.map((item) => (
              <StreamDestinationLink item={item} key={item.key || item.name} />
            ))}
          </div>
        </aside>
        <BroadcastTicker items={["LIVE BUILD", "CHAT PICKS THE PRESSURE", "EVERY RESULT GETS A RECEIPT", "NO GURU EDITS"]} />
      </section>

      <PublicFollowerTicker liveFollowers={liveFollowers} latest={latest} />

      <section className="live-mission-board" aria-label={`Day ${latest.day} live mission`}>
        <div>
          <span>Day</span>
          <strong>{String(latest.day).padStart(2, "0")}</strong>
        </div>
        <article>
          <span>Current build target</span>
          <strong>{latest.mainGoal}</strong>
          <p>{latest.tomorrowPromise}</p>
        </article>
        <article>
          <span>Receipt to capture</span>
          <strong>{latest.proofAssets?.[0] || "Working-state proof"}</strong>
          <a href={`/day/${latest.day}`}>Open today's receipt <span aria-hidden="true">↗</span></a>
        </article>
      </section>

      <section className="public-section stream-command-section">
        <div>
          <span className="public-label">Pinned commands</span>
          <h2>Chat can always find the receipts.</h2>
        </div>
        <div className="stream-command-grid">
          {commands.map((item) => (
            <a key={item.command} href={item.href}>
              <strong>{item.command}</strong>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="run-of-show">
        {liveRunOfShow.map((item) => (
          <article key={item.title}>
            <span>{item.title}</span>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="public-section stream-arc-section">
        <div>
          <span className="public-label">Week 1 stream arc</span>
          <h2>The first week is already mapped.</h2>
          <p>
            The public show moves from setup proof to a weekly verdict. The paid course does not ask buyers
            to copy the stream; it teaches the Claude Code and Codex workflow behind the builds.
          </p>
          <a className="secondary-link" href="/kit">
            Open the kit
          </a>
        </div>
        <div className="stream-arc-grid">
          {firstWeekStreamArc.map((item) => (
            <article key={item.day}>
              <span>{item.day}</span>
              <strong>{item.title}</strong>
              <p>{item.proof}</p>
              <em>{item.cta}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section two-col">
        <div>
          <span className="public-label">Stream modes</span>
          <h2>Entertainment, with guardrails.</h2>
        </div>
        <div className="plain-list">
          <p>Show mode: build races, scoreboard checks, challenge segments, product drops.</p>
          <p>Work mode: code, dashboard, product builds, clips, planning.</p>
          <p>Privacy mode: calls, payments, customer data, family time, anything sensitive.</p>
          <p>Recap mode: daily numbers, shipped work, failure, lesson, tomorrow's promise.</p>
        </div>
      </section>
    </main>
  );
}

function StreamDestinationLink({ item }) {
  const content = (
    <>
      <span>{item.name}</span>
      <strong>{item.status}</strong>
    </>
  );

  if (item.href) {
    return (
      <a href={item.href} target={item.external ? "_blank" : undefined} rel="noreferrer">
        {content}
      </a>
    );
  }

  return <div className="pending">{content}</div>;
}

function ToolsPage({ latest }) {
  const commandLinks = [
    { command: "!scoreboard", title: "Public scoreboard", href: "/60", body: "The live numbers, goals, weekly recap, and latest status." },
    { command: "!dashboard", title: "Dashboard alias", href: "/60", body: "Same scoreboard link for anyone who remembers the older command." },
    { command: "!today", title: `Day ${latest.day} receipt`, href: `/day/${latest.day}`, body: "The current daily proof page for clips and recaps." },
    { command: "!day1", title: "Day 1 receipt", href: "/day/1", body: "The first public receipt page after the launch baseline is pushed." },
    { command: "!live", title: "Live hub", href: "/live", body: "Stream room, pinned commands, run of show, and mode guardrails." },
    { command: "!overlay", title: "Overlay route", href: "/overlay", body: "Clean browser-source URL for the scoreboard overlay." },
    { command: "!kit", title: productName, href: "/kit", body: "The first paid drop and member-product path." },
    { command: "!builds", title: operatorBundleProduct.name, href: "/live-builds", body: "The advanced skill, script, and blueprint bundle." },
    { command: "!start", title: "Build log", href: "/start", body: "Email capture for launch updates and daily receipts." },
    { command: "!members", title: "Member hub", href: "/members", body: "Supabase login, checkout recovery, and gated assets." },
    { command: "!runbook", title: "Launch runbook", href: "/members", body: "Members can download the Day 0 and Day 1 operating checklist from the hub." },
    { command: "/obs", title: "Short OBS alias", href: "/obs", body: "Same overlay, shorter URL for browser source setup." },
  ];

  return (
    <main className="public-page">
      <section className="public-section">
        <span className="public-label">Tools</span>
        <h1>Everything useful needs a command.</h1>
        <p>
          Use this as the public shelf for the sprint: scoreboard, receipts, stream room, overlay,
          product drop, member area, and the links chat should be able to find fast.
        </p>
      </section>

      <section className="public-section tool-command-section">
        <div>
          <span className="public-label">Command shelf</span>
          <h2>Chat links, operator links, proof links.</h2>
        </div>
        <div className="tool-link-grid">
          {commandLinks.map((item) => (
            <a key={`${item.command}-${item.href}`} href={item.href}>
              <span>{item.command}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="public-cards">
        <article className="tool-card live">
          <Icon name="chart" />
          <h2>60-Day Command Center</h2>
          <p>Public scoreboard, daily tracker, OBS overlay, spike detector, and proof deck.</p>
          <a href="/60">View tool</a>
        </article>
        <article className="tool-card">
          <Icon name="deck" />
          <h2>{productName}</h2>
          <p>The first paid drop: {productSubtitle.toLowerCase()}, daily workflow, proof templates, and operating system.</p>
          <a href="/kit">Preview drop</a>
        </article>
        <article className="tool-card">
          <Icon name="calendar" />
          <h2>Live Build Events</h2>
          <p>Stream-native builds first. Workshop assets come from the best live segments.</p>
          <span>Built before July 28</span>
        </article>
      </section>
    </main>
  );
}

function StartPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubscribe(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      await subscribeBuildLog({ email, name, source: "start_page" });
      setStatus("success");
      setMessage("You are on the build log. Your welcome email includes the free Operator Sampler — or grab it right here.");
      setEmail("");
      setName("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message === "valid_email_required" ? "Enter a real email first." : "Signup needs a retry.");
    }
  }

  return (
    <main className="public-page">
      <section className="start-hero">
        <div className="start-copy">
          <span className="public-label">Build log</span>
          <h1>Get the receipts before the 60-day AI sprint goes loud.</h1>
          <p>
            One email when the work produces proof: scoreboard movement, shipped builds, product drops,
            and the honest lesson from whatever broke that day.
          </p>
          <div className="receipt-strip" aria-label="Build log receipts">
            {buildLogReceipts.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <aside className="start-capture-panel">
          {status === "success" ? (
            <div className="start-confirmation">
              <span>
                <Icon name="check" />
              </span>
              <h2>You are on the build log.</h2>
              <p>{message}</p>
              <div className="hero-actions">
                <a className="primary-link" href="/downloads/operator-sampler.zip" download>
                  Download the free sampler
                </a>
                <a className="secondary-link" href="/60">
                  Watch the scoreboard
                </a>
              </div>
            </div>
          ) : (
            <>
              <div>
                <span>Prelaunch list</span>
                <strong>Daily receipts, no classroom fluff.</strong>
                <p>Join before July 28 and follow the setup from Day 0.</p>
              </div>
              <form className="start-form" aria-label="Email signup" onSubmit={handleSubscribe}>
                <input
                  type="text"
                  placeholder="First name"
                  aria-label="First name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <input
                  type="email"
                  placeholder="you@example.com"
                  aria-label="Email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? "Joining..." : "Join the build log"}
                </button>
              </form>
              {message && <p className={`form-message ${status}`}>{message}</p>}
            </>
          )}
        </aside>
      </section>

      <section className="start-proof-grid">
        {startPageProof.map((item) => (
          <article key={item.title}>
            <span>{item.title}</span>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function OperatorBundlePage({ authSession, authReady }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [accessCheck, setAccessCheck] = useState({ status: "idle" });

  useEffect(() => {
    if (!authSession?.access_token) return undefined;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const checkoutState = params.get("checkout");
    if (!sessionId || checkoutState !== "success") return undefined;

    let cancelled = false;
    setAccessCheck({
      status: "checking",
      title: "Checking your Operator Bundle",
      body: "Confirming Stripe payment and attaching the advanced vault to your profile.",
    });

    verifyCheckoutSession(sessionId, authSession.access_token)
      .then((result) => {
        if (cancelled) return;
        window.history.replaceState({}, "", "/live-builds?checkout=success");
        setAccessCheck({
          status: "success",
          title: "Bundle confirmed",
          body:
            result.entitlement?.product_key === operatorBundleProduct.key
              ? "Your New Wave Operator Bundle is attached to this profile."
              : "Stripe confirmed the payment and your profile was updated.",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const pending = error.data?.error === "checkout_not_paid";
        setAccessCheck({
          status: pending ? "pending" : "error",
          title: pending ? "Payment is not marked paid yet" : "Bundle check needs attention",
          body: pending
            ? "Stripe has the session, but it is not marked paid yet. Refresh in a moment if you completed payment."
            : error.message || "Could not verify the Operator Bundle yet.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authSession?.access_token]);

  async function handleSubscribe(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      await subscribeBuildLog({ email, name, source: "operator-bundle" });
      setStatus("success");
      setMessage("You are on the Operator Bundle update list.");
      setEmail("");
      setName("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not join the live-build list yet.");
    }
  }

  return (
    <main className="public-page">
      <section className="public-section live-builds-hero">
        <div>
          <span className="public-label">Complete bundle · {operatorBundleProduct.status}</span>
          <h1>{operatorBundleProduct.name}</h1>
          <p>{operatorBundleProduct.promise}</p>
          <div className="live-builds-positioning">
            <strong>{operatorBundleProduct.subtitle}</strong>
            <span>{operatorBundleProduct.positioning}</span>
          </div>
          <div className="hero-actions">
            <a className="primary-link" href="#operator-bundle-details">
              {operatorBundleProduct.primaryCta}
            </a>
            <a className="secondary-link" href="/kit">
              {operatorBundleProduct.secondaryCta}
            </a>
          </div>
        </div>
        <aside className="live-builds-ticket">
          <span>One-time bundle access</span>
          <strong>{operatorBundleProduct.priceLabel}</strong>
          <p>Includes the complete $47 course plus the advanced skill, script, review, debug, deployment, and blueprint vault.</p>
          <OperatorBundleCheckoutButton authSession={authSession} authReady={authReady} />
          {accessCheck.status !== "idle" && (
            <div className={`live-builds-access ${accessCheck.status}`}>
              <strong>{accessCheck.title}</strong>
              <p>{accessCheck.body}</p>
            </div>
          )}
          <form id="operator-bundle-list" className="start-form" onSubmit={handleSubscribe}>
            <input
              type="text"
              placeholder="First name"
              aria-label="First name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              type="email"
              placeholder="you@example.com"
              aria-label="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Joining..." : "Get bundle updates"}
            </button>
          </form>
          {message && <p className={`form-message ${status}`}>{message}</p>}
        </aside>
      </section>

      <section className="live-builds-outcomes">
        {operatorBundleOutcomes.map((outcome) => (
          <article key={outcome.title}>
            <span>{outcome.title}</span>
            <p>{outcome.body}</p>
          </article>
        ))}
      </section>

      <section id="operator-bundle-details" className="public-section live-builds-flow-section">
        <div>
          <span className="public-label">How to use the bundle</span>
          <h2>Foundation first. Advanced tools second.</h2>
          <p>
            The larger vault should not become a larger distraction. Finish the core setup, install only the skills tied to a
            repeated need, add a second-agent review pass, then use one blueprint for the next build.
          </p>
        </div>
        <div className="live-builds-flow">
          {operatorBundlePath.map((phase) => (
            <article key={phase.phase}>
              <strong>{phase.phase}</strong>
              <div>
                <span>{phase.time}</span>
                <h3>{phase.title}</h3>
                <p>{phase.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section live-build-room-queue-section">
        <div>
          <span className="public-label">Operator collections</span>
          <h2>Install by workflow, not by hype.</h2>
          <p>
            Each collection solves a specific stage of the build lifecycle. Start with the collection that removes a real
            repeated problem from your current work.
          </p>
        </div>
        <div className="live-build-room-queue">
          {operatorBundleCollections.map((collection) => (
            <article key={collection.key}>
              <span>{collection.label}</span>
              <h3>{collection.title}</h3>
              <strong>{collection.status} · {collection.estimatedTime}</strong>
              <p>{collection.outcome}</p>
              <em>{collection.proofTarget}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section live-builds-deliverables">
        <div>
          <span className="public-label">What is included</span>
          <h2>The repeatable systems behind the next build.</h2>
          <p>
            These are customer-safe versions of the workflows Murad uses. Private infrastructure, credentials, and company-only
            automation are deliberately excluded.
          </p>
        </div>
        <ul>
          {operatorBundleDeliverables.map((deliverable) => (
            <li key={deliverable}>{deliverable}</li>
          ))}
        </ul>
      </section>

      <section className="public-section live-builds-faq-section">
        <div>
          <span className="public-label">Before you upgrade</span>
          <h2>Buy the larger vault for a larger workflow.</h2>
        </div>
        <div className="kit-faq-list">
          {operatorBundleFaq.map((item) => (
            <article key={item.question}>
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
        <div className="kit-final-cta">
          <strong>Ready for the full operator system?</strong>
          <OperatorBundleCheckoutButton authSession={authSession} authReady={authReady} compact />
        </div>
      </section>
    </main>
  );
}

function OperatorBundleCheckoutButton({ authSession, authReady, compact = false }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleCheckout() {
    if (!authSession?.access_token) {
      window.location.href = "/members";
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await createOperatorBundleCheckout(authSession.access_token);
      window.location.href = data.url;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not open the Operator Bundle checkout.");
    }
  }

  return (
    <div className={`checkout-box ${compact ? "compact" : ""}`}>
      <button type="button" onClick={handleCheckout} disabled={!authReady || status === "loading"}>
        {authSession
          ? status === "loading"
            ? "Opening Stripe..."
            : `Unlock for ${operatorBundleProduct.priceLabel}`
          : "Create profile to unlock"}
      </button>
      {message && <p className="form-message error">{message}</p>}
    </div>
  );
}

function OperatorToolkitPage({ authSession, authReady }) {
  const checkoutCanceled = new URLSearchParams(window.location.search).get("checkout") === "cancel";

  return (
    <main className="public-page operator-toolkit-page">
      <section className="operator-toolkit-hero">
        <div className="operator-toolkit-hero-copy">
          <span className="public-label">Full system · Permanent launch edition + monthly updates</span>
          <h1>{operatorToolkitProduct.name}</h1>
          <p>{operatorToolkitProduct.promise}</p>
          <div className="operator-toolkit-hero-actions">
            <a className="primary-link" href="#toolkit-checkout">Install the full system</a>
            <a className="secondary-link" href="#compare-tiers">Compare tiers</a>
          </div>
          <div className="operator-toolkit-trust-strip">
            <span><PackageCheck size={17} aria-hidden="true" /> Launch edition stays yours</span>
            <span><RefreshCw size={17} aria-hidden="true" /> Versioned monthly releases</span>
            <span><ShieldCheck size={17} aria-hidden="true" /> Customer-safe system</span>
          </div>
        </div>
        <aside id="toolkit-checkout" className="operator-toolkit-pricing">
          <span>Complete setup</span>
          <strong>{operatorToolkitProduct.priceLabel}</strong>
          <p>{operatorToolkitProduct.checkoutLabel}</p>
          <ul>
            <li>Permanent 24-skill launch edition</li>
            <li>Both lower tiers included</li>
            <li>First month of system updates included</li>
            <li>Cancel future updates without losing the toolkit</li>
          </ul>
          <OperatorToolkitCheckoutButton authSession={authSession} authReady={authReady} />
          {checkoutCanceled && <em>Checkout was canceled. Nothing was charged.</em>}
        </aside>
      </section>

      <section className="operator-toolkit-outcomes" aria-label="Operator Toolkit outcomes">
        {operatorToolkitOutcomes.map((outcome, index) => (
          <article key={outcome.title}>
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <div><span>{outcome.title}</span><p>{outcome.body}</p></div>
          </article>
        ))}
      </section>

      <section id="compare-tiers" className="operator-tier-comparison">
        <header>
          <span className="public-label">Three clear levels</span>
          <h2>Buy the amount of system you are ready to operate.</h2>
          <p>The $97 bundle stays available. The full system earns the higher price through setup, installation, ownership, and ongoing versioned releases.</p>
        </header>
        <div className="operator-tier-grid">
          <article>
            <span>Learn</span>
            <strong>$47</strong>
            <h3>The Future Proof Method</h3>
            <p>Set up Claude Code and Codex and ship the first verified build.</p>
            <a href="/kit">Open starter course</a>
          </article>
          <article>
            <span>Repeat</span>
            <strong>$97</strong>
            <h3>{operatorBundleProduct.name}</h3>
            <p>Add focused skills, advanced scripts, review, debugging, deployment, and blueprints.</p>
            <a href="/live-builds">Open Operator Bundle</a>
          </article>
          <article className="featured">
            <span>Install</span>
            <strong>$297 + $30/mo</strong>
            <h3>{operatorToolkitProduct.name}</h3>
            <p>Install the complete customer-safe command center and keep its release channel active.</p>
            <a href="#toolkit-checkout">Choose full system</a>
          </article>
        </div>
      </section>

      <section className="operator-toolkit-path-section">
        <header>
          <span className="public-label">Installation path</span>
          <h2>From clean environment to verified operating system.</h2>
        </header>
        <div className="operator-toolkit-path">
          {operatorToolkitPath.map((phase) => (
            <article key={phase.phase}>
              <strong>{phase.phase}</strong>
              <div><span>{phase.time}</span><h3>{phase.title}</h3><p>{phase.body}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="operator-toolkit-collections-section">
        <header>
          <span className="public-label">24 original skills</span>
          <h2>Four collections. Installed by actual need.</h2>
          <p>The pack includes matching project layouts for Claude Code and Codex. Every skill has an explicit workflow, output contract, and safety guardrails.</p>
        </header>
        <div className="operator-toolkit-collections">
          {operatorToolkitCollections.map((collection) => (
            <article key={collection.key}>
              <span>{collection.label}</span>
              <strong>{collection.status}</strong>
              <h3>{collection.title}</h3>
              <p>{collection.outcome}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="operator-toolkit-ownership">
        <div>
          <span className="public-label">Permanent ownership</span>
          <h2>The launch edition remains yours.</h2>
          <p>The $297 purchase permanently unlocks the setup, 24-skill ZIP, command center, templates, playbooks, and recovery system.</p>
        </div>
        <div>
          <span className="public-label">Recurring continuity</span>
          <h2>The $30/month keeps the system current.</h2>
          <p>Active members receive new and revised skills, compatibility reviews, release notes, migrations, verification receipts, and rollback instructions.</p>
        </div>
      </section>

      <section className="operator-toolkit-release-preview">
        <header>
          <span className="public-label">Release discipline</span>
          <h2>Every update has a version and a rollback.</h2>
        </header>
        <div>
          {operatorToolkitReleases.map((release) => (
            <article key={release.version}>
              <strong>v{release.version}</strong>
              <span>{release.access}</span>
              <h3>{release.title}</h3>
              <p>{release.summary}</p>
              <em>{release.date}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="operator-toolkit-faq">
        <header>
          <span className="public-label">Billing and access</span>
          <h2>No hidden ownership rules.</h2>
        </header>
        <div className="kit-faq-list">
          {operatorToolkitFaq.map((item) => (
            <article key={item.question}><strong>{item.question}</strong><p>{item.answer}</p></article>
          ))}
        </div>
        <div className="operator-toolkit-final-cta">
          <div><span>Initial payment</span><strong>$327 today</strong><small>$30/month thereafter</small></div>
          <OperatorToolkitCheckoutButton authSession={authSession} authReady={authReady} compact />
        </div>
      </section>
    </main>
  );
}

function OperatorToolkitCheckoutButton({ authSession, authReady, compact = false }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleCheckout() {
    if (!authSession?.access_token) {
      window.location.href = "/members?next=operator-toolkit";
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await createOperatorToolkitCheckout(authSession.access_token);
      window.location.href = data.url;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not open the Operator Toolkit checkout.");
    }
  }

  return (
    <div className={`checkout-box operator-toolkit-checkout ${compact ? "compact" : ""}`}>
      <button type="button" onClick={handleCheckout} disabled={!authReady || status === "loading"}>
        {authSession ? (status === "loading" ? "Opening Stripe..." : "Pay $327 and activate") : "Create profile to continue"}
      </button>
      <small>$297 permanent setup + first $30 month. Then $30/month until canceled.</small>
      {message && <p className="form-message error">{message}</p>}
    </div>
  );
}

function MembersPage({ authSession, authReady, activeModuleKey }) {
  const [memberData, setMemberData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState(null);
  const [accessCheck, setAccessCheck] = useState({ status: "idle" });
  const [activeMemberProduct, setActiveMemberProduct] = useState(() =>
    new URLSearchParams(window.location.search).get("product") === "operator-toolkit"
      ? "operator-toolkit"
      : "future-method",
  );
  const accessToken = authSession?.access_token;
  const requestedNext = new URLSearchParams(window.location.search).get("next");
  const futureMethodPurchased = Boolean(
    memberData?.entitlements?.some((entitlement) => entitlement.product_key === productKey && entitlement.status === "active"),
  );
  const operatorBundlePurchased = Boolean(
    memberData?.entitlements?.some(
      (entitlement) => entitlement.product_key === operatorBundleProduct.key && entitlement.status === "active",
    ),
  );
  const operatorToolkitEntitled = Boolean(
    memberData?.entitlements?.some(
      (entitlement) => entitlement.product_key === operatorToolkitProduct.key && entitlement.status === "active",
    ),
  );
  const operatorUpdatesEntitled = Boolean(
    memberData?.entitlements?.some(
      (entitlement) => entitlement.product_key === operatorUpdatesProduct.key && entitlement.status === "active",
    ),
  );
  const operatorUpdateSubscription = memberData?.subscriptions?.find(
    (subscription) => subscription.product_key === operatorUpdatesProduct.key,
  );
  const operatorBundleEntitled = operatorBundlePurchased || operatorToolkitEntitled;
  const futureMethodEntitled = futureMethodPurchased || operatorBundleEntitled || operatorToolkitEntitled;
  const hasAnyPaidAccess = futureMethodEntitled || operatorBundleEntitled || operatorToolkitEntitled;
  const entitledProductCount = [futureMethodEntitled, operatorBundleEntitled, operatorToolkitEntitled].filter(Boolean).length;

  useEffect(() => {
    if (activeModuleKey && futureMethodEntitled) {
      setActiveMemberProduct("future-method");
      return;
    }
    if (activeMemberProduct === "future-method" && futureMethodEntitled) return;
    if (activeMemberProduct === "operator-bundle" && operatorBundleEntitled) return;
    if (activeMemberProduct === "operator-toolkit" && operatorToolkitEntitled) return;
    if (futureMethodEntitled) {
      setActiveMemberProduct("future-method");
    } else if (operatorBundleEntitled) {
      setActiveMemberProduct("operator-bundle");
    } else if (operatorToolkitEntitled) {
      setActiveMemberProduct("operator-toolkit");
    }
  }, [activeMemberProduct, activeModuleKey, futureMethodEntitled, operatorBundleEntitled, operatorToolkitEntitled]);

  const refreshMemberAccess = useCallback(
    async ({ verifyCheckout = true } = {}) => {
      if (!accessToken) return;

      setStatus("loading");
      const params = new URLSearchParams(window.location.search);
      const sessionId = verifyCheckout ? params.get("session_id") : null;
      let verifiedAccess = null;

      try {
        if (sessionId) {
          setAccessCheck({
            status: "checking",
            title: "Checking your Stripe payment",
            body: "Confirming the session and unlocking your member profile.",
          });
          const result = await verifyCheckoutSession(sessionId, accessToken);
          verifiedAccess = result.access || null;
          const verifiedProduct = result.product_key === operatorToolkitProduct.key ? "&product=operator-toolkit" : "";
          window.history.replaceState({}, "", `/members?checkout=success${verifiedProduct}`);
          if (result.product_key === operatorToolkitProduct.key) setActiveMemberProduct("operator-toolkit");
          setNotice({ tone: "success", text: "Payment verified. Your profile is unlocked." });
          setAccessCheck({
            status: "success",
            title: "Access unlocked",
            body: "Stripe confirmed the payment and the entitlement is active on your profile.",
          });
        }

        const data = verifiedAccess || (await getMemberProfile(accessToken));
        setMemberData(data);
        setStatus("ready");
      } catch (error) {
        const isPendingPayment = error.data?.error === "checkout_not_paid";
        setAccessCheck({
          status: isPendingPayment ? "pending" : "error",
          title: isPendingPayment ? "Payment not finished yet" : "Access check needs attention",
          body: isPendingPayment
            ? "Stripe has the session, but it is not marked paid yet. If you completed payment, refresh access in a moment."
            : "The profile loaded path is still available. Refresh access after Stripe or login catches up.",
        });

        try {
          const data = await getMemberProfile(accessToken);
          setMemberData(data);
          setStatus("ready");
          setNotice({
            tone: isPendingPayment ? "success" : "error",
            text: isPendingPayment
              ? "Your profile is active. Finish checkout or refresh after payment clears."
              : error.message || "Could not verify checkout yet.",
          });
        } catch (profileError) {
          setStatus("error");
          setNotice({ tone: "error", text: profileError.message || "Could not load member profile." });
        }
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!accessToken) {
      setMemberData(null);
      setStatus("idle");
      return undefined;
    }

    refreshMemberAccess();
    return () => {
      // The current calls are short-lived fetches; state changes after route changes are harmless in this SPA.
    };
  }, [accessToken, refreshMemberAccess]);

  async function handleMemberSignOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/members";
    } catch (error) {
      setNotice({ tone: "error", text: error.message || "Could not sign out yet." });
    }
  }

  return (
    <main className={`public-page members-page ${hasAnyPaidAccess ? "has-access" : ""}`}>
      <section className={`member-entry-header ${hasAnyPaidAccess ? "paid" : ""}`}>
        <div>
          <span className="member-entry-kicker">{hasAnyPaidAccess ? "Member build lab" : "Future Proof Method"}</span>
          <h1>{hasAnyPaidAccess ? "Pick up where you stopped." : "Set up. Build. Verify."}</h1>
          <p>
            {hasAnyPaidAccess
              ? "The workspace keeps one next action in front of you and the deeper course, scripts, and skills one click away."
              : `Sign in to access ${productName}, your progress, build scripts, starter skills, and first-build lab.`}
          </p>
          {notice?.text && <p className={`form-message ${notice.tone}`}>{notice.text}</p>}
        </div>
        <aside className="member-account-panel">
          <div className="member-account-state">
            <i className={hasAnyPaidAccess ? "active" : ""} aria-hidden="true" />
            <span>{hasAnyPaidAccess ? "Access active" : status === "loading" ? "Checking access" : authSession ? "Profile active" : "Secure login"}</span>
          </div>
          <strong>{authSession?.user?.email || "Your member profile"}</strong>
          <p>{hasAnyPaidAccess ? "Progress syncs to this account." : "Use the same email for login and checkout."}</p>
          <div className="member-account-actions">
            {authSession && (
              <button type="button" onClick={handleMemberSignOut}>
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            )}
            <a href="/60">
              <ExternalLink size={16} aria-hidden="true" />
              Public scoreboard
            </a>
          </div>
        </aside>
      </section>

      {!authReady && <MemberStateCard title="Checking profile" body="Loading Supabase session..." />}
      {authReady && !isSupabaseConfigured() && (
        <MemberStateCard
          title="Supabase env needed"
          body="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable member login."
        />
      )}
      {authReady && isSupabaseConfigured() && !authSession && <AuthPanel />}
      {authSession && (
        <PurchaseRecoveryCard
          state={accessCheck}
          onRefresh={() => refreshMemberAccess({ verifyCheckout: true })}
          onProfileRefresh={() => refreshMemberAccess({ verifyCheckout: false })}
        />
      )}

      {authSession && status === "loading" && (
        <MemberStateCard title="Loading your workspace" body="Checking products, progress, and member assets." />
      )}

      {authSession && status === "ready" && entitledProductCount > 1 && !activeModuleKey && (
        <nav className="member-product-switcher" aria-label="Your products">
          <button
            type="button"
            className={activeMemberProduct === "future-method" ? "active" : ""}
            onClick={() => setActiveMemberProduct("future-method")}
          >
            <BookOpenText size={19} aria-hidden="true" />
            <span><strong>The Future Proof Method</strong><small>Starter course and core skills</small></span>
            <Check size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={activeMemberProduct === "operator-bundle" ? "active" : ""}
            onClick={() => setActiveMemberProduct("operator-bundle")}
          >
            <RadioTower size={19} aria-hidden="true" />
            <span><strong>{operatorBundleProduct.name}</strong><small>Advanced skills, scripts, and blueprints</small></span>
            <Check size={16} aria-hidden="true" />
          </button>
          {operatorToolkitEntitled && (
            <button
              type="button"
              className={activeMemberProduct === "operator-toolkit" ? "active" : ""}
              onClick={() => setActiveMemberProduct("operator-toolkit")}
            >
              <Layers3 size={19} aria-hidden="true" />
              <span><strong>{operatorToolkitProduct.name}</strong><small>Full setup and versioned updates</small></span>
              <Check size={16} aria-hidden="true" />
            </button>
          )}
        </nav>
      )}

      {authSession && status === "ready" && operatorBundleEntitled && activeMemberProduct === "operator-bundle" && (
        <OperatorBundleMemberPanel accessToken={authSession.access_token} bundle={memberData?.operatorBundle} />
      )}

      {authSession && status === "ready" && operatorToolkitEntitled && activeMemberProduct === "operator-toolkit" && (
        <OperatorToolkitMemberPanel
          accessToken={authSession.access_token}
          toolkit={memberData?.operatorToolkit}
          profile={memberData?.profile}
          updatesEntitled={operatorUpdatesEntitled}
          subscription={operatorUpdateSubscription}
          onRefresh={() => refreshMemberAccess({ verifyCheckout: false })}
        />
      )}

      {authSession && status === "ready" && !futureMethodEntitled && !operatorBundleEntitled && !operatorToolkitEntitled && (
        <section className="public-section unlock-section">
          <div>
            <span className="public-label">Unlock required</span>
            <h2>{requestedNext === "operator-toolkit" ? operatorToolkitProduct.name : productName}</h2>
            {requestedNext === "operator-toolkit" ? (
              <p>Your profile is active. Continue to the transparent mixed checkout: $327 today, then $30/month. The $297 launch edition remains yours if updates are canceled.</p>
            ) : (
              <p>Your profile is active. Buy the $47 starter course to unlock both-agent setup, guided modules, core prompt scripts, starter skills, and the first-build lab.</p>
            )}
          </div>
          {requestedNext === "operator-toolkit" ? (
            <OperatorToolkitCheckoutButton authSession={authSession} authReady={authReady} compact />
          ) : (
            <CheckoutButton authSession={authSession} authReady={authReady} />
          )}
        </section>
      )}

      {authSession && status === "ready" && futureMethodEntitled && activeMemberProduct === "future-method" && (
        <MemberModules
          accessToken={authSession.access_token}
          activeModuleKey={activeModuleKey}
          assets={memberData?.product?.assets || []}
          profile={memberData?.profile}
        />
      )}
    </main>
  );
}

function OperatorBundleMemberPanel({ accessToken, bundle }) {
  const [downloadState, setDownloadState] = useState({});
  const accessPlan = bundle?.accessPlan || operatorBundleAccessPlan;
  const assets = bundle?.assets || [];

  async function handleDownload(asset) {
    if (!asset?.key) return;

    setDownloadState((current) => ({ ...current, [asset.key]: "loading" }));
    try {
      const blob = await downloadOperatorBundleAsset(asset.key, accessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = asset.downloadName || `${asset.key}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadState((current) => ({ ...current, [asset.key]: "success" }));
    } catch (error) {
      setDownloadState((current) => ({ ...current, [asset.key]: "error" }));
    }
  }

  return (
    <section className="live-build-member-panel">
      <article className="live-build-member-hero">
        <div>
          <span className="public-label">{accessPlan.label}</span>
          <h2>Your advanced operator vault is active.</h2>
          <p>{accessPlan.accessNote}</p>
        </div>
        <div className="live-build-ticket-strip">
          <strong>{accessPlan.tier}</strong>
          <span>{accessPlan.status}</span>
          <a className="secondary-link" href="/live-builds">
            Open bundle page
          </a>
        </div>
      </article>

      <div className="live-build-member-grid">
        <article className="live-build-room-plan">
          <span>Activation outcome</span>
          <p>{accessPlan.activationPromise}</p>
          <div className="live-build-buyer-path">
            {accessPlan.buyerPath.map((step, index) => (
              <div key={step}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="live-build-prep-list">
          <span>Install discipline</span>
          <ul>
            {accessPlan.setupChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <section className="live-build-candidates">
        <div>
          <span className="public-label">Skill collections</span>
          <h2>Choose the workflow you need now.</h2>
        </div>
        <div className="live-build-candidate-list">
          {operatorBundleCollections.map((collection) => (
            <article key={collection.key}>
              <strong>{collection.title}</strong>
              <p>{collection.outcome}</p>
              <em>{collection.reuseMove}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="live-build-asset-section">
        <div>
          <span className="public-label">Operator assets</span>
          <h2>The advanced vault is ready.</h2>
          <p>Download only the collection tied to your current project so the larger bundle stays useful instead of noisy.</p>
        </div>
        <div className="live-build-asset-list">
          {assets.map((asset) => (
            <article key={asset.key}>
              <span>{asset.kind}</span>
              <strong>{asset.title}</strong>
              <p>{asset.description}</p>
              <button
                type="button"
                onClick={() => handleDownload(asset)}
                disabled={downloadState[asset.key] === "loading"}
              >
                {downloadState[asset.key] === "loading" ? "Downloading..." : "Download"}
              </button>
              {downloadState[asset.key] === "success" && <em>Saved</em>}
              {downloadState[asset.key] === "error" && <em>Retry</em>}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function OperatorToolkitMemberPanel({ accessToken, toolkit, profile, updatesEntitled, subscription, onRefresh }) {
  const accessPlan = toolkit?.accessPlan || operatorToolkitAccessPlan;
  const assets = toolkit?.assets || [];
  const updateAssets = toolkit?.updateAssets || [];
  const releases = toolkit?.releases || operatorToolkitReleases;
  const storageKey = `aiwithmurda:operator-toolkit-setup:${profile?.id || "member"}:v1`;
  const savedSetup = useMemo(() => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "null") || {};
    } catch {
      return {};
    }
  }, [storageKey]);
  const [activeView, setActiveView] = useState("setup");
  const [goal, setGoal] = useState(savedSetup.goal || "build-products");
  const [agentMode, setAgentMode] = useState(savedSetup.agentMode || "both");
  const [selectedCollections, setSelectedCollections] = useState(
    savedSetup.selectedCollections || ["foundation", "build-quality"],
  );
  const [setupChecks, setSetupChecks] = useState(savedSetup.setupChecks || {});
  const [downloadState, setDownloadState] = useState({});
  const [billingState, setBillingState] = useState("idle");
  const [billingMessage, setBillingMessage] = useState("");

  const goalOptions = [
    { key: "build-products", label: "Build products", collections: ["foundation", "build-quality", "design-product"] },
    { key: "automate-business", label: "Automate business", collections: ["foundation", "build-quality", "operations-growth"] },
    { key: "client-delivery", label: "Deliver client work", collections: ["foundation", "build-quality", "design-product", "operations-growth"] },
    { key: "launch-growth", label: "Launch and grow", collections: ["foundation", "design-product", "operations-growth"] },
  ];
  const selectedGoal = goalOptions.find((item) => item.key === goal) || goalOptions[0];
  const selectedCollectionDetails = operatorToolkitCollections.filter((collection) =>
    selectedCollections.includes(collection.key),
  );
  const completedSetupSteps = Object.values(setupChecks).filter(Boolean).length;

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ goal, agentMode, selectedCollections, setupChecks }),
    );
  }, [agentMode, goal, selectedCollections, setupChecks, storageKey]);

  function chooseGoal(option) {
    setGoal(option.key);
    setSelectedCollections(option.collections);
  }

  function toggleCollection(collectionKey) {
    setSelectedCollections((current) =>
      current.includes(collectionKey)
        ? current.filter((key) => key !== collectionKey)
        : [...current, collectionKey],
    );
  }

  async function handleDownload(asset, update = false) {
    setDownloadState((current) => ({ ...current, [asset.key]: "loading" }));
    try {
      const blob = update
        ? await downloadOperatorUpdateAsset(asset.key, accessToken)
        : await downloadOperatorToolkitAsset(asset.key, accessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = asset.downloadName || `${asset.key}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadState((current) => ({ ...current, [asset.key]: "success" }));
    } catch (error) {
      setDownloadState((current) => ({ ...current, [asset.key]: "error" }));
    }
  }

  const setupPlanMarkdown = useMemo(
    () => [
      "# Operator Toolkit Setup Plan",
      "",
      `Operator: ${profile?.email || "member"}`,
      `Primary goal: ${selectedGoal.label}`,
      `Agent mode: ${agentMode === "both" ? "Claude Code + Codex" : agentMode === "claude" ? "Claude Code" : "Codex"}`,
      `Setup progress: ${completedSetupSteps}/${accessPlan.setupChecklist.length}`,
      "",
      "## Install collections",
      "",
      ...selectedCollectionDetails.map((collection) => `- ${collection.title} (${collection.status})`),
      "",
      "## Setup sequence",
      "",
      ...accessPlan.setupChecklist.map((item, index) => `${setupChecks[index] ? "[x]" : "[ ]"} ${item}`),
      "",
      "## Verification",
      "",
      "- Save the clean environment receipt.",
      "- Run one real task through builder, reviewer, user-path test, and handoff.",
      "- Record the installed Operator System version and restore point.",
      "",
    ].join("\n"),
    [accessPlan.setupChecklist, agentMode, completedSetupSteps, profile?.email, selectedCollectionDetails, selectedGoal.label, setupChecks],
  );

  function handleDownloadSetupPlan() {
    downloadFile("operator-toolkit-setup-plan.md", setupPlanMarkdown, "text/markdown;charset=utf-8");
  }

  async function handleBillingPortal() {
    setBillingState("loading");
    setBillingMessage("");
    try {
      const data = await createBillingPortal(accessToken);
      window.location.href = data.url;
    } catch (error) {
      setBillingState("error");
      setBillingMessage(error.message || "Could not open billing management.");
    }
  }

  async function handleRestartUpdates() {
    setBillingState("loading");
    setBillingMessage("");
    try {
      const data = await createOperatorUpdatesCheckout(accessToken);
      window.location.href = data.url;
    } catch (error) {
      setBillingState("error");
      setBillingMessage(error.message || "Could not restart Operator System Updates.");
    }
  }

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <section className={`operator-toolkit-member active-view-${activeView}`}>
      <header className="operator-toolkit-member-header">
        <div>
          <span className="public-label">{accessPlan.label}</span>
          <h2>Your full operator system is ready.</h2>
          <p>{accessPlan.accessNote}</p>
        </div>
        <aside>
          <span>{accessPlan.tier}</span>
          <strong>{accessPlan.status}</strong>
          <em>{updatesEntitled ? "Updates active" : "Updates paused"}</em>
        </aside>
      </header>

      <nav className="operator-toolkit-member-nav" aria-label="Operator Toolkit sections">
        {[
          ["setup", "Setup", Layers3],
          ["system", "System files", PackageCheck],
          ["updates", "Updates", RefreshCw],
          ["billing", "Billing", ShieldCheck],
        ].map(([key, label, ViewIcon]) => (
          <button key={key} type="button" className={activeView === key ? "active" : ""} onClick={() => setActiveView(key)}>
            <ViewIcon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <section className="operator-toolkit-setup-view toolkit-member-view setup-view">
        <header>
          <div><span>Guided setup</span><h3>Build the system around your actual work.</h3></div>
          <strong>{completedSetupSteps}/{accessPlan.setupChecklist.length} setup checks</strong>
        </header>

        <div className="operator-toolkit-configurator">
          <fieldset>
            <legend>1. What are you operating?</legend>
            <div className="operator-toolkit-choice-grid">
              {goalOptions.map((option) => (
                <button key={option.key} type="button" className={goal === option.key ? "active" : ""} onClick={() => chooseGoal(option)}>
                  {goal === option.key && <Check size={15} aria-hidden="true" />}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>2. Which agent setup?</legend>
            <div className="operator-toolkit-choice-grid compact">
              {[
                ["both", "Claude Code + Codex"],
                ["claude", "Claude Code"],
                ["codex", "Codex"],
              ].map(([key, label]) => (
                <button key={key} type="button" className={agentMode === key ? "active" : ""} onClick={() => setAgentMode(key)}>
                  {agentMode === key && <Check size={15} aria-hidden="true" />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>3. Select skill collections</legend>
            <div className="operator-toolkit-collection-selector">
              {operatorToolkitCollections.map((collection) => (
                <label key={collection.key} className={selectedCollections.includes(collection.key) ? "active" : ""}>
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(collection.key)}
                    onChange={() => toggleCollection(collection.key)}
                  />
                  <span><strong>{collection.title}</strong><small>{collection.status} · {collection.outcome}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="operator-toolkit-setup-checks">
          <div><span>4. Installation sequence</span><p>Mark a step complete only when its evidence exists outside the agent transcript.</p></div>
          <div>
            {accessPlan.setupChecklist.map((item, index) => (
              <label key={item} className={setupChecks[index] ? "complete" : ""}>
                <input
                  type="checkbox"
                  checked={Boolean(setupChecks[index])}
                  onChange={(event) => setSetupChecks((current) => ({ ...current, [index]: event.target.checked }))}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="operator-toolkit-generated-plan">
          <div><span>Your setup plan</span><strong>{selectedGoal.label} · {selectedCollectionDetails.length} collections</strong></div>
          <pre>{setupPlanMarkdown}</pre>
          <button type="button" onClick={handleDownloadSetupPlan}>Download setup plan</button>
        </div>
      </section>

      <section className="operator-toolkit-system-view toolkit-member-view system-view">
        <header><div><span>Permanent launch edition</span><h3>Your owned system files.</h3></div><p>These remain available even if monthly updates end.</p></header>
        <div className="operator-toolkit-asset-grid">
          {assets.map((asset) => (
            <article key={asset.key}>
              <span>{asset.kind}</span><h4>{asset.title}</h4><p>{asset.description}</p>
              <button type="button" onClick={() => handleDownload(asset)} disabled={downloadState[asset.key] === "loading"}>
                {downloadState[asset.key] === "loading" ? "Downloading" : downloadState[asset.key] === "success" ? "Saved" : "Download"}
              </button>
              {downloadState[asset.key] === "error" && <em>Download failed. Retry.</em>}
            </article>
          ))}
        </div>
      </section>

      <section className="operator-toolkit-updates-view toolkit-member-view updates-view">
        <header>
          <div><span>Versioned releases</span><h3>{updatesEntitled ? "Your update channel is active." : "Your permanent toolkit is safe."}</h3></div>
          <p>{updatesEntitled ? "Read migration and rollback notes before applying a release." : "Future update files are paused until the $30/month channel is restarted."}</p>
        </header>
        <div className="operator-toolkit-release-list">
          {releases.map((release) => (
            <article key={release.version}>
              <strong>v{release.version}</strong><span>{release.access}</span><h4>{release.title}</h4><p>{release.summary}</p><em>{release.date}</em>
            </article>
          ))}
        </div>
        <div className={`operator-toolkit-update-assets ${updatesEntitled ? "active" : "locked"}`}>
          {updateAssets.map((asset) => (
            <article key={asset.key}>
              <span>{asset.kind}</span><h4>{asset.title}</h4><p>{asset.description}</p>
              <button type="button" onClick={() => handleDownload(asset, true)} disabled={!updatesEntitled || downloadState[asset.key] === "loading"}>
                {!updatesEntitled ? "Subscription required" : downloadState[asset.key] === "loading" ? "Downloading" : downloadState[asset.key] === "success" ? "Saved" : "Download update"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="operator-toolkit-billing-view toolkit-member-view billing-view">
        <header><div><span>Ownership and billing</span><h3>The toolkit and update channel are separate.</h3></div></header>
        <div className="operator-toolkit-billing-grid">
          <article className="owned"><PackageCheck size={24} aria-hidden="true" /><span>Permanent</span><h4>Operator Toolkit launch edition</h4><p>The $297 system remains attached to your profile.</p><strong>Owned</strong></article>
          <article className={updatesEntitled ? "active" : "paused"}><RefreshCw size={24} aria-hidden="true" /><span>Recurring</span><h4>Operator System Updates</h4><p>{updatesEntitled ? `${subscription?.cancel_at_period_end ? "Scheduled to end" : "Active"}${periodEnd ? ` · through ${periodEnd}` : ""}` : "No active update entitlement."}</p><strong>{updatesEntitled ? "$30/month" : "Paused"}</strong></article>
        </div>
        <div className="operator-toolkit-billing-actions">
          {subscription && <button type="button" onClick={handleBillingPortal} disabled={billingState === "loading"}>Manage billing</button>}
          {!updatesEntitled && <button type="button" onClick={handleRestartUpdates} disabled={billingState === "loading"}>Restart updates for $30/month</button>}
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={billingState === "loading"}>Refresh status</button>
        </div>
        {billingMessage && <p className="form-message error">{billingMessage}</p>}
      </section>
    </section>
  );
}

function PurchaseRecoveryCard({ state, onRefresh, onProfileRefresh }) {
  if (!state?.status || state.status === "idle") return null;

  const checking = state.status === "checking";
  const tone = state.status === "success" ? "success" : state.status === "pending" ? "pending" : "error";

  return (
    <section className={`access-recovery ${tone}`}>
      <div>
        <span className="public-label">Checkout recovery</span>
        <h2>{state.title}</h2>
        <p>{state.body}</p>
      </div>
      <div className="recovery-actions">
        <button type="button" onClick={onRefresh} disabled={checking}>
          {checking ? "Checking..." : "Refresh access"}
        </button>
        <button type="button" className="secondary-button" onClick={onProfileRefresh} disabled={checking}>
          Reload profile
        </button>
      </div>
    </section>
  );
}

function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handlePasswordAuth(event) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setStatus("loading");
    setMessage("");

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setStatus("success");
        setMessage("Signed in. Loading your workspace...");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/members` },
      });
      if (error) throw error;
      setStatus("success");
      setMessage(data.session ? "Profile created. Loading your workspace..." : "Profile created. Check your email to confirm it.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not access your profile.");
    }
  }

  async function handleMagicLink() {
    const supabase = getSupabaseClient();
    if (!supabase || !email) {
      setStatus("error");
      setMessage("Enter your email first.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/members` },
      });
      if (error) throw error;
      setStatus("success");
      setMessage("Secure sign-in link sent. Open it from your email.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not send the sign-in link.");
    }
  }

  return (
    <section className="member-auth-shell">
      <div>
        <span>Member access</span>
        <h2>Continue to your workspace.</h2>
        <p>Sign in with the profile connected to your purchase, or create one before checkout.</p>
      </div>
      <div className="member-auth-panel">
        <div className="member-auth-modes" aria-label="Member access mode">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
        </div>
        <form className="member-auth-form" onSubmit={handlePasswordAuth}>
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </label>
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button type="button" className="member-magic-link" onClick={handleMagicLink} disabled={status === "loading"}>
            Email me a secure sign-in link
          </button>
          {message && <p className={`form-message ${status}`} role="status">{message}</p>}
        </form>
      </div>
    </section>
  );
}

function TestPurchaseButton({ authSession }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleTestPurchase() {
    if (!authSession?.access_token) {
      setStatus("error");
      setMessage("Admin profile session missing. Sign into /admin again.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await createTestPurchaseCheckout(authSession.access_token);
      window.location.href = data.url;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not open the $2 test checkout.");
    }
  }

  return (
    <div className="checkout-box compact">
      <button type="button" onClick={handleTestPurchase} disabled={status === "loading"}>
        {status === "loading" ? "Opening Stripe..." : "Start $2 test purchase"}
      </button>
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </div>
  );
}

function AdminPasswordPanel({ authSession }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !authSession) return;

    if (password.length < 12) {
      setStatus("error");
      setMessage("Use at least 12 characters for the admin password.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("The password confirmation does not match.");
      return;
    }

    setStatus("loading");
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setStatus("success");
    setMessage("Admin password updated. Next time you can use email and password on /admin.");
  }

  return (
    <form className="admin-password-form" onSubmit={handlePasswordUpdate}>
      <label className="field">
        <span>New password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 12 characters"
          autoComplete="new-password"
          required
        />
      </label>
      <label className="field">
        <span>Confirm password</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat password"
          autoComplete="new-password"
          required
        />
      </label>
      <button type="submit" className="primary-action" disabled={status === "loading"}>
        {status === "loading" ? "Updating..." : "Set admin password"}
      </button>
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </form>
  );
}

function MemberStateCard({ title, body }) {
  return (
    <section className="public-section">
      <span className="public-label">Setup state</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

function MemberModules({ accessToken, activeModuleKey, assets, profile }) {
  const [downloadState, setDownloadState] = useState({});
  const [copiedPromptKey, setCopiedPromptKey] = useState("");
  const [copiedActionKitKey, setCopiedActionKitKey] = useState("");
  const [proofDraft, setProofDraft] = useState(() => ({
    moduleKey: activeModuleKey || productModules[0]?.key || "",
    before: "",
    after: "",
    proofLink: "",
    obstacle: "",
    lesson: "",
    cta: "",
    tomorrow: "",
  }));
  const [completionDraft, setCompletionDraft] = useState(() => loadCompletionDraft(profile?.email));
  const [completionDraftOwner, setCompletionDraftOwner] = useState(() => profile?.email || "");
  const [progressState, setProgressState] = useState({
    status: "loading",
    items: [],
    summary: { completed: 0, total: productTaskCount, percent: 0 },
    error: null,
  });
  const [taskSaving, setTaskSaving] = useState({});
  const [resourceQuery, setResourceQuery] = useState("");
  const [buildTrackKey, setBuildTrackKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return undefined;

    setProgressState((current) => ({ ...current, status: "loading", error: null }));
    getMemberProgress(accessToken)
      .then((data) => {
        if (cancelled) return;
        setProgressState({
          status: "ready",
          items: data.progress?.items || [],
          summary: data.progress?.summary || { completed: 0, total: productTaskCount, percent: 0 },
          error: null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setProgressState((current) => ({
          ...current,
          status: "error",
          error: "Progress could not load. Downloads still work.",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!activeModuleKey || !productModules.some((module) => module.key === activeModuleKey)) return;
    setProofDraft((current) =>
      current.moduleKey === activeModuleKey ? current : { ...current, moduleKey: activeModuleKey },
    );
  }, [activeModuleKey]);

  useEffect(() => {
    const owner = profile?.email || "";
    setCompletionDraft(loadCompletionDraft(owner));
    setCompletionDraftOwner(owner);
    if (typeof window !== "undefined") {
      setBuildTrackKey(window.localStorage.getItem(`future-proof-build-track:${owner || "member"}`) || "");
    }
  }, [profile?.email]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (completionDraftOwner !== (profile?.email || "")) return;
    window.localStorage.setItem(getCompletionDraftStorageKey(completionDraftOwner), JSON.stringify(completionDraft));
  }, [completionDraft, completionDraftOwner, profile?.email]);

  useEffect(() => {
    if (typeof window === "undefined" || !buildTrackKey) return;
    window.localStorage.setItem(`future-proof-build-track:${profile?.email || "member"}`, buildTrackKey);
  }, [buildTrackKey, profile?.email]);

  const completedTasks = useMemo(() => {
    return new Set(
      progressState.items
        .filter((item) => item.completed)
        .map((item) => `${item.moduleKey}:${item.taskKey}`),
    );
  }, [progressState.items]);

  const nextMemberTask = useMemo(() => {
    for (const module of productModules) {
      const todo = module.todos.find((item) => !completedTasks.has(`${module.key}:${item.key}`));
      if (todo) {
        return { module, todo };
      }
    }
    return null;
  }, [completedTasks]);
  const activeModule = useMemo(() => {
    return productModules.find((module) => module.key === activeModuleKey) || null;
  }, [activeModuleKey]);
  const assetsByTitle = useMemo(() => {
    return new Map(assets.map((asset) => [asset.title.toLowerCase(), asset]));
  }, [assets]);
  const filteredAssets = useMemo(() => {
    const query = resourceQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) =>
      [asset.title, asset.description, asset.kind].some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [assets, resourceQuery]);
  const selectedProofModule = useMemo(() => {
    return productModules.find((module) => module.key === proofDraft.moduleKey) || productModules[0] || null;
  }, [proofDraft.moduleKey]);
  const selectedBuildTrack = useMemo(() => {
    return firstBuildTracks.find((track) => track.key === buildTrackKey) || null;
  }, [buildTrackKey]);

  function mergeTaskProgress(items, nextItem) {
    const withoutItem = items.filter(
      (item) => !(item.moduleKey === nextItem.moduleKey && item.taskKey === nextItem.taskKey),
    );
    return [...withoutItem, nextItem];
  }

  async function handleDownload(asset) {
    if (!asset?.key) return;

    setDownloadState((current) => ({ ...current, [asset.key]: "loading" }));
    try {
      const blob = await downloadMemberAsset(asset.key, accessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = asset.downloadName || `${asset.key}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadState((current) => ({ ...current, [asset.key]: "success" }));
    } catch (error) {
      setDownloadState((current) => ({ ...current, [asset.key]: "error" }));
    }
  }

  async function handleTaskToggle(module, todo, completed) {
    const progressKey = `${module.key}:${todo.key}`;
    const optimisticItem = {
      moduleKey: module.key,
      taskKey: todo.key,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    const previousProgress = progressState;

    setTaskSaving((current) => ({ ...current, [progressKey]: "saving" }));
    setProgressState((current) => {
      const nextItems = mergeTaskProgress(current.items, optimisticItem);
      const completedCount = nextItems.filter((item) => item.completed).length;
      return {
        ...current,
        status: "ready",
        items: nextItems,
        summary: {
          completed: completedCount,
          total: productTaskCount,
          percent: productTaskCount ? Math.round((completedCount / productTaskCount) * 100) : 0,
        },
        error: null,
      };
    });

    try {
      const data = await updateMemberTaskProgress(
        { moduleKey: module.key, taskKey: todo.key, completed },
        accessToken,
      );
      setProgressState({
        status: "ready",
        items: data.progress?.items || [],
        summary: data.progress?.summary || { completed: 0, total: productTaskCount, percent: 0 },
        error: null,
      });
      setTaskSaving((current) => ({ ...current, [progressKey]: "saved" }));
    } catch (error) {
      setProgressState(previousProgress);
      setTaskSaving((current) => ({ ...current, [progressKey]: "error" }));
    }
  }

  async function handleCopyPrompt(module) {
    const prompt = module.lesson?.starterPrompt;
    if (!prompt) return;

    if (await copyPlainText(prompt)) {
      setCopiedPromptKey(module.key);
      window.setTimeout(() => {
        setCopiedPromptKey((current) => (current === module.key ? "" : current));
      }, 1600);
    } else {
      setCopiedPromptKey("");
    }
  }

  async function handleCopyActionKit(module) {
    if (!module?.actionKit) return;

    if (await copyPlainText(formatModuleActionKit(module))) {
      setCopiedActionKitKey(module.key);
      window.setTimeout(() => {
        setCopiedActionKitKey((current) => (current === module.key ? "" : current));
      }, 1600);
    } else {
      setCopiedActionKitKey("");
    }
  }

  function getModuleProgress(module) {
    const completed = module.todos.filter((todo) => completedTasks.has(`${module.key}:${todo.key}`)).length;
    const total = module.todos.length;
    return {
      completed,
      total,
      percent: total ? Math.round((completed / total) * 100) : 0,
    };
  }

  function findModuleTask(moduleKey, taskKey) {
    const module = productModules.find((item) => item.key === moduleKey);
    const todo = module?.todos.find((item) => item.key === taskKey);
    return module && todo ? { module, todo } : null;
  }

  function updateCompletionDraft(sectionTitle, value) {
    setCompletionDraft((current) => ({ ...current, [sectionTitle]: value }));
  }

  const activeModuleProgress = activeModule ? getModuleProgress(activeModule) : null;
  const selectedProofProgress = selectedProofModule
    ? getModuleProgress(selectedProofModule)
    : { completed: 0, total: 0, percent: 0 };
  const proofReceiptMarkdown = useMemo(() => {
    const receiptDate = new Date().toISOString().slice(0, 10);
    const fallback = (text) => text.trim() || "-";
    const completedModuleTasks =
      selectedProofModule?.todos
        .filter((todo) => completedTasks.has(`${selectedProofModule.key}:${todo.key}`))
        .map((todo) => `- ${todo.label}`) || [];

    return [
      "# Future Proof Method Build Receipt",
      "",
      `Date: ${receiptDate}`,
      `Operator: ${profile?.email || "member"}`,
      `Module: ${selectedProofModule?.title || "Not selected"}`,
      `Module progress: ${selectedProofProgress.completed}/${selectedProofProgress.total} tasks (${selectedProofProgress.percent}%)`,
      "",
      "## Completed tasks",
      completedModuleTasks.length ? completedModuleTasks.join("\n") : "-",
      "",
      "## Starting state",
      fallback(proofDraft.before),
      "",
      "## Working result",
      fallback(proofDraft.after),
      "",
      "## Verification link or file",
      fallback(proofDraft.proofLink),
      "",
      "## Friction",
      fallback(proofDraft.obstacle),
      "",
      "## Lesson",
      fallback(proofDraft.lesson),
      "",
      "## Reusable script or note",
      fallback(proofDraft.cta),
      "",
      "## Next build",
      fallback(proofDraft.tomorrow),
      "",
    ].join("\n");
  }, [
    profile?.email,
    proofDraft,
    selectedProofModule,
    completedTasks,
    selectedProofProgress.completed,
    selectedProofProgress.percent,
    selectedProofProgress.total,
  ]);
  const completionReceiptMarkdown = useMemo(() => {
    const receiptDate = new Date().toISOString().slice(0, 10);
    const fallback = (text) => String(text || "").trim() || "-";
    const criteria = courseCompletion.criteria
      .map((criterion, index) => {
        const module = productModules[index];
        const isDone = module?.todos.every((todo) => completedTasks.has(`${module.key}:${todo.key}`));
        return `- [${isDone ? "x" : " "}] ${criterion.title}\n  - Proof: ${criterion.proof}`;
      })
      .join("\n");
    const modules = productModules
      .map((module) => {
        const completed = module.todos.filter((todo) => completedTasks.has(`${module.key}:${todo.key}`));
        return `## ${module.title}

Progress: ${completed.length}/${module.todos.length} tasks
Output: ${module.lesson.output}
Done criteria: ${module.done}

Completed tasks:
${completed.length ? completed.map((todo) => `- ${todo.label}`).join("\n") : "-"}
`;
      })
      .join("\n");
    const receiptSections = courseCompletion.finalReceiptSections
      .map((section) => `## ${section.title}\n\nPrompt: ${section.prompt}\n\nAnswer:\n${fallback(completionDraft[section.title])}`)
      .join("\n\n");

    return [
      "# Future Proof Method Completion Receipt",
      "",
      `Date: ${receiptDate}`,
      `Operator: ${profile?.email || "member"}`,
      `Course progress: ${progressState.summary.completed}/${progressState.summary.total} tasks (${progressState.summary.percent}%)`,
      "",
      `## ${courseCompletion.capstone.title}`,
      courseCompletion.capstone.body,
      "",
      `Output: ${courseCompletion.capstone.output}`,
      "",
      "Capstone prompt:",
      courseCompletion.capstone.prompt,
      "",
      "## Completion criteria",
      criteria,
      "",
      "## Module receipts",
      modules,
      "## Certificate copy",
      courseCompletion.certificateCopy.map((line) => `- ${line}`).join("\n"),
      "",
      "## Final receipt",
      receiptSections,
      "",
    ].join("\n");
  }, [
    completedTasks,
    completionDraft,
    profile?.email,
    progressState.summary.completed,
    progressState.summary.percent,
    progressState.summary.total,
  ]);
  const completionAnswerCount = useMemo(() => {
    return courseCompletion.finalReceiptSections.filter((section) => completionDraft[section.title]?.trim()).length;
  }, [completionDraft]);
  const completionCertificateHtml = useMemo(() => {
    const issueDate = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const criteria = courseCompletion.criteria
      .map((criterion, index) => {
        const module = productModules[index];
        const isDone = Boolean(module?.todos.every((todo) => completedTasks.has(`${module.key}:${todo.key}`)));
        return `<li class="${isDone ? "done" : "open"}"><strong>${escapeCertificateHtml(
          isDone ? "Done" : "Open",
        )}</strong><span>${escapeCertificateHtml(criterion.title)}</span><p>${escapeCertificateHtml(criterion.proof)}</p></li>`;
      })
      .join("");
    const certificateLines = courseCompletion.certificateCopy
      .map((line) => `<p>${escapeCertificateHtml(line)}</p>`)
      .join("");
    const publicHost =
      typeof window !== "undefined" ? window.location.origin.replace(/^https?:\/\//, "") : "aiwithmurda.com";

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeCertificateHtml(courseCompletion.title)} Certificate</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; color: #f4fbf6; background: #06100a; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 48px 24px; }
    section { width: min(100%, 980px); padding: 48px; border: 1px solid rgba(97, 227, 109, 0.34); border-radius: 8px; background: radial-gradient(circle at 90% 10%, rgba(247, 201, 72, 0.18), transparent 30%), linear-gradient(135deg, rgba(97, 227, 109, 0.11), rgba(255, 255, 255, 0.035)); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35); }
    .kicker { margin: 0 0 18px; color: #61e36d; font-size: 12px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 780px; font-size: clamp(44px, 8vw, 88px); line-height: 0.92; letter-spacing: 0; }
    .operator { margin: 22px 0 0; color: #d8e6de; font-size: 21px; line-height: 1.45; }
    .operator strong { color: #f7c948; }
    .status-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 34px 0; }
    .status-grid div { padding: 16px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(0, 0, 0, 0.22); }
    .status-grid span { display: block; color: #9fb2a8; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .status-grid strong { display: block; margin-top: 8px; color: #f4fbf6; font-size: 25px; line-height: 1; }
    .certificate-copy { display: grid; gap: 10px; color: #d8e6de; font-size: 16px; line-height: 1.6; }
    .certificate-copy p { margin: 0; }
    ol { display: grid; gap: 10px; margin: 30px 0 0; padding: 0; list-style: none; }
    li { display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 8px 14px; padding: 14px; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 8px; background: rgba(255, 255, 255, 0.035); }
    li.done { border-color: rgba(97, 227, 109, 0.28); background: rgba(97, 227, 109, 0.08); }
    li strong { grid-row: span 2; align-self: start; justify-self: start; padding: 6px 8px; color: #061008; border-radius: 999px; background: #f7c948; font-size: 11px; text-transform: uppercase; }
    li.done strong { background: #61e36d; }
    li span { font-weight: 900; }
    li p { margin: 0; color: #9fb2a8; line-height: 1.45; }
    footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 36px; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #9fb2a8; font-size: 13px; }
    @media print { body { background: white; } main { padding: 0; } section { min-height: 100vh; box-shadow: none; } }
    @media (max-width: 720px) { section { padding: 28px; } .status-grid, li { grid-template-columns: 1fr; } li strong { grid-row: auto; } footer { flex-direction: column; } }
  </style>
</head>
<body>
  <main>
    <section>
      <p class="kicker">${escapeCertificateHtml(productName)} Completion Certificate</p>
      <h1>${escapeCertificateHtml(courseCompletion.title)}</h1>
      <p class="operator">Issued to <strong>${escapeCertificateHtml(profile?.email || "member")}</strong> on ${escapeCertificateHtml(
        issueDate,
      )}.</p>
      <div class="status-grid">
        <div><span>Progress</span><strong>${escapeCertificateHtml(progressState.summary.percent)}%</strong></div>
        <div><span>Tasks</span><strong>${escapeCertificateHtml(progressState.summary.completed)} / ${escapeCertificateHtml(
          progressState.summary.total,
        )}</strong></div>
        <div><span>Receipt draft</span><strong>${escapeCertificateHtml(completionAnswerCount)} / ${escapeCertificateHtml(
          courseCompletion.finalReceiptSections.length,
        )}</strong></div>
      </div>
      <div class="certificate-copy">${certificateLines}</div>
      <ol>${criteria}</ol>
      <footer>
        <span>${escapeCertificateHtml(productSubtitle)}</span>
        <span>${escapeCertificateHtml(publicHost)}</span>
      </footer>
    </section>
  </main>
</body>
</html>`;
  }, [
    completedTasks,
    completionAnswerCount,
    profile?.email,
    progressState.summary.completed,
    progressState.summary.percent,
    progressState.summary.total,
  ]);
  const completionSharePackMarkdown = useMemo(() => {
    const receiptDate = new Date().toISOString().slice(0, 10);
    const answerFor = (title) => completionDraft[title]?.trim() || "[add proof]";
    return [
      "# Future Proof Method First-Build Share Pack",
      "",
      `Date: ${receiptDate}`,
      `Operator: ${profile?.email || "member"}`,
      `Progress: ${progressState.summary.completed}/${progressState.summary.total} tasks (${progressState.summary.percent}%)`,
      `Receipt sections drafted: ${completionAnswerCount}/${courseCompletion.finalReceiptSections.length}`,
      "",
      "## Portfolio summary",
      "",
      `I completed ${productName} by setting up Claude Code and Codex, preparing an AI-ready project, and shipping one verified build.`,
      "",
      `Setup: ${answerFor("Setup receipt")}`,
      "",
      `Project: ${answerFor("Project packet")}`,
      "",
      `What works: ${answerFor("Working result")}`,
      "",
      `How it was verified: ${answerFor("Verification")}`,
      "",
      `Next build: ${answerFor("Next build")}`,
      "",
      "## Short completion note",
      "",
      `I did not finish this by watching lessons. I finished it by shipping and verifying: ${answerFor("Working result")}`,
      "",
      "## Verification blurb",
      "",
      `${productName} is built around a simple standard: if the user path and verification do not exist, the lesson is not complete. My completion includes both-agent setup, an AI-ready project, three starter skills, and one reproducible build.`,
      "",
      "## Next-build commitment",
      "",
      `My next smallest useful build is: ${answerFor("Next build")}`,
      "",
    ].join("\n");
  }, [
    completionAnswerCount,
    completionDraft,
    profile?.email,
    progressState.summary.completed,
    progressState.summary.percent,
    progressState.summary.total,
  ]);
  const firstRun = progressState.summary.completed === 0;
  const memberWorkspaceTabs = [
    { key: "today", label: "Start", body: "One next move", icon: House },
    { key: "course", label: "Build path", body: `${progressState.summary.completed}/${progressState.summary.total} steps`, icon: BookOpenText },
    { key: "tools", label: "Script vault", body: `${assets.length} resources`, icon: FolderDown },
    { key: "proof", label: "Build log", body: "Save evidence", icon: FileCheck2 },
    { key: "finish", label: "Ship", body: `${completionAnswerCount}/${courseCompletion.finalReceiptSections.length} drafted`, icon: Trophy },
  ];
  const [activeMemberTab, setActiveMemberTab] = useState(activeModuleKey ? "course" : "today");

  useEffect(() => {
    if (activeModuleKey) {
      setActiveMemberTab("course");
    }
  }, [activeModuleKey]);

  function updateProofDraft(field, value) {
    setProofDraft((current) => ({ ...current, [field]: value }));
  }

  function handleDownloadProofReceipt() {
    const receiptDate = new Date().toISOString().slice(0, 10);
    const moduleSlug = selectedProofModule?.key || "receipt";
    downloadFile(
      `future-proof-receipt-${receiptDate}-${moduleSlug}.md`,
      proofReceiptMarkdown,
      "text/markdown;charset=utf-8",
    );
  }

  function handleDownloadCompletionReceipt() {
    const receiptDate = new Date().toISOString().slice(0, 10);
    downloadFile(
      `future-proof-method-completion-${receiptDate}.md`,
      completionReceiptMarkdown,
      "text/markdown;charset=utf-8",
    );
  }

  function handleDownloadCompletionCertificate() {
    const receiptDate = new Date().toISOString().slice(0, 10);
    downloadFile(
      `future-proof-method-certificate-${receiptDate}.html`,
      completionCertificateHtml,
      "text/html;charset=utf-8",
    );
  }

  function handleDownloadCompletionSharePack() {
    const receiptDate = new Date().toISOString().slice(0, 10);
    downloadFile(
      `future-proof-method-share-pack-${receiptDate}.md`,
      completionSharePackMarkdown,
      "text/markdown;charset=utf-8",
    );
  }

  return (
    <section className={`member-hub active-tab-${activeMemberTab}${activeModuleKey ? " has-active-module" : ""}`}>
      <header className="member-workspace-header">
        <div className="member-workspace-title">
          <span><BookOpenText size={18} aria-hidden="true" /> Guided build workspace</span>
          <h2>{productName}</h2>
          <p>Set up both agents, follow one next step, and finish with a verified first build.</p>
        </div>
        <div className="member-workspace-progress">
          <div>
            <span>Overall progress</span>
            <strong>{progressState.summary.percent}%</strong>
          </div>
          <div className="member-progress-meter" aria-label={`${progressState.summary.percent}% complete`}>
            <i style={{ width: `${progressState.summary.percent}%` }} />
          </div>
          <small>{progressState.summary.completed} of {progressState.summary.total} implementation steps complete</small>
        </div>
      </header>

      <div className="member-workspace-shell">
        {!activeModuleKey && (
          <nav className="member-tab-nav" aria-label="Member workspace sections">
            <span className="member-tab-nav-label">Workspace</span>
            {memberWorkspaceTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={activeMemberTab === tab.key ? "active" : ""}
                  onClick={() => setActiveMemberTab(tab.key)}
                  aria-current={activeMemberTab === tab.key ? "page" : undefined}
                >
                  <TabIcon size={18} strokeWidth={2} aria-hidden="true" />
                  <span><strong>{tab.label}</strong><small>{tab.body}</small></span>
                </button>
              );
            })}
            <a className="member-sidebar-link" href="/60">
              <ExternalLink size={17} aria-hidden="true" />
              <span>Public scoreboard</span>
            </a>
          </nav>
        )}

        <div className="member-workspace-content">
          <section className="member-today-view member-tab-content tab-today">
            <header className="member-view-heading">
              <div>
                <span>Start here</span>
                <h2>{firstRun ? "Get both builders working." : "Continue the next verified step."}</h2>
              </div>
              <p>{firstRun ? "Your first session is already sequenced." : "Ignore the rest of the library until this step is complete."}</p>
            </header>

            <article className="member-next-action">
              <div className="member-next-action-copy">
                <span>{nextMemberTask ? nextMemberTask.module.title : "Course complete"}</span>
                {nextMemberTask ? (
                  <>
                    <h3>{nextMemberTask.todo.label}</h3>
                    <p><strong>Evidence required:</strong> {nextMemberTask.todo.proof}</p>
                    <small>Done means: {nextMemberTask.module.done}</small>
                  </>
                ) : (
                  <>
                    <h3>Package the first-build handoff.</h3>
                    <p>Record the working path, verification, known limits, and next smallest build.</p>
                    <small>The reproducible result is the credential.</small>
                  </>
                )}
              </div>
              <div className="member-next-action-cta">
                <span>{progressState.summary.percent}% complete</span>
                {nextMemberTask ? (
                  <a href={`/members/module/${nextMemberTask.module.key}`}>
                    Continue module <ArrowRight size={17} aria-hidden="true" />
                  </a>
                ) : (
                  <button type="button" onClick={() => setActiveMemberTab("proof")}>
                    Open build log <ArrowRight size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>

            {firstRun && (
              <section className="member-onboarding fresh">
                <div className="member-onboarding-copy">
                  <span>First session</span>
                  <h3>Your setup path is already decided.</h3>
                  <p>Work these four steps in order. Do not install extra skills or start a real build yet.</p>
                </div>
                <div className="onboarding-step-list">
                  {memberOnboardingSteps.map((step, index) => {
                    const asset = step.assetTitle ? assetsByTitle.get(step.assetTitle.toLowerCase()) : null;
                    const taskCompleted =
                      step.moduleKey && step.taskKey ? completedTasks.has(`${step.moduleKey}:${step.taskKey}`) : false;
                    const downloaded = asset ? downloadState[asset.key] === "success" : false;
                    const isDone = taskCompleted || downloaded;
                    const taskMatch = step.moduleKey && step.taskKey ? findModuleTask(step.moduleKey, step.taskKey) : null;

                    return (
                      <article key={step.key} className={isDone ? "done" : ""}>
                        <strong>{isDone ? <Check size={16} aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</strong>
                        <div>
                          <span>{step.title}</span>
                          <p>{step.body}</p>
                        </div>
                        {asset && (
                          <button type="button" onClick={() => handleDownload(asset)} disabled={downloadState[asset.key] === "loading"}>
                            {downloadState[asset.key] === "loading" ? "Downloading" : downloaded ? "Downloaded" : "Download"}
                          </button>
                        )}
                        {step.href && <a href={step.href}>Open</a>}
                        {taskMatch && (
                          <button
                            type="button"
                            onClick={() => handleTaskToggle(taskMatch.module, taskMatch.todo, !taskCompleted)}
                            disabled={taskSaving[`${taskMatch.module.key}:${taskMatch.todo.key}`] === "saving"}
                          >
                            {taskCompleted ? "Completed" : "Mark done"}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="member-build-track-picker">
              <div className="member-build-track-copy">
                <span>First-build direction</span>
                <h3>{selectedBuildTrack ? selectedBuildTrack.title : "Choose the kind of result you want to ship."}</h3>
                <p>
                  {selectedBuildTrack
                    ? selectedBuildTrack.body
                    : "This choice personalizes the Build Lab. It does not lock you into a stack or a giant project."}
                </p>
              </div>
              <div className="member-build-track-options" role="group" aria-label="Choose first-build direction">
                {firstBuildTracks.map((track) => (
                  <button
                    key={track.key}
                    type="button"
                    className={buildTrackKey === track.key ? "active" : ""}
                    onClick={() => setBuildTrackKey(track.key)}
                  >
                    <span>{buildTrackKey === track.key && <Check size={15} aria-hidden="true" />}{track.label}</span>
                    <strong>{track.title}</strong>
                    <small>{track.firstMove}</small>
                  </button>
                ))}
              </div>
              {selectedBuildTrack && (
                <div className="member-build-track-script">
                  <span>Starter script</span>
                  <p>{selectedBuildTrack.starterPrompt}</p>
                  <button type="button" onClick={() => copyPlainText(selectedBuildTrack.starterPrompt)}>Copy script</button>
                </div>
              )}
            </section>

            <div className="member-quick-actions" aria-label="Workspace shortcuts">
              <button type="button" onClick={() => setActiveMemberTab("course")}>
                <BookOpenText size={19} aria-hidden="true" />
                <span><strong>Open build path</strong><small>See the five implementation modules</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setActiveMemberTab("tools")}>
                <FolderDown size={19} aria-hidden="true" />
                <span><strong>Open script vault</strong><small>{assets.length} guided resources</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setActiveMemberTab("proof")}>
                <FileCheck2 size={19} aria-hidden="true" />
                <span><strong>Open build log</strong><small>Save verification and lessons</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </section>

      {activeModuleKey && (
        <section className="member-lesson-detail">
          {activeModule ? (
            <>
              <div className="lesson-detail-copy">
                <a className="text-link" href="/members">
                  Back to member hub
                </a>
                <span className="public-label">Module lesson</span>
                <h2>{activeModule.title}</h2>
                <p className="lesson-progress-copy">
                  {activeModuleProgress.completed} of {activeModuleProgress.total} module steps complete.
                </p>
                <p>{activeModule.body}</p>
                <div className="lesson-output-grid">
                  <article>
                    <span>Focus</span>
                    <strong>{activeModule.lesson.focus}</strong>
                  </article>
                  <article>
                    <span>Output</span>
                    <strong>{activeModule.lesson.output}</strong>
                  </article>
                </div>
                <ModuleActionKit
                  kit={activeModule.actionKit}
                  copied={copiedActionKitKey === activeModule.key}
                  onCopy={() => handleCopyActionKit(activeModule)}
                />
                <details className="member-lesson-deep-dive">
                  <summary>
                    <span>Open the full lesson</span>
                    <small>Framework, examples, workshop, questions, and common mistakes</small>
                  </summary>
                  <ModuleOperatorBrief brief={activeModule.operatorBrief} />
                  <div className="lesson-depth-grid">
                    <article>
                      <span>Deliverables</span>
                      <ul>
                        {activeModule.lesson.deliverables.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <span>Questions before completion</span>
                      <ul>
                        {activeModule.lesson.proofQuestions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <span>Traps to avoid</span>
                      <ul>
                        {activeModule.lesson.failureTraps.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                  <PremiumLessonContent premium={activeModule.premium} />
                </details>
                <em className="module-done">Done: {activeModule.done}</em>
              </div>
              <div className="lesson-action-stack">
                <article className="lesson-prompt-card">
                  <span>Copy this into your agent</span>
                  <p>{activeModule.lesson.starterPrompt}</p>
                  <button type="button" onClick={() => handleCopyPrompt(activeModule)}>
                    {copiedPromptKey === activeModule.key ? "Copied" : "Copy prompt"}
                  </button>
                </article>
                <article className="lesson-task-card">
                  <span>Complete these four steps</span>
                  <ul className="module-todo-list compact trackable">
                    {activeModule.todos.map((todo) => (
                      <li key={todo.key} className={completedTasks.has(`${activeModule.key}:${todo.key}`) ? "complete" : ""}>
                        <label>
                          <input
                            type="checkbox"
                            checked={completedTasks.has(`${activeModule.key}:${todo.key}`)}
                            disabled={taskSaving[`${activeModule.key}:${todo.key}`] === "saving"}
                            onChange={(event) => handleTaskToggle(activeModule, todo, event.target.checked)}
                          />
                          <ModuleTodoCopy todo={todo} />
                        </label>
                        {taskSaving[`${activeModule.key}:${todo.key}`] === "saved" && <em>Saved</em>}
                        {taskSaving[`${activeModule.key}:${todo.key}`] === "error" && <em>Retry</em>}
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="lesson-assets-card">
                  <span>Use only these resources</span>
                  <div className="lesson-download-list">
                    {activeModule.lesson.useWith.map((assetTitle) => {
                      const asset = assetsByTitle.get(assetTitle.toLowerCase());
                      if (!asset) {
                        return <em key={assetTitle}>{assetTitle}</em>;
                      }
                      return (
                        <button
                          key={asset.key}
                          type="button"
                          onClick={() => handleDownload(asset)}
                          disabled={downloadState[asset.key] === "loading"}
                        >
                          <strong>{asset.title}</strong>
                          <small>{downloadState[asset.key] === "loading" ? "Downloading..." : asset.kind}</small>
                        </button>
                      );
                    })}
                  </div>
                </article>
              </div>
            </>
          ) : (
            <div className="lesson-detail-copy">
              <a className="text-link" href="/members">
                Back to member hub
              </a>
              <span className="public-label">Module lesson</span>
              <h2>Module not found.</h2>
              <p>Use the member workspace to open one of the active build modules.</p>
            </div>
          )}
        </section>
      )}

      <section className="member-proof-builder member-tab-content tab-proof">
        <div className="proof-builder-copy">
          <span className="public-label">Build log</span>
          <h2>Save what changed before context disappears.</h2>
          <p>
            Capture the starting state, working result, verification, friction, reusable lesson, and next build. This log becomes
            the handoff for your next Claude Code or Codex session.
          </p>
          <button type="button" className="primary-action" onClick={handleDownloadProofReceipt}>
            Download build receipt
          </button>
        </div>
        <div className="proof-builder-panel">
          <div className="proof-builder-form">
            <label className="field proof-module-select">
              <span>Module</span>
              <select value={proofDraft.moduleKey} onChange={(event) => updateProofDraft("moduleKey", event.target.value)}>
                {productModules.map((module) => (
                  <option key={module.key} value={module.key}>
                    {module.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row two">
              <label className="field">
                <span>Starting state</span>
                <textarea
                  value={proofDraft.before}
                  onChange={(event) => updateProofDraft("before", event.target.value)}
                  placeholder="What was missing, broken, manual, or unclear?"
                />
              </label>
              <label className="field">
                <span>Working result</span>
                <textarea
                  value={proofDraft.after}
                  onChange={(event) => updateProofDraft("after", event.target.value)}
                  placeholder="What can the user do now?"
                />
              </label>
            </div>
            <label className="field">
              <span>Verification link or file</span>
              <input
                type="text"
                value={proofDraft.proofLink}
                onChange={(event) => updateProofDraft("proofLink", event.target.value)}
                placeholder="Test output, browser check, screenshot, commit, or build URL"
              />
            </label>
            <div className="form-row two">
              <label className="field">
                <span>Friction</span>
                <textarea
                  value={proofDraft.obstacle}
                  onChange={(event) => updateProofDraft("obstacle", event.target.value)}
                  placeholder="What slowed the work down?"
                />
              </label>
              <label className="field">
                <span>Lesson</span>
                <textarea
                  value={proofDraft.lesson}
                  onChange={(event) => updateProofDraft("lesson", event.target.value)}
                  placeholder="What did the task teach?"
                />
              </label>
            </div>
            <div className="form-row two">
              <label className="field">
                <span>Reusable script or note</span>
                <textarea
                  value={proofDraft.cta}
                  onChange={(event) => updateProofDraft("cta", event.target.value)}
                  placeholder="A prompt, rule, or workflow worth reusing"
                />
              </label>
              <label className="field">
                <span>Next build</span>
                <textarea
                  value={proofDraft.tomorrow}
                  onChange={(event) => updateProofDraft("tomorrow", event.target.value)}
                  placeholder="The next smallest useful improvement"
                />
              </label>
            </div>
          </div>
          <details className="proof-preview-shell">
            <summary>Preview build receipt</summary>
            <pre className="proof-preview">{proofReceiptMarkdown}</pre>
          </details>
        </div>
      </section>

          <section className="member-course-browser member-tab-content tab-course">
            <header className="member-view-heading">
              <div>
                <span>Build path</span>
                <h2>Five modules from setup to first ship.</h2>
              </div>
              <p>Open the current module, complete its four implementation steps, and move forward only when the output exists.</p>
            </header>
            {progressState.error && <p className="module-status error">{progressState.error}</p>}
            <div className="member-course-list">
              {productModules.map((module, index) => {
                const moduleProgress = getModuleProgress(module);
                const complete = moduleProgress.percent === 100;
                const current = nextMemberTask?.module.key === module.key;
                return (
                  <article key={module.key} className={`${complete ? "complete" : ""} ${current ? "current" : ""}`}>
                    <div className="member-module-index">
                      {complete ? <Check size={20} aria-label="Complete" /> : String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="member-module-copy">
                      <div>
                        <h3>{module.title.replace(/^Module \d+: /, "")}</h3>
                        <span>{moduleProgress.completed}/{moduleProgress.total} steps</span>
                      </div>
                      <p>{module.body}</p>
                      <dl>
                        <div><dt>Output</dt><dd>{module.lesson.output}</dd></div>
                        <div><dt>Work mode</dt><dd>{module.operatorBrief.mode}</dd></div>
                      </dl>
                      <div className="member-module-progress" aria-label={`${moduleProgress.percent}% complete`}>
                        <i style={{ width: `${moduleProgress.percent}%` }} />
                      </div>
                    </div>
                    <a href={`/members/module/${module.key}`}>
                      {current ? "Continue" : complete ? "Review" : "Open"}
                      <ArrowRight size={17} aria-hidden="true" />
                    </a>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="member-resource-library member-tab-content tab-tools">
            <header className="member-view-heading">
              <div>
                <span>Script vault</span>
                <h2>Open the tool tied to the current step.</h2>
              </div>
              <label className="member-resource-search">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  value={resourceQuery}
                  onChange={(event) => setResourceQuery(event.target.value)}
                  placeholder="Search scripts and skills"
                  aria-label="Search member scripts and skills"
                />
              </label>
            </header>
            <div className="member-resource-list">
              {filteredAssets.map((asset) => (
                <article key={asset.key}>
                  <div className="member-resource-icon"><Download size={19} aria-hidden="true" /></div>
                  <div>
                    <span>{asset.kind}</span>
                    <h3>{asset.title}</h3>
                    <p>{asset.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(asset)}
                    disabled={downloadState[asset.key] === "loading"}
                  >
                    <Download size={16} aria-hidden="true" />
                    {downloadState[asset.key] === "loading" ? "Downloading" : downloadState[asset.key] === "success" ? "Saved" : "Download"}
                  </button>
                  {downloadState[asset.key] === "error" && <em>Download failed. Try again.</em>}
                </article>
              ))}
              {!filteredAssets.length && (
                <div className="member-resource-empty">
                  <Search size={22} aria-hidden="true" />
                  <strong>No resources match “{resourceQuery}”.</strong>
                  <button type="button" onClick={() => setResourceQuery("")}>Clear search</button>
                </div>
              )}
            </div>
          </section>

          <section className="member-finish-view member-tab-content tab-finish">
            <header className="member-view-heading">
              <div>
                <span>Ship</span>
                <h2>Turn the first build into a reproducible handoff.</h2>
              </div>
              <p>Complete every module output, document the working path, then export the handoff, certificate, and share pack.</p>
            </header>
            <CourseCompletionPanel
              summary={progressState.summary}
              completedTasks={completedTasks}
              completionDraft={completionDraft}
              completionAnswerCount={completionAnswerCount}
              completionReceiptMarkdown={completionReceiptMarkdown}
              onCompletionDraftChange={updateCompletionDraft}
              onDownload={handleDownloadCompletionReceipt}
              onDownloadCertificate={handleDownloadCompletionCertificate}
              onDownloadSharePack={handleDownloadCompletionSharePack}
            />
          </section>
        </div>
      </div>
    </section>
  );
}

function CourseCompletionPanel({
  summary,
  completedTasks,
  completionDraft,
  completionAnswerCount,
  completionReceiptMarkdown,
  onCompletionDraftChange,
  onDownload,
  onDownloadCertificate,
  onDownloadSharePack,
}) {
  const complete = summary.total > 0 && summary.completed >= summary.total;
  const remaining = Math.max(summary.total - summary.completed, 0);
  const receiptSectionTotal = courseCompletion.finalReceiptSections.length;

  return (
    <section className={`course-completion-panel ${complete ? "complete" : ""}`}>
      <div className="completion-copy">
        <span className="public-label">{complete ? "Completion ready" : "Course finish line"}</span>
        <h2>{courseCompletion.title}</h2>
        <p>{courseCompletion.promise}</p>
        <div className="completion-capstone">
          <strong>{courseCompletion.capstone.title}</strong>
          <p>{courseCompletion.capstone.body}</p>
          <em>{courseCompletion.capstone.output}</em>
        </div>
      </div>
      <div className="completion-control">
        <div className="completion-meter-card">
          <strong>{summary.percent}%</strong>
          <span>{summary.completed}/{summary.total} steps complete</span>
          <p>
            {complete
              ? "Every module output is ready for the final handoff."
              : `${remaining} implementation steps left before the handoff is complete.`}
          </p>
          <p>{completionAnswerCount}/{receiptSectionTotal} receipt sections drafted.</p>
          <button type="button" className="primary-action" onClick={onDownload}>
            Download first-build handoff
          </button>
          <button type="button" className="secondary-action" onClick={onDownloadCertificate}>
            Download certificate
          </button>
          <button type="button" className="secondary-action" onClick={onDownloadSharePack}>
            Download share pack
          </button>
        </div>
        <div className="completion-criteria-list">
          {courseCompletion.criteria.map((criterion, index) => {
            const module = productModules[index];
            const isDone = Boolean(module?.todos.every((todo) => completedTasks.has(`${module.key}:${todo.key}`)));
            return (
              <article key={criterion.key} className={isDone ? "done" : ""}>
                <strong>{isDone ? "Done" : "Open"}</strong>
                <div>
                  <span>{criterion.title}</span>
                  <p>{criterion.proof}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="completion-builder">
        <div className="completion-builder-copy">
          <span className="public-label">Capstone builder</span>
          <h3>Write the build handoff while the evidence is still fresh.</h3>
          <p>
            These answers save in this browser and export inside the final handoff. Use test output, screenshots,
            commits, URLs, and notes that let another person reproduce the result.
          </p>
        </div>
        <div className="completion-section-grid">
          {courseCompletion.finalReceiptSections.map((section) => (
            <label className="field completion-section-field" key={section.title}>
              <span>{section.title}</span>
              <small>{section.prompt}</small>
              <textarea
                value={completionDraft[section.title] || ""}
                onChange={(event) => onCompletionDraftChange(section.title, event.target.value)}
                placeholder={`Write the ${section.title.toLowerCase()} proof here...`}
              />
            </label>
          ))}
        </div>
        <pre className="proof-preview completion-preview">{completionReceiptMarkdown}</pre>
      </div>
    </section>
  );
}

function ModuleTodoCopy({ todo }) {
  return (
    <span className="module-todo-copy">
      <strong>{todo.label}</strong>
      {todo.proof && <small>{todo.proof}</small>}
    </span>
  );
}

function ModuleOperatorBrief({ brief, compact = false }) {
  if (!brief) return null;

  const items = [
    ["Window", brief.window],
    ["Mode", brief.mode],
    ["Evidence", brief.proof],
    ["Why it matters", brief.why],
  ];

  return (
    <div className={`module-operator-brief ${compact ? "compact" : ""}`}>
      {items.map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}

function ModuleActionKit({ kit, copied, onCopy }) {
  if (!kit) return null;

  const items = [
    ["Timebox", kit.timebox],
    ["Next move", kit.todayMove],
    ["Commands or script", kit.runCommand],
    ["Verification", kit.proofCheckpoint],
    ["Stop rule", kit.stopRule],
  ];

  return (
    <div className="module-action-kit">
      <div className="module-action-kit-header">
        <span>Run kit</span>
        <button type="button" onClick={onCopy}>
          {copied ? "Copied run kit" : "Copy run kit"}
        </button>
      </div>
      <div className="module-action-kit-grid">
        {items.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function PremiumLessonContent({ premium }) {
  if (!premium) return null;

  return (
    <div className="premium-lesson-content">
      <article className="premium-lesson-hero">
        <span className="public-label">Premium lesson</span>
        <h3>{premium.headline}</h3>
        <p>{premium.promise}</p>
        <em>{premium.estimatedTime}</em>
      </article>
      <div className="premium-framework-grid">
        {premium.framework.map((item) => (
          <article key={item.name}>
            <span>{item.name}</span>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
      <div className="premium-lesson-blocks">
        {premium.lessonBlocks.map((block) => (
          <article key={block.title}>
            <h4>{block.title}</h4>
            <p>{block.body}</p>
            <ul>
              {block.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="premium-workshop-grid">
        {premium.workshop.map((workshop) => (
          <article key={workshop.title}>
            <span>{workshop.title}</span>
            <ol>
              {workshop.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      <article className="premium-example-card">
        <span>{premium.example.title}</span>
        <div>
          <strong>Before</strong>
          <p>{premium.example.before}</p>
        </div>
        <div>
          <strong>After</strong>
          <p>{premium.example.after}</p>
        </div>
        <ul>
          {premium.example.breakdown.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function PublicProofCard({ title, value }) {
  return (
    <article className="proof-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Header({ config, latest }) {
  return (
    <header className="top-header">
      <div>
        <h1>{config.title}</h1>
        <p>{config.subtitle}</p>
      </div>
      <div className="day-meter" aria-label={`Day ${latest.day} of ${config.totalDays}`}>
        <div className="day-title">
          <span>Day</span>
          <strong>{latest.day}</strong>
          <em>/ {config.totalDays}</em>
        </div>
        <DayRail currentDay={latest.day} totalDays={config.totalDays} />
      </div>
      <div className="countdown-card">
        <span>Days Remaining</span>
        <strong>{daysRemaining(config, latest.day)}</strong>
        <em>until Day {config.totalDays}</em>
      </div>
    </header>
  );
}

function Dashboard({ config, logs, latest, weeks, liveFollowers, onGenerateSlide }) {
  const progressItems = buildProgressItems(config, latest, liveFollowers);
  const recent = [...logs].sort((a, b) => b.day - a.day).slice(0, 5);
  const currentWeek = weeks.at(-1);
  const spike = detectSpike(logs, latest);

  return (
    <section className="dashboard-grid">
      <div className="metric-grid">
        {progressItems.map((item) => (
          <ProgressCard key={item.key} item={item} />
        ))}
      </div>

      <article className="panel sprint-panel">
        <PanelTitle icon="calendar" title="Today's Sprint" right={`Day ${latest.day}`} />
        <h2>{latest.mainGoal}</h2>
        <p>{latest.lessonLearned || "Daily lesson gets logged at night."}</p>
        <div className="check-list">
          {buildSprintChecklist(latest).map((item) => (
            <div key={item.label} className={item.done ? "done" : ""}>
              <span className="check-dot">{item.done ? "✓" : ""}</span>
              <span>{item.label}</span>
              <em>{item.done ? "Done" : "Open"}</em>
            </div>
          ))}
        </div>
        <div className="panel-actions">
          <button type="button" className="primary-action" onClick={onGenerateSlide}>
            Generate Day Slide
          </button>
        </div>
        <div className="ai-strip">
          <span>AI Pairing</span>
          <strong>Claude Code</strong>
          <strong className="blue">Codex</strong>
          <em>03:14:27</em>
        </div>
      </article>

      <article className="panel recent-panel">
        <PanelTitle icon="deck" title="Recent Daily Entries" />
        <div className="entry-list">
          {recent.map((record) => (
            <div key={record.day} className="entry-row">
              <div>
                <strong>Day {record.day}</strong>
                <span>{record.date}</span>
              </div>
              <p>{record.mainGoal}</p>
              <Icon name="check" />
            </div>
          ))}
        </div>
      </article>

      <article className={`panel spike-panel ${spike.isSpike ? "hot" : ""}`}>
        <PanelTitle icon="alert" title="Spike Detector" right="Last 24 Hours" />
        <h2>{spike.isSpike ? "Spike detected" : "No major spike"}</h2>
        <p>
          Followers {signedNumber(spike.followerGain)} · Revenue {signedCurrency(spike.revenueGain)}
        </p>
        <span>Cause: {spike.cause || "Normal daily movement"}</span>
        <MiniTrend logs={logs} />
      </article>

      <article className="panel overlay-panel">
        <PanelTitle icon="monitor" title="OBS Overlay Preview" />
        <CommandOverlay config={config} latest={latest} logs={logs} liveFollowers={liveFollowers} />
      </article>

      <article className="panel weekly-panel">
        <PanelTitle icon="chart" title={currentWeek?.label || "Weekly Recap"} />
        {currentWeek && <WeeklyRecap week={currentWeek} />}
      </article>
    </section>
  );
}

function DailyLog({
  config,
  logs,
  selectedDay,
  selectedRecord,
  setSelectedDay,
  updateRecord,
  updateFollowers,
  updateList,
  addNextDay,
  dirtyDays,
  syncStatus,
  syncMessage,
  onSyncSelectedDay,
}) {
  const gains = getDayGains(logs, selectedRecord);
  const selectedDirty = dirtyDays.includes(selectedRecord.day);
  const dailyRunSheet = getDailyRunSheet(selectedRecord, config);
  const dailyRunSheetText = formatDailyRunSheet(selectedRecord, dailyRunSheet);
  const dailyClipPacket = getDailyClipPacket(selectedRecord, dailyRunSheet);
  const dailyClipPacketText = formatDailyClipPacket(selectedRecord, dailyRunSheet, dailyClipPacket);
  const [runSheetCopyStatus, setRunSheetCopyStatus] = useState("idle");
  const [clipPacketCopyStatus, setClipPacketCopyStatus] = useState("idle");

  async function copyRunSheet() {
    if (await copyPlainText(dailyRunSheetText)) {
      setRunSheetCopyStatus("copied");
      window.setTimeout(() => setRunSheetCopyStatus("idle"), 1800);
    } else {
      setRunSheetCopyStatus("manual");
    }
  }

  async function copyClipPacket() {
    if (await copyPlainText(dailyClipPacketText)) {
      setClipPacketCopyStatus("copied");
      window.setTimeout(() => setClipPacketCopyStatus("idle"), 1800);
    } else {
      setClipPacketCopyStatus("manual");
    }
  }

  return (
    <section className="workspace-view">
      <div className="view-header">
        <div>
          <h2>Daily Log</h2>
          <p>One record powers the dashboard, overlay, deck, and recap.</p>
          <div className={`sync-pill ${selectedDirty ? "dirty" : "clean"}`}>
            {selectedDirty ? `Day ${selectedRecord.day} has unsynced changes` : `Day ${selectedRecord.day} is synced locally`}
          </div>
        </div>
        <div className="toolbar">
          <select value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))}>
            {[...logs]
              .sort((a, b) => a.day - b.day)
              .map((record) => (
                <option key={record.day} value={record.day}>
                  Day {record.day} · {record.date}
                </option>
              ))}
          </select>
          <button type="button" onClick={addNextDay} disabled={logs.length >= config.totalDays}>
            Add Next Day
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={onSyncSelectedDay}
            disabled={syncStatus === "loading" || !selectedRecord}
          >
            {syncStatus === "loading" ? "Syncing..." : `Sync Day ${selectedRecord.day}`}
          </button>
        </div>
      </div>
      {syncMessage && <p className={`form-message ${syncStatus}`}>{syncMessage}</p>}

      <div className="log-layout">
        <article className="panel log-form">
          <div className="form-row two">
            <Field
              label="Date"
              value={selectedRecord.date}
              onChange={(value) => updateRecord(selectedRecord.day, "date", value)}
            />
            <Field
              label="Status"
              value={selectedRecord.status}
              onChange={(value) => updateRecord(selectedRecord.day, "status", value)}
            />
          </div>
          <Field
            label="Main Goal"
            value={selectedRecord.mainGoal}
            onChange={(value) => updateRecord(selectedRecord.day, "mainGoal", value)}
          />

          <h3>Core Metrics</h3>
          <div className="form-row three">
            <Field
              label="Revenue Collected"
              type="number"
              value={selectedRecord.revenueCollected}
              onChange={(value) => updateRecord(selectedRecord.day, "revenueCollected", value)}
            />
            <Field
              label="Revenue Pipeline"
              type="number"
              value={selectedRecord.revenuePipeline}
              onChange={(value) => updateRecord(selectedRecord.day, "revenuePipeline", value)}
            />
            <Field
              label="Email Subscribers"
              type="number"
              value={selectedRecord.emailSubscribers}
              onChange={(value) => updateRecord(selectedRecord.day, "emailSubscribers", value)}
            />
          </div>

          <h3>Followers</h3>
          <div className="form-row five">
            {config.platforms.map((platform) => (
              <Field
                key={platform}
                label={platformLabel(platform)}
                type="number"
                value={selectedRecord.followers[platform] || 0}
                onChange={(value) => updateFollowers(selectedRecord.day, platform, value)}
              />
            ))}
          </div>

          <h3>Output</h3>
          <div className="form-row three">
            <Field
              label="Hours Streamed"
              type="number"
              value={selectedRecord.hoursStreamed}
              onChange={(value) => updateRecord(selectedRecord.day, "hoursStreamed", value)}
            />
            <Field
              label="Clips Posted"
              type="number"
              value={selectedRecord.clipsPosted}
              onChange={(value) => updateRecord(selectedRecord.day, "clipsPosted", value)}
            />
            <Field
              label="Builds Shipped"
              type="number"
              value={selectedRecord.buildsShipped}
              onChange={(value) => updateRecord(selectedRecord.day, "buildsShipped", value)}
            />
            <Field
              label="Outreach Sent"
              type="number"
              value={selectedRecord.outreachSent}
              onChange={(value) => updateRecord(selectedRecord.day, "outreachSent", value)}
            />
            <Field
              label="Calls Booked"
              type="number"
              value={selectedRecord.callsBooked}
              onChange={(value) => updateRecord(selectedRecord.day, "callsBooked", value)}
            />
            <Field
              label="Products Sold"
              type="number"
              value={selectedRecord.productsSold}
              onChange={(value) => updateRecord(selectedRecord.day, "productsSold", value)}
            />
          </div>

          <h3>Story</h3>
          <Textarea
            label="Best Moment"
            value={selectedRecord.bestMoment}
            onChange={(value) => updateRecord(selectedRecord.day, "bestMoment", value)}
          />
          <Textarea
            label="Biggest Failure"
            value={selectedRecord.biggestFailure}
            onChange={(value) => updateRecord(selectedRecord.day, "biggestFailure", value)}
          />
          <Textarea
            label="Lesson Learned"
            value={selectedRecord.lessonLearned}
            onChange={(value) => updateRecord(selectedRecord.day, "lessonLearned", value)}
          />
          <Textarea
            label="Tomorrow's Promise"
            value={selectedRecord.tomorrowPromise}
            onChange={(value) => updateRecord(selectedRecord.day, "tomorrowPromise", value)}
          />
        </article>

        <aside className="panel log-side">
          <section className="daily-run-sheet">
            <PanelTitle icon="calendar" title="Daily Run Sheet" right={`Day ${selectedRecord.day}`} />
            <span className="run-sheet-phase">{dailyRunSheet.label}</span>
            <h3>{dailyRunSheet.goal}</h3>
            <div className="run-sheet-block">
              <span>Stream beat</span>
              <p>{dailyRunSheet.streamBeat}</p>
            </div>
            <div className="run-sheet-block">
              <span>Proof target</span>
              <p>{dailyRunSheet.proofTarget}</p>
            </div>
            <div className="run-sheet-block">
              <span>Chat CTA</span>
              <p>{dailyRunSheet.cta}</p>
            </div>
            <div className="run-sheet-block">
              <span>Shutdown</span>
              <ul>
                {dailyRunSheet.shutdown.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <button type="button" className="primary-action" onClick={copyRunSheet}>
              {runSheetCopyStatus === "copied"
                ? "Copied run sheet"
                : runSheetCopyStatus === "manual"
                  ? "Manual copy ready"
                  : "Copy run sheet"}
            </button>
            {runSheetCopyStatus === "manual" ? (
              <textarea
                aria-label="Run sheet text"
                className="run-sheet-copy-box"
                readOnly
                value={dailyRunSheetText}
                onFocus={(event) => event.currentTarget.select()}
              />
            ) : null}
          </section>
          <section className="clip-packet">
            <PanelTitle icon="video" title="Daily Clip Packet" right={`${dailyClipPacket.hooks.length} hooks`} />
            <div className="clip-hook-list">
              {dailyClipPacket.hooks.map((hook) => (
                <article className="clip-hook-card" key={hook.label}>
                  <span>{hook.label}</span>
                  <p>{hook.text}</p>
                </article>
              ))}
            </div>
            <div className="clip-caption-card">
              <span>Recap caption</span>
              <p>{dailyClipPacket.caption}</p>
            </div>
            <div className="clip-caption-card">
              <span>Follow-up line</span>
              <p>{dailyClipPacket.followUp}</p>
            </div>
            <button type="button" className="primary-action" onClick={copyClipPacket}>
              {clipPacketCopyStatus === "copied"
                ? "Copied clip packet"
                : clipPacketCopyStatus === "manual"
                  ? "Manual copy ready"
                  : "Copy clip packet"}
            </button>
            {clipPacketCopyStatus === "manual" ? (
              <textarea
                aria-label="Clip packet text"
                className="run-sheet-copy-box"
                readOnly
                value={dailyClipPacketText}
                onFocus={(event) => event.currentTarget.select()}
              />
            ) : null}
          </section>
          <PanelTitle icon="chart" title={`Day ${selectedRecord.day} Delta`} />
          <DeltaList gains={gains} />
          <Field
            label="Spike Cause"
            value={selectedRecord.spikeCause}
            onChange={(value) => updateRecord(selectedRecord.day, "spikeCause", value)}
          />
          <Textarea
            label="Shipped Items"
            value={(selectedRecord.shippedItems || []).join("\n")}
            onChange={(value) => updateList(selectedRecord.day, "shippedItems", value)}
          />
          <Textarea
            label="Proof Assets"
            value={(selectedRecord.proofAssets || []).join("\n")}
            onChange={(value) => updateList(selectedRecord.day, "proofAssets", value)}
          />
        </aside>
      </div>
    </section>
  );
}

function OverlayView({ config, latest, logs, liveFollowers }) {
  return (
    <section className="workspace-view">
      <div className="view-header">
        <div>
          <h2>OBS Overlay</h2>
          <p>Use the transparent browser source route for the stream overlay.</p>
        </div>
        <div className="overlay-route-list">
          <code>{window.location.origin}/overlay</code>
          <span>Alias: {window.location.origin}/obs</span>
          <code>{window.location.origin}/overlay/followers</code>
          <span>Alias: {window.location.origin}/obs/followers</span>
        </div>
      </div>
      <div className="overlay-showcase">
        <CommandOverlay
          config={config}
          latest={latest}
          logs={logs}
          compact
          preview={isPrelaunch(config)}
          liveFollowers={liveFollowers}
        />
      </div>
      <div className="overlay-showcase follower-preview">
        <FollowerOverlay liveFollowers={liveFollowers} latest={latest} />
      </div>
    </section>
  );
}

function DeckView({ config, logs, weeks }) {
  const sorted = [...logs].sort((a, b) => a.day - b.day);
  const deckSummary = buildDeckSummary(config, sorted, weeks);
  const summaryCards = [
    {
      label: "Logged days",
      value: `${formatNumber(deckSummary.loggedDays)} / ${formatNumber(deckSummary.totalDays)}`,
      detail: `Latest Day ${deckSummary.latestDay || 0}`,
    },
    {
      label: "Best follower week",
      value: deckSummary.bestFollowerWeek?.label || "Pending",
      detail: `+${formatNumber(deckSummary.bestFollowerWeek?.followerGain || 0)} followers`,
    },
    {
      label: "Best revenue week",
      value: deckSummary.bestRevenueWeek?.label || "Pending",
      detail: `+${formatCurrency(deckSummary.bestRevenueWeek?.revenueGain || 0)}`,
    },
    {
      label: "Best clip week",
      value: deckSummary.bestClipWeek?.label || "Pending",
      detail: `+${formatNumber(deckSummary.bestClipWeek?.clipsGain || 0)} clips`,
    },
  ];

  function exportJson() {
    downloadFile("60-day-command-center-log.json", JSON.stringify({ config, logs: sorted }, null, 2), "application/json");
  }

  function exportCsv() {
    downloadFile("60-day-command-center-log.csv", toCsv(sorted), "text/csv");
  }

  function exportDeckHtml() {
    downloadFile("60-day-command-center-deck.html", buildDeckHtml(config, sorted), "text/html");
  }

  return (
    <section className="workspace-view">
      <div className="view-header">
        <div>
          <h2>Proof Deck</h2>
          <p>Daily slides and weekly recaps generated from the tracker.</p>
        </div>
        <div className="toolbar">
          <button type="button" onClick={exportJson}>
            Export JSON
          </button>
          <button type="button" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="primary-action" onClick={exportDeckHtml}>
            Export Deck HTML
          </button>
        </div>
      </div>

      <div className="deck-summary-strip">
        {summaryCards.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="deck-layout">
        <article className="deck-slide cover-slide">
          <span>{config.publicGoalLabel}</span>
          <h2>{config.title}</h2>
          <p>{config.subtitle}</p>
        </article>

        {weeks.map((week) => (
          <article key={week.label} className="deck-slide weekly-slide">
            <span>{week.label}</span>
            <h2>Weekly Recap</h2>
            <div className="slide-metrics">
              <strong>{formatCurrency(week.revenueGain)}</strong>
              <strong>{formatNumber(week.followerGain)} followers</strong>
              <strong>{formatNumber(week.clipsGain)} clips</strong>
            </div>
            <p>
              Biggest follower jump: Day {week.bestFollowerDay.record.day} · +
              {formatNumber(week.bestFollowerDay.gain)}
            </p>
          </article>
        ))}

        {sorted.map((record) => {
          const gains = getDayGains(sorted, record);
          return (
            <article key={record.day} className="deck-slide">
              <span>
                Day {record.day} / {config.totalDays} · {record.date}
              </span>
              <h2>{record.mainGoal}</h2>
              <div className="slide-metrics">
                <strong>{formatCurrency(record.revenueCollected)}</strong>
                <strong>{formatNumber(totalFollowers(record))} followers</strong>
                <strong>+{formatNumber(gains.followers)} today</strong>
              </div>
              <p>{record.lessonLearned || record.bestMoment}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MetricsAutomationPanel({ summary, status, message, onRefresh }) {
  const snapshot = summary?.snapshot || {};
  const campaign = summary?.campaign || {};
  const sources = summary?.sources || [];
  const events = summary?.events || [];
  const nextBuilds = summary?.nextBuilds || [];
  const liveCount = sources.filter((source) => source.status === "live").length;

  return (
    <article className="panel metrics-automation-panel">
      <PanelTitle icon="chart" title="Metrics Automation Hub" right={status === "success" ? `${liveCount}/${sources.length} live` : "Admin"} />
      <div className="automation-hero">
        <div>
          <span className="panel-kicker">Source of truth</span>
          <strong>The official campaign ledger runs itself.</strong>
          <p>
            July 28 is the hard start. The server opens each day, reconciles Stripe and email,
            counts Twitch time once across the multistream, and rejects duplicate clip events.
          </p>
        </div>
        <button type="button" className="primary-action" onClick={onRefresh} disabled={status === "loading"}>
          {status === "loading" ? "Refreshing..." : "Refresh automation"}
        </button>
      </div>
      <div className="automation-snapshot-grid">
        <KeyValue label="Email list" value={formatNumber(snapshot.emailSubscribers || 0)} positive />
        <KeyValue label="Revenue" value={formatCurrency((snapshot.revenueCents || 0) / 100)} positive />
        <KeyValue label="Orders" value={formatNumber(snapshot.paidPurchases || 0)} />
        <KeyValue label="Members" value={formatNumber(snapshot.activeMembers || 0)} positive />
        <KeyValue
          label="Campaign mode"
          value={campaign.campaign?.isRehearsal ? "Rehearsal" : campaign.campaign?.isComplete ? "Complete" : "Live"}
          positive={!campaign.campaign?.isRehearsal}
        />
        <KeyValue label="Official day" value={campaign.campaign?.currentDay ? `Day ${campaign.campaign.currentDay}` : "Day 0"} />
        <KeyValue label="Clips logged" value={formatNumber(snapshot.clipsPosted || 0)} />
        <KeyValue label="Stream hours" value={formatNumber(snapshot.hoursStreamed || 0)} />
      </div>
      <div className="automation-source-list">
        {sources.map((source) => (
          <article key={source.key} className={`automation-source ${source.status}`}>
            <div>
              <span>{source.label}</span>
              <strong>{source.metric}</strong>
              <p>{source.detail}</p>
            </div>
            <div>
              <em>{source.status.replace("-", " ")}</em>
              <small>{source.mode}</small>
            </div>
            <p>{source.next}</p>
          </article>
        ))}
      </div>
      <div className="automation-bottom-grid">
        <section>
          <span className="panel-kicker">Recent tracked events</span>
          <div className="automation-event-list">
            {events.length ? (
              events.map((event, index) => (
                <div key={`${event.type}-${event.at}-${index}`}>
                  <span>{event.type}</span>
                  <strong>{event.label}</strong>
                  <p>{event.detail}</p>
                  <em>{event.at ? new Date(event.at).toLocaleString() : "Unknown time"}</em>
                </div>
              ))
            ) : (
              <p>No tracked automation events yet.</p>
            )}
          </div>
        </section>
        <section>
          <span className="panel-kicker">Rehearsal checklist</span>
          <div className="automation-next-list">
            {nextBuilds.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
          {summary?.checkedAt && <p className="panel-note">Checked {new Date(summary.checkedAt).toLocaleString()}</p>}
          {message && <p className={`form-message ${status}`}>{message}</p>}
        </section>
      </div>
    </article>
  );
}

function DailySnapshotPanel({ latest, adminToken, onApplied, onRefreshAutomation }) {
  const [targetDay, setTargetDay] = useState(latest?.day || 1);
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const changes = snapshot?.changes || [];
  const proposedLog = snapshot?.proposedLog || null;

  useEffect(() => {
    if (latest?.day && !targetDay) setTargetDay(latest.day);
  }, [latest?.day, targetDay]);

  async function handlePreview() {
    if (!adminToken.trim()) {
      setStatus("error");
      setMessage("Add the admin token before previewing the automated snapshot.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await previewDailySnapshot(adminToken.trim(), targetDay);
      setSnapshot(data.snapshot || null);
      setStatus("success");
      setMessage(data.snapshot?.changes?.length ? "Preview ready. Review the changes before applying." : "Preview ready. No live changes found.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not preview the daily snapshot.");
    }
  }

  async function handleApply() {
    if (!adminToken.trim()) {
      setStatus("error");
      setMessage("Add the admin token before applying the automated snapshot.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await applyDailySnapshot({ day: targetDay }, adminToken.trim());
      setSnapshot(data.snapshot || null);
      onApplied(data.logs || []);
      await onRefreshAutomation();
      setStatus("success");
      setMessage(`Applied automated metrics to Day ${data.snapshot?.targetDay || targetDay}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not apply the daily snapshot.");
    }
  }

  return (
    <article className="panel daily-snapshot-panel">
      <PanelTitle icon="calendar" title="Daily Snapshot Recovery" right={snapshot ? `Day ${snapshot.targetDay}` : "Audit tool"} />
      <div className="automation-hero snapshot-hero">
        <div>
          <span className="panel-kicker">Daily log writer</span>
          <strong>Audit or repair a day without depending on this button.</strong>
          <p>
            The background worker normally writes Stripe sales, email growth, Twitch hours, and clip totals automatically.
            Use this preview only to inspect a discrepancy or recover after an outage.
          </p>
        </div>
        <label className="field snapshot-day-field">
          <span>Target day</span>
          <input
            type="number"
            min="1"
            max="60"
            value={targetDay}
            onChange={(event) => setTargetDay(Number(event.target.value || latest?.day || 1))}
          />
        </label>
      </div>
      {proposedLog ? (
        <div className="automation-snapshot-grid">
          <KeyValue label="Email list" value={formatNumber(proposedLog.emailSubscribers)} positive />
          <KeyValue label="Revenue" value={formatCurrency(proposedLog.revenueCollected)} positive />
          <KeyValue label="Products sold" value={formatNumber(proposedLog.productsSold)} />
          <KeyValue label="Clips" value={formatNumber(proposedLog.clipsPosted)} />
        </div>
      ) : null}
      <div className="snapshot-change-list">
        {changes.length ? (
          changes.map((change) => (
            <div key={change.key}>
              <span>{change.label}</span>
              <strong>
                {change.displayFrom} -&gt; {change.displayTo}
              </strong>
              <p>{change.source}</p>
            </div>
          ))
        ) : (
          <p>{snapshot ? "No changes from the live sources for this day." : "Preview the snapshot to see exactly what will change before it writes."}</p>
        )}
      </div>
      <div className="automation-source-list snapshot-source-list">
        {[...(snapshot?.appliedSources || []), ...(snapshot?.pendingSources || [])].map((source) => (
          <article key={source.key} className={`automation-source ${source.status}`}>
            <div>
              <span>{source.label}</span>
              <strong>{source.status.replaceAll("-", " ")}</strong>
              <p>{source.source}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="snapshot-actions">
        <button type="button" className="secondary-action" onClick={handlePreview} disabled={status === "loading"}>
          {status === "loading" ? "Checking..." : "Preview snapshot"}
        </button>
        <button type="button" className="primary-action" onClick={handleApply} disabled={status === "loading"}>
          {status === "loading" ? "Applying..." : "Apply to public dashboard"}
        </button>
      </div>
      {snapshot?.checkedAt && <p className="panel-note">Snapshot checked {new Date(snapshot.checkedAt).toLocaleString()}</p>}
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </article>
  );
}

function FollowerTickerControlPanel({ liveFollowers, onRefresh }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const sources = liveFollowers?.sources || [];
  const liveCount = sources.filter((source) => ["live", "stale"].includes(source.status)).length;
  const disconnectedCount = sources.length - liveCount;

  async function handleRefresh() {
    setStatus("loading");
    setMessage("");
    try {
      await onRefresh();
      setStatus("success");
      setMessage("Ticker status refreshed.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Ticker refresh failed.");
    }
  }

  return (
    <article className="panel follower-ticker-control-panel">
      <PanelTitle icon="monitor" title="Follower Ticker" right={`${liveCount}/${sources.length || 5} connected`} />
      <div className="ticker-control-hero">
        <div>
          <span className="panel-kicker">Combined OBS total</span>
          <strong>{formatNumber(liveFollowers?.total || 0)}</strong>
          <p>
            The overlay shows this number only. Individual account counts stay on the web dashboard,
            and disconnected accounts never add demo data to the total.
          </p>
        </div>
        <div className="ticker-control-actions">
          <button type="button" className="primary-action" onClick={handleRefresh} disabled={status === "loading"}>
            {status === "loading" ? "Refreshing..." : "Refresh ticker"}
          </button>
          <a className="secondary-action" href="/obs/followers" target="_blank" rel="noreferrer">Open OBS overlay</a>
        </div>
      </div>
      <div className="ticker-control-grid">
        <KeyValue label="Stream endpoint" value="/api/followers/stream" positive />
        <KeyValue label="Connected" value={formatNumber(liveCount)} positive={liveCount > 0} />
        <KeyValue label="Not connected" value={formatNumber(disconnectedCount)} />
        <KeyValue label="Refresh" value={`${formatNumber((liveFollowers?.refreshMs || 15000) / 1000)}s`} />
      </div>
      <div className="ticker-source-list">
        {sources.map((source) => (
          <article key={source.key} className={source.status}>
            <div>
              <span>{source.label}</span>
              <strong>{source.count === null ? "Not connected" : formatNumber(source.count)}</strong>
              <p>{source.detail}</p>
            </div>
            <div>
              <em>{source.status.replaceAll("-", " ")}</em>
              <small>{source.cadence}</small>
            </div>
          </article>
        ))}
      </div>
      {liveFollowers?.checkedAt && <p className="panel-note">Checked {new Date(liveFollowers.checkedAt).toLocaleString()}</p>}
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </article>
  );
}

function SocialAccountsPanel({
  adminToken,
  socialStatus,
  statusState,
  statusMessage,
  onRefresh,
  onTickerRefresh,
}) {
  const [activeAction, setActiveAction] = useState("");
  const [actionState, setActionState] = useState("idle");
  const [actionMessage, setActionMessage] = useState("");
  const providers = socialStatus?.providers || [];
  const connectedCount = providers.filter((provider) => provider.connected).length;

  async function finishAction(message) {
    await Promise.all([onRefresh(), onTickerRefresh()]);
    setActionState("success");
    setActionMessage(message);
    setActiveAction("");
  }

  async function handleConnect(provider) {
    if (!adminToken.trim()) {
      setActionState("error");
      setActionMessage("Add the admin token before connecting an account.");
      return;
    }
    setActiveAction(`${provider.key}:connect`);
    setActionState("loading");
    setActionMessage("");
    try {
      const data = await startSocialOAuth(provider.key, adminToken.trim());
      window.location.assign(data.url);
    } catch (error) {
      setActiveAction("");
      setActionState("error");
      setActionMessage(error.message || `Could not connect ${provider.label}.`);
    }
  }

  async function handleSync(provider) {
    setActiveAction(`${provider.key}:sync`);
    setActionState("loading");
    setActionMessage("");
    try {
      await syncSocialAccount(provider.key, adminToken.trim());
      await finishAction(`${provider.label} is synced to the dashboard.`);
    } catch (error) {
      setActiveAction("");
      setActionState("error");
      setActionMessage(error.message || `Could not sync ${provider.label}.`);
    }
  }

  async function handleSyncAll() {
    setActiveAction("all:sync");
    setActionState("loading");
    setActionMessage("");
    try {
      await syncAllSocialAccounts(adminToken.trim());
      await finishAction("Every connected social account was checked.");
    } catch (error) {
      setActiveAction("");
      setActionState("error");
      setActionMessage(error.message || "Could not sync social accounts.");
    }
  }

  async function handleDisconnect(provider) {
    if (!window.confirm(`Disconnect ${provider.label} from the live dashboard?`)) return;
    setActiveAction(`${provider.key}:disconnect`);
    setActionState("loading");
    setActionMessage("");
    try {
      await disconnectSocialAccount(provider.key, adminToken.trim());
      await finishAction(`${provider.label} was disconnected and removed from the combined total.`);
    } catch (error) {
      setActiveAction("");
      setActionState("error");
      setActionMessage(error.message || `Could not disconnect ${provider.label}.`);
    }
  }

  async function handleTwitchEventSub(provider) {
    setActiveAction("twitch:eventsub");
    setActionState("loading");
    setActionMessage("");
    try {
      await subscribeTwitchEventSub(adminToken.trim());
      await finishAction("Twitch instant follow events are subscribed.");
    } catch (error) {
      setActiveAction("");
      setActionState("error");
      setActionMessage(error.message || "Could not enable Twitch instant follows.");
    }
  }

  return (
    <article className="panel social-accounts-panel">
      <PanelTitle icon="followers" title="Social Accounts" right={`${connectedCount}/${providers.length || 5} connected`} />
      <div className="social-accounts-summary">
        <div>
          <span className="panel-kicker">Verified follower sources</span>
          <strong>Connect once. The dashboard keeps count.</strong>
          <p>
            Only official account data enters the combined total. Twitch pushes follow events instantly;
            Instagram, TikTok, YouTube, and X refresh on a controlled schedule.
          </p>
        </div>
        <button type="button" className="primary-action" onClick={handleSyncAll} disabled={actionState === "loading" || !connectedCount}>
          {activeAction === "all:sync" ? "Syncing..." : "Sync all"}
        </button>
      </div>
      <div className="social-system-state" aria-label="Social metric system status">
        <span className={socialStatus?.storageReady ? "ready" : "blocked"}>
          Metric storage {socialStatus?.storageReady ? "ready" : "needs migration"}
        </span>
        <span className={socialStatus?.encryptionReady ? "ready" : "blocked"}>
          Token encryption {socialStatus?.encryptionReady ? "ready" : "needs secret"}
        </span>
      </div>
      <div className="social-account-list">
        {providers.map((provider) => {
          const isBusy = activeAction.startsWith(`${provider.key}:`);
          const eventSubActive = Boolean(provider.eventSub?.subscriptionId);
          return (
            <article className={`social-account-row ${provider.status}`} key={provider.key}>
              <div className="social-account-identity">
                <span>{provider.label}</span>
                <strong>{provider.connected ? provider.displayName || provider.username || "Connected" : "Not connected"}</strong>
                <p>
                  {provider.connected
                    ? `${provider.precision === "rounded" ? "Rounded public count" : "Exact public count"} · ${provider.cadence}`
                    : provider.appConfigured
                      ? "App credentials ready. Authorize the account next."
                      : `Add ${provider.envKeys.join(" and ")} in Render first.`}
                </p>
              </div>
              <div className="social-account-metric">
                <span>{provider.key === "youtube" ? "Subscribers" : "Followers"}</span>
                <strong>{provider.count === null ? "--" : formatNumber(provider.count)}</strong>
                <em>{provider.status.replaceAll("-", " ")}</em>
              </div>
              <div className="social-account-actions">
                {provider.oauthSupported ? (
                  <button
                    type="button"
                    className={provider.connected ? "secondary-action" : "primary-action"}
                    onClick={() => handleConnect(provider)}
                    disabled={isBusy || !provider.appConfigured || !socialStatus?.encryptionReady}
                  >
                    {activeAction === `${provider.key}:connect` ? "Opening..." : provider.connected ? "Reconnect" : "Connect"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => handleSync(provider)}
                  disabled={isBusy || (!provider.connected && provider.key !== "x") || !provider.appConfigured}
                >
                  {activeAction === `${provider.key}:sync` ? "Syncing..." : "Sync now"}
                </button>
                {provider.key === "twitch" && provider.connected && !eventSubActive ? (
                  <button type="button" className="secondary-action" onClick={() => handleTwitchEventSub(provider)} disabled={isBusy}>
                    {activeAction === "twitch:eventsub" ? "Enabling..." : "Enable instant"}
                  </button>
                ) : null}
                {provider.connected && provider.key !== "x" ? (
                  <button type="button" className="icon-action danger-action" onClick={() => handleDisconnect(provider)} disabled={isBusy} aria-label={`Disconnect ${provider.label}`} title={`Disconnect ${provider.label}`}>
                    <X size={16} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <details className="social-account-details">
                <summary>Connection details</summary>
                <dl>
                  <div><dt>Callback</dt><dd>{provider.callbackUrl || "Server credential connection"}</dd></div>
                  <div><dt>Scopes</dt><dd>{provider.requiredScopes.length ? provider.requiredScopes.join(", ") : "Public metrics"}</dd></div>
                  <div><dt>Last sync</dt><dd>{provider.lastSyncedAt ? new Date(provider.lastSyncedAt).toLocaleString() : "Never"}</dd></div>
                  {provider.lastError ? <div><dt>Last error</dt><dd>{provider.lastError}</dd></div> : null}
                </dl>
              </details>
            </article>
          );
        })}
      </div>
      {statusMessage && <p className={`form-message ${statusState}`}>{statusMessage}</p>}
      {actionMessage && <p className={`form-message ${actionState}`}>{actionMessage}</p>}
    </article>
  );
}

function FollowerCountIntakePanel({ latest, adminToken, onApplied, onRefreshFollowers }) {
  const [platform, setPlatform] = useState("instagram");
  const [count, setCount] = useState(Number(latest?.followers?.instagram || 0));
  const [source, setSource] = useState("n8n");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");

  useEffect(() => {
    setCount(Number(latest?.followers?.[platform] || 0));
  }, [latest?.day, latest?.followers, platform]);

  const payload = {
    day: latest?.day || 1,
    platform,
    count: Number(count || 0),
    source,
    observedAt: new Date().toISOString(),
  };

  function formatWebhookTemplate() {
    return [
      "POST https://aiwithmurda.com/api/admin/followers/intake",
      "Authorization: Bearer <ADMIN_API_TOKEN>",
      "Content-Type: application/json",
      "",
      JSON.stringify(payload, null, 2),
    ].join("\n");
  }

  async function copyWebhookTemplate() {
    if (await copyPlainText(formatWebhookTemplate())) {
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } else {
      setCopyStatus("manual");
    }
  }

  async function submitTestCount() {
    if (!adminToken.trim()) {
      setStatus("error");
      setMessage("Add the admin token before testing follower intake.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await submitFollowerCountIntake(payload, adminToken.trim());
      onApplied(data.logs || []);
      await onRefreshFollowers();
      const nextCount = data.updatedLog?.followers?.[platform] ?? payload.count;
      setStatus("success");
      setMessage(`${platform} count updated to ${formatNumber(nextCount)} on Day ${data.updatedLog?.day || payload.day}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Follower intake failed.");
    }
  }

  return (
    <article className="panel follower-intake-panel">
      <PanelTitle icon="followers" title="Follower Count Intake" right="n8n ready" />
      <div className="follower-intake-hero">
        <div>
          <span className="panel-kicker">Automation bridge</span>
          <strong>{formatNumber(payload.count)}</strong>
          <p>
            Use this for Instagram, TikTok, YouTube, Kick, or any approved source that can poll a count
            and push it into the public ticker.
          </p>
        </div>
        <div className="follower-intake-actions">
          <button type="button" className="primary-action" onClick={submitTestCount} disabled={status === "loading"}>
            {status === "loading" ? "Updating..." : "Test update"}
          </button>
          <button type="button" className="secondary-action" onClick={copyWebhookTemplate}>
            {copyStatus === "copied" ? "Copied payload" : copyStatus === "manual" ? "Manual copy ready" : "Copy n8n payload"}
          </button>
        </div>
      </div>
      <div className="follower-intake-form">
        <label>
          Platform
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="twitch">Twitch</option>
            <option value="kick">Kick</option>
          </select>
        </label>
        <label>
          Count
          <input
            type="number"
            min="0"
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
        </label>
        <label>
          Source
          <input value={source} onChange={(event) => setSource(event.target.value)} />
        </label>
      </div>
      <pre className="webhook-template-preview">{formatWebhookTemplate()}</pre>
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </article>
  );
}

function ClipIntakePanel({ latest, adminToken, onApplied }) {
  const [day, setDay] = useState(latest?.day || 1);
  const [eventId, setEventId] = useState(() => globalThis.crypto?.randomUUID?.() || `clip-${Date.now()}`);
  const [platform, setPlatform] = useState("tiktok");
  const [title, setTitle] = useState("Clip posted");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");

  useEffect(() => {
    if (latest?.day && !day) setDay(latest.day);
  }, [latest?.day, day]);

  const payload = {
    eventId,
    day,
    platform,
    title,
    url,
    count: 1,
    postedAt: new Date().toISOString(),
  };

  function formatWebhookTemplate() {
    return [
      "POST https://aiwithmurda.com/api/admin/clips/intake",
      "Authorization: Bearer <ADMIN_API_TOKEN>",
      "Content-Type: application/json",
      "",
      JSON.stringify(payload, null, 2),
    ].join("\n");
  }

  async function copyWebhookTemplate() {
    if (await copyPlainText(formatWebhookTemplate())) {
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } else {
      setCopyStatus("manual");
    }
  }

  async function submitTestClip() {
    if (!adminToken.trim()) {
      setStatus("error");
      setMessage("Add the admin token before testing clip intake.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await submitClipIntake(payload, adminToken.trim());
      onApplied(data.logs || []);
      setStatus("success");
      if (data.rehearsal) {
        setMessage("Rehearsal clip recorded. The official scoreboard did not change.");
      } else if (data.duplicate) {
        setMessage("Duplicate delivery confirmed. This clip was not counted twice.");
      } else {
        setMessage(`Clip counted on Day ${data.updatedLog?.day || day}. Clips: ${formatNumber(data.updatedLog?.clipsPosted || 0)}.`);
      }
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Clip intake failed.");
    }
  }

  return (
    <article className="panel clip-intake-panel">
      <PanelTitle icon="video" title="Clip Intake Webhook" right="Rehearsal safe" />
      <div className="clip-intake-hero">
        <div>
          <span className="panel-kicker">Short-form automation</span>
          <strong>Let posting workflows report clips automatically.</strong>
          <p>
            n8n, Zapier, or a posting script calls this after a clip goes live. Every external event ID can
            count once, the official day comes from the posting timestamp, and prelaunch tests stay isolated.
          </p>
        </div>
        <div className="clip-intake-actions">
          <button type="button" className="primary-action" onClick={submitTestClip} disabled={status === "loading"}>
            {status === "loading" ? "Logging..." : "Test intake"}
          </button>
          <button type="button" className="secondary-action" onClick={copyWebhookTemplate}>
            {copyStatus === "copied" ? "Copied payload" : copyStatus === "manual" ? "Manual copy ready" : "Copy n8n payload"}
          </button>
        </div>
      </div>
      <div className="clip-intake-form">
        <label className="field">
          <span>Event ID</span>
          <input value={eventId} onChange={(event) => setEventId(event.target.value)} />
        </label>
        <label className="field">
          <span>Expected day</span>
          <input type="number" min="1" max="60" value={day} onChange={(event) => setDay(Number(event.target.value || 1))} />
        </label>
        <label className="field">
          <span>Platform</span>
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube Shorts</option>
            <option value="twitch">Twitch Clip</option>
            <option value="x">X</option>
          </select>
        </label>
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span>URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
        </label>
      </div>
      <pre className="webhook-template-preview">{formatWebhookTemplate()}</pre>
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </article>
  );
}

function SettingsView({
  authSession,
  config,
  logs,
  remoteLogStatus,
  remoteLogMeta,
  dirtyDays,
  adminToken,
  syncStatus,
  syncMessage,
  offerOpsSummary,
  offerOpsStatus,
  offerOpsMessage,
  metricsAutomationSummary,
  metricsAutomationStatus,
  metricsAutomationMessage,
  liveFollowers,
  subscriberSummary,
  subscriberStatus,
  subscriberMessage,
  systemStatus,
  systemStatusState,
  systemStatusMessage,
  socialIntegrationStatus,
  socialIntegrationState,
  socialIntegrationMessage,
  streamConfig,
  streamConfigStatus,
  updateAdminToken,
  refreshSubscriberSummary,
  refreshOfferOpsSummary,
  refreshMetricsAutomationSummary,
  refreshLiveFollowers,
  refreshSystemStatus,
  refreshSocialIntegrationStatus,
  syncLogsToPublic,
  onSnapshotApplied,
  restoreSeedData,
}) {
  const latest = getLatestRecord(logs);
  const mode = getPublicDataMode(config);
  const launchReadiness = buildLaunchReadiness(launchChecklistItems);
  const launchReadyCount = launchChecklistItems.filter((item) => item.status === "done").length;
  const launchManualCount = launchChecklistItems.filter((item) => item.status === "manual").length;
  const launchQueuedCount = launchChecklistItems.filter((item) => item.status === "queued").length;
  const manualGateItems = launchChecklistItems.filter((item) => item.status === "manual");
  const manualGateRunbookText = formatManualGateRunbook(manualGateItems);
  const [manualGateCopyStatus, setManualGateCopyStatus] = useState("idle");
  const streamDestinations = streamConfig?.destinations || fallbackStreamConfig.destinations;
  const streamPlatformDestinations = streamDestinations.filter((item) => ["main", "twitch", "kick", "youtube"].includes(item.key));
  const streamCommands = streamConfig?.commands?.length ? streamConfig.commands : fallbackStreamConfig.commands;
  const configuredStreamCount = streamPlatformDestinations.filter((item) => item.configured).length;
  const visibleStreamCommandCount = streamCommands.length + 1;
  const streamCommandDeckText = formatStreamCommandDeck(streamConfig, streamPlatformDestinations, streamCommands);
  const [streamCommandCopyStatus, setStreamCommandCopyStatus] = useState("idle");
  const streamRehearsal = streamConfig?.rehearsal || fallbackStreamConfig.rehearsal || null;
  const streamRehearsalText = formatStreamRehearsalRunbook(streamRehearsal);
  const [streamRehearsalCopyStatus, setStreamRehearsalCopyStatus] = useState("idle");
  const streamPlatformSetup = streamConfig?.platformSetup || fallbackStreamConfig.platformSetup || [];
  const streamPlatformSetupText = formatStreamPlatformSetupDeck(streamPlatformSetup);
  const [streamPlatformCopyStatus, setStreamPlatformCopyStatus] = useState("idle");
  const streamPrivacyGuard = streamConfig?.privacyGuard || fallbackStreamConfig.privacyGuard || null;
  const streamPrivacyGuardText = formatStreamPrivacyGuard(streamPrivacyGuard);
  const [streamPrivacyCopyStatus, setStreamPrivacyCopyStatus] = useState("idle");
  const buyerEmailDeckText = formatBuyerOnboardingEmailDeck(buyerOnboardingEmails);
  const [buyerEmailCopyStatus, setBuyerEmailCopyStatus] = useState("idle");
  const offerOpsModules =
    offerOpsSummary?.progress?.moduleSummaries ||
    productModules.map((module) => ({
      key: module.key,
      title: module.title,
      tasks: module.todos.length,
      completedTasks: 0,
      activeUsers: 0,
    }));
  const offerOpsMembers = offerOpsSummary?.members || [];
  const offerProductBreakdown = offerOpsSummary?.products || [];

  async function handleSyncPublicLogs() {
    const targetLogs = dirtyDays.length ? logs.filter((record) => dirtyDays.includes(record.day)) : logs;
    await syncLogsToPublic(targetLogs, dirtyDays.length ? `${dirtyDays.length} unsynced day${dirtyDays.length === 1 ? "" : "s"}` : "all days");
  }

  async function copyManualGateRunbook() {
    if (await copyPlainText(manualGateRunbookText)) {
      setManualGateCopyStatus("copied");
      window.setTimeout(() => setManualGateCopyStatus("idle"), 1800);
    } else {
      setManualGateCopyStatus("manual");
    }
  }

  async function copyStreamCommandDeck() {
    if (await copyPlainText(streamCommandDeckText)) {
      setStreamCommandCopyStatus("copied");
      window.setTimeout(() => setStreamCommandCopyStatus("idle"), 1800);
    } else {
      setStreamCommandCopyStatus("manual");
    }
  }

  async function copyStreamRehearsalRunbook() {
    if (await copyPlainText(streamRehearsalText)) {
      setStreamRehearsalCopyStatus("copied");
      window.setTimeout(() => setStreamRehearsalCopyStatus("idle"), 1800);
    } else {
      setStreamRehearsalCopyStatus("manual");
    }
  }

  async function copyStreamPlatformSetup() {
    if (await copyPlainText(streamPlatformSetupText)) {
      setStreamPlatformCopyStatus("copied");
      window.setTimeout(() => setStreamPlatformCopyStatus("idle"), 1800);
    } else {
      setStreamPlatformCopyStatus("manual");
    }
  }

  async function copyStreamPrivacyGuard() {
    if (await copyPlainText(streamPrivacyGuardText)) {
      setStreamPrivacyCopyStatus("copied");
      window.setTimeout(() => setStreamPrivacyCopyStatus("idle"), 1800);
    } else {
      setStreamPrivacyCopyStatus("manual");
    }
  }

  async function copyBuyerEmailDeck() {
    if (await copyPlainText(buyerEmailDeckText)) {
      setBuyerEmailCopyStatus("copied");
      window.setTimeout(() => setBuyerEmailCopyStatus("idle"), 1800);
    } else {
      setBuyerEmailCopyStatus("manual");
    }
  }

  return (
    <section className="workspace-view">
      <div className="view-header">
        <div>
          <h2>Settings</h2>
          <p>Static launch settings for the pre-launch MVP.</p>
        </div>
        <button type="button" onClick={restoreSeedData}>
          Restore Demo Data
        </button>
      </div>

      <div className="settings-grid">
        <article className="panel launch-readiness-panel">
          <PanelTitle icon="calendar" title="Launch Readiness" right={`${launchReadiness.percent}% ready`} />
          <div className="launch-score-card">
            <div>
              <span className="panel-kicker">Overall launch system</span>
              <strong>{launchReadiness.percent}%</strong>
              <p>
                Weighted by launch risk. Manual gates like OBS rehearsal and a real Backbone purchase
                count more than normal checklist items.
              </p>
            </div>
            <div className="launch-score-meter" aria-label={`${launchReadiness.percent}% launch ready`}>
              <i style={{ width: `${launchReadiness.percent}%` }} />
            </div>
          </div>
          <div className="launch-readiness-summary">
            <KeyValue label="Ready" value={formatNumber(launchReadyCount)} positive />
            <KeyValue label="Queued" value={formatNumber(launchQueuedCount)} />
            <KeyValue label="Needs Murad" value={formatNumber(launchManualCount)} />
          </div>
          <div className="launch-category-grid">
            {launchReadiness.categories.map((category) => (
              <div key={category.key}>
                <div>
                  <span>{category.label}</span>
                  <strong>{category.percent}%</strong>
                </div>
                <i>
                  <b style={{ width: `${category.percent}%` }} />
                </i>
              </div>
            ))}
          </div>
          <div className="launch-blocker-strip">
            {launchReadiness.blockers.map((item) => (
              <div key={item.title} className={item.status}>
                <span>{readinessCategoryLabels[item.category] || item.category}</span>
                <strong>{item.title}</strong>
                <p>{item.signal}</p>
              </div>
            ))}
          </div>
          <section className="manual-gate-runbook">
            <div className="manual-gate-header">
              <div>
                <span>Manual Gate Runbook</span>
                <strong>{manualGateItems.length} human gates before launch</strong>
              </div>
              <button type="button" onClick={copyManualGateRunbook}>
                {manualGateCopyStatus === "copied"
                  ? "Copied runbook"
                  : manualGateCopyStatus === "manual"
                    ? "Manual copy ready"
                    : "Copy runbook"}
              </button>
            </div>
            <div className="manual-gate-list">
              {manualGateItems.map((item) => (
                <article key={item.title}>
                  <span>{item.signal}</span>
                  <strong>{item.title}</strong>
                  <p>{item.nextAction}</p>
                  <em>{item.proof}</em>
                </article>
              ))}
            </div>
            {manualGateCopyStatus === "manual" ? (
              <textarea
                aria-label="Manual gate runbook text"
                className="run-sheet-copy-box"
                readOnly
                value={manualGateRunbookText}
                onFocus={(event) => event.currentTarget.select()}
              />
            ) : null}
          </section>
          <div className="launch-checklist">
            {launchChecklistItems.map((item) => (
              <div className={`launch-check-item ${item.status}`} key={item.title}>
                <div>
                  <span>{item.owner}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  {(item.nextAction || item.proof) && (
                    <div className="launch-gate-details">
                      {item.nextAction && (
                        <article>
                          <small>Next action</small>
                          <p>{item.nextAction}</p>
                        </article>
                      )}
                      {item.proof && (
                        <article>
                          <small>Proof needed</small>
                          <p>{item.proof}</p>
                        </article>
                      )}
                    </div>
                  )}
                </div>
                <em>{item.signal}</em>
              </div>
            ))}
          </div>
        </article>
        <MetricsAutomationPanel
          summary={metricsAutomationSummary}
          status={metricsAutomationStatus}
          message={metricsAutomationMessage}
          onRefresh={refreshMetricsAutomationSummary}
        />
        <FollowerTickerControlPanel liveFollowers={liveFollowers} onRefresh={refreshLiveFollowers} />
        <SocialAccountsPanel
          adminToken={adminToken}
          socialStatus={socialIntegrationStatus}
          statusState={socialIntegrationState}
          statusMessage={socialIntegrationMessage}
          onRefresh={refreshSocialIntegrationStatus}
          onTickerRefresh={refreshLiveFollowers}
        />
        <DailySnapshotPanel
          latest={latest}
          adminToken={adminToken}
          onApplied={onSnapshotApplied}
          onRefreshAutomation={refreshMetricsAutomationSummary}
        />
        <ClipIntakePanel latest={latest} adminToken={adminToken} onApplied={onSnapshotApplied} />
        <article className="panel offer-ops-panel">
          <PanelTitle icon="chart" title="Offer Ops" right={offerOpsStatus === "success" ? "Live product" : "Admin"} />
          <div className="offer-ops-grid">
            <KeyValue label="Members" value={formatNumber(offerOpsSummary?.sales?.activeMembers || 0)} positive />
            <KeyValue label="Orders" value={formatNumber(offerOpsSummary?.sales?.paidPurchases || 0)} />
            <KeyValue label="Revenue" value={formatCurrency((offerOpsSummary?.sales?.revenueCents || 0) / 100)} positive />
            <KeyValue label="Tasks" value={`${formatNumber(offerOpsSummary?.progress?.completedTasks || 0)}/${formatNumber(offerOpsSummary?.product?.tasks || productTaskCount)}`} />
          </div>
          <div className="offer-product-breakdown">
            {offerProductBreakdown.map((product) => (
              <article key={product.key}>
                <div>
                  <span>{product.name}</span>
                  <strong>{formatCurrency((product.revenueCents || 0) / 100)}</strong>
                </div>
                <p>
                  {formatNumber(product.activeMembers || 0)} active · {formatNumber(product.paidPurchases || 0)} orders · {formatNumber(product.assets || 0)} assets
                </p>
              </article>
            ))}
          </div>
          <div className="offer-module-health">
            {offerOpsModules.map((module) => (
              <div key={module.key}>
                <span>{module.title.replace(/^Module \d+: /, "")}</span>
                <strong>
                  {formatNumber(module.completedTasks)} done · {formatNumber(module.activeUsers)} users
                </strong>
              </div>
            ))}
          </div>
          <div className="offer-member-roster">
            <span className="panel-kicker">Recent members</span>
            {offerOpsMembers.length ? (
              offerOpsMembers.map((member) => (
                <div key={`${member.userId}:${member.productKey || "product"}`}>
                  <div>
                    <strong>{member.email}</strong>
                    <span>
                      {member.productName} · {member.currentModule?.title ? member.currentModule.title.replace(/^Module \d+: /, "") : "Complete path"}
                      {member.totalTasks ? ` · ${member.progressPercent}% complete` : ""}
                    </span>
                  </div>
                  <em>{member.amountTotal ? formatCurrency(member.amountTotal / 100) : "Access"}</em>
                </div>
              ))
            ) : (
              <p>No active members loaded yet.</p>
            )}
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={refreshOfferOpsSummary}
            disabled={offerOpsStatus === "loading"}
          >
            {offerOpsStatus === "loading" ? "Checking..." : "Refresh Offer Ops"}
          </button>
          {offerOpsSummary?.checkedAt && <p className="panel-note">Checked {new Date(offerOpsSummary.checkedAt).toLocaleString()}</p>}
          {offerOpsMessage && <p className={`form-message ${offerOpsStatus}`}>{offerOpsMessage}</p>}
        </article>
        <article className="panel test-purchase-panel">
          <PanelTitle icon="settings" title="Payment Test" right="$2 live check" />
          <div className="sync-state-card">
            <span>Backbone Stripe</span>
            <strong>Run a real $2 purchase</strong>
            <p>
              This creates a live Stripe Checkout Session for a small test payment, then redirects
              back to the member portal to verify the webhook and entitlement.
            </p>
          </div>
          <TestPurchaseButton authSession={authSession} />
          <p className="panel-note">
            Use this after stream setup so we can confirm checkout, webhook, email, and client portal access in one pass.
          </p>
        </article>
        <article className="panel admin-security-panel">
          <PanelTitle icon="settings" title="Admin Security" right="Supabase auth" />
          <div className="sync-state-card">
            <span>Private operator access</span>
            <strong>Password login is available</strong>
            <p>
              The server still checks the Render admin email allowlist after login. Set your password here
              once, then use email and password on the admin gate.
            </p>
          </div>
          <AdminPasswordPanel authSession={authSession} />
        </article>
        <article className="panel onboarding-email-panel">
          <PanelTitle icon="email" title="Buyer Onboarding" right="Sequence" />
          <div className="buyer-email-deck-header">
            <div>
              <span>Buyer Email Copy Deck</span>
              <strong>{buyerOnboardingEmails.length} launch emails</strong>
            </div>
            <button type="button" onClick={copyBuyerEmailDeck}>
              {buyerEmailCopyStatus === "copied"
                ? "Copied emails"
                : buyerEmailCopyStatus === "manual"
                  ? "Manual copy ready"
                  : "Copy email sequence"}
            </button>
          </div>
          <div className="onboarding-email-list">
            {buyerOnboardingEmails.map((email) => (
              <div key={email.key}>
                <span>{email.day}</span>
                <strong>{email.subject}</strong>
                <p>{email.goal}</p>
                <em>{email.ctaLabel}</em>
              </div>
            ))}
          </div>
          {buyerEmailCopyStatus === "manual" ? (
            <textarea
              aria-label="Buyer email deck text"
              className="run-sheet-copy-box"
              readOnly
              value={buyerEmailDeckText}
              onFocus={(event) => event.currentTarget.select()}
            />
          ) : null}
        </article>
        <article className="panel settings-sync-panel">
          <PanelTitle icon="monitor" title="Public Sync" />
          <div className="sync-state-card">
            <span>{mode.label}</span>
            <strong>{mode.title}</strong>
            <p>{mode.body}</p>
          </div>
          <KeyValue
            label="Source"
            value={remoteLogStatus === "live" ? "Supabase live" : remoteLogStatus === "empty" ? "Local fallback" : "Local only"}
          />
          <KeyValue
            label="Public Records"
            value={`${remoteLogMeta.count || 0} records${remoteLogMeta.latestDay ? ` · latest day ${remoteLogMeta.latestDay}` : ""}`}
          />
          <KeyValue
            label="Unsynced Edits"
            value={dirtyDays.length ? dirtyDays.map((day) => `Day ${day}`).join(", ") : "None"}
          />
          <KeyValue
            label="Loaded"
            value={remoteLogMeta.loadedAt ? new Date(remoteLogMeta.loadedAt).toLocaleString() : "Not checked"}
          />
          <label className="field">
            <span>Admin Token</span>
            <input
              type="password"
              value={adminToken}
              onChange={(event) => updateAdminToken(event.target.value)}
              placeholder="Paste admin token"
            />
          </label>
          <button type="button" className="primary-action" onClick={handleSyncPublicLogs} disabled={syncStatus === "loading"}>
            {syncStatus === "loading" ? "Syncing..." : dirtyDays.length ? `Sync ${dirtyDays.length} Unsynced Days` : "Sync Public Dashboard"}
          </button>
          {syncMessage && <p className={`form-message ${syncStatus}`}>{syncMessage}</p>}
        </article>
        <article className="panel">
          <PanelTitle icon="calendar" title="Sprint Dates" />
          <KeyValue label="Start" value={config.startDate} />
          <KeyValue label="Day 60" value={config.familyReturnDate} />
          <KeyValue label="Current Logged Day" value={`Day ${latest.day}`} />
        </article>
        <article className="panel">
          <PanelTitle icon="chart" title="Public Goals" />
          <KeyValue label="Revenue" value={formatCurrency(config.goals.revenue)} />
          <KeyValue label="Followers" value={formatNumber(config.goals.followers)} />
          <KeyValue label="Email" value={formatNumber(config.goals.emailSubscribers)} />
        </article>
        <article className="panel audience-panel">
          <PanelTitle icon="email" title="Audience" right={subscriberStatus === "success" ? "Supabase" : "Admin"} />
          <div className="audience-grid">
            <KeyValue label="Active Leads" value={formatNumber(subscriberSummary?.active || 0)} />
            <KeyValue label="24 Hours" value={`+${formatNumber(subscriberSummary?.last24h || 0)}`} positive />
            <KeyValue label="7 Days" value={`+${formatNumber(subscriberSummary?.last7d || 0)}`} positive />
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={refreshSubscriberSummary}
            disabled={subscriberStatus === "loading"}
          >
            {subscriberStatus === "loading" ? "Checking..." : "Refresh Audience"}
          </button>
          {subscriberSummary?.checkedAt && (
            <p className="panel-note">Checked {new Date(subscriberSummary.checkedAt).toLocaleString()}</p>
          )}
          {subscriberMessage && <p className={`form-message ${subscriberStatus}`}>{subscriberMessage}</p>}
          <div className="audience-source-list">
            {(subscriberSummary?.latest || []).length ? (
              subscriberSummary.latest.map((row, index) => (
                <div key={`${row.source}-${row.subscribedAt}-${index}`}>
                  <span>{row.source || "unknown"}</span>
                  <strong>{row.subscribedAt ? new Date(row.subscribedAt).toLocaleString() : "Unknown time"}</strong>
                </div>
              ))
            ) : (
              <p>No subscriber events loaded yet.</p>
            )}
          </div>
        </article>
        <article className="panel system-panel">
          <PanelTitle icon="settings" title="System" right={systemStatusState === "success" ? "Render" : "Admin"} />
          <div className="system-grid">
            <KeyValue label="Supabase" value={systemStatus?.supabase ? "Ready" : "Missing"} positive={systemStatus?.supabase} />
            <KeyValue label="Stripe" value={systemStatus?.stripe ? "Ready" : "Missing"} positive={systemStatus?.stripe} />
            <KeyValue label="Resend" value={systemStatus?.resend ? "Ready" : "Missing"} positive={systemStatus?.resend} />
            <KeyValue label="Admin Login" value={systemStatus?.adminLogin ? "Allowlist ready" : "Needs ADMIN_EMAILS"} positive={systemStatus?.adminLogin} />
            <KeyValue label="Stripe Mode" value={systemStatus?.stripeMode || "Unknown"} />
            <KeyValue label="Site URL" value={systemStatus?.siteUrl || "Not checked"} />
            <KeyValue label="Commit" value={systemStatus?.renderCommit || "Local"} />
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={refreshSystemStatus}
            disabled={systemStatusState === "loading"}
          >
            {systemStatusState === "loading" ? "Checking..." : "Refresh System"}
          </button>
          {systemStatus?.checkedAt && <p className="panel-note">Checked {new Date(systemStatus.checkedAt).toLocaleString()}</p>}
          {systemStatusMessage && <p className={`form-message ${systemStatusState}`}>{systemStatusMessage}</p>}
        </article>
        <article className="panel stream-config-panel">
          <PanelTitle icon="monitor" title="Stream Links" right={streamConfigStatus === "success" ? "Live config" : "Fallback"} />
          <div className="system-grid">
            <KeyValue label="Room" value={streamConfig?.statusLabel || "Prelaunch room"} />
            <KeyValue label="Configured" value={`${configuredStreamCount}/${streamPlatformDestinations.length}`} />
            <KeyValue label="Commands" value={formatNumber(visibleStreamCommandCount)} />
            <KeyValue label="Checked" value={streamConfig?.checkedAt ? new Date(streamConfig.checkedAt).toLocaleString() : "Local fallback"} />
          </div>
          <div className="stream-config-list">
            {streamPlatformDestinations.map((item) => (
              <div className={item.configured ? "ready" : "waiting"} key={item.key}>
                <span>{item.name}</span>
                <strong>{item.status}</strong>
              </div>
            ))}
          </div>
          <section className="stream-command-deck">
            <div className="stream-command-deck-header">
              <div>
                <span>Stream Command Deck</span>
                <strong>{visibleStreamCommandCount} public commands</strong>
              </div>
              <button type="button" onClick={copyStreamCommandDeck}>
                {streamCommandCopyStatus === "copied"
                  ? "Copied commands"
                  : streamCommandCopyStatus === "manual"
                    ? "Manual copy ready"
                    : "Copy commands"}
              </button>
            </div>
            <div className="stream-command-mini-list">
              {streamCommands.map((item) => (
                <article key={item.command}>
                  <span>{item.command}</span>
                  <strong>{item.label}</strong>
                  <em>{item.href}</em>
                </article>
              ))}
            </div>
            {streamCommandCopyStatus === "manual" ? (
              <textarea
                aria-label="Stream command deck text"
                className="run-sheet-copy-box"
                readOnly
                value={streamCommandDeckText}
                onFocus={(event) => event.currentTarget.select()}
              />
            ) : null}
          </section>
          {streamRehearsal && (
            <section className="stream-rehearsal-card">
              <div className="stream-command-deck-header">
                <div>
                  <span>{streamRehearsal.title}</span>
                  <strong>{streamRehearsal.duration} dry run</strong>
                </div>
                <button type="button" onClick={copyStreamRehearsalRunbook}>
                  {streamRehearsalCopyStatus === "copied"
                    ? "Copied runbook"
                    : streamRehearsalCopyStatus === "manual"
                      ? "Manual copy ready"
                      : "Copy rehearsal"}
                </button>
              </div>
              <p>{streamRehearsal.goal}</p>
              <div className="stream-rehearsal-step-list">
                {(streamRehearsal.steps || []).map((step, index) => (
                  <article key={step.key}>
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                    <div>
                      <span>{step.title}</span>
                      <p>{step.check}</p>
                      <em>{step.target}</em>
                    </div>
                  </article>
                ))}
              </div>
              <div className="stream-rehearsal-proof">
                <span>Proof target</span>
                <strong>{streamRehearsal.proof}</strong>
              </div>
              {streamRehearsalCopyStatus === "manual" ? (
                <textarea
                  aria-label="Stream rehearsal runbook text"
                  className="run-sheet-copy-box"
                  readOnly
                  value={streamRehearsalText}
                  onFocus={(event) => event.currentTarget.select()}
                />
              ) : null}
            </section>
          )}
          <section className="stream-platform-setup-card">
            <div className="stream-command-deck-header">
              <div>
                <span>Platform setup</span>
                <strong>{streamPlatformSetup.length} destinations to finish</strong>
              </div>
              <button type="button" onClick={copyStreamPlatformSetup}>
                {streamPlatformCopyStatus === "copied"
                  ? "Copied setup"
                  : streamPlatformCopyStatus === "manual"
                    ? "Manual copy ready"
                    : "Copy setup"}
              </button>
            </div>
            <div className="stream-platform-setup-list">
              {streamPlatformSetup.map((platform) => (
                <article key={platform.key}>
                  <div>
                    <span>{platform.name}</span>
                    <strong>{platform.envKey}</strong>
                    <em>{platform.status}</em>
                  </div>
                  <ol>
                    {platform.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p>{platform.proof}</p>
                </article>
              ))}
            </div>
            {streamPlatformCopyStatus === "manual" ? (
              <textarea
                aria-label="Stream platform setup text"
                className="run-sheet-copy-box"
                readOnly
                value={streamPlatformSetupText}
                onFocus={(event) => event.currentTarget.select()}
              />
            ) : null}
          </section>
          {streamPrivacyGuard && (
            <section className="stream-privacy-card">
              <div className="stream-command-deck-header">
                <div>
                  <span>{streamPrivacyGuard.title}</span>
                  <strong>{streamPrivacyGuard.status}</strong>
                </div>
                <button type="button" onClick={copyStreamPrivacyGuard}>
                  {streamPrivacyCopyStatus === "copied"
                    ? "Copied guard"
                    : streamPrivacyCopyStatus === "manual"
                      ? "Manual copy ready"
                      : "Copy guard"}
                </button>
              </div>
              <p>{streamPrivacyGuard.goal}</p>
              <div className="stream-privacy-rule-list">
                {(streamPrivacyGuard.rules || []).map((rule) => (
                  <article key={rule.key}>
                    <strong>{rule.title}</strong>
                    <p>{rule.body}</p>
                  </article>
                ))}
              </div>
              <div className="stream-rehearsal-proof">
                <span>Proof target</span>
                <strong>{streamPrivacyGuard.proof}</strong>
              </div>
              {streamPrivacyCopyStatus === "manual" ? (
                <textarea
                  aria-label="Stream privacy guard text"
                  className="run-sheet-copy-box"
                  readOnly
                  value={streamPrivacyGuardText}
                  onFocus={(event) => event.currentTarget.select()}
                />
              ) : null}
            </section>
          )}
        </article>
        <article className="panel">
          <PanelTitle icon="monitor" title="Stream Goals" />
          <KeyValue label="Hours Live" value={formatNumber(config.goals.hoursStreamed)} />
          <KeyValue label="Clips" value={formatNumber(config.goals.clipsPosted)} />
          <KeyValue label="Builds" value={formatNumber(config.goals.buildsShipped)} />
        </article>
      </div>
    </section>
  );
}

function ProgressCard({ item }) {
  return (
    <article className={`metric-card ${item.accent}`}>
      <div className="metric-icon">
        <Icon name={item.key} />
      </div>
      <div>
        <span>{item.label}</span>
        <strong>{item.display}</strong>
        <em>{percent(item.value, item.goal).toFixed(1)}% of goal</em>
      </div>
      <div className="progress-track">
        <i style={{ width: `${percent(item.value, item.goal)}%` }} />
      </div>
    </article>
  );
}

function CommandOverlay({ config, latest, logs, compact = false, preview = false, liveFollowers = null }) {
  const progress = buildProgressItems(config, latest, liveFollowers);
  const spike = detectSpike(logs, latest);

  return (
    <div className={`command-overlay ${compact ? "compact" : ""}`}>
      <div className="corner top-left" />
      <div className="corner top-right" />
      <div className="corner bottom-left" />
      <div className="corner bottom-right" />

      <section>
        {preview && <span className="overlay-mode">Prelaunch Preview</span>}
        <h2>
          {preview ? "Preview Day" : "Day"} <strong>{latest.day}</strong> {preview ? "" : `/ ${config.totalDays}`}
        </h2>
        <div className="overlay-list">
          {progress.slice(0, 6).map((item) => (
            <div key={item.key}>
              <span>{item.label}</span>
              <strong>{item.display}</strong>
            </div>
          ))}
        </div>
      </section>

      <section>
        <span>Today's Goal</span>
        <h3>{latest.mainGoal}</h3>
        <p>{spike.isSpike ? `Spike: ${spike.cause}` : "Building in public"}</p>
        <div className="operator-row">
          <strong>Claude Code</strong>
          <strong>Codex</strong>
        </div>
      </section>
    </div>
  );
}

function FollowerOverlay({ liveFollowers, latest }) {
  const sources = liveFollowers?.sources || [];
  const total = Number.isFinite(Number(liveFollowers?.total)) ? Number(liveFollowers.total) : 0;
  const liveCount = sources.filter((source) => source.connected).length;
  const previousChangeKey = useRef(null);
  const [gain, setGain] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const lastChange = liveFollowers?.lastChange;
    if (!lastChange?.observedAt) return undefined;
    const changeKey = `${lastChange.provider}:${lastChange.observedAt}:${lastChange.delta}`;
    if (previousChangeKey.current === null) {
      previousChangeKey.current = changeKey;
      return undefined;
    }
    if (previousChangeKey.current === changeKey) return undefined;
    previousChangeKey.current = changeKey;
    const change = Number(lastChange.delta || 0);
    if (change <= 0) return undefined;
    setGain(change);
    setIsPulsing(true);
    const timer = window.setTimeout(() => setIsPulsing(false), 2800);
    return () => window.clearTimeout(timer);
  }, [liveFollowers?.lastChange]);

  return (
    <div className={`follower-overlay ${isPulsing ? "is-gaining" : ""}`}>
      <div className="follower-overlay-header">
        <span>Total followers</span>
        <em>{liveCount ? `${liveCount} connected` : "waiting for accounts"}</em>
      </div>
      <strong>{formatNumber(total)}</strong>
      <div className={`follower-gain-signal ${isPulsing ? "visible" : ""}`} aria-live="polite">
        +{formatNumber(gain)} NEW FOLLOWER{gain === 1 ? "" : "S"}
      </div>
      <small>
        {liveCount
          ? `Across ${liveCount} verified account${liveCount === 1 ? "" : "s"}`
          : "Connect accounts in Admin to begin"}
        {liveFollowers?.checkedAt ? ` · ${new Date(liveFollowers.checkedAt).toLocaleTimeString()}` : ""}
      </small>
    </div>
  );
}

function WeeklyRecap({ week }) {
  const bars = [
    { label: "Revenue", value: week.revenueGain, max: 10000 },
    { label: "Followers", value: week.followerGain, max: 5000 },
    { label: "Email", value: week.emailGain, max: 1200 },
    { label: "Hours", value: week.hoursGain, max: 180 },
    { label: "Clips", value: week.clipsGain, max: 45 },
    { label: "Builds", value: week.buildsGain, max: 10 },
  ];

  return (
    <div className="weekly-content">
      <div className="weekly-stats">
        <KeyValue label="Revenue" value={formatCurrency(week.revenueGain)} positive />
        <KeyValue label="Followers" value={`+${formatNumber(week.followerGain)}`} positive />
        <KeyValue label="Email" value={`+${formatNumber(week.emailGain)}`} positive />
        <KeyValue label="Hours" value={formatNumber(week.hoursGain)} positive />
        <KeyValue label="Clips" value={`+${formatNumber(week.clipsGain)}`} positive />
        <KeyValue label="Builds" value={`+${formatNumber(week.buildsGain)}`} positive />
      </div>
      <div className="bar-chart" aria-label="Weekly metric chart">
        {bars.map((bar) => (
          <div key={bar.label}>
            <i style={{ height: `${Math.min(100, (bar.value / bar.max) * 100)}%` }} />
            <span>{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTrend({ logs }) {
  const points = [...logs].slice(-8).map((record) => totalFollowers(record));
  const max = Math.max(...points);
  const min = Math.min(...points);
  const coords = points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 100;
      const y = 100 - ((value - min) / Math.max(1, max - min)) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mini-trend" viewBox="0 0 100 100" role="img" aria-label="Follower trend">
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy={coords.split(" ").at(-1)?.split(",")[1] || 50} r="3.5" fill="currentColor" />
    </svg>
  );
}

function DayRail({ currentDay, totalDays }) {
  return (
    <div className="day-rail">
      {Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        return <span key={day} className={day <= currentDay ? "filled" : ""} />;
      })}
    </div>
  );
}

function PanelTitle({ icon, title, right }) {
  return (
    <div className="panel-title">
      <div>
        <Icon name={icon} />
        <span>{title}</span>
      </div>
      {right && <em>{right}</em>}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="field textarea-field">
      <span>{label}</span>
      <textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} rows={4} />
    </label>
  );
}

function DeltaList({ gains }) {
  return (
    <div className="delta-list">
      <KeyValue label="Followers" value={signedNumber(gains.followers)} positive={gains.followers >= 0} />
      <KeyValue label="Revenue" value={signedCurrency(gains.revenue)} positive={gains.revenue >= 0} />
      <KeyValue label="Email" value={signedNumber(gains.emailSubscribers)} positive={gains.emailSubscribers >= 0} />
      <KeyValue label="Clips" value={signedNumber(gains.clipsPosted)} positive={gains.clipsPosted >= 0} />
      <KeyValue label="Hours" value={signedNumber(gains.hoursStreamed)} positive={gains.hoursStreamed >= 0} />
      <KeyValue label="Builds" value={signedNumber(gains.buildsShipped)} positive={gains.buildsShipped >= 0} />
    </div>
  );
}

function KeyValue({ label, value, positive = false }) {
  return (
    <div className="key-value">
      <span>{label}</span>
      <strong className={positive ? "positive" : ""}>{value}</strong>
    </div>
  );
}

function StatusPanel() {
  return (
    <div className="mini-panel">
      <span className="live-dot" />
      <strong>Stream Connected</strong>
      <p>OBS: Live</p>
      <p>1080p60 · 6,432 kbps</p>
    </div>
  );
}

function OperatorsPanel() {
  return (
    <div className="mini-panel">
      <strong>AI Operators</strong>
      <p>Claude Code · Online</p>
      <p>Codex · Online</p>
    </div>
  );
}

function Icon({ name }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" };
  const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

  const paths = {
    home: (
      <>
        <path {...stroke} d="m3 11 9-8 9 8" />
        <path {...stroke} d="M5 10v10h5v-6h4v6h5V10" />
      </>
    ),
    calendar: (
      <>
        <path {...stroke} d="M8 2v4M16 2v4M3 10h18" />
        <rect {...stroke} x="3" y="5" width="18" height="16" rx="2" />
      </>
    ),
    monitor: (
      <>
        <rect {...stroke} x="3" y="4" width="18" height="13" rx="2" />
        <path {...stroke} d="M8 21h8M12 17v4" />
      </>
    ),
    deck: (
      <>
        <path {...stroke} d="M5 4h14v16H5z" />
        <path {...stroke} d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    settings: (
      <>
        <path {...stroke} d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
        <path {...stroke} d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05a2.1 2.1 0 1 1-3 3l-.05-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1 1.64V21a2.1 2.1 0 1 1-4.2 0v-.08a1.8 1.8 0 0 0-1-1.64 1.8 1.8 0 0 0-2 .36l-.05.05a2.1 2.1 0 1 1-3-3l.05-.05a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.64-1H3a2.1 2.1 0 1 1 0-4.2h.08a1.8 1.8 0 0 0 1.64-1 1.8 1.8 0 0 0-.36-2l-.05-.05a2.1 2.1 0 1 1 3-3l.05.05a1.8 1.8 0 0 0 2 .36h.04a1.8 1.8 0 0 0 1-1.64V3a2.1 2.1 0 1 1 4.2 0v.08a1.8 1.8 0 0 0 1 1.64 1.8 1.8 0 0 0 2-.36l.05-.05a2.1 2.1 0 1 1 3 3l-.05.05a1.8 1.8 0 0 0-.36 2v.04a1.8 1.8 0 0 0 1.64 1H21a2.1 2.1 0 1 1 0 4.2h-.08a1.8 1.8 0 0 0-1.64 1Z" />
      </>
    ),
    code: (
      <>
        <path {...stroke} d="m8 9-4 3 4 3M16 9l4 3-4 3M14 4l-4 16" />
      </>
    ),
    revenue: <path {...stroke} d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />,
    followers: (
      <>
        <path {...stroke} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle {...stroke} cx="9" cy="7" r="4" />
        <path {...stroke} d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    email: (
      <>
        <rect {...stroke} x="3" y="5" width="18" height="14" rx="2" />
        <path {...stroke} d="m3 7 9 6 9-6" />
      </>
    ),
    hours: (
      <>
        <circle {...stroke} cx="12" cy="12" r="9" />
        <path {...stroke} d="M12 7v5l3 2" />
      </>
    ),
    clips: (
      <>
        <rect {...stroke} x="4" y="5" width="16" height="14" rx="2" />
        <path {...stroke} d="m10 9 5 3-5 3V9Z" />
      </>
    ),
    builds: <path {...stroke} d="m8 9-4 3 4 3M16 9l4 3-4 3M14 4l-4 16" />,
    lessons: (
      <>
        <path {...stroke} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path {...stroke} d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
      </>
    ),
    check: <path {...stroke} d="m20 6-11 11-5-5" />,
    alert: (
      <>
        <path {...stroke} d="m10.3 3.9-8.2 14A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-3.1l-8.2-14a2 2 0 0 0-3.4 0Z" />
        <path {...stroke} d="M12 9v4M12 17h.01" />
      </>
    ),
    chart: <path {...stroke} d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-8" />,
  };

  return <svg {...common}>{paths[name] || paths.code}</svg>;
}

function buildSprintChecklist(record) {
  return [
    { label: "Set daily baseline", done: Boolean(record.mainGoal) },
    { label: "Ship one visible build", done: Number(record.buildsShipped || 0) >= record.day },
    { label: "Post clips", done: Number(record.clipsPosted || 0) > record.day * 2 },
    { label: "Log lesson", done: Boolean(record.lessonLearned) },
    { label: "Generate slide", done: Boolean(record.bestMoment && record.tomorrowPromise) },
  ];
}

function getDailyRunSheet(record, config) {
  const day = Number(record?.day || 1);
  const firstWeekGuide = firstWeekDailyRunSheets[day];
  const patternGuide = weeklyDailyRunSheetPattern[(day - 1) % weeklyDailyRunSheetPattern.length];
  const guide = firstWeekGuide || patternGuide;
  const week = Math.max(1, Math.ceil(day / 7));

  return {
    ...guide,
    label: firstWeekGuide ? `First week / ${guide.theme}` : `Week ${week} / ${guide.theme}`,
    shutdown: guide.shutdown || [
      `Sync Day ${day} to the public dashboard.`,
      `Open /day/${day} and confirm the receipt reads correctly.`,
      "Export the proof deck and check the weekly summary.",
    ],
    day,
    totalDays: config.totalDays,
  };
}

function formatDailyRunSheet(record, guide) {
  return [
    `Day ${guide.day} / ${guide.totalDays} Run Sheet`,
    `Date: ${record.date}`,
    `Phase: ${guide.label}`,
    "",
    `Goal: ${guide.goal}`,
    "",
    `Stream beat: ${guide.streamBeat}`,
    `Proof target: ${guide.proofTarget}`,
    `Chat CTA: ${guide.cta}`,
    "",
    "Shutdown:",
    ...guide.shutdown.map((item) => `- ${item}`),
    "",
    `Current log goal: ${record.mainGoal || "Not set"}`,
    `Tomorrow promise: ${record.tomorrowPromise || "Not set"}`,
  ].join("\n");
}

function getDailyClipPacket(record, guide) {
  const dayLabel = `Day ${guide.day}/${guide.totalDays}`;
  const shippedItem = trimSentence(record.shippedItems?.[0] || guide.proofTarget);
  const proofAsset = record.proofAssets?.[0] || "daily receipt";
  const mainGoal = trimSentence(record.mainGoal || guide.goal);
  const bestMoment = trimSentence(record.bestMoment || guide.streamBeat);
  const lesson = trimSentence(record.lessonLearned || "the system only matters when it creates a public receipt");
  const nextPromise = trimSentence(record.tomorrowPromise || "ship the next receipt");

  return {
    hooks: [
      {
        label: "Proof hook",
        text: `${dayLabel}: ${bestMoment}`,
      },
      {
        label: "Build hook",
        text: `I used AI live to push ${shippedItem}. Here is the receipt, not the theory.`,
      },
      {
        label: "Lesson hook",
        text: `The lesson from ${dayLabel}: ${lesson}.`,
      },
    ],
    caption: `${dayLabel} receipt: ${mainGoal}. Proof: ${proofAsset}. Next: ${nextPromise}. ${guide.cta}`,
    followUp: `If this part of the build would save you time, start with ${productName} and follow the receipts from Day ${guide.day}.`,
  };
}

function formatDailyClipPacket(record, guide, packet) {
  return [
    `Day ${guide.day} / ${guide.totalDays} Clip Packet`,
    `Date: ${record.date}`,
    `Phase: ${guide.label}`,
    "",
    "Hooks:",
    ...packet.hooks.map((hook) => `- ${hook.label}: ${hook.text}`),
    "",
    `Caption: ${packet.caption}`,
    `Follow-up: ${packet.followUp}`,
    "",
    `Proof assets: ${(record.proofAssets || []).join(", ") || "Not logged yet"}`,
    `Shipped items: ${(record.shippedItems || []).join(", ") || "Not logged yet"}`,
  ].join("\n");
}

function trimSentence(value) {
  return String(value || "")
    .trim()
    .replace(/[.!?]+$/g, "");
}

function formatModuleActionKit(module) {
  const kit = module.actionKit;

  return [
    `${module.title} - Run Kit`,
    "",
    `Timebox: ${kit.timebox}`,
    `Next move: ${kit.todayMove}`,
    `Commands or script: ${kit.runCommand}`,
    `Verification: ${kit.proofCheckpoint}`,
    `Stop rule: ${kit.stopRule}`,
    "",
    `Starter prompt: ${module.lesson.starterPrompt}`,
  ].join("\n");
}

function formatManualGateRunbook(items) {
  return [
    "AI with Murda Manual Gate Runbook",
    "",
    ...items.flatMap((item, index) => [
      `${index + 1}. ${item.title}`,
      `Owner: ${item.owner}`,
      `Signal: ${item.signal}`,
      `Next action: ${item.nextAction}`,
      `Proof needed: ${item.proof}`,
      "",
    ]),
  ].join("\n");
}

function formatStreamCommandDeck(streamConfig, destinations, commands) {
  const primary = streamConfig?.primary;
  const primaryTarget = primary?.href || "/live";
  const destinationLines = destinations.map((item) => {
    const target = item.href || item.status || "Waiting for link";
    return `- ${item.name}: ${target}`;
  });

  return [
    "AI with Murda Stream Command Deck",
    "",
    `Room status: ${streamConfig?.statusLabel || "Prelaunch room"}`,
    `Primary room: ${primaryTarget}`,
    "",
    "Pinned commands:",
    `- !live -> ${primaryTarget}`,
    ...commands.map((item) => `- ${item.command} -> ${item.href} (${item.label})`),
    "",
    "Destinations:",
    ...destinationLines,
  ].join("\n");
}

function formatStreamRehearsalRunbook(rehearsal) {
  if (!rehearsal) return "";

  return [
    `AI with Murda ${rehearsal.title || "Stream Rehearsal"}`,
    "",
    `Duration: ${rehearsal.duration || "35-45 min"}`,
    `Goal: ${rehearsal.goal || "Prove the stream stack before going public."}`,
    `Proof: ${rehearsal.proof || "Capture a short recording or screenshot set."}`,
    "",
    "Dry-run steps:",
    ...(rehearsal.steps || []).map(
      (step, index) =>
        `${index + 1}. ${step.title}\n   Target: ${step.target}\n   Check: ${step.check}`,
    ),
  ].join("\n");
}

function formatStreamPlatformSetupDeck(platforms) {
  return [
    "AI with Murda Stream Platform Setup",
    "",
    ...(platforms || []).flatMap((platform) => [
      `${platform.name} (${platform.envKey})`,
      `Status: ${platform.status}`,
      "Steps:",
      ...(platform.steps || []).map((step, index) => `${index + 1}. ${step}`),
      `Proof: ${platform.proof}`,
      "",
    ]),
    "After env updates:",
    "1. Wait for Render to redeploy.",
    "2. Run npm run smoke:stream.",
    "3. Open /live and click each destination card.",
    "4. Run the Fake Stream Rehearsal.",
  ].join("\n");
}

function formatStreamPrivacyGuard(guard) {
  if (!guard) return "";

  return [
    `AI with Murda ${guard.title || "Stream Privacy Guard"}`,
    "",
    `Status: ${guard.status || "Required"}`,
    `Goal: ${guard.goal || "Keep private data off stream."}`,
    "",
    "Rules:",
    ...(guard.rules || []).map((rule, index) => `${index + 1}. ${rule.title}\n   ${rule.body}`),
    "",
    `Proof: ${guard.proof || "Capture proof that privacy mode works."}`,
  ].join("\n");
}

function formatBuyerOnboardingEmailDeck(emails) {
  return [
    "AI with Murda Buyer Email Copy Deck",
    "",
    ...emails.flatMap((email) => [
      `${email.day}: ${email.subject}`,
      `Goal: ${email.goal}`,
      `CTA: ${email.ctaLabel} -> ${email.ctaHref}`,
      "Bullets:",
      ...email.bullets.map((item) => `- ${item}`),
      "",
    ]),
  ].join("\n");
}

async function copyPlainText(text) {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the manual copy path for embedded browsers.
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function platformLabel(platform) {
  const labels = {
    youtube: "YouTube",
    tiktok: "TikTok",
    instagram: "Instagram",
    twitch: "Twitch",
    x: "X",
  };
  return labels[platform] || platform;
}

function signedNumber(value) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function signedCurrency(value) {
  return `${value >= 0 ? "+" : ""}${formatCurrency(value)}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default App;
