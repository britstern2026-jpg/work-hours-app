// backend/src/routes/workHours.js
const express = require("express");
const { DateTime } = require("luxon");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome-wrapper");

const router = express.Router();
const APP_ZONE = "Asia/Jerusalem";

function isValidDateISO(dateStr) {
  const dt = DateTime.fromISO(dateStr, { zone: APP_ZONE });
  return dt.isValid && dt.toFormat("yyyy-MM-dd") === dateStr;
}

function isValidHHMM(t) {
  return typeof t === "string" && /^\d{2}:\d{2}$/.test(t);
}

/**
 * POST /api/work-hours
 * Employee: create/update own work hours for a specific date
 *
 * Body supports:
 *  - work_date (preferred)
 *  - date      (alias)
 */
router.post("/work-hours", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const work_date = body.work_date || body.date; // accept alias
    const { start_time, end_time } = body;

    if (!work_date || !start_time || !end_time) {
      return res
        .status(400)
        .json({ error: "work_date (or date), start_time, end_time are required" });
    }

    if (!isValidDateISO(work_date)) {
      return res.status(400).json({ error: "work_date must be YYYY-MM-DD" });
    }

    if (!isValidHHMM(start_time) || !isValidHHMM(end_time)) {
      return res.status(400).json({ error: "start_time and end_time must be HH:MM" });
    }

    // IMPORTANT: your auth middleware provides req.user.uid (not req.user.id)
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Invalid token: missing uid" });
    }

    // Update-if-exists
    const upd = await query(
      `UPDATE work_hours
       SET start_time = $1,
           end_time   = $2
       WHERE user_id = $3 AND work_date = $4
       RETURNING
         id,
         user_id,
         work_date::text AS work_date,
         start_time::text AS start_time,
         end_time::text AS end_time,
         created_at`,
      [start_time, end_time, userId, work_date]
    );

    if (upd.rows.length > 0) {
      return res.json({ ok: true, workHours: upd.rows[0], action: "updated" });
    }

    // Otherwise insert
    const ins = await query(
      `INSERT INTO work_hours (user_id, work_date, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         user_id,
         work_date::text AS work_date,
         start_time::text AS start_time,
         end_time::text AS end_time,
         created_at`,
      [userId, work_date, start_time, end_time]
    );

    return res.json({ ok: true, workHours: ins.rows[0], action: "created" });
  } catch (err) {
    console.error("work-hours create/update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/work-hours
 * Employee: list own work hours
 */
router.get("/work-hours", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Invalid token: missing uid" });
    }

    const r = await query(
      `SELECT
         id,
         user_id,
         work_date::text AS work_date,
         start_time::text AS start_time,
         end_time::text AS end_time,
         created_at
       FROM work_hours
       WHERE user_id = $1
       ORDER BY work_date DESC`,
      [userId]
    );

    return res.json({ workHours: r.rows });
  } catch (err) {
    console.error("work-hours list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/work-hours/all
 * Manager: list everyone's work hours
 */
router.get("/work-hours/all", requireAuth, requireManager, async (req, res) => {
  try {
    const r = await query(
      `SELECT
         wh.id,
         wh.user_id,
         u.username,
         wh.work_date::text AS work_date,
         wh.start_time::text AS start_time,
         wh.end_time::text AS end_time,
         wh.created_at
       FROM work_hours wh
       JOIN users u ON u.id = wh.user_id
       ORDER BY wh.work_date DESC, u.username ASC`,
      []
    );

    return res.json({ workHours: r.rows });
  } catch (err) {
    console.error("work-hours all error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
