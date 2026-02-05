// frontend/src/js/landing.js
import { apiPost } from "./api.js";
import { setAuth } from "./welcome.js";

console.log("✅ landing.js loaded");

function showError(msg) {
  const el = document.getElementById("loginError");
  if (!el) return;
  el.textContent = msg || "";
  el.classList.toggle("hidden", !msg);
}

function disableLogin(disabled) {
  const btn = document.getElementById("loginBtn");
  if (btn) btn.disabled = !!disabled;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  const userInput = document.getElementById("loginUsername");
  const passInput = document.getElementById("loginPassword");

  if (!btn || !userInput || !passInput) {
    console.error("❌ Login elements not found. Check landing.html IDs.");
    return;
  }

  async function doLogin() {
    showError("");
    disableLogin(true);

    const username = userInput.value.trim();
    const password = passInput.value;

    if (!username || !password) {
      showError("נא להזין שם משתמש וסיסמה.");
      disableLogin(false);
      return;
    }

    try {
      const data = await apiPost("/api/welcome", { username, password });

      setAuth({
        token: data.token,
        role: data.role,
        username: data.username || username,
      });

      // ✅ GitHub Pages project site: NO leading "/"
      window.location.href =
        data.role === "manager" ? "manager.html" : "employee.html";
    } catch (err) {
      console.error(err);
      showError(err?.message || "ההתחברות נכשלה");
      disableLogin(false);
    }
  }

  btn.addEventListener("click", doLogin);

  [userInput, passInput].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
  });
});
