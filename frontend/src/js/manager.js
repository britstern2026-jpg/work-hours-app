// frontend/src/js/manager.js
import { apiGet, apiPost, apiDelete } from "./api.js";
import { requireRoleOrRedirect, clearAuth } from "./welcome.js";

function msg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function wireLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;
  btn.classList.remove("hidden");
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
  if (!tbody) return;

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
  await loadUsers();
}

function readManagerTarget() {
  const user_id = Number(document.getElementById("mgrTargetUid")?.value);
  const date = document.getElementById("mgrTargetDate")?.value;
  return { user_id, date };
}

async function managerSaveWorkHours() {
  const { user_id, date } = readManagerTarget();
  const start_time = document.getElementById("mgrWhStart")?.value;
  const end_time = document.getElementById("mgrWhEnd")?.value;

  if (!user_id || !date || !start_time || !end_time) {
    msg("mgrEditMsg", "Need user UID + date + start + end");
    return;
  }

  const res = await apiPost("/api/work-hours/manager", {
    user_id,
    work_date: date,
    start_time,
    end_time,
  });

  msg("mgrEditMsg", `Work hours ${res.action || "saved"} ✅`);
}

async function managerSetVacation() {
  const { user_id, date } = readManagerTarget();
  const type = document.getElementById("mgrVacType")?.value;

  if (!user_id || !date || !type) {
    msg("mgrEditMsg", "Need user UID + date + type");
    return;
  }

  const res = await apiPost("/api/vacations/manager", {
    user_id,
    vac_date: date,
    type,
  });

  msg("mgrEditMsg", `Vacation ${res.action || "saved"} ✅`);
