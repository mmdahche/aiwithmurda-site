import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  memberStartPath,
  productAssetHighlights,
  productFaqItems,
  productKey,
  productModules,
  productName,
  productSubtitle,
  productTaskCount,
} from "./data/product.js";
import { seedLogs, sprintConfig } from "./data/seed.js";
import {
  createFutureMethodCheckout,
  downloadMemberAsset,
  getDailyLogs,
  getMemberProfile,
  getMemberProgress,
  getOfferOpsSummary,
  getSubscriberSummary,
  getStreamConfig,
  getSystemStatus,
  subscribeBuildLog,
  syncDailyLogs,
  updateMemberTaskProgress,
  verifyCheckoutSession,
} from "./lib/api.js";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase.js";
import {
  buildDeckHtml,
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

const directOverlayRoutes = new Set(["/overlay", "/obs"]);

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
  return config.phase === "prelaunch";
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

const offerStack = [
  {
    title: productName,
    price: "$47",
    status: "Build first",
    description: "The paid setup: new-wave workspace, prompts, daily checklist, proof templates, and stream-tested workflows.",
  },
  {
    title: "New Wave Live Builds",
    price: "$97+",
    status: "After kit",
    description: "Entertainment-first live builds that teach by showing the work, not by pretending the stream is a classroom.",
  },
  {
    title: "Implementation Sprint",
    price: "$2.5K+",
    status: "Case-study gated",
    description: "A scoped business workflow built, tested, trained, and handed off after a real audit.",
  },
];

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
  ],
  commands: [
    { command: "!dashboard", label: "Public scoreboard", href: "/60" },
    { command: "!start", label: "Build log signup", href: "/start" },
    { command: "!kit", label: "Founding product", href: "/kit" },
    { command: "!members", label: "Member login", href: "/members" },
  ],
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
    title: "Command shelf and receipts",
    status: "done",
    owner: "System",
    signal: "/tools + /day/:day",
    body: "Viewers can reach the scoreboard, live hub, daily receipts, overlay, kit, and member hub from public command links.",
  },
  {
    title: "OBS browser routes",
    status: "done",
    owner: "System",
    signal: "/overlay + /obs",
    body: "The stream overlay has direct browser-source URLs with production route smoke coverage.",
  },
  {
    title: "Day 1 baseline",
    status: "queued",
    owner: "RubyX",
    signal: "Launch-day command",
    body: "Run the baseline push only when the sprint starts so preview data becomes clean Day 1 data.",
  },
  {
    title: "Live room links",
    status: "manual",
    owner: "Murad",
    signal: "Channel decision",
    body: "Add the final Twitch, Kick, YouTube, or multistream links to the live hub before promotion.",
  },
  {
    title: "OBS overlay rehearsal",
    status: "manual",
    owner: "Murad",
    signal: "Needs stream scene",
    body: "Load the overlay in OBS, confirm safe cropping, and test screen-share readability.",
  },
  {
    title: "Real purchase test",
    status: "manual",
    owner: "Murad + RubyX",
    signal: "Requires real charge",
    body: "Run one live Backbone Stripe purchase, verify entitlement, and refund only if needed.",
  },
];

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
  const [systemStatus, setSystemStatus] = useState(null);
  const [systemStatusState, setSystemStatusState] = useState("idle");
  const [systemStatusMessage, setSystemStatusMessage] = useState("");
  const [streamConfig, setStreamConfig] = useState(fallbackStreamConfig);
  const [streamConfigStatus, setStreamConfigStatus] = useState("idle");
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") === "overlay" ? "overlay-only" : "dashboard";
  });
  const latest = useMemo(() => getLatestRecord(logs), [logs]);
  const [selectedDay, setSelectedDay] = useState(latest?.day || 1);

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
    setSystemStatus(null);
    setSystemStatusState("idle");
    setSystemStatusMessage("");
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
      <main className="overlay-route">
        <CommandOverlay config={sprintConfig} latest={latest} logs={logs} compact preview={isPrelaunch(sprintConfig)} />
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
      />
    );
  }

  return (
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
        {activeView === "overlay" && <OverlayView config={sprintConfig} latest={latest} logs={logs} />}
        {activeView === "deck" && <DeckView config={sprintConfig} logs={logs} weeks={weeks} />}
        {activeView === "settings" && (
          <SettingsView
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
            subscriberSummary={subscriberSummary}
            subscriberStatus={subscriberStatus}
            subscriberMessage={subscriberMessage}
            systemStatus={systemStatus}
            systemStatusState={systemStatusState}
            systemStatusMessage={systemStatusMessage}
            streamConfig={streamConfig}
            streamConfigStatus={streamConfigStatus}
            updateAdminToken={updateAdminToken}
            refreshSubscriberSummary={refreshSubscriberSummary}
            refreshOfferOpsSummary={refreshOfferOpsSummary}
            refreshSystemStatus={refreshSystemStatus}
            syncLogsToPublic={syncLogsToPublic}
            restoreSeedData={restoreSeedData}
          />
        )}
      </main>
    </div>
  );
}

function PublicSite({ route, config, logs, latest, weeks, authSession, authReady, streamConfig, streamConfigStatus }) {
  const dayRouteDay = getDayRouteDay(route);
  const memberModuleKey = getMemberModuleRouteKey(route);
  const knownRoute = dayRouteDay
    ? "/day"
    : memberModuleKey
      ? "/members"
      : ["/", "/60", "/live", "/tools", "/start", "/kit", "/members"].includes(route)
        ? route
        : "/";

  return (
    <div className="public-site">
      <PublicNav activeRoute={knownRoute} />
      {knownRoute === "/" && <PublicHome config={config} latest={latest} />}
      {knownRoute === "/60" && <PublicDashboard config={config} logs={logs} latest={latest} weeks={weeks} />}
      {knownRoute === "/day" && <DayReceiptPage config={config} logs={logs} day={dayRouteDay} />}
      {knownRoute === "/live" && <LiveHub latest={latest} streamConfig={streamConfig} streamConfigStatus={streamConfigStatus} />}
      {knownRoute === "/tools" && <ToolsPage latest={latest} />}
      {knownRoute === "/start" && <StartPage />}
      {knownRoute === "/kit" && <StarterKitPage authSession={authSession} authReady={authReady} />}
      {knownRoute === "/members" && (
        <MembersPage authSession={authSession} authReady={authReady} activeModuleKey={memberModuleKey} />
      )}
    </div>
  );
}

function PublicNav({ activeRoute }) {
  const links = [
    { href: "/", label: "Home" },
    { href: "/60", label: "Dashboard" },
    { href: "/live", label: "Live" },
    { href: "/kit", label: "Kit" },
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
      <nav aria-label="Public navigation">
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

function PublicHome({ config, latest }) {
  const mode = getPublicDataMode(config);

  return (
    <main className="public-page">
      <section className="public-hero">
        <div className="hero-copy">
          <span className="public-label">Launches July 28, 2026</span>
          <h1>Watch me turn 60 quiet days into an AI money show.</h1>
          <p>
            My family is overseas for two months. I am using that window to stream the grind:
            builds, numbers, wins, crashes, product drops, and the scoreboard that keeps the whole
            thing honest.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="/60">
              Open dashboard
            </a>
            <a className="secondary-link" href="/kit">
              See the first drop
            </a>
          </div>
          {isPrelaunch(config) && (
            <div className="prelaunch-inline">
              <strong>{mode.label}</strong>
              <span>{mode.body}</span>
            </div>
          )}
        </div>
        <div className="hero-command-card">
          <div className="hero-card-top">
            <span>{isPrelaunch(config) ? "Command Center Preview" : "Command Center"}</span>
            <strong>{isPrelaunch(config) ? `Preview Day ${latest.day}` : `Day ${latest.day} / ${config.totalDays}`}</strong>
          </div>
          <CommandOverlay config={config} latest={latest} logs={seedLogs} preview={isPrelaunch(config)} />
        </div>
      </section>

      <section className="public-band">
        <PublicProofCard title="The public bet" value="$100K or 100K followers" />
        <PublicProofCard title="The show" value="Builds, clips, drops, chaos, receipts" />
        <PublicProofCard title="The proof" value="Dashboard, daily log, Day 60 recap deck" />
      </section>

      <section className="public-section two-col">
        <div>
          <span className="public-label">Why this is different</span>
          <h2>The scoreboard is the main character.</h2>
        </div>
        <p>
          Every day gets logged: revenue, followers, email list growth, hours streamed, clips posted,
          builds shipped, best moment, biggest failure, lesson learned, and tomorrow's promise.
          The final Day 60 recap will already be built because the proof deck grows one day at a time.
        </p>
      </section>
    </main>
  );
}

function PublicDashboard({ config, logs, latest, weeks }) {
  const progressItems = buildProgressItems(config, latest);
  const spike = detectSpike(logs, latest);
  const currentWeek = weeks.at(-1);
  const mode = getPublicDataMode(config);

  return (
    <main className="public-page">
      <section className="public-score-header">
        <div>
          <span className="public-label">Public Command Center</span>
          <h1>Every number has to survive the scoreboard.</h1>
          <p>
            Preview data is loaded until the sprint begins. On Day 1, this becomes the public record
            for the 60-day AI operator sprint.
          </p>
        </div>
        <div className="score-day">
          <span>{isPrelaunch(config) ? "Preview Day" : "Day"}</span>
          <strong>{latest.day}</strong>
          <em>{isPrelaunch(config) ? `Live starts ${config.startDate}` : `/ ${config.totalDays}`}</em>
        </div>
      </section>

      {isPrelaunch(config) && <PrelaunchBanner mode={mode} />}

      <section className="public-metrics">
        {progressItems.slice(0, 6).map((item) => (
          <ProgressCard key={item.key} item={item} />
        ))}
      </section>

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

function LiveHub({ latest, streamConfig, streamConfigStatus }) {
  const destinations = streamConfig?.destinations?.length ? streamConfig.destinations : fallbackStreamConfig.destinations;
  const baseCommands = streamConfig?.commands?.length ? streamConfig.commands : fallbackStreamConfig.commands;
  const commands = [{ command: "!today", label: `Day ${latest.day} receipt`, href: `/day/${latest.day}` }, ...baseCommands];
  const primaryHref = streamConfig?.primary?.href || "/start";
  const primaryLabel = streamConfig?.primary?.configured ? "Open live room" : "Join build log";

  return (
    <main className="public-page">
      <section className="live-hero">
        <div>
          <span className="public-label">Live hub</span>
          <h1>This is the stream, not a webinar.</h1>
          <p>
            The main live link drops here before Day 1. Until then, this page defines the show:
            scoreboard pressure, AI-assisted builds, product drops, clip pulls, and honest resets when
            something breaks.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href={primaryHref} target={streamConfig?.primary?.external ? "_blank" : undefined} rel="noreferrer">
              {primaryLabel}
            </a>
            <a className="secondary-link" href="/60">
              Open scoreboard
            </a>
          </div>
        </div>
        <aside className="live-signal-panel">
          <span>Stream status</span>
          <strong>{streamConfig?.statusLabel || "Prelaunch room"}</strong>
          <p>{streamConfig?.message || fallbackStreamConfig.message}</p>
          {streamConfigStatus === "local" && <p className="panel-note">Local stream fallback is showing.</p>}
          <div className="signal-list">
            {destinations.map((item) => (
              <StreamDestinationLink item={item} key={item.key || item.name} />
            ))}
          </div>
        </aside>
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
    { command: "!dashboard", title: "Public scoreboard", href: "/60", body: "The live numbers, goals, weekly recap, and latest status." },
    { command: "!today", title: `Day ${latest.day} receipt`, href: `/day/${latest.day}`, body: "The current daily proof page for clips and recaps." },
    { command: "!live", title: "Live hub", href: "/live", body: "Stream room, pinned commands, run of show, and mode guardrails." },
    { command: "OBS", title: "Overlay route", href: "/overlay", body: "Clean browser-source URL for the scoreboard overlay." },
    { command: "!kit", title: productName, href: "/kit", body: "The first paid drop and member-product path." },
    { command: "!start", title: "Build log", href: "/start", body: "Email capture for launch updates and daily receipts." },
    { command: "!members", title: "Member hub", href: "/members", body: "Supabase login, checkout recovery, and gated assets." },
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
      setMessage("You are on the build log. The receipts start with the Day 0 setup.");
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
                <a className="primary-link" href="/60">
                  Watch the scoreboard
                </a>
                <a className="secondary-link" href="/kit">
                  Preview the kit
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

function StarterKitPage({ authSession, authReady }) {
  const checkoutState = new URLSearchParams(window.location.search).get("checkout");

  return (
    <main className="public-page">
      <section className="public-section product-hero">
        <div>
          <span className="public-label">First paid drop · $47 minimum</span>
          <h1>{productName}</h1>
          <p>
            {productSubtitle} for the next internet boom: the workspace, prompts, checklists, daily
            log, proof templates, and operating rhythm Murad is using live.
          </p>
          {checkoutState === "cancel" && (
            <p className="form-message">
              Checkout was canceled. Your profile is still safe; you can restart whenever you are ready.
            </p>
          )}
          <div className="hero-actions">
            <a className="primary-link" href="/members">Preview member area</a>
            <a className="secondary-link" href="/start">Join the build log</a>
          </div>
        </div>
        <aside className="price-card">
          <span>Founding price</span>
          <strong>$47</strong>
          <p>Stripe checkout on aiwithmurda.com. Real Supabase profile access from day one.</p>
          <CheckoutButton authSession={authSession} authReady={authReady} />
        </aside>
      </section>

      <section className="public-cards">
        {offerStack.map((offer) => (
          <article key={offer.title} className="tool-card">
            <span>{offer.status}</span>
            <h2>{offer.title}</h2>
            <p>{offer.description}</p>
            <strong className="card-price">{offer.price}</strong>
          </article>
        ))}
      </section>

      <section className="public-section two-col kit-proof-section">
        <div>
          <span className="public-label">What you get</span>
          <h2>A working kit, not a folder of random prompts.</h2>
        </div>
        <div className="kit-module-list">
          {productModules.map((module) => (
            <article key={module.title}>
              <strong>{module.title}</strong>
              <p>{module.body}</p>
              <ul className="module-todo-list">
                {module.todos.map((todo) => (
                  <li key={todo.key}>{todo.label}</li>
                ))}
              </ul>
              <em className="module-done">Done: {module.done}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section kit-assets-section">
        <div>
          <span className="public-label">Member assets</span>
          <h2>The files behind the build.</h2>
          <p>
            The member hub unlocks these assets with your profile, plus the trackable module checklist
            so the kit turns into action instead of another unread folder.
          </p>
        </div>
        <div className="kit-asset-list">
          {productAssetHighlights.map((asset) => (
            <article key={asset.title}>
              <strong>{asset.title}</strong>
              <p>{asset.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section kit-faq-section">
        <div>
          <span className="public-label">Before you buy</span>
          <h2>Clear answers, no fantasy math.</h2>
          <p>
            The kit is built around visible work: choose a problem, build a useful slice, capture proof,
            turn it into content, and connect it to an offer.
          </p>
        </div>
        <div className="kit-faq-list">
          {productFaqItems.map((item) => (
            <article key={item.question}>
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
        <div className="kit-final-cta">
          <strong>Ready to build with receipts?</strong>
          <CheckoutButton authSession={authSession} authReady={authReady} />
        </div>
      </section>
    </main>
  );
}

function MembersPage({ authSession, authReady, activeModuleKey }) {
  const [memberData, setMemberData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState(null);
  const [accessCheck, setAccessCheck] = useState({ status: "idle" });
  const accessToken = authSession?.access_token;
  const entitled = Boolean(
    memberData?.entitlements?.some((entitlement) => entitlement.product_key === productKey && entitlement.status === "active"),
  );

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
          window.history.replaceState({}, "", "/members?checkout=success");
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

  return (
    <main className="public-page">
      <section className="public-section members-shell">
        <div>
          <span className="public-label">Member area preview</span>
          <h1>Profile-gated from day one.</h1>
          <p>
            Sign in with your profile, buy {productName}, and unlock the member hub for the kit,
            updates, replays, and future live-build assets.
          </p>
          {notice?.text && <p className={`form-message ${notice.tone}`}>{notice.text}</p>}
        </div>
        <div className="member-login-card">
          <span>Access state</span>
          <strong>
            {entitled ? "Unlocked" : status === "loading" ? "Checking" : authSession ? "Profile active" : "Login required"}
          </strong>
          <p>{authSession?.user?.email || "Use magic link auth before checkout."}</p>
        </div>
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
      {authSession && !entitled && (
        <section className="public-section unlock-section">
          <div>
            <span className="public-label">Unlock required</span>
            <h2>{productName}</h2>
            <p>Your profile is active. Buy the $47 founding drop to unlock the member hub.</p>
          </div>
          <CheckoutButton authSession={authSession} authReady={authReady} />
        </section>
      )}
      {authSession && entitled && (
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
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setStatus("loading");
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/members`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setMessage("Magic link sent. Open it to access your profile.");
  }

  return (
    <section className="public-section auth-section">
      <div>
        <span className="public-label">Member login</span>
        <h2>Create your profile</h2>
        <p>Use the same email you will use at checkout so the product unlocks cleanly.</p>
      </div>
      <form className="auth-form" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Sending..." : "Send magic link"}
        </button>
        {message && <p className={`form-message ${status}`}>{message}</p>}
      </form>
    </section>
  );
}

function CheckoutButton({ authSession, authReady }) {
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
      const data = await createFutureMethodCheckout(authSession.access_token);
      window.location.href = data.url;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Checkout is not wired yet.");
    }
  }

  return (
    <div className="checkout-box">
      <button type="button" onClick={handleCheckout} disabled={!authReady || status === "loading"}>
        {authSession ? (status === "loading" ? "Opening Stripe..." : "Buy for $47") : "Create profile to buy"}
      </button>
      {message && <p className="form-message error">{message}</p>}
    </div>
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
  const [progressState, setProgressState] = useState({
    status: "loading",
    items: [],
    summary: { completed: 0, total: productTaskCount, percent: 0 },
    error: null,
  });
  const [taskSaving, setTaskSaving] = useState({});

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
    if (!prompt || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPromptKey(module.key);
      window.setTimeout(() => {
        setCopiedPromptKey((current) => (current === module.key ? "" : current));
      }, 1600);
    } catch {
      setCopiedPromptKey("");
    }
  }

  return (
    <section className="member-hub">
      <article className="member-welcome">
        <div>
          <span className="public-label">Unlocked hub</span>
          <h2>Your operator kit is active.</h2>
          <p>
            {profile?.email || "Your profile"} now has access to the first version of {productName}.
            Start with the Quickstart Map, then use the daily checklist and proof templates while the live build evolves.
          </p>
        </div>
        <a className="secondary-link" href="/60">
          Open public scoreboard
        </a>
      </article>

      <article className="member-next-action">
        <div>
          <span className="public-label">Next action</span>
          {nextMemberTask ? (
            <>
              <h2>{nextMemberTask.module.title.replace(/^Module \d+: /, "")}</h2>
              <p>{nextMemberTask.todo.label}</p>
              <em>{nextMemberTask.module.done}</em>
            </>
          ) : (
            <>
              <h2>Full path complete.</h2>
              <p>Use the Proof To Offer Canvas to turn the strongest receipt into the next offer test.</p>
              <em>Update the kit with what the sprint proves next.</em>
            </>
          )}
        </div>
        <div className="next-action-stat">
          <strong>{progressState.summary.percent}%</strong>
          <span>complete</span>
        </div>
      </article>

      <section className="member-start-path">
        {memberStartPath.map((item) => (
          <article key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
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
                <em className="module-done">Done: {activeModule.done}</em>
              </div>
              <div className="lesson-action-stack">
                <article className="lesson-prompt-card">
                  <span>Starter prompt</span>
                  <p>{activeModule.lesson.starterPrompt}</p>
                  <button type="button" onClick={() => handleCopyPrompt(activeModule)}>
                    {copiedPromptKey === activeModule.key ? "Copied" : "Copy prompt"}
                  </button>
                </article>
                <article className="lesson-task-card">
                  <span>Lesson checklist</span>
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
                          <span>{todo.label}</span>
                        </label>
                        {taskSaving[`${activeModule.key}:${todo.key}`] === "saved" && <em>Saved</em>}
                        {taskSaving[`${activeModule.key}:${todo.key}`] === "error" && <em>Retry</em>}
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="lesson-assets-card">
                  <span>Open with</span>
                  <div className="workbench-assets">
                    {activeModule.lesson.useWith.map((asset) => (
                      <em key={asset}>{asset}</em>
                    ))}
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
              <p>Use the member hub to open one of the active Future Proof Method modules.</p>
            </div>
          )}
        </section>
      )}

      <section className="member-workbench">
        <div>
          <span className="public-label">Module workbench</span>
          <h2>Use each module like a live operating station.</h2>
          <p>
            Every module has a focus, an output, the assets to open, and a starter prompt for Claude Code, Codex, or your AI tool of choice.
          </p>
        </div>
        <div className="workbench-list">
          {productModules.map((module) => (
            <article key={module.key}>
              <div className="workbench-header">
                <span>{module.title}</span>
                <strong>{module.lesson.output}</strong>
              </div>
              <p>{module.lesson.focus}</p>
              <div className="workbench-assets">
                {module.lesson.useWith.map((asset) => (
                  <em key={asset}>{asset}</em>
                ))}
              </div>
              <div className="workbench-prompt">
                <span>{module.lesson.starterPrompt}</span>
                <button type="button" onClick={() => handleCopyPrompt(module)}>
                  {copiedPromptKey === module.key ? "Copied" : "Copy prompt"}
                </button>
              </div>
              <a className="text-link" href={`/members/module/${module.key}`}>
                Open module
              </a>
            </article>
          ))}
        </div>
      </section>

      <div className="member-grid">
        {assets.map((asset) => (
          <article key={asset.key} className="tool-card live">
            <span>{asset.kind}</span>
            <h2>{asset.title}</h2>
            <p>{asset.description}</p>
            <button
              type="button"
              className="asset-button"
              onClick={() => handleDownload(asset)}
              disabled={downloadState[asset.key] === "loading"}
            >
              {downloadState[asset.key] === "loading" ? "Downloading..." : "Download"}
            </button>
            {downloadState[asset.key] === "success" && <strong className="module-status">Saved</strong>}
            {downloadState[asset.key] === "error" && <strong className="module-status error">Retry</strong>}
          </article>
        ))}
      </div>

      <section className="member-roadmap">
        <div>
          <span className="public-label">Module path</span>
          <h2>Build the proof loop in order.</h2>
          <p className="member-progress-copy">
            {progressState.summary.completed} of {progressState.summary.total} tasks complete.
          </p>
          <div className="member-progress-meter" aria-label={`${progressState.summary.percent}% complete`}>
            <i style={{ width: `${progressState.summary.percent}%` }} />
          </div>
          {progressState.status === "loading" && <em className="module-status">Loading progress</em>}
          {progressState.error && <em className="module-status error">{progressState.error}</em>}
        </div>
        <div className="roadmap-list">
          {productModules.map((module, index) => (
            <article key={module.key}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <div>
                <h3>{module.title.replace(/^Module \d+: /, "")}</h3>
                <p>{module.body}</p>
                <ul className="module-todo-list compact trackable">
                  {module.todos.map((todo) => (
                    <li key={todo.key} className={completedTasks.has(`${module.key}:${todo.key}`) ? "complete" : ""}>
                      <label>
                        <input
                          type="checkbox"
                          checked={completedTasks.has(`${module.key}:${todo.key}`)}
                          disabled={taskSaving[`${module.key}:${todo.key}`] === "saving"}
                          onChange={(event) => handleTaskToggle(module, todo, event.target.checked)}
                        />
                        <span>{todo.label}</span>
                      </label>
                      {taskSaving[`${module.key}:${todo.key}`] === "saved" && <em>Saved</em>}
                      {taskSaving[`${module.key}:${todo.key}`] === "error" && <em>Retry</em>}
                    </li>
                  ))}
                </ul>
                <em className="module-done">Done: {module.done}</em>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="member-roadmap compact">
        <div>
          <span className="public-label">Live drop rhythm</span>
          <h2>The kit grows with the sprint.</h2>
        </div>
        <div className="roadmap-list">
          {["Day 0 setup", "First live build", "First buyer proof", "Week 1 recap"].map((item, index) => (
            <article key={item}>
              <strong>{`Drop ${index + 1}`}</strong>
              <div>
                <h3>{item}</h3>
                <p>New assets get added when the stream creates real proof worth keeping.</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
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

function Dashboard({ config, logs, latest, weeks, onGenerateSlide }) {
  const progressItems = buildProgressItems(config, latest);
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
        <CommandOverlay config={config} latest={latest} logs={logs} />
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

function OverlayView({ config, latest, logs }) {
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
        </div>
      </div>
      <div className="overlay-showcase">
        <CommandOverlay config={config} latest={latest} logs={logs} compact preview={isPrelaunch(config)} />
      </div>
    </section>
  );
}

function DeckView({ config, logs, weeks }) {
  const sorted = [...logs].sort((a, b) => a.day - b.day);

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

function SettingsView({
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
  subscriberSummary,
  subscriberStatus,
  subscriberMessage,
  systemStatus,
  systemStatusState,
  systemStatusMessage,
  streamConfig,
  streamConfigStatus,
  updateAdminToken,
  refreshSubscriberSummary,
  refreshOfferOpsSummary,
  refreshSystemStatus,
  syncLogsToPublic,
  restoreSeedData,
}) {
  const latest = getLatestRecord(logs);
  const mode = getPublicDataMode(config);
  const launchReadyCount = launchChecklistItems.filter((item) => item.status === "done").length;
  const launchManualCount = launchChecklistItems.filter((item) => item.status === "manual").length;
  const streamDestinations = streamConfig?.destinations || fallbackStreamConfig.destinations;
  const streamPlatformDestinations = streamDestinations.filter((item) => ["main", "twitch", "kick", "youtube"].includes(item.key));
  const configuredStreamCount = streamPlatformDestinations.filter((item) => item.configured).length;
  const visibleStreamCommandCount = (streamConfig?.commands?.length || fallbackStreamConfig.commands.length) + 1;
  const offerOpsModules =
    offerOpsSummary?.progress?.moduleSummaries ||
    productModules.map((module) => ({
      key: module.key,
      title: module.title,
      tasks: module.todos.length,
      completedTasks: 0,
      activeUsers: 0,
    }));

  async function handleSyncPublicLogs() {
    const targetLogs = dirtyDays.length ? logs.filter((record) => dirtyDays.includes(record.day)) : logs;
    await syncLogsToPublic(targetLogs, dirtyDays.length ? `${dirtyDays.length} unsynced day${dirtyDays.length === 1 ? "" : "s"}` : "all days");
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
          <PanelTitle icon="calendar" title="Launch Readiness" right={`${launchReadyCount}/${launchChecklistItems.length} ready`} />
          <div className="launch-readiness-summary">
            <KeyValue label="Ready" value={formatNumber(launchReadyCount)} positive />
            <KeyValue label="Queued" value={formatNumber(launchChecklistItems.length - launchReadyCount - launchManualCount)} />
            <KeyValue label="Needs Murad" value={formatNumber(launchManualCount)} />
          </div>
          <div className="launch-checklist">
            {launchChecklistItems.map((item) => (
              <div className={`launch-check-item ${item.status}`} key={item.title}>
                <div>
                  <span>{item.owner}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
                <em>{item.signal}</em>
              </div>
            ))}
          </div>
        </article>
        <article className="panel offer-ops-panel">
          <PanelTitle icon="chart" title="Offer Ops" right={offerOpsStatus === "success" ? "Live product" : "Admin"} />
          <div className="offer-ops-grid">
            <KeyValue label="Members" value={formatNumber(offerOpsSummary?.sales?.activeMembers || 0)} positive />
            <KeyValue label="Orders" value={formatNumber(offerOpsSummary?.sales?.paidPurchases || 0)} />
            <KeyValue label="Revenue" value={formatCurrency((offerOpsSummary?.sales?.revenueCents || 0) / 100)} positive />
            <KeyValue label="Tasks" value={`${formatNumber(offerOpsSummary?.progress?.completedTasks || 0)}/${formatNumber(offerOpsSummary?.product?.tasks || productTaskCount)}`} />
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

function CommandOverlay({ config, latest, logs, compact = false, preview = false }) {
  const progress = buildProgressItems(config, latest);
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
