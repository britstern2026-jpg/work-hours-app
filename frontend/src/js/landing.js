// frontend/src/js/landing.js
import { apiPost } from "./api.js";
import { setAuth } from "./welcome.js";
import { showMessage } from "./ui.js";
import { CONFIG } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  // Show version at bottom if element exists
  const ver = document.getElementById("version");
  if (ver) ver.textContent = `Version: ${CONFIG.APP_VERSION}`;

  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage("", "info");

    const username = document.getElementById("username")?.value?.trim();
    const password = document.getElementById("password")?.value;

    if (!username || !password) {
      showMessage("נא למלא שם משתמש וסיסמה", "error");
      return;
    }

    try {
      const data = await apiPost("/api/welcome", { username, password });
      // expected: { token, role, username }
      setAuth({
        token: data.token,
        role: data.role,
        username: data.username || username,
      });

      window.location.href =
        data.role === "manager" ? "/manager.html" : "/employee.html";
    } catch (err) {
      showMessage(err.message || "Login failed", "error");
    }
  });
});
