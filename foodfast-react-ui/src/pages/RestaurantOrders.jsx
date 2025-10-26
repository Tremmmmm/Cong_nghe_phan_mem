// src/pages/RestaurantOrders.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { formatVND } from "../utils/format";
import OrderEditModal from "../components/OrderEditModal";
import CancelOrderModal from "../components/CancelOrderModal";
import { patchOrder } from "../utils/api";

const VND = (n) => formatVND(n);

// === Toạ độ mặc định của nhà hàng (đổi theo vị trí quán của bạn) ===
const RESTAURANT_COORDS = { lat: 10.776889, lng: 106.700806 }; // ví dụ: gần chợ Bến Thành

// ===== Config cho Drone Mission auto =====
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5181";
const toRad = (d) => (d * Math.PI) / 180;
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
const isNum = (x) => Number.isFinite(x);
const hasCoords = (o) =>
  isNum(o?.restaurantLocation?.lat) &&
  isNum(o?.restaurantLocation?.lng) &&
  isNum(o?.customerLocation?.lat)   &&
  isNum(o?.customerLocation?.lng);

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
  [STATUS.READY]: [STATUS.DELIVERING, STATUS.ACCEPTED],
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

function SmallTag({ children }) {
  return (
    <span
      style={{
        fontSize: 11, padding: "2px 6px", borderRadius: 999,
        border: "1px solid #ddd", background: "#fafafa", color: "#666", marginLeft: 8,
      }}
    >
      {children}
    </span>
  );
}

function Badge({ status }) {
  const c = BADGE_COLOR[status] || "#999";
  return (
    <span className="badge" style={{ color: c, borderColor: c, background: "#fff" }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function MoreMenu({ onEdit, onCancel, canEdit, disabledEdit }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button className="ff-btn ff-btn--ghost" onClick={() => setOpen((v) => !v)}>
        Xem thêm ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "110%", right: 0, minWidth: 160,
            background: "#fff", border: "1px solid #eee", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.08)", padding: 6, zIndex: 5,
          }}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            className="ff-menu-item"
            disabled={!canEdit || disabledEdit}
            title={disabledEdit ? "Đã chỉnh sửa 1 lần" : ""}
            onClick={() => { setOpen(false); onEdit(); }}
          >
            Sửa đơn
          </button>
          <button className="ff-menu-item" onClick={() => { setOpen(false); onCancel(); }}>
            Huỷ đơn
          </button>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onMove, onAskCancel, onEdit }) {
  const s = order.status || STATUS.NEW;
  const canEdit = s === STATUS.NEW || s === STATUS.ACCEPTED;
  const disabledEdit = !!order.modified;

  const actions = [];
  if (s === STATUS.NEW) {
    actions.push(
      <button key="accept" className="ff-btn" onClick={() => onMove(order, STATUS.ACCEPTED)}>Xác nhận</button>,
      <MoreMenu key="more" canEdit={canEdit} disabledEdit={disabledEdit} onEdit={() => onEdit(order)} onCancel={() => onAskCancel(order)} />
    );
  }
  if (s === STATUS.ACCEPTED) {
    actions.push(
      <button key="ready" className="ff-btn" onClick={() => onMove(order, STATUS.READY)}>Sẵn sàng</button>,
      <MoreMenu key="more" canEdit={canEdit} disabledEdit={disabledEdit} onEdit={() => onEdit(order)} onCancel={() => onAskCancel(order)} />
    );
  }
  if (s === STATUS.READY) {
    actions.push(
      <button key="deliver" className="ff-btn" onClick={() => onMove(order, STATUS.DELIVERING)}>Giao bằng Drone</button>,
      <button key="back" className="ff-btn ff-btn--ghost" onClick={() => onMove(order, STATUS.ACCEPTED)} title="Trả về bước Đã xác nhận">Trả về</button>
    );
  }
  if (s === STATUS.DELIVERING) {
    actions.push(<button key="done" className="ff-btn" onClick={() => onMove(order, STATUS.COMPLETED)}>Đánh dấu đã giao</button>);
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
          {order.modified ? <SmallTag>Đã chỉnh sửa</SmallTag> : null}
        </div>
        <Badge status={s} />
      </div>

      <div className="k-meta">
        <div> Món: <b>{order.items?.length ?? 0}</b></div>
        <div> Tổng: <b>{VND(order.finalTotal ?? order.total ?? 0)}</b></div>
        <div className="muted">{order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}</div>
      </div>

      <div className="act-row" style={{ marginTop: 10 }}>
        {actions.filter(Boolean).length ? actions : (
          <button className="ff-btn ff-btn--disabled" disabled>Không có thao tác</button>
        )}
      </div>
    </div>
  );
}

export default function RestaurantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // modals
  const [editOpen, setEditOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelOrderObj, setCancelOrderObj] = useState(null);

  const mainColumns = [STATUS.NEW, STATUS.ACCEPTED, STATUS.READY, STATUS.DELIVERING];
    const bottomColumns = [STATUS.COMPLETED, STATUS.CANCELLED];
    const allColumns = [...mainColumns, ...bottomColumns];
  const css = `
    .od-wrap{max-width:1200px;margin:24px auto;padding:0 16px}
    .top{display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
    .title{font-size:24px;font-weight:800;margin:0}
    .bottom-board {
        display: grid;
        grid-template-columns: repeat(2, 1fr); /* 2 cột dưới */
        gap: 16px;margin-bottom: 16px;
    }
        .board {
      display: grid;
      grid-template-columns: repeat(4, 1fr); /* MUST define 4 columns here */
      gap: 16px;
      margin-bottom: 16px;
  }

    /* Điều chỉnh responsive */
    @media (max-width: 1320px) {
        .board { display: grid;
        grid-template-columns: repeat(4, 1fr); /* This creates 4 equal columns */
        gap: 16px;
        margin-bottom: 16px; }
        .bottom-board { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 900px) {
        .board { grid-template-columns: repeat(2, 1fr); } 
        .bottom-board { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
        .board { grid-template-columns: 1fr; }
        .bottom-board { grid-template-columns: 1fr; } /* Stack 2 cột dưới */
    }
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
    .ff-menu-item{display:block;width:100%;text-align:left;background:#fff;border:none;padding:8px 10px;border-radius:8px;cursor:pointer}
    .ff-menu-item:hover{background:#fafafa}
    .dark .col,.dark .card{background:#151515;border-color:#333}
    .dark .col-count{background:#1d1d1d;border-color:#333}
    .dark .muted{color:#aaa}
    .ff-modal .ff-edit-row{align-items:flex-start !important}
    .ff-modal .ff-edit-row .c3{display:grid;grid-template-rows:32px auto;align-items:start}
    .ff-modal .ff-edit-row .c3 input{height:32px}
  `;

  const grouped = useMemo(() => {
        const by = Object.fromEntries(allColumns.map((c) => [c, []]));
        for (const o of orders) (by[o.status || STATUS.NEW] || by[STATUS.NEW]).push(o);
        return by;
    }, [orders]);

  function toTs(v) {
    if (!v) return 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v === "number") return v;
    const num = Number(v);
    if (!Number.isNaN(num) && String(num).length >= 10) return num;

    const s = String(v).trim();
    const iso = Date.parse(s);
    if (!Number.isNaN(iso)) return iso;

    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const [, dd, MM, yyyy, hh = "0", mm = "0", ss = "0"] = m;
      return new Date(+yyyy, +MM - 1, +dd, +hh, +mm, +ss).getTime();
    }

    m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?[ ,]+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
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
      const list = (Array.isArray(data) ? data : []).slice().sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt));
      setOrders(list);
    } finally {
      setLoading(false);
    }
  }

  // ====== Tạo mission tự động khi chuyển sang DELIVERING ======
  async function ensureMissionFor(ord) {
    try {
      // Nếu đã có missionId và còn tồn tại -> OK
      if (ord.droneMissionId) {
        const r = await fetch(`${API_BASE}/droneMissions/${encodeURIComponent(ord.droneMissionId)}`);
        if (r.ok) return true;
      }

      // Thiếu toạ độ -> báo và từ chối
      if (!hasCoords(ord)) {
        alert(
          "Không đủ tọa độ (nhà hàng/khách) để tạo Drone Mission.\n" +
          "Hãy bổ sung restaurantLocation và customerLocation cho đơn."
        );
        return false;
      }

      const origin = [ord.restaurantLocation.lat, ord.restaurantLocation.lng];
      const dest   = [ord.customerLocation.lat,   ord.customerLocation.lng];

      const speedKmh = 35;
      const etaMin = Math.ceil((haversineKm(origin, dest) / speedKmh) * 60);

      const payload = {
        orderId: String(ord.id),
        restaurantId: ord.restaurantId || null,
        customerId: ord.customerId || null,
        startTime: new Date().toISOString(),
        status: "in_progress",
        vehicle: "drone",
        speedKmh,
        eta: etaMin,
        path: [origin, dest],
        currentIndex: 0,
      };

      // 1) tạo mission
      const res = await fetch(`${API_BASE}/droneMissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Tạo mission thất bại");
      const mission = await res.json();

      // 2) gán vào order
      await api.patch(`/orders/${ord.id}`, {
        droneMissionId: mission.id,
        deliveryMode: "DRONE",
        updatedAt: new Date().toISOString(),
      });

      // 3) ghi điểm xuất phát (optional)
      try {
        await fetch(`${API_BASE}/dronePositions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            missionId: mission.id,
            lat: origin[0], lng: origin[1],
            speed: 0, heading: 0, timestamp: Date.now(),
          }),
        });
      } catch {}

      return true;
    } catch (e) {
      console.error("ensureMissionFor error", e);
      alert("Không thể tạo mission tự động cho đơn này.");
      return false;
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
      if (target === STATUS.DELIVERING) {
        // Lấy bản order hiện tại nhất
        const current = orders.find((o) => o.id === order.id) || order;

        // Nếu thiếu toạ độ nhà hàng → gán mặc định
        const hasRes = isNum(current?.restaurantLocation?.lat) && isNum(current?.restaurantLocation?.lng);
        if (!hasRes) current.restaurantLocation = RESTAURANT_COORDS;

        const ok = await ensureMissionFor(current);
        if (!ok) {
          // hoàn tác nếu không tạo được mission
          setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: prev } : o)));
          return;
        }
      }

      await api.patch(`/orders/${order.id}`, patch);
    } catch (e) {
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: prev } : o)));
      console.error(e);
      alert("Cập nhật trạng thái thất bại. Đã hoàn tác.");
    }
  }

  // === Edit handlers ===
  function onEdit(order) {
    if (!((order.status === STATUS.NEW || order.status === STATUS.ACCEPTED) && !order.modified)) return;
    setEditOrder(order);
    setEditOpen(true);
  }

  async function handleSaveEdit(patch) {
    const ord = editOrder;
    setEditOpen(false);
    patch.modified = true;
    setOrders((list) => list.map((o) => (o.id === ord.id ? { ...o, ...patch } : o)));
    try { await patchOrder(ord.id, patch); }
    catch (e) { console.error(e); alert("Lưu chỉnh sửa thất bại. Đã hoàn tác."); fetchOrders(); }
    finally { setEditOrder(null); }
  }

  // === Cancel handlers ===
  function onAskCancel(order) {
    setCancelOrderObj(order);
    setCancelOpen(true);
  }

  async function handleConfirmCancel({ reason, note }) {
    const ord = cancelOrderObj;
    setCancelOpen(false);

    const prev = ord.status || STATUS.NEW;
    setOrders((list) => list.map((o) => (o.id === ord.id ? { ...o, status: STATUS.CANCELLED } : o)));

    try {
      const now = new Date().toISOString();
      await api.patch(`/orders/${ord.id}`, {
        status: STATUS.CANCELLED,
        cancelReason: reason,
        cancelBy: "merchant",
        cancelNote: note,
        cancelledAt: now,
        updatedAt: now,
      });

      if (reason === "out_of_stock") {
        if (window.confirm("Huỷ do hết món. Bạn có muốn cập nhật món tạm hết hàng trên menu không?")) {
          // TODO: điều hướng sang trang menu/inventory của merchant
        }
      } else if (reason === "closed") {
        alert("Đã huỷ do quán đóng cửa. Hãy cập nhật trạng thái quán để tránh khách đặt nhầm.");
      }
    } catch (e) {
      console.error(e);
      alert("Huỷ đơn thất bại. Đã hoàn tác.");
      setOrders((list) => list.map((o) => (o.id === ord.id ? { ...o, status: prev } : o)));
    } finally {
      setCancelOrderObj(null);
    }
  }

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => {
    const onFocus = () => fetchOrders();
    const onVis = () => { if (document.visibilityState === "visible") fetchOrders(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVis); };
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
                <> {/* Sử dụng Fragment để chứa 2 board */}
                    {/* Hàng trên: 4 cột chính */}
                    <div className="board">
                        {mainColumns.map((col) => (
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
                                {grouped[col]?.length ? (
                                    grouped[col].map((o) => (
                                        <OrderCard key={o.id} order={o} onMove={moveStatus} onEdit={onEdit} onAskCancel={onAskCancel} />
                                    ))
                                ) : (
                                    <div className="muted">Không có đơn</div>
                                )}
                            </section>
                        ))}
                    </div>

                    {/* Hàng dưới: 2 cột phụ */}
                    <div className="bottom-board">
                        {bottomColumns.map((col) => (
                            <section
                                key={col}
                                className="col"
                                onDragOver={(e) => e.preventDefault()}
                                onDragEnter={onDragEnter}
                                onDragLeave={onDragLeave}
                                onDrop={(e) => onDropCol(e, col)} // Vẫn cho phép kéo thả vào đây nếu cần
                            >
                                <div className="col-head">
                                    <div className="col-title">{STATUS_LABEL[col]}</div>
                                    <span className="col-count">{grouped[col]?.length || 0}</span>
                                </div>
                                {grouped[col]?.length ? (
                                    grouped[col].map((o) => (
                                        // Card ở đây có thể có ít action hơn hoặc không có drag
                                        <OrderCard key={o.id} order={o} onMove={moveStatus} onEdit={onEdit} onAskCancel={onAskCancel} />
                                    ))
                                ) : (
                                    <div className="muted">Không có đơn</div>
                                )}
                            </section>
                        ))}
                    </div>
                </>
            )}

      {/* Modal sửa đơn */}
      <OrderEditModal
        open={editOpen}
        order={editOrder}
        onClose={() => { setEditOpen(false); setEditOrder(null); }}
        onSave={handleSaveEdit}
      />

      {/* Modal huỷ đơn có lý do */}
      <CancelOrderModal
        open={cancelOpen}
        order={cancelOrderObj}
        onClose={() => { setCancelOpen(false); setCancelOrderObj(null); }}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
