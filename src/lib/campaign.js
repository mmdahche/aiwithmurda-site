const DAY_MS = 24 * 60 * 60 * 1000;

function parseTimestamp(value, fallback) {
  const parsed = Date.parse(value || fallback || "");
  if (!Number.isFinite(parsed)) throw new Error("invalid_campaign_start");
  return parsed;
}

function formatCampaignDate(timestamp, timeZone = "America/Chicago") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getCampaignBounds(config) {
  const startMs = parseTimestamp(config?.startAt, `${config?.startDate}T00:00:00`);
  const totalDays = Math.max(1, Number(config?.totalDays || 60));
  const endMs = startMs + totalDays * DAY_MS;

  return {
    startMs,
    endMs,
    totalDays,
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
  };
}

export function getCampaignDayForTimestamp(config, timestamp = Date.now()) {
  const value = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  if (!Number.isFinite(value)) return null;
  const { startMs, endMs, totalDays } = getCampaignBounds(config);
  if (value < startMs || value >= endMs) return null;
  return Math.min(totalDays, Math.floor((value - startMs) / DAY_MS) + 1);
}

export function getCampaignDateForDay(config, day) {
  const targetDay = Number(day);
  const { startMs, totalDays } = getCampaignBounds(config);
  if (!Number.isInteger(targetDay) || targetDay < 1 || targetDay > totalDays) {
    throw new Error("invalid_campaign_day");
  }
  return formatCampaignDate(startMs + (targetDay - 1) * DAY_MS, config?.timeZone || "America/Chicago");
}

export function getCampaignState(config, timestamp = Date.now()) {
  const nowMs = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  if (!Number.isFinite(nowMs)) throw new Error("invalid_campaign_timestamp");
  const bounds = getCampaignBounds(config);
  const officialDay = getCampaignDayForTimestamp(config, nowMs);
  const phase = nowMs < bounds.startMs ? "rehearsal" : nowMs >= bounds.endMs ? "complete" : "live";
  const currentDay = phase === "rehearsal" ? 0 : phase === "complete" ? bounds.totalDays : officialDay;
  const activeDayStartMs = currentDay
    ? bounds.startMs + (currentDay - 1) * DAY_MS
    : bounds.startMs;

  return {
    phase,
    isRehearsal: phase === "rehearsal",
    isLive: phase === "live",
    isComplete: phase === "complete",
    currentDay,
    totalDays: bounds.totalDays,
    startAt: bounds.startAt,
    endAt: bounds.endAt,
    startDate: getCampaignDateForDay(config, 1),
    endDate: getCampaignDateForDay(config, bounds.totalDays),
    activeDayStartAt: new Date(activeDayStartMs).toISOString(),
    activeDayEndAt: new Date(Math.min(activeDayStartMs + DAY_MS, bounds.endMs)).toISOString(),
    millisecondsUntilStart: Math.max(0, bounds.startMs - nowMs),
    millisecondsRemaining: Math.max(0, bounds.endMs - nowMs),
  };
}

