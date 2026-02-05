// backend/src/routes/users.js
const express = require("express");
const { query } = require("../db");
const { requireAuth, requireManager } = require("./welcome");

const router = express.Router();

function getUserId(req) {
  return req?.user?.id ?? req?.user?.uid ?? null;
}

// GET /api/users
router.get("/users", requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, password, role, created_at
       FROM users
       ORDER BY id ASC`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error("users list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users (manager only) — ✅ returns 409 on duplicate username
router.post("/users", requireAuth, requireManager, async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ error: "username, password, role are required" });
    }

    const uname = String(username).trim();

    const { rows } = await query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, password, role, created_at`,
      [uname, String(password), String(role)]
    );

    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    // Postgres unique violation
    if (err && err.code === "23505") {
      return res.status(409).json({ error: "Username already exists" });
    }

    console.error("users create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/users/by-username/:username (manager only)
router.delete("/users/by-username/:username", requireAuth, requireManager, async (req, res) => {
  try {
    const targetUsername = String(req.params.username || "").trim();
    if (!targetUsername) return res.status(400).json({ error: "Missing username" });

    // Safety
    if (targetUsername === "admin") {
      return res.status(400).json({ error: "Refusing to delete admin user" });
    }

    // Find target id
    const target = await query(
      `SELECT id, username FROM users WHERE username = $1 LIMIT 1`,
      [targetUsername]
    );
    if (!target.rows.length) return res.status(404).json({ error: "User not found" });

    const targetId = target.rows[0].id;
    const meId = getUserId(req);
    if (meId && targetId === meId) {
      return res.status(400).json({ error: "You cannot delete yourself" });
    }

    // Delete related rows first (unless you have ON DELETE CASCADE)
    await query(`DELETE FROM work_hours WHERE user_id = $1`, [targetId]);
    await query(`DELETE FROM vacations WHERE user_id = $1`, [targetId]);
    await query(`DELETE FROM expenses WHERE user_id = $1`, [targetId]);

    const del = await query(`DELETE FROM users WHERE id = $1 RETURNING id, username`, [targetId]);
    if (!del.rows.length) return res.status(404).json({ error: "User not found" });

    return res.json({ ok: true, deleted: del.rows[0] });
  } catch (err) {
    console.error("users delete by username error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
