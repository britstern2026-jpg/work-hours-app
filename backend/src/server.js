/**
 * backend/src/server.js
 *
 * Requires:
 *   npm i express cors pg
 *
 * Env:
 *   DATABASE_URL=postgresql://...
 *   NODE_ENV=production
 *   PORT=10000 (Render sets this automatically)
 */

require("dotenv").config();

console.log("✅ server.js starting...");
console.log("PORT =", process.env.PORT);
console.log("NODE_ENV =", process.env.NODE_ENV);

process.on("uncaughtException", (err) => {
  console.error("🔥 uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("🔥 unhandledRejection:", reason);
  process.exit(1);
});

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const workHoursRoutes = require("./routes/workHours");
const vacationsRoutes = require("./routes/vacations");
const expensesRoutes = require("./routes/expenses");
const exportRoutes = require("./routes/export");

const app = express();

/**
 * CORS
 * - "origin: true" echoes back the requesting origin (fine for dev).
 * - If you want to lock it down later, replace with an allowlist array.
 */
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

/**
 * Postgres pool (Render Postgres expects SSL in most cases)
 */
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("🔥 Missing DATABASE_URL env var");
  process.exit(1);
}

const isProd = process.env.NODE_ENV === "production";

// Note: Render Postgres generally works with ssl: { rejectUnauthorized: false }
// If you later use a DB that has a proper CA chain, set rejectUnauthorized: true.
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Make the pool available to routes (two ways):
// 1) req.pg (recommended in route handlers)
// 2) app.locals.pg (if you prefer app.locals in routes)
app.locals.pg = pool;
app.use((req, _res, next) => {
  req.pg = pool;
  next();
});

/**
 * Health endpoint
 * - also checks DB connectivity (optional but very helpful)
 */
app.get("/health", async (_req, res) => {
  try {
    const r = await pool.query("select 1 as ok");
    res.json({ ok: true, service: "work-hours-backend", db: r.rows?.[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, service: "work-hours-backend", db: false, error: "db_unreachable" });
  }
});

app.use("/api", authRoutes);
app.use("/api", usersRoutes);
app.use("/api", workHoursRoutes);
app.use("/api", vacationsRoutes);
app.use("/api", expensesRoutes);
app.use("/api", exportRoutes);

const port = Number(process.env.PORT || 8080);

async function start() {
  // Quick DB check on startup so Render logs tell you immediately if DB is wrong
  try {
    await pool.query("select 1");
    console.log("✅ DB connected");
  } catch (err) {
    console.error("🔥 DB connection failed:", err?.message || err);
    // Don’t exit if you want the service to still answer /health (up to you).
    // For now, we exit to force a visible failure and avoid serving a broken API.
    process.exit(1);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server listening on port ${port}`);
  });
}

start();
