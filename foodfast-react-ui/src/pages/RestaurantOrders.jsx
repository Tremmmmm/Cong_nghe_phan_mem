// src/pages/RestaurantOrders.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { formatVND } from "../utils/format";

const VND = (n) => formatVND(n);

// === Flow Drone ===
const STATUS = {
  NEW: "new",
  ACCEPTED: "accepted",
  READY: "ready",
  DELIVERING: "delivering",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const STATUS_LABEL = {
  [STATUS.NEW]: "Đơn mới",
  [STATUS.ACCEPTED]: "Đã xác nhận",
  [STATUS.READY]: "Đã sẵn sàng",
  [STATUS.DELIVERING]: "Đang giao (Drone)",
  [STATUS.COMPLETED]: "Hoàn thành",
  [STATUS.CANCELLED]: "Đã huỷ",
};

const NEXT_STATUS = {
  [STATUS.NEW]: [STATUS.ACCEPTED, STATUS.CANCELLED],
  [STATUS.ACCEPTED]: [STATUS.READY, STATUS.CANCELLED],
  [STATUS.READY]: [STATUS.DELIVERING, STATUS.ACCEPTED], // cho phép trả lại nếu cần
  [STATUS.DELIVERING]: [STATUS.COMPLETED],
  [STATUS.COMPLETED]: [],
  [STATUS.CANCELLED]: [],
};

const BADGE_COLOR = {
  [STATUS.NEW]: "#ff9800",
  [STATUS.ACCEPTED]: "#03a9f4",
  [STATUS.READY]: "#8bc34a",
  [STATUS.DELIVERING]: "#673ab7",
  [STATUS.COMPLETED]: "#009688",
  [STATUS.CANCELLED]: "#9e9e9e",
};

function Badge({ status }) {
  const c = BADGE_COLOR[status] || "#999";
  return (
    <span
      className="badge"
      style={{ color: c, borderColor: c, background: "#fff" }}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function OrderCard({ order, onMove, onCancel }) {
  const s = order.status || STATUS.NEW;
  const actions = [];

  if (s === STATUS.NEW) {
    actions.push(
      <button key="accept" className="ff-btn" onClick={() => onMove(order, STATUS.ACCEPTED)}>Xác nhận</button>,
      <button key="cancel" className="ff-btn ff-btn--ghost" onClick={() => onCancel(order)}>Huỷ đơn</button>,
    );
  }
  if (s === STATUS.ACCEPTED) {
    actions.push(
      <button key="ready" className="ff-btn" onClick={() => onMove(order, STATUS.READY)}>Hoàn tất (đã xong món)</button>,
      <button key="cancel" className="ff-btn ff-btn--ghost" onClick={() => onCancel(order)}>Huỷ đơn</button>,
    );
  }
  if (s === STATUS.READY) {
    actions.push(
      <button key="deliver" className="ff-btn" onClick={() => onMove(order, STATUS.DELIVERING)}>Giao bằng Drone</button>,
      <button key="back" className="ff-btn ff-btn--ghost" onClick={() => onMove(order, STATUS.ACCEPTED)} title="Trả về bước Đã xác nhận">Trả về</button>,
    );
  }
  if (s === STATUS.DELIVERING) {
    actions.push(
      <button key="done" className="ff-btn" onClick={() => onMove(order, STATUS.COMPLETED)}>Đánh dấu đã giao</button>,
    );
  }

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
        <div>
          <b>#{order.code || order.id}</b>{" "}
          <span className="muted">• {order.customerName || order.userEmail || "Khách"}</span>
        </div>
        <Badge status={s} />
      </div>

      <div className="k-meta">
        <div>Món: <b>{order.items?.length ?? 0}</b></div>
        <div>Tổng: <b>{VND(order.finalTotal ?? order.total ?? 0)}</b></div>
        <div className="muted">
          {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}
        </div>
      </div>

      <div className="act-row" style={{ marginTop: 10 }}>
        {actions.length ? actions : <button className="ff-btn ff-btn--disabled" disabled>Không có thao tác</button>}
      </div>
    </div>
  );
}

export default function RestaurantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [STATUS.NEW, STATUS.ACCEPTED, STATUS.READY, STATUS.DELIVERING, STATUS.COMPLETED, STATUS.CANCELLED];

  const css = `
    .od-wrap{max-width:1200px;margin:24px auto;padding:0 16px}
    .top{display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
    .title{font-size:24px;font-weight:800;margin:0}
    .board{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
    @media (max-width:1220px){ .board{grid-template-columns:repeat(3,1fr)} }
    @media (max-width:820px){ .board{grid-template-columns:1fr} }
    .col{background:#fff;border:1px solid #eee;border-radius:14px;padding:14px;min-height:140px;transition:border-color .2s, box-shadow .2s}
    .col.drag-over{border-color:#ffb199; box-shadow:0 0 0 3px #ffe8e0}
    .col-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
    .col-title{font-weight:800}
    .col-count{font-size:12px;background:#f6f6f6;border:1px solid #eee;border-radius:999px;padding:2px 8px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:14px;margin-bottom:12px;transition:box-shadow .2s,border-color .2s}
    .card:hover{box-shadow:0 6px 16px rgba(0,0,0,.06)}
    .row{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .muted{font-size:12px;color:#777}
    .act-row{display:flex; gap:8px; align-items:center; flex-wrap:wrap}
    .badge{background:#fff;border:1px solid #ddd;border-radius:999px;padding:4px 10px;font-weight:700;font-size:12px}
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
    const by = Object.fromEntries(columns.map((c) => [c, []]));
    for (const o of orders) (by[o.status || STATUS.NEW] || by[STATUS.NEW]).push(o);
    return by;
  }, [orders]);

  // parse "HH:mm:ss dd/MM/yyyy" hoặc ISO
function toTs(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();

  // nếu là số hoặc chuỗi số (timestamp ms)
  if (typeof v === "number") return v;
  const num = Number(v);
  if (!Number.isNaN(num) && String(num).length >= 10) return num;

  const s = String(v).trim();

  // ISO / Date.parse chuẩn
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;

  // 1) dd/MM/yyyy [HH:mm[:ss]]
  let m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const [, dd, MM, yyyy, hh = "0", mm = "0", ss = "0"] = m;
    return new Date(+yyyy, +MM - 1, +dd, +hh, +mm, +ss).getTime();
  }

  // 2) HH:mm[:ss] dd/MM/yyyy
  m = s.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?[ ,]+(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );
  if (m) {
    const [, hh, mm, ss = "0", dd, MM, yyyy] = m;
    return new Date(+yyyy, +MM - 1, +dd, +hh, +mm, +ss).getTime();
  }

  return 0;
}

  async function fetchOrders() {
  setLoading(true);
  try {
    const { data } = await api.get("/orders", { params: { _: Date.now() } });
    const list = (Array.isArray(data) ? data : []).slice().sort(
      (a, b) => toTs(b.createdAt) - toTs(a.createdAt)
    );
    setOrders(list);
  } finally {
    setLoading(false);
  }
}

  async function moveStatus(order, target) {
    const allow = NEXT_STATUS[order.status || STATUS.NEW] || [];
    if (!allow.includes(target)) {
      alert("Không thể chuyển trạng thái này.");
      return;
    }
    const prev = order.status || STATUS.NEW;
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: target } : o)));

    const nowIso = new Date().toISOString();
    const patch = { status: target, deliveryMode: "DRONE", updatedAt: nowIso };
    if (target === STATUS.ACCEPTED) patch.acceptedAt = nowIso;
    if (target === STATUS.READY) patch.readyAt = nowIso;
    if (target === STATUS.DELIVERING) patch.pickedAt = nowIso;
    if (target === STATUS.COMPLETED) patch.deliveredAt = nowIso;

    try {
      await api.patch(`/orders/${order.id}`, patch);
    } catch (e) {
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: prev } : o)));
      console.error(e);
      alert("Cập nhật trạng thái thất bại. Đã hoàn tác.");
    }
  }

  async function cancelOrder(order) {
    if (!window.confirm("Huỷ đơn này?")) return;
    const prev = order.status || STATUS.NEW;
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: STATUS.CANCELLED } : o)));
    try {
      const now = new Date().toISOString();
      await api.patch(`/orders/${order.id}`, {
        status: STATUS.CANCELLED,
        cancelReason: "merchant_cancelled",
        cancelledAt: now,
        updatedAt: now,
      });
    } catch (e) {
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: prev } : o)));
      console.error(e);
      alert("Huỷ đơn thất bại. Đã hoàn tác.");
    }
  }

  useEffect(() => { fetchOrders(); }, []);

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

  function onDragEnter(e) { e.currentTarget.classList.add("drag-over"); }
  function onDragLeave(e) { e.currentTarget.classList.remove("drag-over"); }
  function onDropCol(e, targetStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const dragged = orders.find((o) => String(o.id) === id);
    if (!dragged) return;
    const allow = NEXT_STATUS[dragged.status || STATUS.NEW] || [];
    if (!allow.includes(targetStatus)) return;
    moveStatus(dragged, targetStatus);
  }

  return (
    <div className="od-wrap">
      <style>{css}</style>

      <div className="top">
        <h2 className="title">Quản lý đơn hàng</h2>
        <button className="ff-btn" onClick={fetchOrders}>Làm mới</button>
      </div>

      {loading ? (
        <div>Đang tải…</div>
      ) : (
        <div className="board">
          {columns.map((col) => (
            <section
              key={col}
              className="col"
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDropCol(e, col)}
            >
              <div className="col-head">
                <div className="col-title">{STATUS_LABEL[col]}</div>
                <span className="col-count">{grouped[col]?.length || 0}</span>
              </div>

              {grouped[col]?.length
                ? grouped[col].map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      onMove={moveStatus}
                      onCancel={cancelOrder}
                    />
                  ))
                : <div className="muted">Không có đơn</div>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
