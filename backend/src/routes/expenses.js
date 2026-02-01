const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../welcome");

const router = express.Router();

// POST /api/expenses
router.post("/expenses", requireAuth, async (req, res) => {
  try {
    const { description, amount } = req.body;

    await pool.query(
      `INSERT INTO expenses (user_id,description,amount)
       VALUES ($1,$2,$3)`,
      [req.user.uid, description, amount]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("expenses error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
