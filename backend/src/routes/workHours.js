// backend/src/routes/workHours.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

// POST /api/work-hours  (employee adds own)
router.post("/work-hours", requireAuth, async (req, res) => {
  try {
    const { work_date, start_time, end_time } = req.body || {};

    // keep the error text exactly like you saw earlier
    if (!work_date || !start_time || !end_time) {
      return res.status(400).json({ error: "date, start_time, end_time are required" });
    }

    const inserted = await query(
      `INSERT INTO work_hours (user_id, work_date, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, work_date, start_time, end_time, created_at`,
      [req.user.uid, work_date, start_time, end_time]
    );

    return res.json({ ok: true, workHours: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("work-hours create error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/work-hours  (employee sees own)
router.get("/work-hours", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, user_id, work_date, start_time, end_time, created_at
       FROM work_hours
       WHERE user_id = $1
       ORDER BY work_date DESC, id DESC`,
      [req.user.uid]
    );

    return res.json({ workHours: result.rows });
  } catch (err) {
    console.error("work-hours list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/work-hours/all  (manager sees all)
router.get("/work-hours/all", requireAuth, requireManager, async (req, res) => {
  try {
    const result = await query(
      `SELECT wh.id, wh.user_id, u.username, wh.work_date, wh.start_time, wh.end_time, wh.created_at
       FROM work_hours wh
       JOIN users u ON u.id = wh.user_id
       ORDER BY wh.work_date DESC, wh.id DESC`,
      []
    );

    return res.json({ workHours: result.rows });
  } catch (err) {
    console.error("work-hours all error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
