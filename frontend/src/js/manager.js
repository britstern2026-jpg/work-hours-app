import { initCommon } from "./common.js";
import { apiFetch } from "./api.js";
import { getAuth } from "./auth.js";
import { qs, setText } from "./ui.js";
import { CONFIG } from "./config.js";

function ymdToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function ymThisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

async function boot() {
  initCommon({ requiredRole: "manager" });
  qs("mgrTargetDate").value = ymdToday();
  qs("mgrExportMonth").value = ymThisMonth();

  // Users list
  qs("mgrUsersLoad").addEventListener("click", async () => {
    setText("mgrUsersMsg", "");
    try {
      const data = await apiFetch("/api/users");
      qs("mgrUsersTable").querySelector("tbody").innerHTML = (data.users||[]).map(u => `
        <tr>
          <td>${u.username||""}</td>
          <td>${u.role||""}</td>
          <td>${u.password||""}</td>
          <td><code>${u.uid||""}</code></td>
        </tr>
      `).join("");
      setText("mgrUsersMsg", `Loaded ${(data.users||[]).length} users.`);
    } catch (e) { setText("mgrUsersMsg", `Error: ${e.message}`); }
  });

  // Create user
  qs("mgrCreateUser").addEventListener("click", async () => {
    setText("mgrUsersMsg", "");
    try {
      const username = qs("mgrNewUsername").value.trim();
      const password = qs("mgrNewPassword").value;
      const role = qs("mgrNewRole").value;
      const r = await apiFetch("/api/users", { method:"POST", body:{ username, password, role } });
      setText("mgrUsersMsg", `Created user (${r.uid}).`);
    } catch (e) { setText("mgrUsersMsg", `Error: ${e.message}`); }
  });

  // Work hours manager edit
  qs("mgrWhSave").addEventListener("click", async () => {
    setText("mgrEditMsg", "");
    try {
      await apiFetch("/api/work-hours/manager", {
        method: "POST",
        body: {
          userId: qs("mgrTargetUid").value.trim(),
          date: qs("mgrTargetDate").value,
          startTime: qs("mgrWhStart").value,
          endTime: qs("mgrWhEnd").value,
        },
      });
      setText("mgrEditMsg", "Work hours saved.");
    } catch (e) { setText("mgrEditMsg", `Error: ${e.message}`); }
  });

  // Vacation manager set/remove
  qs("mgrVacSet").addEventListener("click", async () => {
    setText("mgrEditMsg", "");
    try {
      await apiFetch("/api/vacations/manager", {
        method: "POST",
        body: {
          userId: qs("mgrTargetUid").value.trim(),
          date: qs("mgrTargetDate").value,
          type: qs("mgrVacType").value,
        },
      });
      setText("mgrEditMsg", "Vacation set.");
    } catch (e) { setText("mgrEditMsg", `Error: ${e.message}`); }
  });

  qs("mgrVacRemove").addEventListener("click", async () => {
    setText("mgrEditMsg", "");
    try {
      const userId = qs("mgrTargetUid").value.trim();
      const date = qs("mgrTargetDate").value;
      await apiFetch(`/api/vacations/manager?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`, { method: "DELETE" });
      setText("mgrEditMsg", "Vacation removed.");
    } catch (e) { setText("mgrEditMsg", `Error: ${e.message}`); }
  });

  // Export download
  qs("mgrExport").addEventListener("click", async () => {
    setText("mgrExportMsg", "");
    try {
      const month = qs("mgrExportMonth").value;
      const { token } = getAuth();
      const url = `${CONFIG.API_BASE}/api/export?month=${encodeURIComponent(month)}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        const msg = ct.includes("application/json") ? (await res.json()).error : await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `report_${month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setText("mgrExportMsg", "Downloaded.");
    } catch (e) { setText("mgrExportMsg", `Error: ${e.message}`); }
  });
}

boot();
