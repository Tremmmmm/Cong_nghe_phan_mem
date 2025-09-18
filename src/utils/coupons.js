export const coupons = {
  FF10:     { type: 'percent', value: 10,   min: 0,      label: '-10% hoá đơn' },
  SAVE50K:  { type: 'amount',  value: 50000, min: 300000, label: '-50.000đ (đơn ≥ 300.000đ)' },
  FREESHIP: { type: 'amount',  value: 15000, min: 150000, label: 'Giảm 15.000đ' },
}

export function calcDiscount(code, subtotal) {
  if (!code) return 0
  const c = coupons[code.toUpperCase()]
  if (!c) return 0
  if (subtotal < (c.min || 0)) return 0
  return c.type === 'percent' ? Math.round(subtotal * c.value / 100) : c.value
}
