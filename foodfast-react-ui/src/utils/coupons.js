export const coupons = {
  FF10:     { type: 'percent', value: 10,    min: 0,      label: '-10% hoá đơn' },
  SAVE50K:  { type: 'amount',  value: 50000, min: 300000, label: '-50.000đ (đơn ≥ 300.000đ)' },
  FREESHIP: { type: 'freeship', min: 150000, label: 'Miễn phí vận chuyển' }
};

export function normalizeCode(input = '') {
  return String(input).trim().toUpperCase();
}

// CHO PHÉP CHỮ & SỐ, không khoảng trắng/ký tự đặc biệt
export const CODE_PATTERN = /^[A-Z0-9]+$/;

export function calcDiscount(codeInput, subtotal) {
  const code = normalizeCode(codeInput);
  if (!code || !CODE_PATTERN.test(code)) return 0;

  const c = coupons[code];
  if (!c) return 0;
  if ((subtotal || 0) < (c.min || 0)) return 0;

  let off = 0;
  if (c.type === 'percent') {
    off = Math.round((subtotal * (c.value || 0)) / 100);
  } else if (c.type === 'amount') {
    off = c.value || 0;
  }
  return Math.max(0, Math.min(off, subtotal || 0));
}
