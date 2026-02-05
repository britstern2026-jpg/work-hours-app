// backend/src/routes/workHours.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

function getUserId(req) {
  return req?.user?.id ?? req?.user?.uid ?? req?.user?.user_id ?? null;
}

async function resolveUserId(input) {
  // If it's a number-like string, treat as id
  if (input === undefined || input === null) return null;

  const s = String(input).trim();
  if (!s) return null;

  // numeric id
  if (/^\d+$/.test(s)) return Number(s);

  // otherwise treat as username
  const r = await query(`SELECT id FROM users WHERE username = $1 LIMIT 1`, [s]);
  if (!r.rows.length) return null;
  return r.rows[0].id;
}

// POST /api/work-hours  (employee adds own)
router.post("/work-hours", requireAuth, async (req, res) => {
  try {
    const { work_date, start_time, end_time } = req.body || {};

    if (!work_date || !start_time || !end_time) {
      return res.status(400).json({ error: "date, start_time, end_time are required" });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized (missing user id in token)" });
    }

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

// ✅ POST /api/work-hours/manager
// Accepts either:
// - user_id: number (existing behavior)
// - OR username: string
// - OR user_id field containing a username string (so UI can stay "User UID")
router.post("/work-hours/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { work_date, start_time, end_time } = req.body || {};

    // Keep compatibility: allow req.body.user_id OR req.body.username
    const rawUser = req.body?.user_id ?? req.body?.username;

    if (!rawUser || !work_date || !start_time || !end_time) {
      return res
        .status(400)
        .json({ error: "user_id (or username), work_date, start_time, end_time are required" });
    }

    const user_id = await resolveUserId(rawUser);
    if (!user_id) {
      return res.status(404).json({ error: "User not found" });
    }

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
    if (!userId) return res.status(401).json({ error: "Unauthorized (missing user id in token)" });

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
       ORDER BY wh.work_date DESC, wh.id DESC`
    );

    return res.json({ workHours: result.rows });
  } catch (err) {
    console.error("work-hours all error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
