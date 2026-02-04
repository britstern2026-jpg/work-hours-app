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

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "landing.html";
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

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body);
export const apiPut = (path, body) => request("PUT", path, body);
export const apiDelete = (path, body) => request("DELETE", path, body);
