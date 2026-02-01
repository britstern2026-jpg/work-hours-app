const express = require("express");
const { requireAuth, requireManager } = require("../welcome");

const router = express.Router();

// GET /api/export
router.get("/export", requireAuth, requireManager, async (req, res) => {
  res.json({ message: "Export will be implemented later ✅" });
});

module.exports = router;
