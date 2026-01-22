const express = require("express");
const { DateTime } = require("luxon");
const { db, admin } = require("../firebase");
const { requireAuth, requireManager } = require("../auth");

const router = express.Router();

const APP_ZONE = "Asia/Jerusalem";

const ALLOWED_TYPES = new Set(["vacation", "sick", "child_sick", "reserve"]);

function isValidDateISO(dateStr) {
  const dt = DateTime.fromISO(dateStr, { zone: APP_ZONE });
  return dt.isValid && dt.toFormat("yyyy-MM-dd") === dateStr;
}

function monthRange(monthStr) {
  const m = DateTime.fromFormat(monthStr, "yyyy-MM", { zone: APP_ZONE });
  if (!m.isValid) return null;
  const start = m.startOf("month");
  const end = m.endOf("month");
  return { start, end };
}

function docId(uid, dateStr) {
  return `${uid}_${dateStr}`;
}

// POST /api/vacations  (employee: own; past+future allowed)
router.post("/vacations", requireAuth, async (req, res) => {
  try {
    const { date, type } = req.body || {};
    if (!date || !type) {
      return res.status(400).json({ error: "date and type are required" });
    }
    if (!isValidDateISO(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: "invalid type" });
    }

    const uid = req.user.uid;
    const ref = db().collection("vacations").doc(docId(uid, date));
    const now = admin.firestore.FieldValue.serverTimestamp();

    await ref.set(
      {
        uid,
        date,
        type,
        updatedAt: now
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations employee upsert error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/vacations?date=YYYY-MM-DD (employee: own)
router.delete("/vacations", requireAuth, async (req, res) => {
  try {
    const date = String(req.query.date || "");
    if (!date || !isValidDateISO(date)) {
      return res.status(400).json({ error: "date is required and must be YYYY-MM-DD" });
    }

    const uid = req.user.uid;
    await db().collection("vacations").doc(docId(uid, date)).delete();

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations employee delete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/vacations/manager (manager: any user/date)
router.post("/vacations/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { userId, date, type } = req.body || {};
    if (!userId || !date || !type) {
      return res.status(400).json({ error: "userId, date and type are required" });
    }
    if (!isValidDateISO(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: "invalid type" });
    }

    const ref = db().collection("vacations").doc(docId(userId, date));
    const now = admin.firestore.FieldValue.serverTimestamp();

    await ref.set(
      {
        uid: userId,
        date,
        type,
        updatedAt: now,
        updatedBy: req.user.uid
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations manager upsert error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/vacations/manager?userId=...&date=... (manager)
router.delete("/vacations/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const userId = String(req.query.userId || "");
    const date = String(req.query.date || "");

    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (!date || !isValidDateISO(date)) {
      return res.status(400).json({ error: "date is required and must be YYYY-MM-DD" });
    }

    await db().collection("vacations").doc(docId(userId, date)).delete();
    return res.json({ ok: true });
  } catch (err) {
    console.error("vacations manager delete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/vacations?month=YYYY-MM[&userId=...]
router.get("/vacations", requireAuth, async (req, res) => {
  try {
    const month = String(req.query.month || "");
    const userId = req.query.userId ? String(req.query.userId) : null;

    const range = monthRange(month);
    if (!range) {
      return res.status(400).json({ error: "month is required and must be YYYY-MM" });
    }

    let uidToFetch = req.user.uid;
    if (userId) {
      if (req.user.role !== "manager") {
        return res.status(403).json({ error: "Only managers can query other users" });
      }
      uidToFetch = userId;
    }

    const { start, end } = range;
    const startStr = start.toFormat("yyyy-MM-dd");
    const endStr = end.toFormat("yyyy-MM-dd");

    const snap = await db()
      .collection("vacations")
      .where("uid", "==", uidToFetch)
      .where("date", ">=", startStr)
      .where("date", "<=", endStr)
      .orderBy("date", "asc")
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ uid: uidToFetch, month, items });
  } catch (err) {
    console.error("vacations get error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
