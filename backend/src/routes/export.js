// backend/src/routes/export.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

// GET /api/export  (manager)
router.get("/export", requireAuth, requireManager, async (req, res) => {
  try {
    const users = await query(`SELECT id, username, role, created_at FROM users ORDER BY id`);
    const workHours = await query(`SELECT * FROM work_hours ORDER BY work_date, id`);
    const vacations = await query(`SELECT * FROM vacations ORDER BY id`);
    const expenses = await query(`SELECT * FROM expenses ORDER BY id`);

    return res.json({
      users: users.rows,
      work_hours: workHours.rows,
      vacations: vacations.rows,
      expenses: expenses.rows,
    });
  } catch (err) {
    console.error("export error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
