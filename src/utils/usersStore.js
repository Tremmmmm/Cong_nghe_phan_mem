const KEY = "ff_users_v1";

/**
 * Cấu trúc mỗi user (Đã cập nhật để hỗ trợ Merchant ID và Role chuẩn):
 * { 
 * email, 
 * name, 
 * phone, 
 * role: 'Customer'|'Merchant'|'SuperAdmin', 
 * active: true,
 * merchantId: null | string // Dành cho vai trò Merchant
 * }
 */

export function listUsers() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const obj = JSON.parse(raw) || {};
    // Trả về mảng các user objects
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
  const prev = idx[u.email] || { 
      email: u.email, 
      role: "Customer", // 💡 Mặc định là Customer (User)
      active: true,
      merchantId: null, // 💡 Mặc định là null
      id: u.id || `u_${Date.now()}` // Đảm bảo có ID
  };
  
  // 💡 Ghi đè các thuộc tính mới, giữ nguyên các thuộc tính cũ (như id)
  idx[u.email] = { ...prev, ...u };
  
  writeIndex(idx);
}

/**
 * Cập nhật vai trò và Merchant ID (chỉ dành cho Admin Server)
 * @param {string} email
 * @param {string} role - 'Customer'|'Merchant'|'SuperAdmin'
 * @param {string|null} [merchantId] - Cần thiết nếu role là Merchant
 */
export function setRole(email, role, merchantId = null) {
  if (!email) return;
  const idx = readIndex();
  // Lấy user cũ hoặc tạo user base mặc định
  const prev = idx[email] || { 
      email, 
      role: "Customer", 
      active: true, 
      merchantId: null,
      id: `u_${Date.now()}`
  };
  
  // 💡 Cập nhật Role
  prev.role = role;

  // 💡 Cập nhật Merchant ID chỉ khi role là Merchant
  if (role === 'Merchant') {
      prev.merchantId = merchantId || prev.merchantId || null;
  } else {
      prev.merchantId = null; // Xóa Merchant ID nếu không phải Merchant
  }
  
  idx[email] = prev;
  writeIndex(idx);
}

export function setActive(email, active) {
  if (!email) return;
  const idx = readIndex();
  // Lấy user cũ (đảm bảo không ghi đè role/merchantId)
  const prev = idx[email] || { email, role: "Customer", active: true };
  idx[email] = { ...prev, active };
  writeIndex(idx);
}