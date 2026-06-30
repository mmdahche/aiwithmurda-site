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

const twitchStatusUnauthorized = await fetchJson(`${siteUrl}/api/admin/integrations/twitch/status`);
if (twitchStatusUnauthorized.response.status !== 401 || twitchStatusUnauthorized.data?.error !== "invalid_admin_token") {
  throw new Error(
    `Twitch status guard failed: ${twitchStatusUnauthorized.response.status} ${JSON.stringify(twitchStatusUnauthorized.data)}`,
  );
}

const twitchOAuthUnauthorized = await fetchJson(`${siteUrl}/api/admin/integrations/twitch/oauth/start`, {
  method: "POST",
});
if (twitchOAuthUnauthorized.response.status !== 401 || twitchOAuthUnauthorized.data?.error !== "invalid_admin_token") {
  throw new Error(
    `Twitch OAuth guard failed: ${twitchOAuthUnauthorized.response.status} ${JSON.stringify(twitchOAuthUnauthorized.data)}`,
  );
}

const twitchStatus = await fetchJson(`${siteUrl}/api/admin/integrations/twitch/status`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
if (
  !twitchStatus.response.ok ||
  twitchStatus.data?.ok !== true ||
  !twitchStatus.data?.status?.callbackUrl?.includes("/api/integrations/twitch/callback") ||
  !twitchStatus.data?.status?.eventSubCallbackUrl?.includes("/api/integrations/twitch/eventsub")
) {
  throw new Error(`Twitch status failed: ${twitchStatus.response.status} ${JSON.stringify(twitchStatus.data)}`);
}

const followerStreamController = new AbortController();
const followerStream = await fetch(`${siteUrl}/api/followers/stream`, {
  signal: followerStreamController.signal,
});
const followerStreamReader = followerStream.body?.getReader();
const followerStreamDecoder = new TextDecoder();
let followerStreamText = "";
for (let index = 0; index < 5 && followerStreamReader; index += 1) {
  const chunk = await followerStreamReader.read();
  if (chunk.done) break;
  followerStreamText += followerStreamDecoder.decode(chunk.value, { stream: true });
  if (followerStreamText.includes("live-follower-ticker")) break;
}
followerStreamController.abort();
if (
  !followerStream.ok ||
  !followerStream.headers.get("content-type")?.includes("text/event-stream") ||
  !followerStreamText.includes("event: followers") ||
  !followerStreamText.includes("live-follower-ticker")
) {
  throw new Error(`Public live follower stream failed: ${followerStream.status} ${followerStreamText}`);
}

const robotsResponse = await fetch(`${siteUrl}/robots.txt`);
const robotsText = await robotsResponse.text();
if (!robotsResponse.ok || !robotsText.includes("Sitemap: https://aiwithmurda.com/sitemap.xml")) {
  throw new Error(`Robots route failed: ${robotsResponse.status}`);
}

const sitemapResponse = await fetch(`${siteUrl}/sitemap.xml`);
const sitemapText = await sitemapResponse.text();
if (
  !sitemapResponse.ok ||
  !sitemapText.includes("https://aiwithmurda.com/kit") ||
  !sitemapText.includes("https://aiwithmurda.com/live-builds")
) {
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
if (!liveBundle.includes("Live follower counter")) {
  throw new Error("Client bundle missing Live follower counter");
}
if (!liveBundle.includes("Follower Ticker Control")) {
  throw new Error("Client bundle missing Follower Ticker Control");
}
if (!liveBundle.includes("/api/followers/stream")) {
  throw new Error("Client bundle missing follower stream route");
}
if (!liveBundle.includes("Clip Intake Webhook")) {
  throw new Error("Client bundle missing Clip Intake Webhook");
}
if (!liveBundle.includes("Follower Count Intake")) {
  throw new Error("Client bundle missing Follower Count Intake");
}
if (!liveBundle.includes("Twitch Live Connector")) {
  throw new Error("Client bundle missing Twitch Live Connector");
}
if (!liveBundle.includes("Subscribe EventSub")) {
  throw new Error("Client bundle missing Twitch EventSub control");
}

const kitResponse = await fetch(`${siteUrl}/kit/`);
const kitHtml = await kitResponse.text();
if (!kitResponse.ok || !kitHtml.includes("root")) {
  throw new Error(`Kit route failed: ${kitResponse.status}`);
}

const liveBuildsResponse = await fetch(`${siteUrl}/live-builds/`);
const liveBuildsHtml = await liveBuildsResponse.text();
if (!liveBuildsResponse.ok || !liveBuildsHtml.includes("root")) {
  throw new Error(`Live builds route failed: ${liveBuildsResponse.status}`);
}
const liveBuildsBundle = await fetchClientBundle(liveBuildsHtml, "Live builds route", siteUrl);
if (!liveBuildsBundle.includes("New Wave Live Builds") || !liveBuildsBundle.includes("Join the live-build list")) {
  throw new Error("Live builds route client bundle missing second-product offer copy");
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

const followerOverlayResponse = await fetch(`${siteUrl}/overlay/followers/`);
const followerOverlayHtml = await followerOverlayResponse.text();
if (!followerOverlayResponse.ok || !followerOverlayHtml.includes("root")) {
  throw new Error(`Follower overlay route failed: ${followerOverlayResponse.status}`);
}

const obsResponse = await fetch(`${siteUrl}/obs/`);
const obsHtml = await obsResponse.text();
if (!obsResponse.ok || !obsHtml.includes("root")) {
  throw new Error(`OBS alias route failed: ${obsResponse.status}`);
}

const followerObsResponse = await fetch(`${siteUrl}/obs/followers/`);
const followerObsHtml = await followerObsResponse.text();
if (!followerObsResponse.ok || !followerObsHtml.includes("root")) {
  throw new Error(`Follower OBS alias route failed: ${followerObsResponse.status}`);
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

const blockedClipIntake = await fetchJson(`${siteUrl}/api/admin/clips/intake`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ day: 1, platform: "smoke", title: "blocked" }),
});
if (blockedClipIntake.response.status !== 401 || blockedClipIntake.data?.error !== "invalid_admin_token") {
  throw new Error(
    `Admin clip intake guard failed: ${blockedClipIntake.response.status} ${JSON.stringify(blockedClipIntake.data)}`,
  );
}

const blockedFollowerIntake = await fetchJson(`${siteUrl}/api/admin/followers/intake`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ platform: "instagram", count: 1 }),
});
if (blockedFollowerIntake.response.status !== 401 || blockedFollowerIntake.data?.error !== "invalid_admin_token") {
  throw new Error(
    `Admin follower intake guard failed: ${blockedFollowerIntake.response.status} ${JSON.stringify(blockedFollowerIntake.data)}`,
  );
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
        publicLiveFollowerStreamReadable: true,
        robotsReadable: true,
        sitemapReadable: true,
        manifestReadable: true,
        publicDashboardRoute: true,
        publicToolsRoute: true,
        adminRoute: true,
        publicLiveRoute: true,
        publicLiveBuildsRoute: true,
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
        adminClipIntakeBundle: true,
        adminFollowerIntakeBundle: true,
        adminTwitchConnectorBundle: true,
        adminMetricsAutomationApi: true,
        adminDailySnapshotApi: true,
        adminTwitchStatusApi: true,
        kitRoute: true,
        membersRoute: true,
        memberModuleRoute: true,
        overlayRoute: true,
        followerOverlayRoute: true,
        obsAliasRoute: true,
        followerObsAliasRoute: true,
        dayReceiptRoute: true,
        adminWritesBlockedWithoutToken: true,
        adminClipIntakeBlockedWithoutToken: true,
        adminFollowerIntakeBlockedWithoutToken: true,
        adminTwitchStatusBlockedWithoutToken: true,
        adminTwitchOAuthBlockedWithoutToken: true,
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
