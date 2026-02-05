// backend/src/routes/expenses.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

function getUserId(req) {
  // support different auth payload shapes
  return req?.user?.id ?? req?.user?.uid ?? req?.user?.user_id ?? null;
}

// POST /api/expenses (employee: own)
router.post("/expenses", requireAuth, async (req, res) => {
  try {
    const expense_date = req.body?.expense_date || req.body?.date;
    const { description, amount } = req.body || {};

    if (!expense_date || !description || amount === undefined || amount === null) {
      return res
        .status(400)
        .json({ error: "expense_date (or date), description, amount are required" });
    }

    const userId = getUserId(req);
    if (!userId) {
      // This would indicate your JWT middleware didn't attach the user id
      return res.status(401).json({ error: "Unauthorized (missing user id in token)" });
    }

    const { rows } = await query(
      `INSERT INTO expenses (user_id, expense_date, description, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, expense_date, String(description), Number(amount)]
    );

    return res.json({ ok: true, expense: rows[0] });
  } catch (err) {
    console.error("expenses create error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// GET /api/expenses (employee: own)
router.get("/expenses", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized (missing user id in token)" });

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
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// GET /api/expenses/all (manager)
// Use LEFT JOIN so it doesn't fail when user_id is NULL (existing bad rows)
router.get("/expenses/all", requireAuth, requireManager, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*, u.username
       FROM expenses e
       LEFT JOIN users u ON u.id = e.user_id
       ORDER BY e.expense_date DESC, e.id DESC`
    );

    return res.json({ expenses: rows });
  } catch (err) {
    console.error("expenses all error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

module.exports = router;
