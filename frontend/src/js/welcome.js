// frontend/src/js/welcome.js
// Frontend-only auth helpers (token storage + role)

const KEY = "workhours_auth_v1";

export function setAuth({ token, role, username }) {
  if (!token) throw new Error("setAuth: token is required");
  const payload = { token, role, username, savedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function getAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

export function getToken() {
  return getAuth()?.token || null;
}

export function getRole() {
  return getAuth()?.role || null;
}

export function requireLoggedInOrRedirect() {
  const a = getAuth();
  if (!a?.token) {
    window.location.href = "/landing.html";
    return null;
  }
  return a;
}

export function requireRoleOrRedirect(requiredRole) {
  const a = requireLoggedInOrRedirect();
  if (!a) return null;

  if (a.role !== requiredRole) {
    // If role mismatch, send them somewhere sane:
    window.location.href = a.role === "manager" ? "/manager.html" : "/employee.html";
    return null;
  }
  return a;
}
