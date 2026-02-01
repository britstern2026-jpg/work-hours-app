// backend/src/routes/welcome-wrapper.js
const { requireAuth, requireManager } = require("./welcome").router
  ? require("./welcome")
  : require("./welcome");

module.exports = { requireAuth, requireManager };
