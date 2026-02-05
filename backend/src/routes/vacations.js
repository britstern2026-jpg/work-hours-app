// backend/src/routes/vacations.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

/**
 * Your DB schema is username-based (vacations.username FK -> users.username).
 * So we use username everywhere.
 * For manager routes we allow either:
 *  - username (preferred)
 *  - user_id (legacy) -> we resolve to username via users table
 */

function getUsernameFromToken(req) {
  return req?.user?.username ?? null;
}

async function resolveUsernameFromBody(body) {
  const username = body?.username?.trim();
  if (username) return username;

  const user_id = body?.user_id ?? body?.uid ?? body?.id;
  if (user_id === undefined || user_id === null || user_id === "") return null;

  // If it's numeric, try resolve id -> username
  const n = Number(user_id);
  if (!Number.isFinite(n)) return null;

  const r = await query(`SELECT username FROM users WHERE id = $1 LIMIT 1`, [n]);
  return r.rows[0]?.username ?? null;
}

// Try SQL with vacation_date first; if DB uses vac_date, fallback.
async function runWithDateColumn(sqlVacationDate, sqlVacDate, params) {
  try {
    return await query(sqlVacationDate, params);
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("does not exist") || msg.includes("column")) {
      return await query(sqlVacDate, params);
    }
    throw err;
  }
}

/** Returns { exists: boolean, row?: any } */
async function vacationExists(username, date) {
  const r = await runWithDateColumn(
    `SELECT id, username, vacation_date, type, created_at
     FROM vacations
     WHERE username = $1 AND vacation_date = $2
     ORDER BY id DESC
     LIMIT 1`,
    `SELECT id, username, vac_date, type, created_at
     FROM vacations
     WHERE username = $1 AND vac_date = $2
     ORDER BY id DESC
     LIMIT 1`,
    [username, date]
  );

  if (r.rows.length) return { exists: true, row: r.rows[0] };
  return { exists: false };
}

/**
 * POST /api/vacations (employee own)
 * Body: { vacation_date|vac_date|date, type }
 */
router.post("/vacations", requireAuth, async (req, res) => {
  try {
    const date = req.body?.vacation_date || req.body?.vac_date || req.body?.date;
    const { type } = req.body || {};

    if (!date || !type) {
      return res
        .status(400)
        .json({ error: "date (vacation_date/vac_date) and type are required" });
    }

    const username = getUsernameFromToken(req);
    if (!username) {
      return res.status(401).json({ error: "Unauthorized (missing username in token)" });
    }

    const exists = await vacationExists(username, date);
    if (exists.exists) {
      return res.status(409).json({
        error: "Vacation already exists for this date",
        existing: exists.row,
      });
    }

    const inserted = await runWithDateColumn(
      `INSERT INTO vacations (username, vacation_date, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      `INSERT INTO vacations (username, vac_date, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [username, date, type]
    );

    return res.json({ ok: true, vacation: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("vacations create error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

/**
 * DELETE /api/vacations (employee own by date)
 * Body: { vacation_date|vac_date|date }
 */
router.delete("/vacations", requireAuth, async (req, res) => {
  try {
    const date = req.body?.vacation_date || req.body?.vac_date || req.body?.date;
    if (!date) {
      return res.status(400).json({ error: "date (vacation_date/vac_date) is required" });
    }

    const username = getUsernameFromToken(req);
    if (!username) {
      return res.status(401).json({ error: "Unauthorized (missing username in token)" });
    }

    await runWithDateColumn(
      `DELETE FROM vacations WHERE username = $1 AND vacation_date = $2`,
      `DELETE FROM vacations WHERE username = $1 AND vac_date = $2`,
      [username, date]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations delete error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

/**
 * GET /api/vacations (employee own)
 */
router.get("/vacations", requireAuth, async (req, res) => {
  try {
    const username = getUsernameFromToken(req);
    if (!username) {
      return res.status(401).json({ error: "Unauthorized (missing username in token)" });
    }

    const r = await runWithDateColumn(
      `SELECT * FROM vacations WHERE username = $1 ORDER BY vacation_date DESC, id DESC`,
      `SELECT * FROM vacations WHERE username = $1 ORDER BY vac_date DESC, id DESC`,
      [username]
    );

    return res.json({ vacations: r.rows });
  } catch (err) {
    console.error("vacations list error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

/**
 * POST /api/vacations/manager (manager set)
 * Body: { username OR user_id, vacation_date|vac_date|date, type }
 */
router.post("/vacations/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const date = req.body?.vacation_date || req.body?.vac_date || req.body?.date;
    const { type } = req.body || {};

    const username = await resolveUsernameFromBody(req.body);
    if (!username || !date || !type) {
      return res.status(400).json({
        error: "username (preferred) or user_id, date (vacation_date/vac_date), and type are required",
      });
    }

    const exists = await vacationExists(username, date);
    if (exists.exists) {
      return res.status(409).json({
        error: "Vacation already exists for this date",
        existing: exists.row,
      });
    }

    const inserted = await runWithDateColumn(
      `INSERT INTO vacations (username, vacation_date, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      `INSERT INTO vacations (username, vac_date, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [username, date, type]
    );

    return res.json({ ok: true, vacation: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("vacations manager set error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

/**
 * DELETE /api/vacations/manager (manager remove)
 * Body: { username OR user_id, vacation_date|vac_date|date }
 */
router.delete("/vacations/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const date = req.body?.vacation_date || req.body?.vac_date || req.body?.date;
    const username = await resolveUsernameFromBody(req.body);

    if (!username || !date) {
      return res.status(400).json({
        error: "username (preferred) or user_id, and date (vacation_date/vac_date) are required",
      });
    }

    await runWithDateColumn(
      `DELETE FROM vacations WHERE username = $1 AND vacation_date = $2`,
      `DELETE FROM vacations WHERE username = $1 AND vac_date = $2`,
      [username, date]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations manager delete error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

/**
 * GET /api/vacations/all (manager)
 */
router.get("/vacations/all", requireAuth, requireManager, async (req, res) => {
  try {
    const r = await runWithDateColumn(
      `SELECT v.*, u.id AS user_id
       FROM vacations v
       LEFT JOIN users u ON u.username = v.username
       ORDER BY v.vacation_date DESC, v.id DESC`,
      `SELECT v.*, u.id AS user_id
       FROM vacations v
       LEFT JOIN users u ON u.username = v.username
       ORDER BY v.vac_date DESC, v.id DESC`,
      []
    );

    return res.json({ vacations: r.rows });
  } catch (err) {
    console.error("vacations all error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

module.exports = router;
