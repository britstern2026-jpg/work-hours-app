// frontend/src/js/manager.js
import { apiGet, apiPost } from "./api.js";
import { requireRoleOrRedirect } from "./welcome.js";
import { logout } from "./common.js";

function msg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

/* ---------------- USERS ---------------- */

function renderUsers(users) {
  const tbody = document.querySelector("#mgrUsersTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  users.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>${u.password || "(hidden)"}</td>
      <td>${u.id}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadUsers() {
  msg("mgrUsersMsg", "Loading...");
  const res = await apiGet("/api/users");
  renderUsers(res.users || []);
  msg("mgrUsersMsg", "");
}

/* ---------------- EXPORT ---------------- */

async function exportXlsx(month) {
  msg("mgrExportMsg", "Preparing report...");

  const res = await apiGet(`/api/export?month=${month}`);

  // backend should return URL or file download
  msg("mgrExportMsg", "Export ready ✅");
}

/* ---------------- MAIN ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleOrRedirect("manager");
  if (!auth) return;

  document.getElementById("logoutBtn")?.classList.remove("hidden");
  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  // Load users button
  document.getElementById("mgrUsersLoad")?.addEventListener("click", loadUsers);

  // Create user button
  document.getElementById("mgrCreateUser")?.addEventListener("click", async () => {
    const username = document.getElementById("mgrNewUsername").value.trim();
    const password = document.getElementById("mgrNewPassword").value;
    const role = document.getElementById("mgrNewRole").value;

    if (!username || !password) {
      msg("mgrUsersMsg", "Username + password required");
      return;
    }

    await apiPost("/api/users", { username, password, role });
    msg("mgrUsersMsg", "User created ✅");
    await loadUsers();
  });

  // Export button
  document.getElementById("mgrExport")?.addEventListener("click", async () => {
    const month = document.getElementById("mgrExportMonth").value;
    if (!month) {
      msg("mgrExportMsg", "Choose a month");
      return;
    }

    await exportXlsx(month);
  });
});
