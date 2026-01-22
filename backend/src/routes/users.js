const express = require("express");
const { db, admin } = require("../firebase");
const { requireAuth, requireManager } = require("../auth");

const router = express.Router();

// POST /api/bootstrap
router.post("/bootstrap", async (req, res) => {
  try {
    const token = req.headers["x-bootstrap-token"];
    if (!token || token !== process.env.BOOTSTRAP_TOKEN) {
      return res.status(403).json({ error: "Invalid bootstrap token" });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const managersSnap = await db()
      .collection("users")
      .where("role", "==", "manager")
      .limit(1)
      .get();

    if (!managersSnap.empty) {
      return res.status(409).json({ error: "A manager already exists. Bootstrap disabled." });
    }

    const existing = await db().collection("users").where("username", "==", username).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    const ref = await db().collection("users").add({
      username,
      password, // plaintext
      role: "manager",
      createdAt: now
    });

    return res.json({ ok: true, uid: ref.id });
  } catch (err) {
    console.error("bootstrap error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users (manager only)
router.post("/users", requireAuth, requireManager, async (req, res) => {
  try {
    const { username, password, role } = req.body || {};

    if (!username || !password || !role) {
      return res.status(400).json({ error: "username, password, role are required" });
    }
    if (!["employee", "manager"].includes(role)) {
      return res.status(400).json({ error: "role must be employee or manager" });
    }

    const existing = await db().collection("users").where("username", "==", username).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    const ref = await db().collection("users").add({
      username,
      password, // plaintext
      role,
      createdAt: now
    });

    return res.json({ ok: true, uid: ref.id });
  } catch (err) {
    console.error("create user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users (manager only) - includes passwords
router.get("/users", requireAuth, requireManager, async (req, res) => {
  try {
    const snap = await db().collection("users").orderBy("createdAt", "desc").get();
    const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    return res.json({ users });
  } catch (err) {
    console.error("list users error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/me
router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
