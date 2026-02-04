// backend/src/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const welcomeRoutes = require("./routes/welcome");
const usersRoutes = require("./routes/users");
const workHoursRoutes = require("./routes/workHours");

// If you have these wired to Postgres already, you can uncomment:
// const vacationsRoutes = require("./routes/vacations");
// const expensesRoutes = require("./routes/expenses");
// const exportRoutes = require("./routes/export");

const app = express();

console.log("✅ server.js starting...");
console.log("PORT =", process.env.PORT || 8080);
console.log("NODE_ENV =", process.env.NODE_ENV);

// --- Middleware: request timing logs ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// --- CORS (explicit) ---
const allowedOrigins = [
  "https://britstern2026-jpg.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

const corsOptions = {
  origin: function (origin, cb) {
    // allow curl/postman/server-to-server (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ Preflight handler — use regex, NOT "*" (fixes your Render crash)
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// --- Health endpoints (no DB touch) ---
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "work-hours-backend" });
});

app.get("/", (req, res) => {
  res.status(200).json({ ok: true, hint: "Use /api/* endpoints" });
});

// ✅ IMPORTANT: mount all routers under /api
app.use("/api", welcomeRoutes);
app.use("/api", usersRoutes);
app.use("/api", workHoursRoutes);
// app.use("/api", vacationsRoutes);
// app.use("/api", expensesRoutes);
// app.use("/api", exportRoutes);

// 404 JSON
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error", details: String(err.message || err) });
});

const port = Number(process.env.PORT || 8080);
// You can also bind explicitly, but not required:
// app.listen(port, "0.0.0.0", () => ...)
app.listen(port, () => console.log(`✅ Server listening on port ${port}`));
