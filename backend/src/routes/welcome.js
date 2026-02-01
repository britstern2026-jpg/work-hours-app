// backend/src/routes/welcome.js
const express = require("express");
const jwt = require("jsonwebtoken");
const { query } = require("../db");

const router = express.Router();

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "Server misconfigured: JWT_SECRET missing" });

    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireManager(req, res, next) {
  if (!req.user) return res.status(500).json({ error: "Auth middleware not applied" });
  if (req.user.role !== "manager") return res.status(403).json({ error: "Manager access required" });
  next();
}

// POST /api/welcome  (login)
router.post("/welcome", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });

    const r = await query(
      `SELECT id, username, password, role
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username]
    );

    if (r.rowCount === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = r.rows[0];
    if (user.password !== password) return res.status(401).json({ error: "Invalid credentials" });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "Server misconfigured: JWT_SECRET missing" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn: "7d" }
    );

    return res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error("welcome error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = { router, requireAuth, requireManager };
