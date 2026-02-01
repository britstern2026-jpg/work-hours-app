// backend/src/routes/expenses.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

// POST /api/expenses  (employee: own)
router.post("/expenses", requireAuth, async (req, res) => {
  try {
    const expense_date = req.body?.expense_date || req.body?.date;
    const { description, amount } = req.body || {};

    if (!expense_date || !description || amount === undefined) {
      return res.status(400).json({ error: "expense_date (or date), description, amount are required" });
    }

    const userId = req.user.id;

    const { rows } = await query(
      `INSERT INTO expenses (user_id, expense_date, description, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, expense_date, String(description), Number(amount)]
    );

    return res.json({ ok: true, expense: rows[0] });
  } catch (err) {
    console.error("expenses create error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/expenses  (employee: own)
router.get("/expenses", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await query(
      `SELECT *
       FROM expenses
       WHERE user_id = $1
       ORDER BY expense_date DESC, id DESC`,
      [userId]
    );
    return res.json({ expenses: rows });
  } catch (err) {
    console.error("expenses list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/expenses/all  (manager)
router.get("/expenses/all", requireAuth, requireManager, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*, u.username
       FROM expenses e
       JOIN users u ON u.id = e.user_id
       ORDER BY e.expense_date DESC, e.id DESC`
    );
    return res.json({ expenses: rows });
  } catch (err) {
    console.error("expenses all error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
