// frontend/src/js/api.js
import { CONFIG } from "./config.js";
import { getToken, clearAuth, goToLanding } from "./welcome.js";

function normalizeBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

function buildUrl(path) {
  const base = normalizeBase(CONFIG.API_BASE);
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base}${path}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status) {
  // Typical cold-start / gateway / transient statuses
  return status === 408 || status === 425 || status === 429 || status === 502 || status === 503 || status === 504;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Request wrapper:
 * - Adds Authorization header if token exists
 * - Retries transient failures (helps Render cold starts)
 * - On 401/403 clears auth + redirects to landing
 */
async function request(method, path, body) {
  const url = buildUrl(path);

  const headers = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  // Retry strategy (total ~60s worst case)
  const attempts = [
    { timeoutMs: 15000, backoffMs: 1000 },
    { timeoutMs: 20000, backoffMs: 3000 },
    { timeoutMs: 25000, backoffMs: 5000 },
  ];

  let lastErr = null;

  for (let i = 0; i < attempts.length; i++) {
    const { timeoutMs, backoffMs } = attempts[i];

    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);

      // If backend returns 401/403 — logout and go to login
      if (res.status === 401 || res.status === 403) {
        clearAuth();
        if (typeof window !== "undefined") goToLanding();
      }

      // Retry transient statuses
      if (isRetryableStatus(res.status) && i < attempts.length - 1) {
        await sleep(backoffMs);
        continue;
      }

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          (isRetryableStatus(res.status)
            ? `Server is waking up (HTTP ${res.status}). Try again in a moment.`
            : `HTTP ${res.status}`);

        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      lastErr = err;

      // AbortError / TypeError Failed to fetch are usually transient / cold-start / network
      const retryableNetwork =
        err?.name === "AbortError" || String(err?.message || "").toLowerCase().includes("failed to fetch");

      if ((retryableNetwork || isRetryableStatus(err?.status)) && i < attempts.length - 1) {
        await sleep(attempts[i].backoffMs);
        continue;
      }

      break;
    }
  }

  // Friendly final error
  const message = lastErr?.message || "Request failed";
  throw new Error(
    `${message}\n\nIf you’re using Render free instances, the backend may sleep. Open /health once to wake it:\n${normalizeBase(
      CONFIG.API_BASE
    )}/health`
  );
}

export function apiGet(path) {
  return request("GET", path);
}

export function apiPost(path, body) {
  return request("POST", path, body);
}

export function apiPut(path, body) {
  return request("PUT", path, body);
}

export function apiDelete(path) {
  return request("DELETE", path);
}
