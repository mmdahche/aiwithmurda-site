import { seedLogs, sprintConfig } from "../src/data/seed.js";
import { buildDeckHtml, buildDeckSummary, weeklySummaries } from "../src/lib/tracker.js";

const weekly = weeklySummaries(seedLogs);
const summary = buildDeckSummary(sprintConfig, seedLogs, weekly);
const html = buildDeckHtml(sprintConfig, seedLogs);

const checks = {
  loggedDaysCounted: summary.loggedDays === seedLogs.length,
  bestFollowerWeekPresent: Boolean(summary.bestFollowerWeek?.label),
  bestRevenueWeekPresent: Boolean(summary.bestRevenueWeek?.label),
  bestClipWeekPresent: Boolean(summary.bestClipWeek?.label),
  controlSlideExported: html.includes("Proof Deck Control Slide"),
  weeklySlidesExported: weekly.every((week) => html.includes(week.label)),
  dailyProofAssetsExported: html.includes("Proof assets") && html.includes(seedLogs[0].proofAssets[0]),
  dailyShippedItemsExported: html.includes("What shipped") && html.includes(seedLogs[0].shippedItems[0]),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

if (failed.length) {
  throw new Error(`Deck smoke failed: ${failed.join(", ")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checks,
      summary: {
        loggedDays: summary.loggedDays,
        latestDay: summary.latestDay,
        bestFollowerWeek: summary.bestFollowerWeek.label,
        bestRevenueWeek: summary.bestRevenueWeek.label,
        bestClipWeek: summary.bestClipWeek.label,
      },
      slides: {
        weekly: weekly.length,
        daily: seedLogs.length,
      },
    },
    null,
    2,
  ),
);
