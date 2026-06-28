async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "request_failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function subscribeBuildLog({ email, name, source = "start" }) {
  return apiRequest("/api/subscribe", {
    method: "POST",
    body: { email, name, source },
  });
}

export function getDailyLogs() {
  return apiRequest("/api/daily-logs");
}

export function syncDailyLogs(logs, adminToken) {
  return apiRequest("/api/admin/daily-logs", {
    method: "PUT",
    body: { logs },
    token: adminToken,
  });
}

export function getMemberProfile(token) {
  return apiRequest("/api/me", { token });
}

export function createFutureMethodCheckout(token) {
  return apiRequest("/api/checkout/future-proof-method", {
    method: "POST",
    token,
  });
}

export function verifyCheckoutSession(sessionId, token) {
  return apiRequest(`/api/access/session/${encodeURIComponent(sessionId)}`, {
    token,
  });
}

export async function downloadMemberAsset(assetKey, token) {
  const response = await fetch(`/api/member-assets/future-proof-method/${encodeURIComponent(assetKey)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || "asset_download_failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return response.blob();
}
