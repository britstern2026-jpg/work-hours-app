// backend/src/db.js
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is missing. API will fail until it is set.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Most hosted Postgres providers require SSL. If yours doesn't, set PGSSLMODE=disable.
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DB_LOG === "1") {
    console.log("🗄️ query", { duration, rows: res.rowCount, text });
  }
  return res;
}

module.exports = { pool, query };
