const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const parts = header.split(" ");
    const token = parts.length === 2 ? parts[1] : null;

    if (!token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server misconfigured: JWT_SECRET missing" });
    }

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

module.exports = { requireAuth, requireManager };
