// frontend/src/js/manager.js
import { apiGet, apiPost } from "./api.js";
import { requireRoleOrRedirect, clearAuth } from "./welcome.js";
import { showMessage } from "./ui.js";

function wireLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.classList.remove("hidden");
  btn.disabled = false;

  btn.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("✅ logout clicked (manager)");

      clearAuth();
      window.location.href = "landing.html";
    },
    true
  );
}

function renderUsers(users) {
  const el = document.getElementById("usersList");
  if (!el) return;

  if (!users?.length) {
    el.innerHTML = "<div class='muted'>No users.</div>";
    return;
  }

  el.innerHTML = users
    .map((u) => {
      return `<div class="row-item">
        <div><b>#${u.id}</b> ${u.username} — <span class="pill">${u.role}</span></div>
      </div>`;
    })
    .join("");
}

function renderAllWorkHours(rows, usersById) {
  const el = document.getElementById("allWorkHoursList");
  if (!el) return;

  if (!rows?.length) {
    el.innerHTML = "<div class='muted'>No work hours.</div>";
    return;
  }

  el.innerHTML = rows
    .map((r) => {
      const user = usersById.get(r.user_id);
      const username = user?.username || `user_id=${r.user_id}`;
      const d = r.work_date || "";
      const start = (r.start_time || "").slice(0, 5);
      const end = (r.end_time || "").slice(0, 5);
      const note = r.note ? ` • ${r.note}` : "";
      return `<div class="row-item">
        <div><b>${username}</b> — ${d} — ${start}-${end}${note}</div>
      </div>`;
    })
    .join("");
}

async function refresh() {
  const usersRes = await apiGet("/api/users");
  const users = usersRes.users || [];
  renderUsers(users);

  const usersById = new Map(users.map((u) => [u.id, u]));

  const whRes = await apiGet("/api/work-hours/all");
  renderAllWorkHours(whRes.workHours || [], usersById);
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleOrRedirect("manager");
  if (!auth) return;

  wireLogout();

  try {
    await refresh();
  } catch (e) {
    showMessage(e.message || "Failed to load manager data", "error");
  }

  const form = document.getElementById("createUserForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showMessage("", "info");

      const username = document.getElementById("newUsername")?.value?.trim();
      const password = document.getElementById("newPassword")?.value;
      const role = document.getElementById("newRole")?.value;

      if (!username || !password || !role) {
        showMessage("username, password, role are required", "error");
        return;
      }

      try {
        await apiPost("/api/users", { username, password, role });
        showMessage("User created ✅", "success");
        form.reset();
        await refresh();
      } catch (err) {
        showMessage(err.message || "Failed to create user", "error");
      }
    });
  }
});
