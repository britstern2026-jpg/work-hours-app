// backend/src/routes/workHours.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

function getTokenUserId(req) {
  return req?.user?.id ?? req?.user?.uid ?? req?.user?.user_id ?? null;
}

function getTokenUsername(req) {
  return req?.user?.username ?? null;
}

async function resolveUserIdFromInput(rawUser) {
  if (rawUser === undefined || rawUser === null) return null;

  const s = String(rawUser).trim();
  if (!s) return null;

  // If it’s numeric, treat it as user id
  if (/^\d+$/.test(s)) return Number(s);

  // Otherwise treat as username
  const r = await query(`SELECT id FROM users WHERE username = $1 LIMIT 1`, [s]);
  return r.rows?.[0]?.id ?? null;
}

// ---- DB schema compatibility helpers ----
// Some people accidentally migrate to username schema. This lets the same code work
// even if work_hours doesn't have user_id (but has username) or vice versa.

async function insertWorkHours({ user_id, username, work_date, start_time, end_time }) {
  try {
    // try user_id schema first
    return await query(
      `INSERT INTO work_hours (user_id, work_date, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, work_date, start_time, end_time, created_at`,
      [user_id, work_date, start_time, end_time]
    );
  } catch (err) {
    const msg = String(err?.message || "");
    // fallback to username schema if column doesn't exist
    if (msg.includes('column "user_id"') && msg.includes("does not exist")) {
      return await query(
        `INSERT INTO work_hours (username, work_date, start_time, end_time)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, work_date, start_time, end_time, created_at`,
        [username, work_date, start_time, end_time]
      );
    }
    throw err;
  }
}

async function findExistingWorkHours({ user_id, username, work_date }) {
  try {
    // try user_id schema first
    return await query(
      `SELECT id
       FROM work_hours
       WHERE user_id = $1 AND work_date = $2
       ORDER BY id DESC
       LIMIT 1`,
      [user_id, work_date]
    );
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes('column "user_id"') && msg.includes("does not exist")) {
      return await query(
        `SELECT id
         FROM work_hours
         WHERE username = $1 AND work_date = $2
         ORDER BY id DESC
         LIMIT 1`,
        [username, work_date]
      );
    }
    throw err;
  }
}

async function updateWorkHours({ id, start_time, end_time }) {
  // update query doesn't depend on user_id/username
  return await query(
    `UPDATE work_hours
     SET start_time = $1, end_time = $2
     WHERE id = $3
     RETURNING *`,
    [start_time, end_time, id]
  );
}

async function listWorkHoursForEmployee({ user_id, username }) {
  try {
    return await query(
      `SELECT id, user_id, work_date, start_time, end_time, created_at
       FROM work_hours
       WHERE user_id = $1
       ORDER BY work_date DESC, id DESC`,
      [user_id]
    );
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes('column "user_id"') && msg.includes("does not exist")) {
      return await query(
        `SELECT id, username, work_date, start_time, end_time, created_at
         FROM work_hours
         WHERE username = $1
         ORDER BY work_date DESC, id DESC`,
        [username]
      );
    }
    throw err;
  }
}

// ---- Routes ----

// POST /api/work-hours  (employee adds own)
router.post("/work-hours", requireAuth, async (req, res) => {
  try {
    const { work_date, start_time, end_time } = req.body || {};

    if (!work_date || !start_time || !end_time) {
      return res.status(400).json({ error: "date, start_time, end_time are required" });
    }

    const user_id = getTokenUserId(req);
    const username = getTokenUsername(req);

    // Prevent NULL inserts
    if (!user_id && !username) {
      return res.status(401).json({ error: "Unauthorized (missing user identity in token)" });
    }

    const inserted = await insertWorkHours({
      user_id,
      username,
      work_date,
      start_time,
      end_time,
    });

    return res.json({ ok: true, workHours: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("work-hours create error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/work-hours/manager (manager upsert for any user+date)
// Accepts:
// - user_id as number
// - OR username as string
// - OR the existing UI can keep sending "user_id" but you type "matti" in it
router.post("/work-hours/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { work_date, start_time, end_time } = req.body || {};
    const rawUser = req.body?.user_id ?? req.body?.username;

    if (!rawUser || !work_date || !start_time || !end_time) {
      return res.status(400).json({ error: "user_id (or username), work_date, start_time, end_time are required" });
    }

    // Resolve id and username (for schema fallback)
    const resolvedUserId = await resolveUserIdFromInput(rawUser);
    const resolvedUsername = /^\d+$/.test(String(rawUser).trim())
      ? null
      : String(rawUser).trim();

    if (!resolvedUserId && !resolvedUsername) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await findExistingWorkHours({
      user_id: resolvedUserId,
      username: resolvedUsername,
      work_date,
    });

    if (existing.rows.length) {
      const updated = await updateWorkHours({
        id: existing.rows[0].id,
        start_time,
        end_time,
      });

      return res.json({ ok: true, workHours: updated.rows[0], action: "updated" });
    }

    const inserted = await insertWorkHours({
      user_id: resolvedUserId,
      username: resolvedUsername,
      work_date,
      start_time,
      end_time,
    });

    return res.json({ ok: true, workHours: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("work-hours manager upsert error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/work-hours  (employee sees own)
router.get("/work-hours", requireAuth, async (req, res) => {
  try {
    const user_id = getTokenUserId(req);
    const username = getTokenUsername(req);

    if (!user_id && !username) {
      return res.status(401).json({ error: "Unauthorized (missing user identity in token)" });
    }

    const result = await listWorkHoursForEmployee({ user_id, username });
    return res.json({ workHours: result.rows });
  } catch (err) {
    console.error("work-hours list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/work-hours/all  (manager sees all)
router.get("/work-hours/all", requireAuth, requireManager, async (req, res) => {
  try {
    // Try joining by user_id first; fallback to username schema if needed
    try {
      const result = await query(
        `SELECT wh.id, wh.user_id, u.username, wh.work_date, wh.start_time, wh.end_time, wh.created_at
         FROM work_hours wh
         JOIN users u ON u.id = wh.user_id
         ORDER BY wh.work_date DESC, wh.id DESC`
      );
      return res.json({ workHours: result.rows });
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes('column "user_id"') && msg.includes("does not exist")) {
        const result2 = await query(
          `SELECT wh.id, wh.username, wh.work_date, wh.start_time, wh.end_time, wh.created_at
           FROM work_hours wh
           ORDER BY wh.work_date DESC, wh.id DESC`
        );
        return res.json({ workHours: result2.rows });
      }
      throw err;
    }
  } catch (err) {
    console.error("work-hours all error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
