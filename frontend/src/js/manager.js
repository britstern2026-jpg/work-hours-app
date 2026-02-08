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
        msg("mgrUsersMsg", "לא ניתן למחוק את המשתמש admin");
        return;
      }

      if (username === currentUsername) {
        msg("mgrUsersMsg", "לא ניתן למחוק את עצמך");
        return;
      }

      const ok = confirm(
        `למחוק את המשתמש "${username}"?\n\nפעולה זו תמחק גם שעות עבודה, חופשות והוצאות.`
      );
      if (!ok) return;

      try {
        btn.disabled = true;
        await apiDelete(`/api/users/by-username/${encodeURIComponent(username)}`);
        msg("mgrUsersMsg", `המשתמש "${username}" נמחק ✅`);
        await loadUsers(currentUsername);
      } catch (e) {
        msg("mgrUsersMsg", e?.message || "מחיקת המשתמש נכשלה");
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
          מחיקה
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  wireUserDeleteButtons(tbody, currentUsername);
}

async function loadUsers(currentUsername) {
  msg("mgrUsersMsg", "טוען...");
  const res = await apiGet("/api/users");
  renderUsers(res.users || [], currentUsername);
  msg("mgrUsersMsg", `נטענו ${res.users?.length || 0} משתמשים ✅`);
}

async function createUser(currentUsername) {
  const username = document.getElementById("mgrNewUsername")?.value?.trim();
  const password = document.getElementById("mgrNewPassword")?.value;
  const role = document.getElementById("mgrNewRole")?.value;

  if (!username || !password) {
    msg("mgrUsersMsg", "יש להזין שם משתמש וסיסמה");
    return;
  }

  try {
    await apiPost("/api/users", { username, password, role });
    msg("mgrUsersMsg", "המשתמש נוצר ✅");
  } catch (e) {
    if (e?.status === 409) msg("mgrUsersMsg", "שם המשתמש כבר קיים");
    else msg("mgrUsersMsg", e?.message || "יצירת המשתמש נכשלה");
    return;
  }

  await loadUsers(currentUsername);
}

/**
 * Read the manager edit target.
 * Preferred: an input/select with id="mgrTargetUsername"
 * Backward-compatible: uses the existing "mgrTargetUid" field but treats it as username text.
 */
function readTarget() {
  const usernameFromNewField = document
    .getElementById("mgrTargetUsername")
    ?.value?.trim();

  const usernameFromOldField = document
    .getElementById("mgrTargetUid")
    ?.value?.trim();

  const username = usernameFromNewField || usernameFromOldField || "";
  const date = document.getElementById("mgrTargetDate")?.value;

  return { username, date };
}

async function saveWorkHours() {
  const { username, date } = readTarget();
  const start_time = document.getElementById("mgrWhStart")?.value;
  const end_time = document.getElementById("mgrWhEnd")?.value;

  if (!username || !date || !start_time || !end_time) {
    msg("mgrEditMsg", "יש להזין שם משתמש, תאריך, שעת התחלה ושעת סיום");
    return;
  }

  const res = await apiPost("/api/work-hours/manager", {
    username,
    work_date: date,
    start_time,
    end_time,
  });

  msg("mgrEditMsg", `שעות העבודה ${res.action || "נשמרו"} ✅`);
}

async function setVacation() {
  const { username, date } = readTarget();
  const type = document.getElementById("mgrVacType")?.value;

  if (!username || !date || !type) {
    msg("mgrEditMsg", "יש להזין שם משתמש, תאריך וסוג");
    return;
  }

  const res = await apiPost("/api/vacations/manager", {
    username,
    vac_date: date,
    type,
  });

  msg("mgrEditMsg", `החופשה ${res.action || "נשמרה"} ✅`);
}

async function removeVacation() {
  const { username, date } = readTarget();

  if (!username || !date) {
    msg("mgrEditMsg", "יש להזין שם משתמש ותאריך");
    return;
  }

  await apiDelete("/api/vacations/manager", {
    username,
    vac_date: date,
  });

  msg("mgrEditMsg", "החופשה הוסרה ✅");
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
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
  msg("mgrExportMsg", "מייצא...");
  const month = document.getElementById("mgrExportMonth")?.value; // YYYY-MM

  const data = await apiGet("/api/export");
  const filename = month ? `export-${month}.json` : `export-all.json`;

  if (month) {
    const starts = (d) => String(d || "").startsWith(month);
    const filtered = {
      users: data.users || [],
      workHours: (data.workHours || []).filter((r) => starts(r.work_date)),
      vacations: (data.vacations || []).filter((r) =>
        starts(r.vac_date || r.vacation_date)
      ),
      expenses: (data.expenses || []).filter((r) => starts(r.expense_date)),
    };
    downloadJson(filename, filtered);
  } else {
    downloadJson(filename, data);
  }

  msg("mgrExportMsg", "הורד ✅");
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleOrRedirect("manager");
  if (!auth) return;

  const who = document.getElementById("whoami");
  if (who) who.textContent = `מחובר כ־${auth.username}`;

  wireLogout();

  document
    .getElementById("mgrUsersLoad")
    ?.addEventListener("click", () => loadUsers(auth.username));
  document
    .getElementById("mgrCreateUser")
    ?.addEventListener("click", () => createUser(auth.username));

  document.getElementById("mgrWhSave")?.addEventListener("click", saveWorkHours);
  document.getElementById("mgrVacSet")?.addEventListener("click", setVacation);
  document
    .getElementById("mgrVacRemove")
    ?.addEventListener("click", removeVacation);

  document.getElementById("mgrExport")?.addEventListener("click", doExport);

  // await loadUsers(auth.username);
});
