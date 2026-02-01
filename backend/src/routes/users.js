// backend/src/routes/users.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome-wrapper");

const router = express.Router();

// GET /api/users (manager)
router.get("/users", requireAuth, requireManager, async (req, res) => {
  try {
    const r = await query(
      `SELECT id, username, password, role, created_at
       FROM users
       ORDER BY id DESC`,
      []
    );
    return res.json({ users: r.rows });
  } catch (err) {
    console.error("users list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users (manager)
router.post("/users", requireAuth, requireManager, async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ error: "username, password, role are required" });
    }
    if (!["manager", "employee"].includes(role)) {
      return res.status(400).json({ error: "role must be manager or employee" });
    }

    const exists = await query(`SELECT 1 FROM users WHERE username = $1 LIMIT 1`, [username]);
    if (exists.rowCount > 0) return res.status(409).json({ error: "Username already exists" });

    const ins = await query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [username, password, role]
    );

    return res.json({ ok: true, uid: ins.rows[0].id });
  } catch (err) {
    console.error("users create error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
