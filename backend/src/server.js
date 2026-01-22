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

// Load routes
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "work-hours-backend" });
});

app.use("/api", authRoutes);
app.use("/api", usersRoutes);

const port = Number(process.env.PORT || 8080);

try {
  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server listening on port ${port}`);
  });
} catch (err) {
  console.error("🔥 listen() failed:", err);
  process.exit(1);
}
