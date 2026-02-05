// backend/src/routes/expenses.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

/**
 * DB schema (your actual DB):
 *   expenses(username text NOT NULL, expense_date date, amount numeric, description text, created_at)
 *   FK: expenses.username -> users.username
 *
 * So we use username everywhere.
 * For safety, if someone sends user_id (legacy), we try to resolve id -> username.
 */

function getUsernameFromToken(req) {
  return req?.user?.username ?? null;
}

async function resolveUsernameFromBody(body) {
  const username = body?.username?.trim();
  if (username) return username;

  const user_id = body?.user_id ?? body?.uid ?? body?.id;
  if (user_id === undefined || user_id === null || user_id === "") return null;

  const n = Number(user_id);
  if (!Number.isFinite(n)) return null;

  const r = await query(`SELECT username FROM users WHERE id = $1 LIMIT 1`, [n]);
  return r.rows[0]?.username ?? null;
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
    if (!username) return res.status(401).json({ error: "Unauthorized (missing username in token)" });

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

// GET /api/expenses/all (manager)
// LEFT JOIN to still work if there are old bad rows (e.g., username NULL in legacy data)
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
