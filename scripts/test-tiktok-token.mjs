// Offline checks for server/tiktok-token.mjs against TikTok's Dec 1 2026 token
// rules (2h access tokens, 180-day refresh tokens rotated on every refresh).
// Run: npm run test:tiktok-token
import assert from "node:assert/strict";
import {
  TIKTOK_RECONNECT_MESSAGE,
  TIKTOK_SAVE_ATTEMPTS,
  createTikTokTokenRefresher,
} from "../server/tiktok-token.mjs";

const NOW = Date.parse("2026-12-02T12:00:00Z");
const TWO_HOURS = 2 * 60 * 60;
const DAYS_180 = 180 * 24 * 60 * 60;

function storedToken(overrides = {}) {
  return {
    access_token: "act-old",
    refresh_token: "rft-old",
    token_type: "bearer",
    scope: ["user.info.stats"],
    expires_at: new Date(NOW + 60 * 1000).toISOString(),
    provider_user_id: "oid",
    provider_user_login: "aiwithmurda",
    provider_user_name: "AiWithMurda",
    updated_at: "2026-12-02T10:00:00Z",
    metadata: {},
    ...overrides,
  };
}

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

function errResponse(status, body) {
  return { ok: false, status, json: async () => body };
}

function harness({ row, responses, storeFailures = 0 }) {
  const state = { row, stores: [], flags: [], calls: [], storeFailures };
  const refresher = createTikTokTokenRefresher({
    getConfig: () => ({ configured: true, clientKey: "ck", clientSecret: "cs" }),
    readToken: async () => state.row,
    storeToken: async (values) => {
      if (state.storeFailures > 0) {
        state.storeFailures -= 1;
        throw new Error("supabase down");
      }
      state.stores.push(values);
      state.row = { ...values, updated_at: "2026-12-02T12:00:01Z" };
      return state.row;
    },
    flagReconnect: async (token, reason) => {
      state.flags.push({ reason, refresh_token: token.refresh_token });
    },
    fetchImpl: async (url, init) => {
      state.calls.push({ url, init, body: new URLSearchParams(init.body) });
      const next = responses.shift();
      if (typeof next === "function") return next(state);
      return next;
    },
    now: () => NOW,
    sleep: async () => {},
    log: { error: () => {} },
  });
  return { state, refresher };
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push(false);
    console.error(`  ✗ ${name}\n    ${error.message}`);
  }
}

console.log("\nTikTok token refresh\n");

await check("fresh token is returned without a call", async () => {
  const token = storedToken({ expires_at: new Date(NOW + 60 * 60 * 1000).toISOString() });
  const { state, refresher } = harness({ row: token, responses: [] });
  assert.equal(await refresher(token), token);
  assert.equal(state.calls.length, 0);
});

await check("2h/180d refresh saves the rotated refresh token and its expiry", async () => {
  const token = storedToken();
  const { state, refresher } = harness({
    row: token,
    responses: [okResponse({ access_token: "act-new", refresh_token: "rft-new", expires_in: TWO_HOURS, refresh_expires_in: DAYS_180, open_id: "oid", scope: "user.info.stats" })],
  });
  const result = await refresher(token);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].body.get("refresh_token"), "rft-old");
  assert.equal(state.calls[0].body.get("client_key"), "ck");
  assert.ok(state.calls[0].init.signal, "token call has a timeout signal");
  assert.equal(result.refresh_token, "rft-new");
  assert.equal(result.expires_at, new Date(NOW + TWO_HOURS * 1000).toISOString());
  assert.equal(result.metadata.refreshExpiresAt, new Date(NOW + DAYS_180 * 1000).toISOString());
});

await check("concurrent callers share one refresh", async () => {
  const token = storedToken();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { state, refresher } = harness({
    row: token,
    responses: [async () => { await gate; return okResponse({ access_token: "act-new", refresh_token: "rft-new", expires_in: TWO_HOURS, refresh_expires_in: DAYS_180 }); }],
  });
  const a = refresher(token);
  const b = refresher(token);
  release();
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(state.calls.length, 1);
  assert.equal(ra.refresh_token, "rft-new");
  assert.equal(rb.refresh_token, "rft-new");
});

await check("token another instance already refreshed is used as is", async () => {
  const token = storedToken();
  const newer = storedToken({ access_token: "act-other", refresh_token: "rft-other", expires_at: new Date(NOW + TWO_HOURS * 1000).toISOString() });
  const { state, refresher } = harness({ row: newer, responses: [] });
  const result = await refresher(token);
  assert.equal(state.calls.length, 0);
  assert.equal(result.refresh_token, "rft-other");
});

await check("invalid_grant after another instance rotated adopts the newer pair", async () => {
  const token = storedToken();
  const { state, refresher } = harness({
    row: token,
    responses: [(s) => {
      // The other instance saves its rotation while our call is in flight.
      s.row = storedToken({ access_token: "act-other", refresh_token: "rft-other", expires_at: new Date(NOW + TWO_HOURS * 1000).toISOString() });
      return errResponse(400, { error: "invalid_grant", error_description: "refresh token is invalid" });
    }],
  });
  const result = await refresher(token);
  assert.equal(result.refresh_token, "rft-other");
  assert.equal(state.flags.length, 0);
});

await check("invalid_grant with no newer pair flags reconnect", async () => {
  const token = storedToken();
  const { state, refresher } = harness({ row: token, responses: [errResponse(400, { error: "invalid_grant" })] });
  await assert.rejects(refresher(token), (error) => error.message === TIKTOK_RECONNECT_MESSAGE && error.reconnectRequired === true);
  assert.deepEqual(state.flags, [{ reason: "invalid_grant", refresh_token: "rft-old" }]);
});

await check("flagged token fails fast with no call", async () => {
  const token = storedToken({ metadata: { needsReconnect: true } });
  const { state, refresher } = harness({ row: token, responses: [] });
  await assert.rejects(refresher(token), (error) => error.reconnectRequired === true);
  assert.equal(state.calls.length, 0);
});

await check("refresh token past its 180 days flags reconnect with no call", async () => {
  const token = storedToken({ metadata: { refreshExpiresAt: new Date(NOW - 1000).toISOString() } });
  const { state, refresher } = harness({ row: token, responses: [] });
  await assert.rejects(refresher(token), (error) => error.reconnectRequired === true);
  assert.equal(state.calls.length, 0);
  assert.equal(state.flags[0].reason, "refresh_token_expired");
});

await check("one failed save is retried and the rotated token is kept", async () => {
  const token = storedToken();
  const { state, refresher } = harness({
    row: token,
    storeFailures: 1,
    responses: [okResponse({ access_token: "act-new", refresh_token: "rft-new", expires_in: TWO_HOURS, refresh_expires_in: DAYS_180 })],
  });
  const result = await refresher(token);
  assert.equal(result.refresh_token, "rft-new");
  assert.equal(state.stores.length, 1);
});

await check("save that keeps failing flags reconnect", async () => {
  const token = storedToken();
  const { state, refresher } = harness({
    row: token,
    storeFailures: TIKTOK_SAVE_ATTEMPTS,
    responses: [okResponse({ access_token: "act-new", refresh_token: "rft-new", expires_in: TWO_HOURS, refresh_expires_in: DAYS_180 })],
  });
  await assert.rejects(refresher(token), (error) => error.reconnectRequired === true);
  assert.equal(state.flags[0].reason, "save_failed");
});

await check("other TikTok refusals keep the stored pair and do not flag", async () => {
  const token = storedToken();
  const { state, refresher } = harness({ row: token, responses: [errResponse(503, { error: "temporarily_unavailable" })] });
  await assert.rejects(refresher(token), (error) => !error.reconnectRequired);
  assert.equal(state.flags.length, 0);
  assert.equal(state.stores.length, 0);
});

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
