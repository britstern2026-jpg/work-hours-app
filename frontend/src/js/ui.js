export const qs = (id) => document.getElementById(id);
export function setText(id, text) { qs(id).textContent = text; }
export function setHidden(id, hidden) { qs(id).classList.toggle("hidden", hidden); }
