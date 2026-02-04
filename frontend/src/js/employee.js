// frontend/src/js/employee.js
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
      console.log("✅ logout clicked (employee)");

      clearAuth();
      window.location.href = "landing.html";
    },
    true // capture phase: even if something tries to intercept bubbling
  );
}

function renderWorkHours(rows) {
  const list = document.getElementById("workHoursList");
  if (!list) return;

  if (!rows?.length) {
    list.innerHTML = "<div class='muted'>No work hours yet.</div>";
    return;
  }

  list.innerHTML = rows
    .map((r) => {
      const d = r.work_date || r.workDate || "";
      const start = (r.start_time || "").slice(0, 5);
      const end = (r.end_time || "").slice(0, 5);
      const note = r.note ? ` • ${r.note}` : "";
      return `<div class="row-item">
        <div><b>${d}</b> — ${start} - ${end}${note}</div>
      </div>`;
    })
    .join("");
}

async function loadMyWorkHours() {
  const data = await apiGet("/api/work-hours");
  renderWorkHours(data.workHours || []);
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleOrRedirect("employee");
  if (!auth) return;

  wireLogout();

  try {
    await loadMyWorkHours();
  } catch (e) {
    showMessage(e.message || "Failed to load work hours", "error");
  }

  const form = document.getElementById("workHoursForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage("", "info");

    const work_date = document.getElementById("workDate")?.value;
    const start_time = document.getElementById("startTime")?.value;
    const end_time = document.getElementById("endTime")?.value;
    const note = document.getElementById("note")?.value?.trim();

    if (!work_date || !start_time || !end_time) {
      showMessage("work_date, start_time, end_time are required", "error");
      return;
    }

    try {
      await apiPost("/api/work-hours", { work_date, start_time, end_time, note });
      showMessage("Saved ✅", "success");
      form.reset();
      await loadMyWorkHours();
    } catch (err) {
      showMessage(err.message || "Failed to save", "error");
    }
  });
});
