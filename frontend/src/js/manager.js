// frontend/src/js/manager.js
import { apiGet, apiPost } from "./api.js";
import { requireRoleOrRedirect, clearAuth } from "./welcome.js";

function msg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function wireLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.classList.remove("hidden");
  btn.disabled = false;

  btn.addEventListener("click", () => {
    clearAuth();
    window.location.href = "landing.html";
  });
}

function getOrCreateTbody(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return null;

  let tbody = table.querySelector("tbody");
  if (!tbody) {
    tbody = document.createElement("tbody");
    table.appendChild(tbody);
  }
  return tbody;
}

function renderUsers(users) {
  const tbody = getOrCreateTbody("mgrUsersTable");
  if (!tbody) {
    console.error("mgrUsersTable not found in DOM");
    return;
  }

  tbody.innerHTML = "";

  (users || []).forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username ?? ""}</td>
      <td>${u.role ?? ""}</td>
      <td>${u.password ?? ""}</td>
      <td>${u.id ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadUsers() {
  msg("mgrUsersMsg", "Loading...");
  const res = await apiGet("/api/users");
  renderUsers(res.users || []);
  msg("mgrUsersMsg", `Loaded ${res.users?.length || 0} users ✅`);
}

async function createUser() {
  const username = document.getElementById("mgrNewUsername")?.value?.trim();
  const password = document.getElementById("mgrNewPassword")?.value;
  const role = document.getElementById("mgrNewRole")?.value;

  if (!username || !password) {
    msg("mgrUsersMsg", "Username + password required");
    return;
  }

  await apiPost("/api/users", { username, password, role });
  msg("mgrUsersMsg", "User created ✅");

  // Optional: refresh list after creation (keep this or remove if you want manual refresh)
  await loadUsers();
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleOrRedirect("manager");
  if (!auth) return;

  const who = document.getElementById("whoami");
  if (who) who.textContent = `Logged in as ${auth.username}`;

  wireLogout();

  // Manual only:
  document.getElementById("mgrUsersLoad")?.addEventListener("click", loadUsers);
  document.getElementById("mgrCreateUser")?.addEventListener("click", createUser);
});
