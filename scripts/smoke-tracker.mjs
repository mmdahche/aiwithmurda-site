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
if (
  !publicLogs.response.ok ||
  !Array.isArray(publicLogs.data?.logs) ||
  publicLogs.data.logs.some((log) => !Array.isArray(log.workItems))
) {
  throw new Error(`Public daily logs failed: ${publicLogs.response.status} ${JSON.stringify(publicLogs.data)}`);
}

const liveFollowers = await fetchJson(`${siteUrl}/api/followers/live`);
if (
  !liveFollowers.response.ok ||
  liveFollowers.data?.ok !== true ||
  liveFollowers.data?.mode !== "verified-social-metrics" ||
  typeof liveFollowers.data?.total !== "number" ||
  !Array.isArray(liveFollowers.data?.sources) ||
  !["twitch", "tiktok", "instagram", "youtube", "x"].every((provider) =>
    liveFollowers.data.sources.some((source) => source.key === provider),
  ) ||
  liveFollowers.data.sources.some((source) => source.status === "daily-log-fallback") ||
  liveFollowers.data.total !== liveFollowers.data.sources
    .filter((source) => source.connected)
    .reduce((sum, source) => sum + Number(source.count || 0), 0)
) {
  throw new Error(`Public live followers failed: ${liveFollowers.response.status} ${JSON.stringify(liveFollowers.data)}`);
}

const socialStatusUnauthorized = await fetchJson(`${siteUrl}/api/admin/integrations/social/status`);
if (socialStatusUnauthorized.response.status !== 401 || socialStatusUnauthorized.data?.error !== "invalid_admin_token") {
  throw new Error(
    `Social status guard failed: ${socialStatusUnauthorized.response.status} ${JSON.stringify(socialStatusUnauthorized.data)}`,
  );
}

const socialStatus = await fetchJson(`${siteUrl}/api/admin/integrations/social/status`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
if (
  !socialStatus.response.ok ||
  socialStatus.data?.ok !== true ||
  !Array.isArray(socialStatus.data?.status?.providers) ||
  (siteUrl.startsWith("https://") && socialStatus.data?.status?.encryptionReady !== true) ||
  !socialStatus.data.status.providers.some((provider) => provider.key === "twitch" && provider.oauthSupported) ||
  !socialStatus.data.status.providers.some(
    (provider) =>
      provider.key === "instagram" &&
      provider.callbackUrl?.includes("/api/integrations/instagram/callback") &&
      provider.requiredScopes?.includes("instagram_business_basic") &&
      provider.envKeys?.includes("INSTAGRAM_APP_ID"),
  ) ||
  !socialStatus.data.status.providers.some((provider) => provider.key === "youtube" && provider.precision === "rounded")
) {
  throw new Error(`Social status failed: ${socialStatus.response.status} ${JSON.stringify(socialStatus.data)}`);
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
  if (followerStreamText.includes("verified-social-metrics")) break;
}
followerStreamController.abort();
if (
  !followerStream.ok ||
  !followerStream.headers.get("content-type")?.includes("text/event-stream") ||
  !followerStreamText.includes("event: followers") ||
  !followerStreamText.includes("verified-social-metrics")
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
  !sitemapText.includes("<loc>https://aiwithmurda.com/</loc>") ||
  !sitemapText.includes("<loc>https://aiwithmurda.com/terms</loc>") ||
  !sitemapText.includes("<loc>https://aiwithmurda.com/privacy</loc>")
) {
  throw new Error(`Sitemap route failed: ${sitemapResponse.status}`);
}

const manifestResponse = await fetch(`${siteUrl}/site.webmanifest`);
const manifestText = await manifestResponse.text();
if (!manifestResponse.ok || !manifestText.includes("\"short_name\": \"AIWM\"")) {
  throw new Error(`Manifest route failed: ${manifestResponse.status}`);
}

const adminResponse = await fetch(`${siteUrl}/admin/`);
const adminHtml = await adminResponse.text();
if (!adminResponse.ok || !adminHtml.includes("root")) {
  throw new Error(`Admin route failed: ${adminResponse.status}`);
}
// The admin workspace and the OBS overlays share the one entry bundle with the public sales page.
// Every string below comes from admin or overlay code (AdminGate, DailyLog, SettingsView, the admin panels,
// FollowerOverlay, the stream config the admin edits), so it stays in the bundle while those routes exist.
const adminBundle = await fetchClientBundle(adminHtml, "Admin route", siteUrl);
if (!adminBundle.includes("Daily Run Sheet")) {
  throw new Error("Client bundle missing Daily Run Sheet");
}
if (!adminBundle.includes("Daily Clip Packet")) {
  throw new Error("Client bundle missing Daily Clip Packet");
}
if (!adminBundle.includes("Live work queue") || !adminBundle.includes("Read-only automation")) {
  throw new Error("Client bundle missing daily operating console");
}
if (!adminBundle.includes("Manual Gate Runbook")) {
  throw new Error("Client bundle missing Manual Gate Runbook");
}
if (!adminBundle.includes("Stream Command Deck")) {
  throw new Error("Client bundle missing Stream Command Deck");
}
if (!adminBundle.includes("Fake Stream Rehearsal") || !adminBundle.includes("Copy rehearsal")) {
  throw new Error("Client bundle missing fake stream rehearsal workflow");
}
if (!adminBundle.includes("Platform setup") || !adminBundle.includes("STREAM_YOUTUBE_URL")) {
  throw new Error("Client bundle missing stream platform setup workflow");
}
if (!adminBundle.includes("Stream Privacy Guard") || !adminBundle.includes("Never show secret screens")) {
  throw new Error("Client bundle missing stream privacy guard workflow");
}
if (!adminBundle.includes("Buyer Email Copy Deck")) {
  throw new Error("Client bundle missing Buyer Email Copy Deck");
}
if (!adminBundle.includes("Admin login required")) {
  throw new Error("Client bundle missing admin login gate");
}
if (!adminBundle.includes("Password login is available")) {
  throw new Error("Client bundle missing admin password settings panel");
}
if (!adminBundle.includes("Send magic link backup")) {
  throw new Error("Client bundle missing admin magic-link backup");
}
if (!adminBundle.includes("Start $2 test purchase")) {
  throw new Error("Client bundle missing $2 test purchase control");
}
if (!adminBundle.includes("Metrics Automation Hub")) {
  throw new Error("Client bundle missing Metrics Automation Hub");
}
if (!adminBundle.includes("Daily Snapshot Recovery")) {
  throw new Error("Client bundle missing Daily Snapshot Recovery");
}
if (!adminBundle.includes("Total followers")) {
  throw new Error("Client bundle missing combined follower overlay");
}
if (!adminBundle.includes("Follower Ticker")) {
  throw new Error("Client bundle missing Follower Ticker Control");
}
if (!adminBundle.includes("/api/followers/stream")) {
  throw new Error("Client bundle missing follower stream route");
}
if (!adminBundle.includes("Clip Intake Webhook")) {
  throw new Error("Client bundle missing Clip Intake Webhook");
}
if (!adminBundle.includes("Social Accounts")) {
  throw new Error("Client bundle missing Social Accounts control panel");
}
if (!adminBundle.includes("Enable instant")) {
  throw new Error("Client bundle missing Twitch EventSub control");
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

const blockedWrite = await fetchJson(`${siteUrl}/api/admin/daily-logs`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ logs: [] }),
});
if (blockedWrite.response.status !== 401 || blockedWrite.data?.error !== "invalid_admin_token") {
  throw new Error(`Admin guard failed: ${blockedWrite.response.status} ${JSON.stringify(blockedWrite.data)}`);
}

const blockedDailyPlanPatch = await fetchJson(`${siteUrl}/api/admin/daily-logs/1`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mainGoal: "Blocked smoke test" }),
});
if (blockedDailyPlanPatch.response.status !== 401 || blockedDailyPlanPatch.data?.error !== "missing_bearer_token") {
  throw new Error(
    `Admin daily plan guard failed: ${blockedDailyPlanPatch.response.status} ${JSON.stringify(blockedDailyPlanPatch.data)}`,
  );
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
  !offerSummary.data?.summary?.products?.some((product) => product.key === "new_wave_live_builds") ||
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
  !metricsAutomation.data.summary.nextBuilds.includes(
    "Run a private OBS rehearsal and confirm Twitch creates a rehearsal-only stream session",
  ) ||
  metricsAutomation.data?.summary?.campaign?.campaign?.startDate !== "2026-08-01"
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
        adminRoute: true,
        adminDailyRunSheetBundle: true,
        adminDailyClipPacketBundle: true,
        adminDailyOperatingConsoleBundle: true,
        adminManualGateRunbookBundle: true,
        adminStreamCommandDeckBundle: true,
        adminStreamRehearsalBundle: true,
        adminStreamPlatformSetupBundle: true,
        adminStreamPrivacyGuardBundle: true,
        adminBuyerEmailCopyDeckBundle: true,
        adminLoginGateBundle: true,
        adminPasswordSettingsBundle: true,
        adminMagicLinkBackupBundle: true,
        adminTestPurchaseBundle: true,
        adminMetricsAutomationBundle: true,
        adminDailySnapshotBundle: true,
        adminClipIntakeBundle: true,
        adminSocialAccountsBundle: true,
        combinedFollowerOverlayBundle: true,
        adminMetricsAutomationApi: true,
        adminDailySnapshotApi: true,
        adminTwitchStatusApi: true,
        adminSocialStatusApi: true,
        socialSeedFallbackExcluded: true,
        overlayRoute: true,
        followerOverlayRoute: true,
        obsAliasRoute: true,
        followerObsAliasRoute: true,
        adminWritesBlockedWithoutToken: true,
        adminDailyPlanPatchBlockedWithoutLogin: true,
        adminClipIntakeBlockedWithoutToken: true,
        adminFollowerIntakeBlockedWithoutToken: true,
        adminTwitchStatusBlockedWithoutToken: true,
        adminTwitchOAuthBlockedWithoutToken: true,
        adminSocialStatusBlockedWithoutToken: true,
        adminSessionBlockedWithoutLogin: true,
        adminSystemStatusReadable: true,
        adminOfferSummaryReadable: true,
        adminOfferProductBreakdownReadable: true,
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
