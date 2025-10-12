import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { formatVND } from "../utils/format";

const STATUS_FLOW = ["pending", "preparing", "done"];
const VND = (n) => formatVND(n);

function OrderCard({ order, onMove }) {
  const idx = STATUS_FLOW.indexOf(order.status);
  const nextStatus =
    idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;

  return (
    <div
      className="card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(order.id));
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="row" style={{ marginBottom: 6 }}>
        <div><b>#{order.code || order.id}</b></div>
        <span className={`badge ${order.status}`}>{order.status || "pending"}</span>
      </div>

      <div className="k-meta">
        <div>Items: <b>{order.items?.length ?? 0}</b></div>
        <div>Total: <b>{VND(order.total ?? 0)}</b></div>
        <div className="muted">
          {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}
        </div>
      </div>

      <div className="act-row" style={{ marginTop: 10 }}>
        {nextStatus ? (
          <button className="ff-btn ff-btn--ghost" onClick={() => onMove(order, nextStatus)}>
            Move to <b style={{ textTransform: "capitalize" }}>{nextStatus}</b>
          </button>
        ) : (
          <button className="ff-btn ff-btn--disabled" disabled>Completed</button>
        )}
      </div>
    </div>
  );
}

export default function RestaurantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const css = `
    .od-wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .top{display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
    .title{font-size:24px;font-weight:800;margin:0}
    .board{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    @media (max-width:960px){ .board{grid-template-columns:1fr} }
    .col{background:#fff;border:1px solid #eee;border-radius:14px;padding:14px;min-height:140px;transition:border-color .2s, box-shadow .2s}
    .col.drag-over{border-color:#ffb199; box-shadow:0 0 0 3px #ffe8e0}
    .col-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
    .col-title{font-weight:800;text-transform:capitalize}
    .col-count{font-size:12px;background:#f6f6f6;border:1px solid #eee;border-radius:999px;padding:2px 8px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:14px;margin-bottom:12px;transition:box-shadow .2s,border-color .2s}
    .card:hover{box-shadow:0 6px 16px rgba(0,0,0,.06)}
    .row{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .muted{font-size:12px;color:#777}
    .act-row{display:flex; gap:8px; align-items:center; flex-wrap:wrap}
    .badge{background:#ffe5d8;color:#c24a26;border:1px solid #ffb199;border-radius:999px;padding:4px 10px;font-weight:700;text-transform:capitalize;font-size:12px}
    .badge.pending{background:#fff3e2;color:#c24a26;border-color:#ffc9a6}
    .badge.preparing{background:#e7efff;color:#2456c2;border-color:#b9cffd}
    .badge.done{background:#eaf7ea;color:#2a7e2a;border-color:#cce9cc}
    .ff-btn{height:32px;border:none;border-radius:16px;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .ff-btn--ghost{background:#fff;color:#c24a26;border:1px solid #ffb199}
    .ff-btn--disabled{background:#f0f0f0;color:#999;cursor:not-allowed}
    .ff-btn:hover{filter:brightness(0.98)}
    .ff-btn:active{transform:translateY(1px)}
    .dark .col,.dark .card{background:#151515;border-color:#333}
    .dark .col-count{background:#1d1d1d;border-color:#333}
    .dark .muted{color:#aaa}
  `;

  const grouped = useMemo(() => {
    const by = { pending: [], preparing: [], done: [] };
    for (const o of orders) (by[o.status] || (by[o.status] = [])).push(o);
    return by;
  }, [orders]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const { data } = await api.get("/orders", {
        params: { _sort: "createdAt", _order: "desc", _: Date.now() },
      });
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function moveStatus(order, nextStatus) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o)));
    try {
      await api.patch(`/orders/${order.id}`, {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: order.status } : o)));
      console.error(e);
      alert("Cập nhật trạng thái thất bại. Đã hoàn tác.");
    }
  }

  useEffect(() => { fetchOrders(); }, []);

  // ✅ Revalidate khi cửa sổ/Tab lấy lại focus
  useEffect(() => {
    const onFocus = () => fetchOrders();
    const onVis = () => { if (document.visibilityState === "visible") fetchOrders(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // helpers để add/remove class drag-over cho cột
  function onDragEnter(e) {
    e.currentTarget.classList.add("drag-over");
  }
  function onDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
  }
  function onDropCol(e, targetStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const dragged = orders.find((o) => String(o.id) === id);
    if (dragged && dragged.status !== targetStatus) {
      moveStatus(dragged, targetStatus);
    }
  }

  return (
    <div className="od-wrap">
      <style>{css}</style>

      <div className="top">
        <h2 className="title">Kitchen / Restaurant</h2>
        <button className="ff-btn" onClick={fetchOrders}>Refresh</button>
      </div>

      {loading ? (
        <div>Đang tải…</div>
      ) : (
        <div className="board">
          {["pending", "preparing", "done"].map((col) => (
            <section
              key={col}
              className="col"
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDropCol(e, col)}
            >
              <div className="col-head">
                <div className="col-title">{col}</div>
                <span className="col-count">{grouped[col]?.length || 0}</span>
              </div>

              {grouped[col]?.length
                ? grouped[col].map((o) => (
                    <OrderCard key={o.id} order={o} onMove={moveStatus} />
                  ))
                : <div className="muted">No orders</div>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
