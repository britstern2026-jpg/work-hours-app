// frontend/src/js/employee.js
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

function monthPrefix(monthStr) {
  return String(monthStr || "").trim(); // "YYYY-MM"
}

function filterByMonth(rows, fieldName, monthStr) {
  const m = monthPrefix(monthStr);
  if (!m) return rows || [];
  return (rows || []).filter((r) => String(r[fieldName] || "").startsWith(m));
}

/* ------------ Work Hours ------------ */
let cacheWorkHours = [];

function renderWorkHours(rows) {
  const tbody = document.querySelector("#empWhTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (rows || []).forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.work_date}</td>
      <td>${String(r.start_time || "").slice(0, 5)}</td>
      <td>${String(r.end_time || "").slice(0, 5)}</td>
      <td></td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadWorkHours() {
  msg("empWhMsg", "Loading...");
  const res = await apiGet("/api/work-hours");
  cacheWorkHours = res.workHours || [];
  renderWorkHours(cacheWorkHours);
  msg("empWhMsg", "");
}

/* ------------ Vacations ------------ */
let cacheVacations = [];

function renderVacations(rows) {
  const tbody = document.querySelector("#empVacTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (rows || []).forEach((v) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${v.vac_date}</td><td>${v.type}</td>`;
    tbody.appendChild(tr);
  });
}

async function loadVacations() {
  msg("empVacMsg", "Loading...");
  const res = await apiGet("/api/vacations");
  cacheVacations = res.vacations || [];
  renderVacations(cacheVacations);
  msg("empVacMsg", "");
}

/* ------------ Expenses ------------ */
let cacheExpenses = [];

function renderExpenses(rows) {
  const tbody = document.querySelector("#empExpTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (rows || []).forEach((ex) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${ex.expense_date}</td><td>${ex.description}</td><td>${ex.amount}</td>`;
    tbody.appendChild(tr);
  });
}

async function loadExpenses() {
  msg("empExpMsg", "Loading...");
  const res = await apiGet("/api/expenses");
  cacheExpenses = res.expenses || [];
  renderExpenses(cacheExpenses);
  msg("empExpMsg", "");
}

/* ------------ Main ------------ */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleOrRedirect("employee");
  if (!auth) return;

  const who = document.getElementById("whoami");
  if (who) who.textContent = `Logged in as ${auth.username}`;

  wireLogout();

  // ✅ NO auto-load here. User controls when to load.

  // Work hours: Save
  document.getElementById("empWhSave")?.addEventListener("click", async () => {
    const work_date = document.getElementById("empWhDate")?.value;
    const start_time = document.getElementById("empWhStart")?.value;
    const end_time = document.getElementById("empWhEnd")?.value;

    if (!work_date || !start_time || !end_time) {
      msg("empWhMsg", "All fields required");
      return;
    }

    await apiPost("/api/work-hours", { work_date, start_time, end_time });
    msg("empWhMsg", "Saved ✅");
    await loadWorkHours(); // refresh after save
  });

  // Work hours: Load button (and month filter)
  document.getElementById("empWhLoad")?.addEventListener("click", async () => {
    await loadWorkHours();
    const m = document.getElementById("empWhMonth")?.value;
    const filtered = filterByMonth(cacheWorkHours, "work_date", m);
    renderWorkHours(filtered);
    msg("empWhMsg", m ? `Showing ${m}` : "");
  });

  // Vacation: Save
  document.getElementById("empVacSave")?.addEventListener("click", async () => {
    const vac_date = document.getElementById("empVacDate")?.value;
    const type = document.getElementById("empVacType")?.value;

    if (!vac_date || !type) {
      msg("empVacMsg", "Date + type required");
      return;
    }

    await apiPost("/api/vacations", { vac_date, type });
    msg("empVacMsg", "Vacation saved ✅");
    await loadVacations();
  });

  // Vacation: Delete
  document.getElementById("empVacDelete")?.addEventListener("click", async () => {
    const vac_date = document.getElementById("empVacDate")?.value;
    if (!vac_date) {
      msg("empVacMsg", "Choose a date to remove");
      return;
    }

    await apiDelete("/api/vacations", { vac_date });
    msg("empVacMsg", "Vacation removed ✅");
    await loadVacations();
  });

  // Vacations: Load (and month filter)
  document.getElementById("empVacLoad")?.addEventListener("click", async () => {
    await loadVacations();
    const m = document.getElementById("empVacMonth")?.value;
    const filtered = filterByMonth(cacheVacations, "vac_date", m);
    renderVacations(filtered);
    msg("empVacMsg", m ? `Showing ${m}` : "");
  });

  // Expenses: Add
  document.getElementById("empExpAdd")?.addEventListener("click", async () => {
    const expense_date = document.getElementById("empExpDate")?.value;
    const amount = document.getElementById("empExpAmount")?.value;
    const description = document.getElementById("empExpDesc")?.value?.trim();

    if (!expense_date || !description || amount === "" || amount === null) {
      msg("empExpMsg", "Date + amount + description required");
      return;
    }

    await apiPost("/api/expenses", { expense_date, description, amount: Number(amount) });
    msg("empExpMsg", "Expense saved ✅");
    await loadExpenses();
  });

  // Expenses: Load (and month filter)
  document.getElementById("empExpLoad")?.addEventListener("click", async () => {
    await loadExpenses();
    const m = document.getElementById("empExpMonth")?.value;
    const filtered = filterByMonth(cacheExpenses, "expense_date", m);
    renderExpenses(filtered);
    msg("empExpMsg", m ? `Showing ${m}` : "");
  });
});
