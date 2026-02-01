// backend/src/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { router: welcomeRouter } = require("./routes/welcome");
const usersRoutes = require("./routes/users");
const workHoursRoutes = require("./routes/workHours");
// (You can plug vacations/expenses/export next once you want)

const app = express();

app.use(cors());
app.use(express.json());

console.log("✅ server.js starting...");
console.log("PORT =", process.env.PORT);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api", welcomeRouter);
app.use("/api", usersRoutes);
app.use("/api", workHoursRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`✅ Server listening on port ${port}`));
