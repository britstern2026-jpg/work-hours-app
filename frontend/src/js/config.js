// frontend/src/js/config.js

function normalizeBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

// You can override this at runtime by adding in HTML:
// <script>window.__API_BASE="https://YOUR_BACKEND_URL";</script>
function detectApiBase() {
  if (typeof window !== "undefined" && window.__API_BASE) {
    return normalizeBase(window.__API_BASE);
  }

  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  // Local dev
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:8080";
  }

  // Production: set this to your Render backend URL
  // Example: https://work-hours-backend.onrender.com
  return "https://work-hours-backend-fx4l.onrender.com";
}

export const CONFIG = {
  API_BASE: detectApiBase(),
  // Bump this string whenever you want to confirm a new deploy visually
  APP_VERSION: "dev-2026-02-01-1",
};
