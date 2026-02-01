// backend/src/routes/welcome.js
const express = require("express");
const jwt = require("jsonwebtoken");
const { query } = require("../db");

const router = express.Router();

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Missing Authorization Bearer token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { uid, username, role, iat, exp }
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ error: "Manager role required" });
  }
  return next();
}

// POST /api/welcome  (login)
router.post("/welcome", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const result = await query(
      `SELECT id, username, password, role
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];

    // NOTE: plaintext password (matches your current DB)
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { uid: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error("welcome error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/me
router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;

// Export middlewares so other routes can reuse them
module.exports.requireAuth = requireAuth;
module.exports.requireManager = requireManager;
