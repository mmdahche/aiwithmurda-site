import React, { useCallback, useEffect, useMemo, useState } from "react";
import { seedLogs, sprintConfig } from "./data/seed.js";
import {
  createFutureMethodCheckout,
  getMemberProfile,
  subscribeBuildLog,
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

const productKey = "future_proof_method";
const productName = "The Future Proof Method";
const productSubtitle = "New Wave Operator Kit";

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

const starterKitNames = [
  "The Future Proof Method",
  "New Wave Operator",
  "Internet Boom OS",
  "The Next Internet Kit",
  "Future Internet Method",
  "Wave One Operator",
];

function getRoute() {
  const normalized = window.location.pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function App() {
  const [logs, setLogs] = useState(() => loadLogs(seedLogs));
  const [authSession, setAuthSession] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
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

  function updateRecord(day, field, value) {
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
    setSelectedDay(nextDay);
    setActiveView("daily-log");
  }

  function restoreSeedData() {
    resetLogs();
    setLogs(seedLogs);
    setSelectedDay(seedLogs.at(-1).day);
  }

  if (activeView === "overlay-only") {
    return (
      <main className="overlay-route">
        <CommandOverlay config={sprintConfig} latest={latest} logs={logs} compact />
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
          />
        )}
        {activeView === "overlay" && <OverlayView config={sprintConfig} latest={latest} logs={logs} />}
        {activeView === "deck" && <DeckView config={sprintConfig} logs={logs} weeks={weeks} />}
        {activeView === "settings" && (
          <SettingsView config={sprintConfig} logs={logs} restoreSeedData={restoreSeedData} />
        )}
      </main>
    </div>
  );
}

function PublicSite({ route, config, logs, latest, weeks, authSession, authReady }) {
  const knownRoute = ["/", "/60", "/live", "/tools", "/start", "/kit", "/members"].includes(route) ? route : "/";

  return (
    <div className="public-site">
      <PublicNav activeRoute={knownRoute} />
      {knownRoute === "/" && <PublicHome config={config} latest={latest} />}
      {knownRoute === "/60" && <PublicDashboard config={config} logs={logs} latest={latest} weeks={weeks} />}
      {knownRoute === "/live" && <LiveHub />}
      {knownRoute === "/tools" && <ToolsPage />}
      {knownRoute === "/start" && <StartPage />}
      {knownRoute === "/kit" && <StarterKitPage authSession={authSession} authReady={authReady} />}
      {knownRoute === "/members" && <MembersPage authSession={authSession} authReady={authReady} />}
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
        </div>
        <div className="hero-command-card">
          <div className="hero-card-top">
            <span>Command Center</span>
            <strong>Day {latest.day} / {config.totalDays}</strong>
          </div>
          <CommandOverlay config={config} latest={latest} logs={seedLogs} />
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
          <span>Day</span>
          <strong>{latest.day}</strong>
          <em>/ {config.totalDays}</em>
        </div>
      </section>

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

function LiveHub() {
  return (
    <main className="public-page">
      <section className="public-section">
        <span className="public-label">Live hub</span>
        <h1>This is the stream, not a webinar.</h1>
        <p>
          The main stream link goes here before Day 1. The stream is built like a long-running show:
          live builds, scoreboard checks, product drops, clip-worthy breakdowns, and honest resets when
          something breaks.
        </p>
      </section>

      <section className="public-cards three">
        <PublicProofCard title="Main stream" value="YouTube Live first" />
        <PublicProofCard title="Stream energy" value="More Kai-style marathon than lecture hall" />
        <PublicProofCard title="Clips engine" value="Shorts, TikTok, Reels daily" />
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

function ToolsPage() {
  return (
    <main className="public-page">
      <section className="public-section">
        <span className="public-label">Tools</span>
        <h1>The systems behind the 60-day sprint.</h1>
        <p>
          These are the public-facing tools and resources that come out of the build. The Command
          Center is first. Starter Kit, workshop notes, and templates come next.
        </p>
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
      await subscribeBuildLog({ email, name });
      setStatus("success");
      setMessage("You are on the build log. Check your inbox.");
      setEmail("");
      setName("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message === "valid_email_required" ? "Enter a real email first." : "Signup is not wired yet.");
    }
  }

  return (
    <main className="public-page">
      <section className="public-section start-section">
        <span className="public-label">Start here</span>
        <h1>Get the daily receipts before the stream gets loud.</h1>
        <p>
          Join the list for the daily recap, best clip, scoreboard movement, product drops, and the
          honest lesson from whatever broke that day.
        </p>
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
            {status === "loading" ? "Joining..." : "Join"}
          </button>
        </form>
        {message && <p className={`form-message ${status}`}>{message}</p>}
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

      <section className="public-section two-col">
        <div>
          <span className="public-label">Name board</span>
          <h2>We should name it like a drop, not homework.</h2>
        </div>
        <div className="name-grid">
          {starterKitNames.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>
    </main>
  );
}

function MembersPage({ authSession, authReady }) {
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
      {authSession && entitled && <MemberModules />}
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

function MemberModules() {
  const modules = [
    {
      label: "Module 01",
      title: "Start Here",
      status: "Ready",
      body: "How to use the kit, what to set up first, and how to follow the stream without getting lost.",
    },
    {
      label: "Module 02",
      title: "New Wave Workspace",
      status: "Ready",
      body: "Folder structure, daily tracker, prompt capture, proof capture, and tool stack.",
    },
    {
      label: "Module 03",
      title: "Prompt Workflows",
      status: "Loading",
      body: "Business problem finder, workflow mapper, offer builder, content repurposer, and QA prompts.",
    },
    {
      label: "Module 04",
      title: "Build Receipts",
      status: "Loading",
      body: "Daily log, before/after proof, what broke, lesson learned, and recap templates.",
    },
  ];

  return (
    <section className="member-grid">
      {modules.map((module) => (
        <article key={module.title} className={`tool-card ${module.status === "Ready" ? "live" : ""}`}>
          <span>{module.label}</span>
          <h2>{module.title}</h2>
          <p>{module.body}</p>
          <strong className="module-status">{module.status}</strong>
        </article>
      ))}
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
}) {
  const gains = getDayGains(logs, selectedRecord);

  return (
    <section className="workspace-view">
      <div className="view-header">
        <div>
          <h2>Daily Log</h2>
          <p>One record powers the dashboard, overlay, deck, and recap.</p>
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
        </div>
      </div>

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
        <code>{window.location.origin}/?view=overlay</code>
      </div>
      <div className="overlay-showcase">
        <CommandOverlay config={config} latest={latest} logs={logs} compact />
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

function SettingsView({ config, logs, restoreSeedData }) {
  const latest = getLatestRecord(logs);

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

function CommandOverlay({ config, latest, logs, compact = false }) {
  const progress = buildProgressItems(config, latest);
  const spike = detectSpike(logs, latest);

  return (
    <div className={`command-overlay ${compact ? "compact" : ""}`}>
      <div className="corner top-left" />
      <div className="corner top-right" />
      <div className="corner bottom-left" />
      <div className="corner bottom-right" />

      <section>
        <h2>
          Day <strong>{latest.day}</strong> / {config.totalDays}
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
