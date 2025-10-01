const KEY = "ff_users_v1";

/**
 * Cấu trúc mỗi user:
 * { email, name, phone, role: 'user'|'restaurant'|'admin', active: true }
 */

export function listUsers() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const obj = JSON.parse(raw) || {};
    return Object.values(obj);
  } catch {
    return [];
  }
}

function writeIndex(idx) {
  localStorage.setItem(KEY, JSON.stringify(idx));
}

function readIndex() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function upsertUser(u) {
  if (!u?.email) return;
  const idx = readIndex();
  const prev = idx[u.email] || {};
  idx[u.email] = { role: "user", active: true, ...prev, ...u };
  writeIndex(idx);
}

export function setRole(email, role) {
  if (!email) return;
  const idx = readIndex();
  const prev = idx[email] || { email, role: "user", active: true };
  idx[email] = { ...prev, role };
  writeIndex(idx);
}

export function setActive(email, active) {
  if (!email) return;
  const idx = readIndex();
  const prev = idx[email] || { email, role: "user", active: true };
  idx[email] = { ...prev, active };
  writeIndex(idx);
}
