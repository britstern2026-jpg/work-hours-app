const express = require("express");
const { DateTime } = require("luxon");
const { db, admin } = require("../firebase");
const { requireAuth, requireManager } = require("../auth");

const router = express.Router();

const APP_ZONE = "Asia/Jerusalem"; // business rule timezone

function isValidDateISO(dateStr) {
  // expects YYYY-MM-DD
  const dt = DateTime.fromISO(dateStr, { zone: APP_ZONE });
  return dt.isValid && dt.toFormat("yyyy-MM-dd") === dateStr;
}

function isValidTimeHHmm(t) {
  // expects HH:mm (24h)
  if (typeof t !== "string") return false;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
  return !!m;
}

function timeToMinutes(t) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function todayStart() {
  return DateTime.now().setZone(APP_ZONE).startOf("day");
}

function dateStart(dateStr) {
  return DateTime.fromISO(dateStr, { zone: APP_ZONE }).startOf("day");
}

function monthRange(monthStr) {
  // monthStr: YYYY-MM
  const m = DateTime.fromFormat(monthStr, "yyyy-MM", { zone: APP_ZONE });
  if (!m.isValid) return null;
  const start = m.startOf("month");
  const end = m.endOf("month");
  return { start, end };
}

function docId(uid, dateStr) {
  return `${uid}_${dateStr}`;
}

// POST /api/work-hours  (employee: own hours; no future dates)
router.post("/work-hours", requireAuth, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body || {};

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: "date, startTime, endTime are required" });
    }
    if (!isValidDateISO(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }
    if (!isValidTimeHHmm(startTime) || !isValidTimeHHmm(endTime)) {
      return res.status(400).json({ error: "startTime/endTime must be HH:mm" });
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      return res.status(400).json({ error: "endTime must be after startTime" });
    }

    // Employee rule: cannot set future work hours (today OK)
    const d = dateStart(date);
    if (d > todayStart()) {
      return res.status(403).json({ error: "Employees cannot edit future work hours" });
    }

    const uid = req.user.uid;
    const ref = db().collection("workHours").doc(docId(uid, date));

    const now = admin.firestore.FieldValue.serverTimestamp();
    const durationMinutes = endMin - startMin;

    await ref.set(
      {
        uid,
        date,
        startTime,
        endTime,
        durationMinutes,
        updatedAt: now
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("work-hours employee upsert error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/work-hours/manager  (manager: any user/date; future allowed)
router.post("/work-hours/manager", requireAuth, requireManager, async (req, res) => {
  try {
    const { userId, date, startTime, endTime } = req.body || {};

    if (!userId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: "userId, date, startTime, endTime are required" });
    }
    if (!isValidDateISO(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }
    if (!isValidTimeHHmm(startTime) || !isValidTimeHHmm(endTime)) {
      return res.status(400).json({ error: "startTime/endTime must be HH:mm" });
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      return res.status(400).json({ error: "endTime must be after startTime" });
    }

    const ref = db().collection("workHours").doc(docId(userId, date));
    const now = admin.firestore.FieldValue.serverTimestamp();
    const durationMinutes = endMin - startMin;

    await ref.set(
      {
        uid: userId,
        date,
        startTime,
        endTime,
        durationMinutes,
        updatedAt: now,
        updatedBy: req.user.uid
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("work-hours manager upsert error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/work-hours?month=YYYY-MM[&userId=...]
router.get("/work-hours", requireAuth, async (req, res) => {
  try {
    const month = String(req.query.month || "");
    const userId = req.query.userId ? String(req.query.userId) : null;

    const range = monthRange(month);
    if (!range) {
      return res.status(400).json({ error: "month is required and must be YYYY-MM" });
    }

    const { start, end } = range;
    const startStr = start.toFormat("yyyy-MM-dd");
    const endStr = end.toFormat("yyyy-MM-dd");

    let uidToFetch = req.user.uid;

    // manager can fetch any userId if provided
    if (userId) {
      if (req.user.role !== "manager") {
        return res.status(403).json({ error: "Only managers can query other users" });
      }
      uidToFetch = userId;
    }

    const snap = await db()
      .collection("workHours")
      .where("uid", "==", uidToFetch)
      .where("date", ">=", startStr)
      .where("date", "<=", endStr)
      .orderBy("date", "asc")
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ uid: uidToFetch, month, items });
  } catch (err) {
    console.error("work-hours get error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
