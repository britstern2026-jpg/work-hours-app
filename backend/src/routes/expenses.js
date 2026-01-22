const express = require("express");
const { DateTime } = require("luxon");
const { db, admin } = require("../firebase");
const { requireAuth } = require("../auth");

const router = express.Router();

const APP_ZONE = "Asia/Jerusalem";

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

// POST /api/expenses  (employee: own; date can be past/future - your choice; here: allow both)
router.post("/expenses", requireAuth, async (req, res) => {
  try {
    const { date, description, amount } = req.body || {};

    if (!date || !description || amount === undefined) {
      return res.status(400).json({ error: "date, description, amount are required" });
    }
    if (!isValidDateISO(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }
    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "description must be a non-empty string" });
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const uid = req.user.uid;
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Use auto ID for multiple expenses per day
    const ref = db().collection("expenses").doc();

    await ref.set({
      uid,
      date,
      description: description.trim(),
      amount: amt,
      createdAt: now,
      updatedAt: now
    });

    return res.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("expenses create error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/expenses?month=YYYY-MM[&userId=...]
router.get("/expenses", requireAuth, async (req, res) => {
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
      .collection("expenses")
      .where("uid", "==", uidToFetch)
      .where("date", ">=", startStr)
      .where("date", "<=", endStr)
      .orderBy("date", "asc")
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ uid: uidToFetch, month, items });
  } catch (err) {
    console.error("expenses get error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;