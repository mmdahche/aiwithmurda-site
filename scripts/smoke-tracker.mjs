import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function fetchClientBundle(appHtml, routeName, siteUrl) {
  const scriptMatch =
    appHtml.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/) ||
    appHtml.match(/<script[^>]+src=["']([^"']+)["'][^>]+type=["']module["']/);

  if (!scriptMatch) {
    throw new Error(`${routeName} client bundle missing`);
  }

  const bundleUrl = new URL(scriptMatch[1], siteUrl).toString();
  const response = await fetch(bundleUrl);
  const bundle = await response.text();

  if (!response.ok) {
    throw new Error(`${routeName} client bundle failed: ${response.status}`);
  }

  return bundle;
}

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const adminToken = requireEnv(env, "ADMIN_API_TOKEN");

const publicLogs = await fetchJson(`${siteUrl}/api/daily-logs`);
if (!publicLogs.response.ok || !Array.isArray(publicLogs.data?.logs)) {
  throw new Error(`Public daily logs failed: ${publicLogs.response.status} ${JSON.stringify(publicLogs.data)}`);
}

const liveFollowers = await fetchJson(`${siteUrl}/api/followers/live`);
if (
  !liveFollowers.response.ok ||
  liveFollowers.data?.ok !== true ||
  liveFollowers.data?.mode !== "live-follower-ticker" ||
  typeof liveFollowers.data?.total !== "number" ||
  !Array.isArray(liveFollowers.data?.sources)
) {
  throw new Error(`Public live followers failed: ${liveFollowers.response.status} ${JSON.stringify(liveFollowers.data)}`);
}

const robotsResponse = await fetch(`${siteUrl}/robots.txt`);
const robotsText = await robotsResponse.text();
if (!robotsResponse.ok || !robotsText.includes("Sitemap: https://aiwithmurda.com/sitemap.xml")) {
  throw new Error(`Robots route failed: ${robotsResponse.status}`);
}

const sitemapResponse = await fetch(`${siteUrl}/sitemap.xml`);
const sitemapText = await sitemapResponse.text();
if (!sitemapResponse.ok || !sitemapText.includes("https://aiwithmurda.com/kit")) {
  throw new Error(`Sitemap route failed: ${sitemapResponse.status}`);
}

const manifestResponse = await fetch(`${siteUrl}/site.webmanifest`);
const manifestText = await manifestResponse.text();
if (!manifestResponse.ok || !manifestText.includes("\"short_name\": \"AIWM\"")) {
  throw new Error(`Manifest route failed: ${manifestResponse.status}`);
}

const dashboardResponse = await fetch(`${siteUrl}/60/`);
const dashboardHtml = await dashboardResponse.text();
if (!dashboardResponse.ok || !dashboardHtml.includes("root")) {
  throw new Error(`Public dashboard route failed: ${dashboardResponse.status}`);
}

const toolsResponse = await fetch(`${siteUrl}/tools/`);
const toolsHtml = await toolsResponse.text();
if (!toolsResponse.ok || !toolsHtml.includes("root")) {
  throw new Error(`Public tools route failed: ${toolsResponse.status}`);
}

const adminResponse = await fetch(`${siteUrl}/admin/`);
const adminHtml = await adminResponse.text();
if (!adminResponse.ok || !adminHtml.includes("root")) {
  throw new Error(`Admin route failed: ${adminResponse.status}`);
}

const liveResponse = await fetch(`${siteUrl}/live/`);
const liveHtml = await liveResponse.text();
if (!liveResponse.ok || !liveHtml.includes("root")) {
  throw new Error(`Live route failed: ${liveResponse.status}`);
}
const liveBundle = await fetchClientBundle(liveHtml, "Live route", siteUrl);
if (!liveBundle.includes("Week 1 stream arc")) {
  throw new Error("Live route client bundle missing Week 1 stream arc");
}
if (!liveBundle.includes("Daily Run Sheet")) {
  throw new Error("Client bundle missing Daily Run Sheet");
}
if (!liveBundle.includes("Daily Clip Packet")) {
  throw new Error("Client bundle missing Daily Clip Packet");
}
if (!liveBundle.includes("Manual Gate Runbook")) {
  throw new Error("Client bundle missing Manual Gate Runbook");
}
if (!liveBundle.includes("Stream Command Deck")) {
  throw new Error("Client bundle missing Stream Command Deck");
}
if (!liveBundle.includes("Buyer Email Copy Deck")) {
  throw new Error("Client bundle missing Buyer Email Copy Deck");
}
if (!liveBundle.includes("Admin login required")) {
  throw new Error("Client bundle missing admin login gate");
}
if (!liveBundle.includes("Password login is available")) {
  throw new Error("Client bundle missing admin password settings panel");
}
if (!liveBundle.includes("Send magic link backup")) {
  throw new Error("Client bundle missing admin magic-link backup");
}
if (!liveBundle.includes("Start $2 test purchase")) {
  throw new Error("Client bundle missing $2 test purchase control");
}
if (!liveBundle.includes("Metrics Automation Hub")) {
  throw new Error("Client bundle missing Metrics Automation Hub");
}
if (!liveBundle.includes("Automated Daily Snapshot")) {
  throw new Error("Client bundle missing Automated Daily Snapshot");
}
if (!liveBundle.includes("Live follower ticker")) {
  throw new Error("Client bundle missing Live follower ticker");
}

const kitResponse = await fetch(`${siteUrl}/kit/`);
const kitHtml = await kitResponse.text();
if (!kitResponse.ok || !kitHtml.includes("root")) {
  throw new Error(`Kit route failed: ${kitResponse.status}`);
}

const membersResponse = await fetch(`${siteUrl}/members/`);
const membersHtml = await membersResponse.text();
if (!membersResponse.ok || !membersHtml.includes("root")) {
  throw new Error(`Members route failed: ${membersResponse.status}`);
}

const memberModuleResponse = await fetch(`${siteUrl}/members/module/command-setup/`);
const memberModuleHtml = await memberModuleResponse.text();
if (!memberModuleResponse.ok || !memberModuleHtml.includes("root")) {
  throw new Error(`Member module route failed: ${memberModuleResponse.status}`);
}

const overlayResponse = await fetch(`${siteUrl}/overlay/`);
const overlayHtml = await overlayResponse.text();
if (!overlayResponse.ok || !overlayHtml.includes("root")) {
  throw new Error(`Overlay route failed: ${overlayResponse.status}`);
}

const obsResponse = await fetch(`${siteUrl}/obs/`);
const obsHtml = await obsResponse.text();
if (!obsResponse.ok || !obsHtml.includes("root")) {
  throw new Error(`OBS alias route failed: ${obsResponse.status}`);
}

const dayReceiptResponse = await fetch(`${siteUrl}/day/1/`);
const dayReceiptHtml = await dayReceiptResponse.text();
if (!dayReceiptResponse.ok || !dayReceiptHtml.includes("root")) {
  throw new Error(`Day receipt route failed: ${dayReceiptResponse.status}`);
}

const blockedWrite = await fetchJson(`${siteUrl}/api/admin/daily-logs`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ logs: [] }),
});
if (blockedWrite.response.status !== 401 || blockedWrite.data?.error !== "invalid_admin_token") {
  throw new Error(`Admin guard failed: ${blockedWrite.response.status} ${JSON.stringify(blockedWrite.data)}`);
}

const blockedAdminSession = await fetchJson(`${siteUrl}/api/admin/session`);
if (blockedAdminSession.response.status !== 401 || blockedAdminSession.data?.error !== "missing_bearer_token") {
  throw new Error(
    `Admin session guard failed: ${blockedAdminSession.response.status} ${JSON.stringify(blockedAdminSession.data)}`,
  );
}

const systemStatus = await fetchJson(`${siteUrl}/api/admin/system/status`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
if (!systemStatus.response.ok || systemStatus.data?.ok !== true || !systemStatus.data?.status?.supabase) {
  throw new Error(`Admin system status failed: ${systemStatus.response.status} ${JSON.stringify(systemStatus.data)}`);
}

const offerSummary = await fetchJson(`${siteUrl}/api/admin/offer/summary`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
if (
  !offerSummary.response.ok ||
  offerSummary.data?.ok !== true ||
  offerSummary.data?.summary?.product?.tasks < 20 ||
  offerSummary.data?.summary?.product?.assets < 5 ||
  !Array.isArray(offerSummary.data?.summary?.members)
) {
  throw new Error(`Admin offer summary failed: ${offerSummary.response.status} ${JSON.stringify(offerSummary.data)}`);
}

const metricsAutomation = await fetchJson(`${siteUrl}/api/admin/metrics/automation`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
if (
  !metricsAutomation.response.ok ||
  metricsAutomation.data?.ok !== true ||
  !Array.isArray(metricsAutomation.data?.summary?.sources) ||
  !metricsAutomation.data.summary.sources.some((source) => source.key === "email-subscribers" && source.status === "live") ||
  !metricsAutomation.data.summary.sources.some((source) => source.key === "twitch-followers") ||
  !Array.isArray(metricsAutomation.data?.summary?.nextBuilds) ||
  !metricsAutomation.data.summary.nextBuilds.includes("Twitch OAuth + EventSub follow listener")
) {
  throw new Error(
    `Admin metrics automation summary failed: ${metricsAutomation.response.status} ${JSON.stringify(metricsAutomation.data)}`,
  );
}

const dailySnapshot = await fetchJson(`${siteUrl}/api/admin/metrics/daily-snapshot?day=1`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
if (
  !dailySnapshot.response.ok ||
  dailySnapshot.data?.ok !== true ||
  dailySnapshot.data?.snapshot?.targetDay !== 1 ||
  !dailySnapshot.data?.snapshot?.proposedLog ||
  !Array.isArray(dailySnapshot.data?.snapshot?.changes) ||
  !Array.isArray(dailySnapshot.data?.snapshot?.pendingSources)
) {
  throw new Error(`Admin daily snapshot failed: ${dailySnapshot.response.status} ${JSON.stringify(dailySnapshot.data)}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      siteUrl,
      checks: {
        publicLogsReadable: true,
        publicLiveFollowersReadable: true,
        robotsReadable: true,
        sitemapReadable: true,
        manifestReadable: true,
        publicDashboardRoute: true,
        publicToolsRoute: true,
        adminRoute: true,
        publicLiveRoute: true,
        publicLiveWeekOneArc: true,
        adminDailyRunSheetBundle: true,
        adminDailyClipPacketBundle: true,
        adminManualGateRunbookBundle: true,
        adminStreamCommandDeckBundle: true,
        adminBuyerEmailCopyDeckBundle: true,
        adminLoginGateBundle: true,
        adminPasswordSettingsBundle: true,
        adminMagicLinkBackupBundle: true,
        adminTestPurchaseBundle: true,
        adminMetricsAutomationBundle: true,
        adminDailySnapshotBundle: true,
        adminMetricsAutomationApi: true,
        adminDailySnapshotApi: true,
        kitRoute: true,
        membersRoute: true,
        memberModuleRoute: true,
        overlayRoute: true,
        obsAliasRoute: true,
        dayReceiptRoute: true,
        adminWritesBlockedWithoutToken: true,
        adminSessionBlockedWithoutLogin: true,
        adminSystemStatusReadable: true,
        adminOfferSummaryReadable: true,
        adminOfferMembersReadable: true,
      },
      system: {
        stripeMode: systemStatus.data.status.stripeMode,
        renderCommit: systemStatus.data.status.renderCommit,
      },
      offer: {
        activeMembers: offerSummary.data.summary.sales.activeMembers,
        paidPurchases: offerSummary.data.summary.sales.paidPurchases,
        completedTasks: offerSummary.data.summary.progress.completedTasks,
      },
      logs: {
        count: publicLogs.data.logs.length,
        firstDay: publicLogs.data.logs[0]?.day || null,
        latestDay: publicLogs.data.logs.at(-1)?.day || null,
      },
    },
    null,
    2,
  ),
);
