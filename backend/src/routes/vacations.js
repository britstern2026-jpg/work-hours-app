// backend/src/routes/vacations.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

function getUserId(req) {
  return req?.user?.id ?? req?.user?.uid;
}

// Try SQL with vacation_date first; if DB uses vac_date, fallback.
async function runWithDateColumn(sqlVacationDate, sqlVacDate, params) {
  try {
    return await query(sqlVacationDate, params);
  } catch (err) {
    const msg = String(err?.message || "");
    // common Postgres error message: column "vacation_date" does not exist
    if (msg.includes("does not exist") || msg.includes("column")) {
      return await query(sqlVacDate, params);
    }
    throw err;
  }
}

// POST /api/vacations (employee own)
router.post("/vacations", requireAuth, async (req, res) => {
  try {
    const date = req.body?.vacation_date || req.body?.vac_date || req.body?.date;
    const { type } = req.body || {};

    if (!date || !type) {
      return res.status(400).json({ error: "date (vacation_date/vac_date) and type are required" });
    }

    const userId = getUserId(req);

    const r = await runWithDateColumn(
      // vacation_date
      `INSERT INTO vacations (user_id, vacation_date, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      // vac_date
      `INSERT INTO vacations (user_id, vac_date, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, date, type]
    );

    return res.json({ ok: true, vacation: r.rows[0] });
  } catch (err) {
    console.error("vacations create error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// DELETE /api/vacations (employee own by date)
router.delete("/vacations", requireAuth, async (req, res) => {
  try {
    const date = req.body?.vacation_date || req.body?.vac_date || req.body?.date;
    if (!date) return res.status(400).json({ error: "date (vacation_date/vac_date) is required" });

    const userId = getUserId(req);

    await runWithDateColumn(
      `DELETE FROM vacations WHERE user_id = $1 AND vacation_date = $2`,
      `DELETE FROM vacations WHERE user_id = $1 AND vac_date = $2`,
      [userId, date]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations delete error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// POST /api/vacations/manager (manager set/replace)
router.post("/vacations/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { user_id, type } = req.body || {};
    const date = req.body?.vacation_date || req.body?.vac_date || req.body?.date;

    if (!user_id || !date || !type) {
      return res.status(400).json({ error: "user_id, date (vacation_date/vac_date), type are required" });
    }

    // Upsert by (user_id, date) without relying on DB constraint
    const existing = await runWithDateColumn(
      `SELECT id FROM vacations WHERE user_id = $1 AND vacation_date = $2 ORDER BY id DESC LIMIT 1`,
      `SELECT id FROM vacations WHERE user_id = $1 AND vac_date = $2 ORDER BY id DESC LIMIT 1`,
      [user_id, date]
    );

    if (existing.rows.length) {
      const updated = await runWithDateColumn(
        `UPDATE vacations SET type = $1 WHERE id = $2 RETURNING *`,
        `UPDATE vacations SET type = $1 WHERE id = $2 RETURNING *`,
        [type, existing.rows[0].id]
      );
      return res.json({ ok: true, vacation: updated.rows[0], action: "updated" });
    }

    const inserted = await runWithDateColumn(
      `INSERT INTO vacations (user_id, vacation_date, type) VALUES ($1,$2,$3) RETURNING *`,
      `INSERT INTO vacations (user_id, vac_date, type) VALUES ($1,$2,$3) RETURNING *`,
      [user_id, date, type]
    );

    return res.json({ ok: true, vacation: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("vacations manager set error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// DELETE /api/vacations/manager (manager remove)
router.delete("/vacations/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { user_id } = req.body || {};
    const date = req.body?.vacation_date || req.body?.vac_date || req.body?.date;

    if (!user_id || !date) {
      return res.status(400).json({ error: "user_id and date (vacation_date/vac_date) are required" });
    }

    await runWithDateColumn(
      `DELETE FROM vacations WHERE user_id = $1 AND vacation_date = $2`,
      `DELETE FROM vacations WHERE user_id = $1 AND vac_date = $2`,
      [user_id, date]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations manager delete error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// GET /api/vacations (employee own)
router.get("/vacations", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);

    const r = await runWithDateColumn(
      `SELECT * FROM vacations WHERE user_id = $1 ORDER BY vacation_date DESC, id DESC`,
      `SELECT * FROM vacations WHERE user_id = $1 ORDER BY vac_date DESC, id DESC`,
      [userId]
    );

    return res.json({ vacations: r.rows });
  } catch (err) {
    console.error("vacations list error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// GET /api/vacations/all (manager)
router.get("/vacations/all", requireAuth, requireManager, async (req, res) => {
  try {
    const r = await runWithDateColumn(
      `SELECT v.*, u.username
       FROM vacations v
       JOIN users u ON u.id = v.user_id
       ORDER BY v.vacation_date DESC, v.id DESC`,
      `SELECT v.*, u.username
       FROM vacations v
       JOIN users u ON u.id = v.user_id
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
