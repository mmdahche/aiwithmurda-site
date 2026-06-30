const STORAGE_KEY = "sixty-day-command-center:v1";

export function loadLogs(seedLogs) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedLogs;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedLogs;
  } catch {
    return seedLogs;
  }
}

export function saveLogs(logs) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function resetLogs() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function totalFollowers(record) {
  return Object.values(record.followers || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function getLatestRecord(logs) {
  return [...logs].sort((a, b) => a.day - b.day).at(-1);
}

export function getPreviousRecord(logs, day) {
  return [...logs].filter((record) => record.day < day).sort((a, b) => b.day - a.day)[0] || null;
}

export function getDayGains(logs, record) {
  const previous = getPreviousRecord(logs, record.day);
  const previousFollowers = previous ? totalFollowers(previous) : 0;
  return {
    followers: totalFollowers(record) - previousFollowers,
    revenue: Number(record.revenueCollected || 0) - Number(previous?.revenueCollected || 0),
    emailSubscribers: Number(record.emailSubscribers || 0) - Number(previous?.emailSubscribers || 0),
    clipsPosted: Number(record.clipsPosted || 0) - Number(previous?.clipsPosted || 0),
    hoursStreamed: Number(record.hoursStreamed || 0) - Number(previous?.hoursStreamed || 0),
    buildsShipped: Number(record.buildsShipped || 0) - Number(previous?.buildsShipped || 0),
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

export function percent(value, goal) {
  if (!goal) return 0;
  return Math.min(100, Math.max(0, (Number(value || 0) / Number(goal)) * 100));
}

export function daysRemaining(config, latestDay) {
  return Math.max(0, Number(config.totalDays) - Number(latestDay || 0));
}

export function buildProgressItems(config, latest, liveFollowers = null) {
  const liveFollowerTotal = Number(liveFollowers?.total);
  const followers = Number.isFinite(liveFollowerTotal) ? liveFollowerTotal : totalFollowers(latest);
  return [
    {
      key: "revenue",
      label: "Revenue",
      value: latest.revenueCollected,
      goal: config.goals.revenue,
      display: `${formatCurrency(latest.revenueCollected)} / ${formatCurrency(config.goals.revenue)}`,
      accent: "green",
    },
    {
      key: "followers",
      label: "Followers",
      value: followers,
      goal: config.goals.followers,
      display: `${formatNumber(followers)} / ${formatNumber(config.goals.followers)}`,
      accent: "green",
    },
    {
      key: "email",
      label: "Email Subscribers",
      value: latest.emailSubscribers,
      goal: config.goals.emailSubscribers,
      display: `${formatNumber(latest.emailSubscribers)} / ${formatNumber(config.goals.emailSubscribers)}`,
      accent: "green",
    },
    {
      key: "hours",
      label: "Hours Streamed",
      value: latest.hoursStreamed,
      goal: config.goals.hoursStreamed,
      display: `${formatNumber(latest.hoursStreamed)} / ${formatNumber(config.goals.hoursStreamed)}`,
      accent: "green",
    },
    {
      key: "clips",
      label: "Clips Posted",
      value: latest.clipsPosted,
      goal: config.goals.clipsPosted,
      display: `${formatNumber(latest.clipsPosted)} / ${formatNumber(config.goals.clipsPosted)}`,
      accent: "green",
    },
    {
      key: "builds",
      label: "Builds Shipped",
      value: latest.buildsShipped,
      goal: config.goals.buildsShipped,
      display: `${formatNumber(latest.buildsShipped)} / ${formatNumber(config.goals.buildsShipped)}`,
      accent: "blue",
    },
    {
      key: "lessons",
      label: "Daily Lessons",
      value: latest.dailyLessons,
      goal: config.goals.dailyLessons,
      display: `${formatNumber(latest.dailyLessons)} / ${formatNumber(config.goals.dailyLessons)}`,
      accent: "green",
    },
  ];
}

export function detectSpike(logs, record) {
  const current = getDayGains(logs, record);
  const previousRecords = logs.filter((item) => item.day < record.day).slice(-5);
  const previousGains = previousRecords.map((item) => getDayGains(logs, item));
  const avgFollowers =
    previousGains.reduce((sum, gain) => sum + Math.max(0, gain.followers), 0) /
    Math.max(1, previousGains.length);
  const avgRevenue =
    previousGains.reduce((sum, gain) => sum + Math.max(0, gain.revenue), 0) /
    Math.max(1, previousGains.length);

  const followerSpike = current.followers >= 250 && current.followers > avgFollowers * 1.8;
  const revenueSpike = current.revenue >= 500 && current.revenue > avgRevenue * 1.8;

  return {
    isSpike: Boolean(record.spikeCause || followerSpike || revenueSpike),
    followerSpike,
    revenueSpike,
    followerGain: current.followers,
    revenueGain: current.revenue,
    cause: record.spikeCause || (followerSpike ? "Follower jump" : revenueSpike ? "Revenue jump" : ""),
  };
}

export function weeklySummaries(logs) {
  const summaries = [];
  const sorted = [...logs].sort((a, b) => a.day - b.day);

  for (let start = 1; start <= 60; start += 7) {
    const days = sorted.filter((record) => record.day >= start && record.day <= start + 6);
    if (!days.length) continue;
    const first = days[0];
    const last = days.at(-1);
    const before = getPreviousRecord(sorted, first.day);
    const beforeFollowers = before ? totalFollowers(before) : 0;
    const beforeRevenue = before?.revenueCollected || 0;
    const bestFollowerDay = days
      .map((record) => ({ record, gain: getDayGains(sorted, record).followers }))
      .sort((a, b) => b.gain - a.gain)[0];
    const bestRevenueDay = days
      .map((record) => ({ record, gain: getDayGains(sorted, record).revenue }))
      .sort((a, b) => b.gain - a.gain)[0];

    summaries.push({
      week: Math.ceil(start / 7),
      label: `Week ${Math.ceil(start / 7)}: Days ${first.day}-${last.day}`,
      days,
      revenueGain: last.revenueCollected - beforeRevenue,
      followerGain: totalFollowers(last) - beforeFollowers,
      emailGain: last.emailSubscribers - (before?.emailSubscribers || 0),
      hoursGain: last.hoursStreamed - (before?.hoursStreamed || 0),
      clipsGain: last.clipsPosted - (before?.clipsPosted || 0),
      buildsGain: last.buildsShipped - (before?.buildsShipped || 0),
      bestFollowerDay,
      bestRevenueDay,
    });
  }

  return summaries;
}

function bestBy(items, scoreFn) {
  return items
    .map((item) => ({ item, score: scoreFn(item) }))
    .sort((a, b) => b.score - a.score)[0]?.item;
}

export function buildDeckSummary(config, logs, weekly = weeklySummaries(logs)) {
  const sorted = [...logs].sort((a, b) => a.day - b.day);
  const latest = sorted.at(-1) || {};
  const dayStats = sorted.map((record) => ({ record, gains: getDayGains(sorted, record) }));
  const bestFollowerDay = bestBy(dayStats, (item) => item.gains.followers);
  const bestRevenueDay = bestBy(dayStats, (item) => item.gains.revenue);
  const bestClipDay = bestBy(dayStats, (item) => item.gains.clipsPosted);
  const bestFollowerWeek = bestBy(weekly, (week) => week.followerGain);
  const bestRevenueWeek = bestBy(weekly, (week) => week.revenueGain);
  const bestClipWeek = bestBy(weekly, (week) => week.clipsGain);

  return {
    loggedDays: sorted.length,
    totalDays: Number(config.totalDays || 60),
    latestDay: latest.day || 0,
    latestRevenue: Number(latest.revenueCollected || 0),
    latestFollowers: latest.followers ? totalFollowers(latest) : 0,
    latestEmailSubscribers: Number(latest.emailSubscribers || 0),
    bestFollowerDay,
    bestRevenueDay,
    bestClipDay,
    bestFollowerWeek,
    bestRevenueWeek,
    bestClipWeek,
  };
}

export function toCsv(logs) {
  const headers = [
    "day",
    "date",
    "mainGoal",
    "totalFollowers",
    "emailSubscribers",
    "revenueCollected",
    "revenuePipeline",
    "hoursStreamed",
    "clipsPosted",
    "outreachSent",
    "callsBooked",
    "productsSold",
    "buildsShipped",
    "bestMoment",
    "biggestFailure",
    "lessonLearned",
    "tomorrowPromise",
    "spikeCause",
  ];

  const rows = logs.map((record) =>
    headers
      .map((header) => {
        const value = header === "totalFollowers" ? totalFollowers(record) : record[header];
        return `"${String(value ?? "").replaceAll('"', '""')}"`;
      })
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function buildDeckHtml(config, logs) {
  const sorted = [...logs].sort((a, b) => a.day - b.day);
  const weekly = weeklySummaries(sorted);
  const summary = buildDeckSummary(config, sorted, weekly);
  const dailySlides = sorted
    .map((record) => {
      const gains = getDayGains(sorted, record);
      return `
        <section class="slide">
          <p class="kicker">Day ${record.day} / ${config.totalDays} · ${record.date}</p>
          <h1>${escapeHtml(record.mainGoal)}</h1>
          <div class="grid">
            <div><span>Revenue</span><strong>${formatCurrency(record.revenueCollected)}</strong><em>+${formatCurrency(gains.revenue)}</em></div>
            <div><span>Followers</span><strong>${formatNumber(totalFollowers(record))}</strong><em>+${formatNumber(gains.followers)}</em></div>
            <div><span>Email</span><strong>${formatNumber(record.emailSubscribers)}</strong><em>+${formatNumber(gains.emailSubscribers)}</em></div>
            <div><span>Hours</span><strong>${formatNumber(record.hoursStreamed)}</strong><em>+${formatNumber(gains.hoursStreamed)}</em></div>
          </div>
          <h2>Best moment</h2>
          <p>${escapeHtml(record.bestMoment)}</p>
          <h2>What shipped</h2>
          <p>${escapeHtml((record.shippedItems || []).join(" · ") || "No shipped items logged yet.")}</p>
          <h2>Proof assets</h2>
          <p>${escapeHtml((record.proofAssets || []).join(" · ") || "Proof assets pending.")}</p>
          <h2>Lesson</h2>
          <p>${escapeHtml(record.lessonLearned)}</p>
          <h2>Tomorrow</h2>
          <p>${escapeHtml(record.tomorrowPromise)}</p>
        </section>
      `;
    })
    .join("");

  const summarySlide = `
        <section class="slide recap">
          <p class="kicker">Proof Deck Control Slide</p>
          <h1>Best jumps so far</h1>
          <div class="grid">
            <div><span>Logged days</span><strong>${formatNumber(summary.loggedDays)} / ${formatNumber(summary.totalDays)}</strong></div>
            <div><span>Total revenue</span><strong>${formatCurrency(summary.latestRevenue)}</strong></div>
            <div><span>Total followers</span><strong>${formatNumber(summary.latestFollowers)}</strong></div>
            <div><span>Email list</span><strong>${formatNumber(summary.latestEmailSubscribers)}</strong></div>
          </div>
          <h2>Best follower week</h2>
          <p>${escapeHtml(summary.bestFollowerWeek?.label || "Pending")} · +${formatNumber(summary.bestFollowerWeek?.followerGain || 0)} followers</p>
          <h2>Best revenue week</h2>
          <p>${escapeHtml(summary.bestRevenueWeek?.label || "Pending")} · +${formatCurrency(summary.bestRevenueWeek?.revenueGain || 0)}</p>
          <h2>Best clip week</h2>
          <p>${escapeHtml(summary.bestClipWeek?.label || "Pending")} · +${formatNumber(summary.bestClipWeek?.clipsGain || 0)} clips</p>
        </section>
      `;

  const weeklySlides = weekly
    .map(
      (week) => `
        <section class="slide weekly">
          <p class="kicker">${week.label}</p>
          <h1>Weekly Recap</h1>
          <div class="grid">
            <div><span>Revenue gained</span><strong>${formatCurrency(week.revenueGain)}</strong></div>
            <div><span>Followers gained</span><strong>${formatNumber(week.followerGain)}</strong></div>
            <div><span>Email gained</span><strong>${formatNumber(week.emailGain)}</strong></div>
            <div><span>Clips posted</span><strong>${formatNumber(week.clipsGain)}</strong></div>
          </div>
          <h2>Biggest follower jump</h2>
          <p>Day ${week.bestFollowerDay.record.day}: +${formatNumber(week.bestFollowerDay.gain)} followers</p>
          <h2>Biggest revenue jump</h2>
          <p>Day ${week.bestRevenueDay.record.day}: +${formatCurrency(week.bestRevenueDay.gain)}</p>
        </section>
      `,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(config.title)} Deck</title>
<style>
  body { margin: 0; background: #07100d; color: #f8fff9; font-family: Inter, Arial, sans-serif; }
  .slide { box-sizing: border-box; width: 1280px; height: 720px; padding: 64px; page-break-after: always; background: radial-gradient(circle at 75% 20%, rgba(68, 235, 103, .12), transparent 30%), #08100d; border-bottom: 1px solid #1f3328; }
  .kicker { color: #58e36b; text-transform: uppercase; letter-spacing: .12em; font-size: 18px; margin: 0 0 20px; }
  h1 { font-size: 46px; line-height: 1.02; margin: 0 0 24px; max-width: 980px; }
  h2 { color: #8aa296; font-size: 15px; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .08em; }
  p { color: #d8e7df; font-size: 21px; line-height: 1.25; max-width: 1060px; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
  .grid div { border: 1px solid #234232; background: #101a16; padding: 20px; border-radius: 10px; }
  span, em { display: block; color: #9fb2a8; font-style: normal; }
  strong { display: block; font-size: 30px; margin: 10px 0 4px; }
  em { color: #58e36b; font-size: 18px; }
</style>
</head>
<body>
<section class="slide">
  <p class="kicker">${escapeHtml(config.publicGoalLabel)}</p>
  <h1>${escapeHtml(config.title)}</h1>
  <p>${escapeHtml(config.subtitle)}</p>
</section>
${summarySlide}
${weeklySlides}
${dailySlides}
</body>
</html>`;
}

export function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
