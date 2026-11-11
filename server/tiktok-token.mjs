// TikTok user-token refresh for the follower-count integration.
//
// From Dec 1 2026 TikTok access tokens last 2 hours, refresh tokens last 180
// days, and every successful refresh returns a NEW refresh token and voids the
// old one at once. So:
//   - the rotated refresh token must be saved every time (retried if the write
//     fails, because the stored one is already dead once TikTok answers),
//   - only one refresh may run at a time in this process,
//   - another server instance (a deploy overlap) may have rotated first: on
//     invalid_grant, re-read the row and adopt the newer pair before giving up,
//   - a refresh token that is truly dead flags the account for reconnect
//     instead of failing on every poll.
// All I/O is injected so the logic can be tested without Supabase or TikTok.

export const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
export const TIKTOK_REFRESH_WINDOW_MS = 10 * 60 * 1000;
export const TIKTOK_REFRESH_TIMEOUT_MS = 15 * 1000;
export const TIKTOK_SAVE_ATTEMPTS = 3;
export const TIKTOK_RECONNECT_MESSAGE = "tiktok_reconnect_required: TikTok sign-in expired. Reconnect TikTok in Admin settings.";

export function tiktokReconnectError() {
  const error = new Error(TIKTOK_RECONNECT_MESSAGE);
  error.status = 409;
  error.reconnectRequired = true;
  return error;
}

// ISO time the refresh token stops working, from a TikTok token response.
export function tiktokRefreshExpiresAt(data, now) {
  const seconds = Number(data?.refresh_expires_in);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(now + seconds * 1000).toISOString() : null;
}

export function createTikTokTokenRefresher({
  getConfig,
  readToken,
  storeToken,
  flagReconnect,
  normalizeScope = (scope) => scope,
  fetchImpl = (...args) => fetch(...args),
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log = console,
}) {
  let inFlight = null;

  function isFresh(token) {
    const expiresAt = token?.expires_at ? new Date(token.expires_at).getTime() : 0;
    return Boolean(expiresAt) && expiresAt - now() > TIKTOK_REFRESH_WINDOW_MS;
  }

  function refreshTokenExpired(token) {
    const at = Date.parse(token?.metadata?.refreshExpiresAt || "");
    return Number.isFinite(at) && at <= now();
  }

  async function storeWithRetry(values) {
    let lastError = null;
    for (let attempt = 0; attempt < TIKTOK_SAVE_ATTEMPTS; attempt += 1) {
      try {
        return await storeToken(values);
      } catch (error) {
        lastError = error;
        if (attempt < TIKTOK_SAVE_ATTEMPTS - 1) await sleep(250 * (attempt + 1));
      }
    }
    // TikTok already voided the refresh token still in the database.
    log.error?.("[tiktok-token] refreshed token could not be saved", lastError?.message || lastError);
    throw lastError || new Error("tiktok_token_save_failed");
  }

  async function refresh(token) {
    const config = getConfig();
    if (!config.configured) return token;

    // Re-read: another instance may have refreshed (or flagged) since our read.
    const latest = (await readToken()) || token;
    if (latest?.metadata?.needsReconnect) throw tiktokReconnectError();
    if (isFresh(latest)) return latest;
    if (!latest?.refresh_token) return latest;
    if (refreshTokenExpired(latest)) {
      await flagReconnect(latest, "refresh_token_expired").catch(() => null);
      throw tiktokReconnectError();
    }

    let response;
    let data;
    try {
      response = await fetchImpl(TIKTOK_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: config.clientKey,
          client_secret: config.clientSecret,
          grant_type: "refresh_token",
          refresh_token: latest.refresh_token,
        }),
        signal: AbortSignal.timeout(TIKTOK_REFRESH_TIMEOUT_MS),
      });
      data = await response.json().catch(() => ({}));
    } catch (error) {
      // Timeout or network failure. Keep the stored pair; the next poll retries.
      const wrapped = new Error("tiktok_token_refresh_unreachable");
      wrapped.cause = error;
      throw wrapped;
    }

    if (!response.ok || !data?.access_token) {
      const code = String(data?.error || data?.data?.error || "");
      if (code === "invalid_grant") {
        // invalid_grant covers an invalid, expired or revoked refresh token. If
        // another instance rotated it a moment ago, use that pair instead.
        const after = await readToken().catch(() => null);
        if (after?.refresh_token && after.refresh_token !== latest.refresh_token && !after.metadata?.needsReconnect) {
          return after;
        }
        await flagReconnect(after || latest, "invalid_grant").catch(() => null);
        throw tiktokReconnectError();
      }
      throw new Error(data?.error_description || data?.message || code || `tiktok_token_refresh_${response.status}`);
    }

    const at = now();
    const metadata = { ...(latest.metadata && typeof latest.metadata === "object" ? latest.metadata : {}) };
    delete metadata.needsReconnect;
    delete metadata.reconnectReason;
    const values = {
      access_token: data.access_token,
      // Rotated on every refresh; fall back only if TikTok omits it.
      refresh_token: data.refresh_token || latest.refresh_token,
      token_type: data.token_type || latest.token_type || "bearer",
      scope: normalizeScope(data.scope || latest.scope),
      expires_at: data.expires_in ? new Date(at + Number(data.expires_in) * 1000).toISOString() : null,
      provider_user_id: data.open_id || latest.provider_user_id,
      provider_user_login: latest.provider_user_login,
      provider_user_name: latest.provider_user_name,
      broadcaster_user_id: null,
      metadata: {
        ...metadata,
        refreshExpiresIn: data.refresh_expires_in || metadata.refreshExpiresIn || null,
        refreshExpiresAt: tiktokRefreshExpiresAt(data, at) || metadata.refreshExpiresAt || null,
        refreshedAt: new Date(at).toISOString(),
      },
    };

    try {
      return await storeWithRetry(values);
    } catch {
      await flagReconnect(latest, "save_failed").catch(() => null);
      throw tiktokReconnectError();
    }
  }

  // Returns a usable token, refreshing it when it is close to expiry.
  return async function refreshTikTokStoredTokenIfNeeded(token) {
    if (!token?.refresh_token) return token;
    if (token.metadata?.needsReconnect) throw tiktokReconnectError();
    if (isFresh(token)) return token;
    if (!inFlight) {
      inFlight = refresh(token).finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}
