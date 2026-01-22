require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "work-hours-backend" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
