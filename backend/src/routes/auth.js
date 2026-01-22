const express = require("express");
const jwt = require("jsonwebtoken");
const { db } = require("../firebase");

const router = express.Router();

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const snap = await db()
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snap.empty) return res.status(401).json({ error: "Invalid credentials" });

    const doc = snap.docs[0];
    const user = doc.data();

    // Plaintext password check (as requested)
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server misconfigured: JWT_SECRET missing" });
    }

    const payload = { uid: doc.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, secret, { expiresIn: "7d" });

    return res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
