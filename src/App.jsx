import React, { useEffect, useMemo, useState } from "react";
import { seedLogs, sprintConfig } from "./data/seed.js";
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

function getRoute() {
  const normalized = window.location.pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function App() {
  const [logs, setLogs] = useState(() => loadLogs(seedLogs));
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
    return <PublicSite route={route} config={sprintConfig} logs={logs} latest={latest} weeks={weeks} />;
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

function PublicSite({ route, config, logs, latest, weeks }) {
  const knownRoute = ["/", "/60", "/live", "/tools", "/start"].includes(route) ? route : "/";

  return (
    <div className="public-site">
      <PublicNav activeRoute={knownRoute} />
      {knownRoute === "/" && <PublicHome config={config} latest={latest} />}
      {knownRoute === "/60" && <PublicDashboard config={config} logs={logs} latest={latest} weeks={weeks} />}
      {knownRoute === "/live" && <LiveHub />}
      {knownRoute === "/tools" && <ToolsPage />}
      {knownRoute === "/start" && <StartPage />}
    </div>
  );
}

function PublicNav({ activeRoute }) {
  const links = [
    { href: "/", label: "Home" },
    { href: "/60", label: "Dashboard" },
    { href: "/live", label: "Live" },
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
          <h1>60 days to build online income with AI in public.</h1>
          <p>
            My family is overseas for two months. I am using that window to build, stream, sell,
            measure, and prove what one operator can do with Claude Code, Codex, and a public
            scoreboard.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="/60">
              Open dashboard
            </a>
            <a className="secondary-link" href="/live">
              Watch live
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
        <PublicProofCard title="The method" value="Build live with AI agents" />
        <PublicProofCard title="The proof" value="Daily dashboard and recap deck" />
      </section>

      <section className="public-section two-col">
        <div>
          <span className="public-label">Why this is different</span>
          <h2>The scoreboard is part of the show.</h2>
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
        <h1>Watch the sprint where the work actually happens.</h1>
        <p>
          The main stream link will go here before Day 1. The live page keeps the stream, daily goal,
          dashboard link, and current offer in one place so nobody has to hunt around while the build is moving.
        </p>
      </section>

      <section className="public-cards three">
        <PublicProofCard title="Main stream" value="YouTube Live first" />
        <PublicProofCard title="Secondary stream" value="Twitch or Kick after setup" />
        <PublicProofCard title="Clips engine" value="Shorts, TikTok, Reels daily" />
      </section>

      <section className="public-section two-col">
        <div>
          <span className="public-label">Stream modes</span>
          <h2>Live does not mean reckless.</h2>
        </div>
        <div className="plain-list">
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
          <h2>AI Operator Starter Kit</h2>
          <p>Prompt stack, daily workflow, clip checklist, and build-in-public operating system.</p>
          <span>Coming before launch</span>
        </article>
        <article className="tool-card">
          <Icon name="calendar" />
          <h2>Workshop</h2>
          <p>Live session showing business owners how to turn AI into a working income system.</p>
          <span>Planned for sprint</span>
        </article>
      </section>
    </main>
  );
}

function StartPage() {
  return (
    <main className="public-page">
      <section className="public-section start-section">
        <span className="public-label">Start here</span>
        <h1>Follow the 60-day sprint from Day 1.</h1>
        <p>
          The email capture will connect here before launch. For now, this page defines the promise:
          one daily recap, one useful build lesson, and no fake guru nonsense.
        </p>
        <div className="start-form" aria-label="Email signup preview">
          <input type="email" placeholder="you@example.com" aria-label="Email address" disabled />
          <button type="button" disabled>
            Opens soon
          </button>
        </div>
      </section>
    </main>
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
