const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../welcome");

const router = express.Router();

// POST /api/vacations
router.post("/vacations", requireAuth, async (req, res) => {
  try {
    const { date, type } = req.body;

    await pool.query(
      `INSERT INTO vacations (user_id,date,type)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id,date)
       DO UPDATE SET type=$3`,
      [req.user.uid, date, type]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("vacations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
