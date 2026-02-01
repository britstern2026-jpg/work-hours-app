// frontend/src/js/api.js
import { CONFIG } from "./config.js";
import { getToken, clearAuth } from "./welcome.js";

function normalizeBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

function buildUrl(path) {
  const base = normalizeBase(CONFIG.API_BASE);
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base}${path}`;
}

async function request(method, path, body) {
  const url = buildUrl(path);

  const headers = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // If backend returns 401/403 — logout and go to login
  if (res.status === 401 || res.status === 403) {
    clearAuth();
    // only redirect if we're in browser
    if (typeof window !== "undefined") window.location.href = "/landing.html";
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
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
