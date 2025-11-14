// src/utils/exportCsv.js
export function exportCsv(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  // Chuẩn hoá dữ liệu thân thiện khi mở bằng Excel
  const mapped = rows.map(o => ({
    id: o.id,
    status: o.status,
    createdAt: o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
    customerName: o.customerName || '',
    phone: o.phone || '',
    address: o.address || '',
    couponCode: o.couponCode || '',
    discount: o.discount ?? 0,
    total: o.total ?? 0,
    finalTotal: o.finalTotal ?? o.total ?? 0,
    items: (o.items || []).map(it => `${it.name} x${it.qty}`).join(' | ')
  }));

  const header = Object.keys(mapped[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    header.join(','),
    ...mapped.map(r => header.map(k => escape(r[k])).join(','))
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
