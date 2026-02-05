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
        <button
          class="btn btn-outline"
          type="button"
          data-del-username="${u.username}"
          ${canDelete ? "" : "disabled"}
        >
          Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // wire delete buttons
  tbody.querySelectorAll("button[data-del-username]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const username = btn.getAttribute("data-del-username");
      if (!username) return;

      if (!confirm(`Delete user "${username}"?`)) return;

      try {
        btn.disabled = true;
        await apiDelete(`/api/users/by-username/${encodeURIComponent(username)}`);
        msg("mgrUsersMsg", `Deleted ${username} ✅`);
        await loadUsers(currentUsername);
      } catch (e) {
        msg("mgrUsersMsg", e?.message || "Delete failed");
        btn.disabled = false;
      }
    });
  });
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
    await loadUsers(currentUsername);
  } catch (e) {
    msg("mgrUsersMsg", e?.message || "Create failed");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleOrRedirect("manager");
  if (!auth) return;

  const who = document.getElementById("whoami");
  if (who) who.textContent = `Logged in as ${auth.username}`;

  wireLogout();

  document
    .getElementById("mgrUsersLoad")
    ?.addEventListener("click", () => loadUsers(auth.username));

  document
    .getElementById("mgrCreateUser")
    ?.addEventListener("click", () => createUser(auth.username));
});
