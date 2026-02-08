// backend/src/routes/expenses.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

function getUsernameFromToken(req) {
  return req?.user?.username ?? null;
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

    const username = getUsernameFromToken(req);
    if (!username) {
      return res.status(401).json({ error: "Unauthorized (missing username in token)" });
    }

    const { rows } = await query(
      `INSERT INTO expenses (username, expense_date, description, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [username, expense_date, String(description), Number(amount)]
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
    const username = getUsernameFromToken(req);
    if (!username) {
      return res.status(401).json({ error: "Unauthorized (missing username in token)" });
    }

    const { rows } = await query(
      `SELECT *
       FROM expenses
       WHERE username = $1
       ORDER BY expense_date DESC, id DESC`,
      [username]
    );

    return res.json({ expenses: rows });
  } catch (err) {
    console.error("expenses list error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// DELETE /api/expenses/:id (employee: own)
// Deletes only if the expense belongs to the logged-in user.
router.delete("/expenses/:id", requireAuth, async (req, res) => {
  try {
    const username = getUsernameFromToken(req);
    if (!username) {
      return res.status(401).json({ error: "Unauthorized (missing username in token)" });
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid expense id" });
    }

    const { rows } = await query(
      `DELETE FROM expenses
       WHERE id = $1 AND username = $2
       RETURNING id`,
      [id, username]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Expense not found" });
    }

    return res.json({ ok: true, deleted_id: rows[0].id });
  } catch (err) {
    console.error("expenses delete error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

// GET /api/expenses/all (manager)
router.get("/expenses/all", requireAuth, requireManager, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*, u.id AS user_id
       FROM expenses e
       LEFT JOIN users u ON u.username = e.username
       ORDER BY e.expense_date DESC, e.id DESC`
    );

    return res.json({ expenses: rows });
  } catch (err) {
    console.error("expenses all error:", err);
    return res.status(500).json({ error: "Server error", details: String(err.message || err) });
  }
});

module.exports = router;
