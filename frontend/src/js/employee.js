// frontend/src/js/employee.js
import { apiGet, apiPost } from "./api.js";
import { requireRoleOrRedirect, getAuth } from "./welcome.js";
import { logout } from "./common.js";

function msg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

/* ---------------- WORK HOURS ---------------- */

function renderWorkHours(rows) {
  const tbody = document.querySelector("#empWhTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.work_date}</td>
      <td>${r.start_time.slice(0, 5)}</td>
      <td>${r.end_time.slice(0, 5)}</td>
      <td>${r.duration || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadWorkHours() {
  msg("empWhMsg", "Loading...");
  const res = await apiGet("/api/work-hours");
  renderWorkHours(res.workHours || []);
  msg("empWhMsg", "");
}

/* ---------------- VACATIONS ---------------- */

function renderVacations(rows) {
  const tbody = document.querySelector("#empVacTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  rows.forEach((v) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.vacation_date}</td>
      <td>${v.type}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadVacations() {
  msg("empVacMsg", "Loading...");
  const res = await apiGet("/api/vacations");
  renderVacations(res.vacations || []);
  msg("empVacMsg", "");
}

/* ---------------- EXPENSES ---------------- */

function renderExpenses(rows) {
  const tbody = document.querySelector("#empExpTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  rows.forEach((ex) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ex.expense_date}</td>
      <td>${ex.description}</td>
      <td>${ex.amount}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadExpenses() {
  msg("empExpMsg", "Loading...");
  const res = await apiGet("/api/expenses");
  renderExpenses(res.expenses || []);
  msg("empExpMsg", "");
}

/* ---------------- MAIN ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Protect page
  const auth = requireRoleOrRedirect("employee");
  if (!auth) return;

  // Show username
  const who = document.getElementById("whoami");
  if (who) who.textContent = `Logged in as ${auth.username}`;

  // Enable logout
  document.getElementById("logoutBtn")?.classList.remove("hidden");
  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  // Load initial data
  await loadWorkHours();
  await loadVacations();
  await loadExpenses();

  /* ---- Work hours save ---- */
  document.getElementById("empWhSave")?.addEventListener("click", async () => {
    const work_date = document.getElementById("empWhDate").value;
    const start_time = document.getElementById("empWhStart").value;
    const end_time = document.getElementById("empWhEnd").value;

    if (!work_date || !start_time || !end_time) {
      msg("empWhMsg", "All fields required");
      return;
    }

    await apiPost("/api/work-hours", { work_date, start_time, end_time });
    msg("empWhMsg", "Saved ✅");
    await loadWorkHours();
  });

  /* ---- Vacation save ---- */
  document.getElementById("empVacSave")?.addEventListener("click", async () => {
    const vacation_date = document.getElementById("empVacDate").value;
    const type = document.getElementById("empVacType").value;

    await apiPost("/api/vacations", { vacation_date, type });
    msg("empVacMsg", "Vacation saved ✅");
    await loadVacations();
  });

  /* ---- Expenses add ---- */
  document.getElementById("empExpAdd")?.addEventListener("click", async () => {
    const expense_date = document.getElementById("empExpDate").value;
    const amount = document.getElementById("empExpAmount").value;
    const description = document.getElementById("empExpDesc").value;

    await apiPost("/api/expenses", { expense_date, amount, description });
    msg("empExpMsg", "Expense saved ✅");
    await loadExpenses();
  });
});
