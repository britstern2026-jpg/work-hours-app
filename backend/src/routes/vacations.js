// backend/src/routes/vacations.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

// POST /api/vacations  (employee: own)
router.post("/vacations", requireAuth, async (req, res) => {
  try {
    const vac_date = req.body?.vac_date || req.body?.date;
    const { type } = req.body || {};

    if (!vac_date || !type) {
      return res.status(400).json({ error: "vac_date (or date) and type are required" });
    }

    const userId = req.user.id;

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

// GET /api/vacations  (employee: own)
router.get("/vacations", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
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
