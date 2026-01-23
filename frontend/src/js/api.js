import { CONFIG } from "./config.js";
import { getAuth } from "./auth.js";

export async function apiFetch(path, { method="GET", body=null, auth=true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const { token } = getAuth();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text;
}
