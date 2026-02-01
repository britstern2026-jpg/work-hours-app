// backend/src/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const welcomeRoutes = require("./routes/welcome");
const usersRoutes = require("./routes/users");
const workHoursRoutes = require("./routes/workHours");

// (keep your other route files once you convert them to Postgres too)
// const vacationsRoutes = require("./routes/vacations");
// const expensesRoutes = require("./routes/expenses");
// const exportRoutes = require("./routes/export");

const app = express();

console.log("✅ server.js starting...");
console.log("PORT =", process.env.PORT || 8080);
console.log("NODE_ENV =", process.env.NODE_ENV);

app.use(cors());
app.use(express.json());

// ✅ IMPORTANT: mount all routers under /api
app.use("/api", welcomeRoutes);
app.use("/api", usersRoutes);
app.use("/api", workHoursRoutes);
// app.use("/api", vacationsRoutes);
// app.use("/api", expensesRoutes);
// app.use("/api", exportRoutes);

// 404 JSON (so curl shows a clear message)
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// basic error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`✅ Server listening on port ${port}`));
