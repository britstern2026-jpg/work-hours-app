const express = require("express");
const ExcelJS = require("exceljs");
const { DateTime } = require("luxon");
const { db } = require("../firebase");
const { requireAuth, requireManager } = require("../auth");

const router = express.Router();
const APP_ZONE = "Asia/Jerusalem";

function monthRange(monthStr) {
  const m = DateTime.fromFormat(monthStr, "yyyy-MM", { zone: APP_ZONE });
  if (!m.isValid) return null;
  return {
    startStr: m.startOf("month").toFormat("yyyy-MM-dd"),
    endStr: m.endOf("month").toFormat("yyyy-MM-dd"),
  };
}

async function loadUsers() {
  const snap = await db().collection("users").orderBy("username", "asc").get();
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

async function loadWorkHours(startStr, endStr) {
  const snap = await db()
    .collection("workHours")
    .where("date", ">=", startStr)
    .where("date", "<=", endStr)
    .orderBy("date", "asc")
    .get();

  return snap.docs.map(d => d.data());
}

async function loadVacations(startStr, endStr) {
  const snap = await db()
    .collection("vacations")
    .where("date", ">=", startStr)
    .where("date", "<=", endStr)
    .orderBy("date", "asc")
    .get();

  return snap.docs.map(d => d.data());
}

async function loadExpenses(startStr, endStr) {
  const snap = await db()
    .collection("expenses")
    .where("date", ">=", startStr)
    .where("date", "<=", endStr)
    .orderBy("date", "asc")
    .get();

  return snap.docs.map(d => d.data());
}

router.get("/export", requireAuth, requireManager, async (req, res) => {
  try {
    const month = String(req.query.month || "");
    const range = monthRange(month);
    if (!range) {
      return res.status(400).json({ error: "month is required and must be YYYY-MM" });
    }

    const { startStr, endStr } = range;

    const [users, workHours, vacations, expenses] = await Promise.all([
      loadUsers(),
      loadWorkHours(startStr, endStr),
      loadVacations(startStr, endStr),
      loadExpenses(startStr, endStr),
    ]);

    const uidToUser = new Map(users.map(u => [u.uid, u]));

    const wb = new ExcelJS.Workbook();
    wb.creator = "work-hours-app";

    // ===== Sheet 1: Work Hours =====
    const wsHours = wb.addWorksheet("Work Hours");
    wsHours.columns = [
      { header: "Username", key: "username", width: 18 },
      { header: "UID", key: "uid", width: 24 },
      { header: "Date", key: "date", width: 12 },
      { header: "Start", key: "startTime", width: 10 },
      { header: "End", key: "endTime", width: 10 },
      { header: "Duration (min)", key: "durationMinutes", width: 14 },
    ];
    wsHours.getRow(1).font = { bold: true };

    for (const r of workHours) {
      const u = uidToUser.get(r.uid);
      wsHours.addRow({
        username: u?.username || "(unknown)",
        uid: r.uid,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        durationMinutes: r.durationMinutes,
      });
    }

    // ===== Sheet 2: Vacations =====
    const wsVac = wb.addWorksheet("Vacations");
    wsVac.columns = [
      { header: "Username", key: "username", width: 18 },
      { header: "UID", key: "uid", width: 24 },
      { header: "Date", key: "date", width: 12 },
      { header: "Type", key: "type", width: 14 },
    ];
    wsVac.getRow(1).font = { bold: true };

    for (const r of vacations) {
      const u = uidToUser.get(r.uid);
      wsVac.addRow({
        username: u?.username || "(unknown)",
        uid: r.uid,
        date: r.date,
        type: r.type,
      });
    }

    // ===== Sheet 3: Expenses =====
    const wsExp = wb.addWorksheet("Expenses");
    wsExp.columns = [
      { header: "Username", key: "username", width: 18 },
      { header: "UID", key: "uid", width: 24 },
      { header: "Date", key: "date", width: 12 },
      { header: "Description", key: "description", width: 40 },
      { header: "Amount", key: "amount", width: 10 },
    ];
    wsExp.getRow(1).font = { bold: true };

    for (const r of expenses) {
      const u = uidToUser.get(r.uid);
      wsExp.addRow({
        username: u?.username || "(unknown)",
        uid: r.uid,
        date: r.date,
        description: r.description,
        amount: r.amount,
      });
    }

    // ===== Sheet 4: Summary =====
    const wsSum = wb.addWorksheet("Summary");
    wsSum.columns = [
      { header: "Username", key: "username", width: 18 },
      { header: "UID", key: "uid", width: 24 },
      { header: "Total Work Minutes", key: "work", width: 18 },
      { header: "Vacation Days", key: "vacation", width: 14 },
      { header: "Sick Days", key: "sick", width: 12 },
      { header: "Child Sick Days", key: "child_sick", width: 16 },
      { header: "Reserve Days", key: "reserve", width: 14 },
      { header: "Expense Total", key: "expenseTotal", width: 14 },
    ];
    wsSum.getRow(1).font = { bold: true };

    const workByUid = new Map();
    for (const r of workHours) {
      workByUid.set(r.uid, (workByUid.get(r.uid) || 0) + (r.durationMinutes || 0));
    }

    const vacByUid = new Map(); // uid -> {type -> count}
    for (const r of vacations) {
      const m = vacByUid.get(r.uid) || { vacation: 0, sick: 0, child_sick: 0, reserve: 0 };
      if (m[r.type] !== undefined) m[r.type] += 1;
      vacByUid.set(r.uid, m);
    }

    const expByUid = new Map();
    for (const r of expenses) {
      expByUid.set(r.uid, (expByUid.get(r.uid) || 0) + (Number(r.amount) || 0));
    }

    for (const u of users) {
      const v = vacByUid.get(u.uid) || { vacation: 0, sick: 0, child_sick: 0, reserve: 0 };
      wsSum.addRow({
        username: u.username,
        uid: u.uid,
        work: workByUid.get(u.uid) || 0,
        vacation: v.vacation,
        sick: v.sick,
        child_sick: v.child_sick,
        reserve: v.reserve,
        expenseTotal: expByUid.get(u.uid) || 0,
      });
    }

    // Return file
    const filename = `report_${month}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("export error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;