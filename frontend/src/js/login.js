import { apiFetch } from "./api.js";
import { setAuth, getAuth, clearAuth } from "./auth.js";
import { qs, setHidden, setText } from "./ui.js";

function goByRole(role) {
  window.location.href = role === "manager" ? "./manager.html" : "./employee.html";
}

async function login() {
  setHidden("loginError", true);
  const username = qs("loginUsername").value.trim();
  const password = qs("loginPassword").value;

  try {
    const data = await apiFetch("/api/welcome", {
      method: "POST",
      body: { username, password },
      auth: false,
    });

    setAuth({ token: data.token, role: data.role, username: data.username });
    goByRole(data.role);
  } catch (e) {
    setText("loginError", e.message);
    setHidden("loginError", false);
  }
}

function boot() {
  // if already logged in, route out of login page
  const { token, role } = getAuth();
  if (token && role) return goByRole(role);

  // hide logout on login page, just in case
  if (qs("logoutBtn")) {
    setHidden("logoutBtn", true);
    qs("logoutBtn").addEventListener("click", () => {
      clearAuth();
      window.location.reload();
    });
  }

  qs("loginBtn").addEventListener("click", login);
  qs("loginPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
}

boot();
