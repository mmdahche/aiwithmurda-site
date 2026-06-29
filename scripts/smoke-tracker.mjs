import { getSiteUrl, loadEnv, requireEnv } from "./env-loader.mjs";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const env = loadEnv();
const siteUrl = getSiteUrl(env);
const adminToken = requireEnv(env, "ADMIN_API_TOKEN");

const publicLogs = await fetchJson(`${siteUrl}/api/daily-logs`);
if (!publicLogs.response.ok || !Array.isArray(publicLogs.data?.logs)) {
  throw new Error(`Public daily logs failed: ${publicLogs.response.status} ${JSON.stringify(publicLogs.data)}`);
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

const liveResponse = await fetch(`${siteUrl}/live/`);
const liveHtml = await liveResponse.text();
if (!liveResponse.ok || !liveHtml.includes("root") || !liveHtml.includes("Week 1 stream arc")) {
  throw new Error(`Live route failed: ${liveResponse.status}`);
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

console.log(
  JSON.stringify(
    {
      ok: true,
      siteUrl,
      checks: {
        publicLogsReadable: true,
        robotsReadable: true,
        sitemapReadable: true,
        manifestReadable: true,
        publicDashboardRoute: true,
        publicToolsRoute: true,
        publicLiveRoute: true,
        kitRoute: true,
        membersRoute: true,
        memberModuleRoute: true,
        overlayRoute: true,
        obsAliasRoute: true,
        dayReceiptRoute: true,
        adminWritesBlockedWithoutToken: true,
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
