// backend/src/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const welcomeRoutes = require("./routes/welcome");
const usersRoutes = require("./routes/users");
const workHoursRoutes = require("./routes/workHours");
const vacationsRoutes = require("./routes/vacations");
const expensesRoutes = require("./routes/expenses");
const exportRoutes = require("./routes/export");

const app = express();

console.log("✅ server.js starting...");
console.log("PORT =", process.env.PORT || 8080);
console.log("NODE_ENV =", process.env.NODE_ENV);

// Request timing logs
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// CORS
const allowedOrigins = [
  "https://britstern2026-jpg.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

const corsOptions = {
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// IMPORTANT: regex, not "*"
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// health
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "work-hours-backend" });
});

app.get("/", (req, res) => {
  res.status(200).json({ ok: true, hint: "Use /api/* endpoints" });
});

// ✅ Mount all /api routes
app.use("/api", welcomeRoutes);
app.use("/api", usersRoutes);
app.use("/api", workHoursRoutes);
app.use("/api", vacationsRoutes);
app.use("/api", expensesRoutes);
app.use("/api", exportRoutes);

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
app.listen(port, () => console.log(`✅ Server listening on port ${port}`));
