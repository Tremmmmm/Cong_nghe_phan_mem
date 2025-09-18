import { useEffect, useMemo, useState } from "react";
import { useOrders } from "../context/OrderContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

// Trạng thái đồng bộ với OrderContext (đơn mới tạo = "pending")
const STATUSES = ["pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"];
const VND = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";

export default function AdminOrders() {
  const { orders, updateStatus } = useOrders();
  const toast = useToast();

  const [filter, setFilter] = useState("all");
  const [auto, setAuto] = useState(true);
  const [q, setQ] = useState("");

  // (Optional) Auto refresh: hữu ích nếu mở ở *tab khác* và muốn lấy thay đổi từ localStorage
  // Trong cùng 1 tab, OrderContext cập nhật *ngay lập tức* khi tạo đơn.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      // chạm nhẹ để React re-render (dựa trên orders hiện có trong context)
      // (Nếu muốn đồng bộ đa tab tốt hơn, có thể thêm listener 'storage' ở OrderProvider)
    }, 10000);
    return () => clearInterval(t);
  }, [auto]);

  // Lọc theo trạng thái + từ khoá
  const list = orders.filter((o) => {
    const byStatus = filter === "all" ? true : (o.status || "pending") === filter;
    const text = q.trim().toLowerCase();
    const byQuery =
      !text ||
      o.id.toLowerCase().includes(text) ||
      (o.name || o.customerName || "").toLowerCase().includes(text) ||
      (o.address || "").toLowerCase().includes(text) ||
      (o.phone || "").toLowerCase().includes(text);
    return byStatus && byQuery;
  });

  // Tổng quan
  const summary = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let revenue = 0, todayCount = 0;
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));

    for (const o of orders) {
      const total = o.finalTotal ?? o.total ?? 0;
      revenue += total;

      const s = (o.status || "pending");
      if (byStatus[s] != null) byStatus[s]++;

      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (d && d >= today) todayCount++;
    }
    return { revenue, todayCount, byStatus, total: orders.length };
  }, [orders]);

  const exportCSV = () => {
    const headers = [
      "id","createdAt","customerName","phone","address","status","total","discount","finalTotal","couponCode","items"
    ];
    const rows = list.map((o) => {
      const itemsText = (o.items || [])
        .map((i) => `${i.name} x${i.qty}`)
        .join("; ");
      return [
        o.id,
        o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "",
        o.name || o.customerName || "",
        o.phone || "",
        o.address || "",
        o.status || "pending",
        o.total || 0,
        o.discount || 0,
        o.finalTotal ?? o.total ?? 0,
        o.couponCode || "",
        itemsText,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replaceAll(`"`, `""`)}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orders_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const styles = useMemo(
    () => `
    .ff-container{max-width:1200px;margin:24px auto;padding:0 16px}
    .controls{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .select,.input{border:1px solid #e6e6ea;border-radius:10px;padding:8px 10px;background:#fff}
    .orders{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}
    .order-card{background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden}
    .order-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px;border-bottom:1px solid #eee}
    .order-items{padding:8px 12px;border-bottom:1px dashed #eee}
    .order-item-row{display:flex;gap:8px;align-items:center}
    .order-foot{padding:12px}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid #ffc2ae;background:#ffe5d8;color:#c24a26;font-weight:700;text-transform:capitalize}
    .sum{font-weight:700}
    .dark .select,.dark .input{background:#111;border-color:#444;color:#eee}
    .dark .order-card{background:#151515;border-color:#333}
    .dark .order-head{border-bottom-color:#333}
    .dark .order-items{border-bottom-color:#333}
    `,
    []
  );

  useEffect(() => {
    const id = "admin-orders-inline-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  return (
    <section className="ff-container" style={{ padding: "24px 0" }}>
      <div className="controls">
        <h2 style={{ margin: 0 }}>Quản trị đơn hàng</h2>
        <div className="row">
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto refresh
          </label>

          <div className="row" style={{ gap: 6 }}>
            <label>Lọc:</label>
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <input
            className="input"
            placeholder="Tìm theo mã/khách/địa chỉ/sđt…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <button className="ff-btn" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {/* Tổng quan */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 14 }}>
        <div className="order-card"><div style={{padding:12}}><b>Doanh thu</b><div className="sum" style={{fontSize:20}}>{VND(summary.revenue)}</div></div></div>
        <div className="order-card"><div style={{padding:12}}><b>Đơn hôm nay</b><div className="sum" style={{fontSize:20}}>{summary.todayCount}</div></div></div>
        <div className="order-card"><div style={{padding:12}}><b>Tổng đơn</b><div className="sum" style={{fontSize:20}}>{summary.total}</div></div></div>
        {STATUSES.map((s) => (
          <div key={s} className="order-card">
            <div style={{ padding: 12 }}>
              <div><span className="badge">{s}</span></div>
              <div className="sum" style={{ fontSize: 20 }}>{summary.byStatus[s] ?? 0}</div>
            </div>
          </div>
        ))}
      </div>

      {!list.length ? (
        "Không có đơn."
      ) : (
        <div className="orders">
          {list.map((o) => (
            <article key={o.id} className="order-card">
              <header className="order-head">
                <div>
                  <strong>Đơn #{o.id}</strong>
                  <div style={{ opacity: 0.7 }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={o.status || "pending"}
                    onChange={(e) => {
                      updateStatus(o.id, e.target.value);
                      toast.show(`Cập nhật ${o.id} → ${e.target.value}`, "info");
                    }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div className="sum">{VND(o.finalTotal ?? o.total)}</div>
                </div>
              </header>

              <div className="order-items">
                {o.items?.map((it, idx) => (
                  <div key={`${o.id}-${idx}`} className="order-item-row">
                    <div className="flex-1">{it.name}</div>
                    <div>x{it.qty}</div>
                    <div className="sum">{VND((it.price || 0) * (it.qty || 0))}</div>
                  </div>
                ))}
              </div>

              <footer className="order-foot">
                <div>
                  <div><strong>{o.name || o.customerName || "Khách lẻ"}</strong></div>
                  <div style={{ opacity: 0.8 }}>{o.phone} — {o.address}</div>
                  {o.couponCode && (
                    <div style={{ opacity: 0.8 }}>
                      Mã: {o.couponCode} — Giảm: -{VND(o.discount || 0)}
                    </div>
                  )}
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
