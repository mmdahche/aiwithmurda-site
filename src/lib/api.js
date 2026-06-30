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

export function syncDailyLogs(logs, adminToken, { replace = false } = {}) {
  return apiRequest("/api/admin/daily-logs", {
    method: "PUT",
    body: { logs, replace },
    token: adminToken,
  });
}

export function getSubscriberSummary(adminToken) {
  return apiRequest("/api/admin/subscribers/summary", {
    token: adminToken,
  });
}

export function getOfferOpsSummary(adminToken) {
  return apiRequest("/api/admin/offer/summary", {
    token: adminToken,
  });
}

export function getMetricsAutomationSummary(adminToken) {
  return apiRequest("/api/admin/metrics/automation", {
    token: adminToken,
  });
}

export function previewDailySnapshot(adminToken, day) {
  const params = day ? `?day=${encodeURIComponent(day)}` : "";
  return apiRequest(`/api/admin/metrics/daily-snapshot${params}`, {
    token: adminToken,
  });
}

export function applyDailySnapshot({ day } = {}, adminToken) {
  return apiRequest("/api/admin/metrics/daily-snapshot", {
    method: "POST",
    body: { day },
    token: adminToken,
  });
}

export function getSystemStatus(adminToken) {
  return apiRequest("/api/admin/system/status", {
    token: adminToken,
  });
}

export function verifyAdminSession(token) {
  return apiRequest("/api/admin/session", { token });
}

export function getStreamConfig() {
  return apiRequest("/api/stream/config");
}

export function getMemberProfile(token) {
  return apiRequest("/api/me", { token });
}

export function getMemberProgress(token) {
  return apiRequest("/api/member-progress/future-proof-method", { token });
}

export function updateMemberTaskProgress({ moduleKey, taskKey, completed }, token) {
  return apiRequest("/api/member-progress/future-proof-method", {
    method: "PUT",
    body: { moduleKey, taskKey, completed },
    token,
  });
}

export function createFutureMethodCheckout(token) {
  return apiRequest("/api/checkout/future-proof-method", {
    method: "POST",
    token,
  });
}

export function createTestPurchaseCheckout(token) {
  return apiRequest("/api/checkout/test-purchase", {
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
