// backend/src/routes/vacations.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

function getUserId(req) {
  return req?.user?.id ?? req?.user?.uid;
}

// POST /api/vacations  (employee: own)
router.post("/vacations", requireAuth, async (req, res) => {
  try {
    const vac_date = req.body?.vac_date || req.body?.date;
    const { type } = req.body || {};

    if (!vac_date || !type) {
      return res.status(400).json({ error: "vac_date (or date) and type are required" });
    }

    const userId = getUserId(req);

    const { rows } = await query(
      `INSERT INTO vacations (user_id, vac_date, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, vac_date, type]
    );

    return res.json({ ok: true, vacation: rows[0] });
  } catch (err) {
    console.error("vacations create error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ DELETE /api/vacations  (employee removes own by date)
router.delete("/vacations", requireAuth, async (req, res) => {
  try {
    const vac_date = req.body?.vac_date || req.body?.date;
    if (!vac_date) return res.status(400).json({ error: "vac_date (or date) is required" });

    const userId = getUserId(req);

    await query(
      `DELETE FROM vacations WHERE user_id = $1 AND vac_date = $2`,
      [userId, vac_date]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations delete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ POST /api/vacations/manager  (manager set/replace vacation for any user+date)
router.post("/vacations/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { user_id, vac_date, type } = req.body || {};
    if (!user_id || !vac_date || !type) {
      return res.status(400).json({ error: "user_id, vac_date, type are required" });
    }

    const existing = await query(
      `SELECT id FROM vacations WHERE user_id = $1 AND vac_date = $2 ORDER BY id DESC LIMIT 1`,
      [user_id, vac_date]
    );

    if (existing.rows.length) {
      const updated = await query(
        `UPDATE vacations
         SET type = $1
         WHERE id = $2
         RETURNING *`,
        [type, existing.rows[0].id]
      );
      return res.json({ ok: true, vacation: updated.rows[0], action: "updated" });
    }

    const inserted = await query(
      `INSERT INTO vacations (user_id, vac_date, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, vac_date, type]
    );

    return res.json({ ok: true, vacation: inserted.rows[0], action: "created" });
  } catch (err) {
    console.error("vacations manager set error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ DELETE /api/vacations/manager  (manager removes vacation for any user+date)
router.delete("/vacations/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { user_id, vac_date } = req.body || {};
    if (!user_id || !vac_date) {
      return res.status(400).json({ error: "user_id and vac_date are required" });
    }

    await query(
      `DELETE FROM vacations WHERE user_id = $1 AND vac_date = $2`,
      [user_id, vac_date]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations manager delete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/vacations  (employee: own)
router.get("/vacations", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { rows } = await query(
      `SELECT *
       FROM vacations
       WHERE user_id = $1
       ORDER BY vac_date DESC, id DESC`,
      [userId]
    );
    return res.json({ vacations: rows });
  } catch (err) {
    console.error("vacations list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/vacations/all  (manager)
router.get("/vacations/all", requireAuth, requireManager, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT v.*, u.username
       FROM vacations v
       JOIN users u ON u.id = v.user_id
       ORDER BY v.vac_date DESC, v.id DESC`
    );
    return res.json({ vacations: rows });
  } catch (err) {
    console.error("vacations all error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
