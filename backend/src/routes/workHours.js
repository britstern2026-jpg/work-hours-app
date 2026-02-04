// backend/src/routes/workHours.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

function getUserId(req) {
  return req?.user?.id ?? req?.user?.uid;
}

// POST /api/work-hours  (employee adds own)
router.post("/work-hours", requireAuth, async (req, res) => {
  try {
    const { work_date, start_time, end_time } = req.body || {};

    // keep the error text exactly like you saw earlier
    if (!work_date || !start_time || !end_time) {
      return res.status(400).json({ error: "date, start_time, end_time are required" });
    }

    const userId = getUserId(req);

    const inserted = await query(
      `INSERT INTO work_hours (user_id, work_date, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, work_date, start_time, end_time, created_at`,
      [userId, work_date, start_time, end_time]
    );

    return res.json({ ok: true, workHours: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("work-hours create error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ POST /api/work-hours/manager  (manager adds/updates for any user+date)
router.post("/work-hours/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { user_id, work_date, start_time, end_time } = req.body || {};

    if (!user_id || !work_date || !start_time || !end_time) {
      return res.status(400).json({ error: "user_id, work_date, start_time, end_time are required" });
    }

    // Upsert by (user_id, work_date) without requiring a DB constraint
    const existing = await query(
      `SELECT id
       FROM work_hours
       WHERE user_id = $1 AND work_date = $2
       ORDER BY id DESC
       LIMIT 1`,
      [user_id, work_date]
    );

    if (existing.rows.length) {
      const updated = await query(
        `UPDATE work_hours
         SET start_time = $1, end_time = $2
         WHERE id = $3
         RETURNING id, user_id, work_date, start_time, end_time, created_at`,
        [start_time, end_time, existing.rows[0].id]
      );

      return res.json({ ok: true, workHours: updated.rows[0], action: "updated" });
    }

    const inserted = await query(
      `INSERT INTO work_hours (user_id, work_date, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, work_date, start_time, end_time, created_at`,
      [user_id, work_date, start_time, end_time]
    );

    return res.json({ ok: true, workHours: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("work-hours manager upsert error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/work-hours  (employee sees own)
router.get("/work-hours", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await query(
      `SELECT id, user_id, work_date, start_time, end_time, created_at
       FROM work_hours
       WHERE user_id = $1
       ORDER BY work_date DESC, id DESC`,
      [userId]
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
