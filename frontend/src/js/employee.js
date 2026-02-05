// frontend/src/js/employee.js
import { apiGet, apiPost, apiDelete } from "./api.js";
import { requireRoleOrRedirect, clearAuth } from "./welcome.js";

console.log("✅ employee.js loaded v8 (fix expenses load + tbody + ISO dates)");

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

function isoToYmd(s) {
  if (!s) return "";
  const str = String(s);
  return str.includes("T") ? str.split("T")[0] : str;
}

function ensureTbody(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return null;

  let tbody = table.querySelector("tbody");
  if (!tbody) {
    tbody = document.createElement("tbody");
    table.appendChild(tbody);
  }
  return tbody;
}

function monthPrefix(monthStr) {
  return String(monthStr || "").trim(); // "YYYY-MM"
}

function filterByMonth(rows, getDateFn, monthStr) {
  const m = monthPrefix(monthStr);
  if (!m) return rows || [];
  return (rows || []).filter((r) => String(getDateFn(r) || "").startsWith(m));
}

/* ------------ Work Hours ------------ */
let cacheWorkHours = [];

function renderWorkHours(rows) {
  const tbody = ensureTbody("empWhTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  (rows || []).forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.work_date || ""}</td>
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

function getVacationDate(v) {
  return isoToYmd(v.vacation_date || v.vac_date || v.date);
}

function renderVacations(rows) {
  const tbody = ensureTbody("empVacTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  (rows || []).forEach((v) => {
    const d = getVacationDate(v);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d}</td><td>${v.type ?? ""}</td>`;
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

function getExpenseDate(ex) {
  return isoToYmd(ex.expense_date || ex.date);
}

function renderExpenses(rows) {
  const tbody = ensureTbody("empExpTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  (rows || []).forEach((ex) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${getExpenseDate(ex)}</td>
      <td>${ex.description ?? ""}</td>
      <td>${ex.amount ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadExpenses() {
  msg("empExpMsg", "Loading...");
  const res = await apiGet("/api/expenses");
  cacheExpenses = res.expenses || [];

  console.log("expenses loaded:", cacheExpenses.length, "sample:", cacheExpenses[0]);

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
    await loadWorkHours();
  });

  // Work hours: Load + month filter
  document.getElementById("empWhLoad")?.addEventListener("click", async () => {
    await loadWorkHours();
    const m = document.getElementById("empWhMonth")?.value;
    const filtered = filterByMonth(cacheWorkHours, (r) => r.work_date, m);
    renderWorkHours(filtered);
    msg("empWhMsg", m ? `Showing ${m}` : "");
  });

  // Vacation: Save (409 expected if already exists)
  document.getElementById("empVacSave")?.addEventListener("click", async () => {
    const vac_date = document.getElementById("empVacDate")?.value;
    const type = document.getElementById("empVacType")?.value;

    if (!vac_date || !type) {
      msg("empVacMsg", "Date + type required");
      return;
    }

    try {
      await apiPost("/api/vacations", { vac_date, type });
      msg("empVacMsg", "Vacation saved ✅");
    } catch (e) {
      if (e?.status === 409) msg("empVacMsg", "Already exists for this date. Remove first.");
      else msg("empVacMsg", e?.message || "Error");
      return;
    }

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

  // Vacations: Load + month filter
  document.getElementById("empVacLoad")?.addEventListener("click", async () => {
    await loadVacations();
    const m = document.getElementById("empVacMonth")?.value;
    const filtered = filterByMonth(cacheVacations, getVacationDate, m);
    renderVacations(filtered);
    msg("empVacMsg", m ? `Showing ${m}` : "");
  });

  // Expense: Add
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

  // Expenses: Load + month filter
  document.getElementById("empExpLoad")?.addEventListener("click", async () => {
    await loadExpenses();
    const m = document.getElementById("empExpMonth")?.value;
    const filtered = filterByMonth(cacheExpenses, getExpenseDate, m);
    renderExpenses(filtered);
    msg("empExpMsg", m ? `Showing ${m}` : "");
  });
});
