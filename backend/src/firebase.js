const admin = require("firebase-admin");

function initFirebase() {
  if (admin.apps.length) return;
  admin.initializeApp();
}

function db() {
  initFirebase();
  return admin.firestore();
}

module.exports = { admin, db };
