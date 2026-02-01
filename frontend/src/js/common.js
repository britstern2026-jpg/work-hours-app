// frontend/src/js/common.js
import { clearAuth, getAuth } from "./welcome.js";

export function logout() {
  clearAuth();
  window.location.href = "/landing.html";
}

export function goHomeByRole() {
  const a = getAuth();
  if (!a?.role) {
    window.location.href = "/landing.html";
    return;
  }
  window.location.href = a.role === "manager" ? "/manager.html" : "/employee.html";
}

export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
