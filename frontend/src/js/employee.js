import { initCommon } from "./common.js";
import { apiFetch } from "./api.js";
import { qs, setText } from "./ui.js";

function ymdToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function ymThisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function setDefaults() {
  const today = ymdToday();
  const month = ymThisMonth();
  qs("empWhDate").value = today;
  qs("empVacDate").value = today;
  qs("empExpDate").value = today;
  qs("empWhMonth").value = month;
  qs("empVacMonth").value = month;
  qs("empExpMonth").value = month;
}
function render(tableId, rowsHtml) {
  qs(tableId).querySelector("tbody").innerHTML = rowsHtml;
}

async function boot() {
  initCommon({ requiredRole: "employee" });
  setDefaults();

  // Work hours
  qs("empWhSave").addEventListener("click", async () => {
    setText("empWhMsg", "");
    try {
      await apiFetch("/api/work-hours", {
        method: "POST",
        body: {
          date: qs("empWhDate").value,
          startTime: qs("empWhStart").value,
          endTime: qs("empWhEnd").value,
        },
      });
      setText("empWhMsg", "Saved.");
    } catch (e) { setText("empWhMsg", `Error: ${e.message}`); }
  });

  qs("empWhLoad").addEventListener("click", async () => {
    setText("empWhMsg", "");
    try {
      const month = qs("empWhMonth").value;
      const data = await apiFetch(`/api/work-hours?month=${encodeURIComponent(month)}`);
      render("empWhTable", (data.items||[]).map(it =>
        `<tr><td>${it.date||""}</td><td>${it.startTime||""}</td><td>${it.endTime||""}</td><td>${it.durationMinutes??""}</td></tr>`
      ).join(""));
      setText("empWhMsg", `Loaded ${(data.items||[]).length} rows.`);
    } catch (e) { setText("empWhMsg", `Error: ${e.message}`); }
  });

  // Vacations
  qs("empVacSave").addEventListener("click", async () => {
    setText("empVacMsg", "");
    try {
      await apiFetch("/api/vacations", {
        method: "POST",
        body: { date: qs("empVacDate").value, type: qs("empVacType").value },
      });
      setText("empVacMsg", "Set.");
    } catch (e) { setText("empVacMsg", `Error: ${e.message}`); }
  });

  qs("empVacDelete").addEventListener("click", async () => {
    setText("empVacMsg", "");
    try {
      const date = qs("empVacDate").value;
      await apiFetch(`/api/vacations?date=${encodeURIComponent(date)}`, { method: "DELETE" });
      setText("empVacMsg", "Removed.");
    } catch (e) { setText("empVacMsg", `Error: ${e.message}`); }
  });

  qs("empVacLoad").addEventListener("click", async () => {
    setText("empVacMsg", "");
    try {
      const month = qs("empVacMonth").value;
      const data = await apiFetch(`/api/vacations?month=${encodeURIComponent(month)}`);
      render("empVacTable", (data.items||[]).map(it =>
        `<tr><td>${it.date||""}</td><td>${it.type||""}</td></tr>`
      ).join(""));
      setText("empVacMsg", `Loaded ${(data.items||[]).length} rows.`);
    } catch (e) { setText("empVacMsg", `Error: ${e.message}`); }
  });

  // Expenses
  qs("empExpAdd").addEventListener("click", async () => {
    setText("empExpMsg", "");
    try {
      await apiFetch("/api/expenses", {
        method: "POST",
        body: {
          date: qs("empExpDate").value,
          description: qs("empExpDesc").value,
          amount: qs("empExpAmount").value,
        },
      });
      qs("empExpDesc").value = "";
      qs("empExpAmount").value = "";
      setText("empExpMsg", "Added.");
    } catch (e) { setText("empExpMsg", `Error: ${e.message}`); }
  });

  qs("empExpLoad").addEventListener("click", async () => {
    setText("empExpMsg", "");
    try {
      const month = qs("empExpMonth").value;
      const data = await apiFetch(`/api/expenses?month=${encodeURIComponent(month)}`);
      render("empExpTable", (data.items||[]).map(it =>
        `<tr><td>${it.date||""}</td><td>${it.description||""}</td><td>${it.amount??""}</td></tr>`
      ).join(""));
      setText("empExpMsg", `Loaded ${(data.items||[]).length} rows.`);
    } catch (e) { setText("empExpMsg", `Error: ${e.message}`); }
  });
}

boot();
