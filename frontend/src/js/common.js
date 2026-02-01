import { getAuth, clearAuth } from "./auth.js";
import { qs, setText, setHidden } from "./ui.js";

export function initCommon({ requiredRole } = {}) {
  const { token, role, username } = getAuth();

  // header
  if (qs("whoami")) setText("whoami", token ? `${username} (${role})` : "");
  if (qs("logoutBtn")) {
    setHidden("logoutBtn", !token);
    qs("logoutBtn").addEventListener("click", () => {
      clearAuth();
      window.location.href = "./landing.html";
    });
  }

  // guard
  if (!token) {
    window.location.href = "./landing.html";
    return;
  }
  if (requiredRole && role !== requiredRole) {
    // send employee to employee page, manager to manager page
    window.location.href = role === "manager" ? "./manager.html" : "./employee.html";
  }
}
