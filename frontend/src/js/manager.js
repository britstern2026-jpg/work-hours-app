// frontend/src/js/manager.js
import { apiGet, apiPost, apiDelete } from "./api.js";
import { requireRoleOrRedirect, clearAuth } from "./welcome.js";

function msg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function wireLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) {
    console.error("❌ logoutBtn not found in manager.html");
    return;
  }

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

function wireUserDeleteButtons(tbody, currentUsername) {
  tbody.querySelectorAll("button[data-del-username]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const username = btn.getAttribute("data-del-username");
      if (!username) return;

      if (username === "admin") {
        msg("mgrUsersMsg", "Refusing to delete admin user");
        return;
      }

      if (username === currentUsername) {
        msg("mgrUsersMsg", "You cannot delete yourself");
        return;
      }

      const ok = confirm(
        `Delete user "${username}"?\n\nThis will also delete their work hours, vacations, and expenses.`
      );
      if (!ok) return;

      try {
        btn.disabled = true;
        await apiDelete(`/api/users/by-username/${encodeURIComponent(username)}`);
        msg("mgrUsersMsg", `Deleted "${username}" ✅`);
        await loadUsers(currentUsername);
      } catch (e) {
        msg("mgrUsersMsg", e?.message || "Failed to delete user");
        btn.disabled = false;
      }
    });
  });
}

function renderUsers(users, currentUsername) {
  const tbody = getOrCreateTbody("mgrUsersTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  (users || []).forEach((u) => {
    const canDelete = u.username !== "admin" && u.username !== currentUsername;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username ?? ""}</td>
      <td>${u.role ?? ""}</td>
      <td>${u.password ?? ""}</td>
      <td>${u.id ?? ""}</td>
      <td>
        <button class="btn btn-outline" type="button"
          data-del-username="${u.username ?? ""}"
          ${canDelete ? "" : "disabled"}
        >
          Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  wireUserDeleteButtons(tbody, currentUsername);
}

async function loadUsers(currentUsername) {
  msg("mgrUsersMsg", "Loading...");
  const res = await apiGet("/api/users");
  renderUsers(res.users || [], currentUsername);
  msg("mgrUsersMsg", `Loaded ${res.users?.length || 0} users ✅`);
}

async function createUser(currentUsername) {
  const username = document.getElementById("mgrNewUsername")?.value?.trim();
  const password = document.getElementById("mgrNewPassword")?.value;
  const role = document.getElementById("mgrNewRole")?.value;

  if (!username || !password) {
    msg("mgrUsersMsg", "Username + password required");
    return;
  }

  try {
    await apiPost("/api/users", { username, password, role });
    msg("mgrUsersMsg", "User created ✅");
  } catch (e) {
    // if you implemented 409 in backend
    if (e?.status === 409) msg("mgrUsersMsg", "Username already exists");
    else msg("mgrUsersMsg", e?.message || "Failed to create user");
    return;
  }

  await loadUsers(currentUsername);
}

function readTarget() {
  const user_id = Number(document.getElementById("mgrTargetUid")?.value);
  const date = document.getElementById("mgrTargetDate")?.value;
  return { user_id, date };
}

async function saveWorkHours() {
  const { user_id, date } = readTarget();
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

async function setVacation() {
  const { user_id, date } = readTarget();
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
}

async function removeVacation() {
  const { user_id, date } = readTarget();

  if (!user_id || !date) {
    msg("mgrEditMsg", "Need user UID + date");
    return;
  }

  await apiDelete("/api/vacations/manager", {
    user_id,
    vac_date: date,
  });

  msg("mgrEditMsg", "Vacation removed ✅");
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function doExport() {
  msg("mgrExportMsg", "Exporting...");
  const month = document.getElementById("mgrExportMonth")?.value; // YYYY-MM

  const data = await apiGet("/api/export");
  const filename = month ? `export-${month}.json` : `export-all.json`;

  if (month) {
    const starts = (d) => String(d || "").startsWith(month);
    const filtered = {
      users: data.users || [],
      workHours: (data.workHours || []).filter((r) => starts(r.work_date)),
      vacations: (data.vacations || []).filter((r) => starts(r.vac_date || r.vacation_date)),
      expenses: (data.expenses || []).filter((r) => starts(r.expense_date)),
    };
    downloadJson(filename, filtered);
  } else {
    downloadJson(filename, data);
  }

  msg("mgrExportMsg", "Downloaded ✅");
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleOrRedirect("manager");
  if (!auth) return;

  const who = document.getElementById("whoami");
  if (who) who.textContent = `Logged in as ${auth.username}`;

  wireLogout();

  document.getElementById("mgrUsersLoad")?.addEventListener("click", () => loadUsers(auth.username));
  document.getElementById("mgrCreateUser")?.addEventListener("click", () => createUser(auth.username));

  document.getElementById("mgrWhSave")?.addEventListener("click", saveWorkHours);
  document.getElementById("mgrVacSet")?.addEventListener("click", setVacation);
  document.getElementById("mgrVacRemove")?.addEventListener("click", removeVacation);

  document.getElementById("mgrExport")?.addEventListener("click", doExport);

  // auto-load users (optional). If you don't want it, delete the next line:
  await loadUsers(auth.username);
});
