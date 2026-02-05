// frontend/src/js/welcome.js
// Frontend-only auth helpers (token storage + role)

const KEY = "workhours_auth_v1";

export function setAuth({ token, role, username }) {
  if (!token) throw new Error("setAuth: נדרש טוקן");
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

/**
 * IMPORTANT for GitHub Pages:
 * Use relative navigation (NO leading "/") so it works under /work-hours-app/
 */
export function goToLanding() {
  window.location.href = "landing.html";
}

export function goToEmployee() {
  window.location.href = "employee.html";
}

export function goToManager() {
  window.location.href = "manager.html";
}

export function requireLoggedInOrRedirect() {
  const a = getAuth();
  if (!a?.token) {
    goToLanding();
    return null;
  }
  return a;
}

export function requireRoleOrRedirect(requiredRole) {
  const a = requireLoggedInOrRedirect();
  if (!a) return null;

  if (a.role !== requiredRole) {
    // If role mismatch, send them somewhere sane:
    if (a.role === "manager") goToManager();
    else goToEmployee();
    return null;
  }
  return a;
}
