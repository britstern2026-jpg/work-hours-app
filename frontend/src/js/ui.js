// frontend/src/js/ui.js

export function showMessage(message, type = "info") {
  const el = document.getElementById("message");
  if (!el) return;

  el.textContent = message || "";
  el.style.display = message ? "block" : "none";

  el.classList.remove("msg-info", "msg-error", "msg-success", "msg-warn");
  if (type === "error") el.classList.add("msg-error");
  else if (type === "success") el.classList.add("msg-success");
  else if (type === "warn") el.classList.add("msg-warn");
  else el.classList.add("msg-info");
}

export function formatDate(d) {
  // Accept ISO date or Date
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (!(dt instanceof Date) || isNaN(dt.getTime())) return String(d);
    return dt.toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}
