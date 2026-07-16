/** Client-side scoreboard helpers — configurable storage key. */

export const DEFAULT_STORAGE_KEY = "proof-engine:v1";

export function loadLogs(seedLogs, storageKey = DEFAULT_STORAGE_KEY) {
  if (typeof window === "undefined") return seedLogs;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return seedLogs;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedLogs;
  } catch {
    return seedLogs;
  }
}

export function saveLogs(logs, storageKey = DEFAULT_STORAGE_KEY) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(logs));
}

export function resetLogs(storageKey = DEFAULT_STORAGE_KEY) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
}

export function totalFollowers(record) {
  return Object.entries(record.followers || {}).reduce((sum, [key, value]) => {
    if (key.startsWith("_")) return sum;
    const count = Number(value);
    return Number.isFinite(count) ? sum + count : sum;
  }, 0);
}

function baselineFollowers(record) {
  return Object.values(record.followers?._baseline || {}).reduce((sum, value) => {
    const count = Number(value);
    return Number.isFinite(count) ? sum + count : sum;
  }, 0);
}

export function getLatestRecord(logs) {
  return [...logs].sort((a, b) => a.day - b.day).at(-1);
}

export function getPreviousRecord(logs, day) {
  return [...logs].filter((record) => record.day < day).sort((a, b) => b.day - a.day)[0] || null;
}

export function getDayGains(logs, record) {
  const previous = getPreviousRecord(logs, record.day);
  const previousFollowers = previous ? totalFollowers(previous) : baselineFollowers(record);
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

export function buildShareCopy(config, record, receiptUrl) {
  return [
    `Day ${record.day} of ${config.title}: ${record.mainGoal}`,
    record.shippedItems?.[0] ? `Shipped: ${record.shippedItems[0]}` : null,
    record.lessonLearned ? `Lesson: ${record.lessonLearned}` : null,
    `Receipt: ${receiptUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
