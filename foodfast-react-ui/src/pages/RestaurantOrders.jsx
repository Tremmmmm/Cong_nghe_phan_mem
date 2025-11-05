// src/pages/RestaurantOrders.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { formatVND } from "../utils/format";
import OrderEditModal from "../components/OrderEditModal";
import CancelOrderModal from "../components/CancelOrderModal";
import { patchOrder } from "../utils/api";

const VND = (n) => formatVND(n);

// === Toạ độ mặc định của nhà hàng (đổi theo vị trí quán của bạn) ===
const RESTAURANT_COORDS = { lat: 10.776889, lng: 106.700806 };

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

// ===== Quy tắc quyền hành động =====
const canEditOrder = (o) =>
  (o?.status === STATUS.NEW || o?.status === STATUS.ACCEPTED) && !o?.modified;

// Cho phép huỷ ở NEW/ACCEPTED (nếu muốn thêm READY thì thêm vào dưới đây)
const canCancelOrder = (o) =>
  o?.status === STATUS.NEW || o?.status === STATUS.ACCEPTED;

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

/* ===================== Order Detail Drawer (panel bên phải) ===================== */
function Row({ label, children, muted }) {
  return (
    <div style={{display:"flex", justifyContent:"space-between", margin:"8px 0"}}>
      <div style={{color: muted ? "#999" : "#333"}}>{label}</div>
      <div style={{fontWeight:600}}>{children}</div>
    </div>
  );
}

function StatusPill({ text, color="#555" }) {
  return (
    <span style={{
      display:"inline-block", padding:"4px 10px", borderRadius:999,
      border:`1px solid ${color}`, color, background:"#fff", fontWeight:700, fontSize:12
    }}>{text}</span>
  );
}

function OrderDetailDrawer({
  open, order, onClose, onEdit, onCancel, canEdit=false, canCancel=false,
}) {
  useEffect(() => {
    function onEsc(e){ if(e.key === "Escape") onClose?.(); }
    if(open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open || !order) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const qty = (it) => it.quantity ?? it.qty ?? 1;
  const price = (it) => it.unitPrice ?? it.price ?? 0;
  const name = (it) => it.name ?? it.title ?? "Món";
  const subTotal = items.reduce((s, it) => s + qty(it)*price(it), 0);

  const discount = order.discount ?? order.discountAmount ?? 0;
  const shipping = order.deliveryFee ?? order.shippingFee ?? 0;
  const finalTotal = order.finalTotal ?? order.total ?? (subTotal - discount + shipping);

  const statusMap = {
    new:     { text:"Đơn mới",          color:"#ff9800" },
    accepted:{ text:"Đã xác nhận",      color:"#03a9f4" },
    ready:   { text:"Đã sẵn sàng",      color:"#8bc34a" },
    delivering:{ text:"Đang giao (Drone)", color:"#673ab7" },
    completed:{ text:"Hoàn thành",      color:"#009688" },
    cancelled:{ text:"Đã huỷ",          color:"#9e9e9e" },
  };
  const st = statusMap[(order.status || "new")];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:3000,
      background:"rgba(0,0,0,.35)", display:"flex", justifyContent:"flex-end"
    }}
      onClick={(e)=>{ if(e.target === e.currentTarget) onClose?.(); }}
    >
      <aside style={{
        width:"380px", maxWidth:"100%", height:"100%", background:"#fff",
        borderLeft:"1px solid #eee", boxShadow:"-8px 0 24px rgba(0,0,0,.08)",
        padding:"16px 16px 24px 16px", overflowY:"auto"
      }}>
        {/* Header */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
          <div style={{fontSize:18, fontWeight:800}}>Chi tiết đơn hàng</div>
          <button
            onClick={onClose}
            style={{border:"1px solid #eee", background:"#fff", borderRadius:10, padding:"6px 10px", cursor:"pointer"}}
          >Đóng</button>
        </div>
        <div style={{fontSize:13, color:"#777", marginBottom:12}}>
          Mã đơn <b>#{order.code || order.id}</b>
        </div>

        {/* Trạng thái + drone */}
        <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:12}}>
          <StatusPill text={st?.text || order.status} color={st?.color || "#555"} />
          {!order.droneMissionId ? (
            <span style={{
              fontSize:12, padding:"4px 10px", borderRadius:999,
              background:"#fffbe6", color:"#d48806", border:"1px solid #ffe58f"
            }}>Chưa chỉ định drone</span>
          ) : (
            <span style={{
              fontSize:12, padding:"4px 10px", borderRadius:999,
              background:"#f6ffed", color:"#389e0d", border:"1px solid #b7eb8f"
            }}>Mission: {String(order.droneMissionId).slice(0,8)}</span>
          )}
        </div>

        {/* Khách đặt */}
        <div style={{margin:"10px 0 14px", padding:"12px", border:"1px solid #eee", borderRadius:12}}>
          <div style={{fontWeight:700, marginBottom:6}}>Khách đặt đơn</div>
          <div style={{fontSize:14}}>{order.customerName || order.userEmail || "Khách"}</div>
          {order.customerPhone ? (
            <div style={{fontSize:13, color:"#666", marginTop:4}}>{order.customerPhone}</div>
          ) : null}
        </div>

        {/* Danh sách món */}
        <div style={{marginBottom:8, fontWeight:700}}>Món đã chọn</div>
        <div style={{border:"1px solid #eee", borderRadius:12, overflow:"hidden"}}>
          {items.length ? items.map((it, idx) => (
            <div key={idx} style={{
              display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center",
              padding:"10px 12px", borderTop: idx ? "1px solid #f3f3f3" : "none", background:"#fff"
            }}>
              <div style={{fontWeight:600}}>{name(it)}</div>
              <div style={{color:"#666"}}>x {qty(it)}</div>
              <div style={{fontWeight:700}}>{VND(price(it)*qty(it))}</div>
            </div>
          )) : (
            <div style={{padding:"12px"}}>—</div>
          )}
        </div>

        {/* Tổng tiền */}
        <div style={{marginTop:14, padding:"12px", border:"1px solid #eee", borderRadius:12}}>
          <Row label="Tổng tiền món (giá gốc)">{VND(subTotal)}</Row>
          {discount ? <Row label="Chiết khấu">{VND(-discount)}</Row> : null}
          <Row label="Phí giao hàng">{VND(shipping)}</Row>
          <div style={{height:8}} />
          <Row label={<span style={{fontWeight:800}}>Tổng tiền cần nhận</span>}>
            <span style={{color:"#ff7a59"}}>{VND(finalTotal)}</span>
          </Row>
        </div>

        {/* Thông tin khác */}
        <div style={{marginTop:14}}>
          <div style={{fontSize:12, color:"#999", marginBottom:4}}>Thông tin</div>
          <div style={{fontSize:13, color:"#444", lineHeight:1.8}}>
            <div>Thời gian đặt: <b>{order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}</b></div>
            {order.distanceKm ? <div>Khoảng cách: <b>{order.distanceKm} km</b></div> : null}
            {order.etaMin ? <div>Thời gian lấy hàng dự kiến: <b>~ {order.etaMin} phút</b></div> : null}
          </div>
        </div>

        {/* Hành động nhanh */}
        <div style={{display:"flex", gap:8, marginTop:18}}>
          <button
            onClick={onEdit}
            disabled={!canEdit}
            title={!canEdit ? "Chỉ sửa khi đơn ở trạng thái Mới/Đã xác nhận và chưa chỉnh sửa" : ""}
            style={{
              height:34, padding:"0 14px", borderRadius:17,
              background: canEdit ? "#ff7a59" : "#f0f0f0",
              color: canEdit ? "#fff" : "#999",
              border:"none", cursor: canEdit ? "pointer" : "not-allowed"
            }}
          >Chỉnh sửa</button>
          <button
            onClick={onCancel}
            disabled={!canCancel}
            title={!canCancel ? "Chỉ huỷ khi đơn ở trạng thái Mới/Đã xác nhận" : ""}
            style={{
              height:34, padding:"0 14px", borderRadius:17,
              background:"#fff",
              color: canCancel ? "#c24a26" : "#aaa",
              border:`1px solid ${canCancel ? "#ffb199" : "#e5e5e5"}`,
              cursor: canCancel ? "pointer" : "not-allowed"
            }}
          >Huỷ đơn</button>
        </div>
      </aside>
    </div>
  );
}
/* ===================== End Drawer ===================== */

/* ======= Card gọn, không Sửa/Huỷ ======= */
function OrderCard({ order, onMove, onOpenDetail }) {
  const s = order.status || STATUS.NEW;
  const stop = (fn) => (e) => { e.stopPropagation(); fn?.(); };

  const actions = [];
  if (s === STATUS.NEW) {
    actions.push(
      <button key="accept" className="ff-btn" onClick={stop(() => onMove(order, STATUS.ACCEPTED))}>Xác nhận</button>
    );
  }
  if (s === STATUS.ACCEPTED) {
    actions.push(
      <button key="ready" className="ff-btn" onClick={stop(() => onMove(order, STATUS.READY))}>Sẵn sàng</button>
    );
  }
  if (s === STATUS.READY) {
    actions.push(
      <button key="deliver" className="ff-btn" onClick={stop(() => onMove(order, STATUS.DELIVERING))}>Giao bằng Drone</button>,
      <button key="back" className="ff-btn ff-btn--ghost" onClick={stop(() => onMove(order, STATUS.ACCEPTED))} title="Trả về bước Đã xác nhận">Trả về</button>
    );
  }
  if (s === STATUS.DELIVERING) {
    actions.push(<button key="done" className="ff-btn" onClick={stop(() => onMove(order, STATUS.COMPLETED))}>Đánh dấu đã giao</button>);
  }

  return (
    <div
      className="card"
      onClick={() => onOpenDetail(order)}
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
          <button className="ff-btn ff-btn--disabled" onClick={stop(()=>{})} disabled>Không có thao tác</button>
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

  // Drawer chi tiết
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const openDetail = (ord) => { setDetailOrder(ord); setDetailOpen(true); };

  const mainColumns = [STATUS.NEW, STATUS.ACCEPTED, STATUS.READY, STATUS.DELIVERING];
  const bottomColumns = [STATUS.COMPLETED, STATUS.CANCELLED];
  const allColumns = [...mainColumns, ...bottomColumns];

  // ===== Global Pagination (áp dụng đồng thời cho tất cả cột) =====
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  const css = `
    :root{
      --ff-accent:#ff7a59;
      --ff-accent-ghost:#ffb199;
      --ff-bg:#fff;
      --ff-border:#eee;
      --ff-muted:#777;
      --ff-shadow:0 8px 24px rgba(0,0,0,.08);
      --ff-soft:#fff6f3;
    }
    .od-wrap{max-width:1200px;margin:24px auto;padding:0 16px}
    .top{display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
    .title{font-size:24px;font-weight:800;margin:0}
    .bottom-board{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:16px}
    .board{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:8px}

    @media (max-width:900px){ .board{grid-template-columns:repeat(2,1fr)} .bottom-board{grid-template-columns:repeat(2,1fr)} }
    @media (max-width:640px){ .board{grid-template-columns:1fr} .bottom-board{grid-template-columns:1fr} }

    .col{background:var(--ff-bg);border:1px solid var(--ff-border);border-radius:14px;padding:14px;min-height:140px;transition:border-color .2s, box-shadow .2s; overflow:visible}
    .col.drag-over{border-color:#ffb199; box-shadow:0 0 0 3px #ffe8e0}
    .col-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
    .col-title{font-weight:800}
    .col-count{font-size:12px;background:#f6f6f6;border:1px solid var(--ff-border);border-radius:999px;padding:2px 8px}

    .card{background:var(--ff-bg);border:1px solid var(--ff-border);border-radius:14px;padding:14px;margin-bottom:12px;transition:box-shadow .2s,border-color .2s; overflow:visible; position:relative}
    .card:hover{box-shadow:0 6px 16px rgba(0,0,0,.06)}
    .row{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .muted{font-size:12px;color:var(--ff-muted)}
    .act-row{display:flex; gap:8px; align-items:center; flex-wrap:wrap}
    .badge{background:#fff;border:1px solid #ddd;border-radius:999px;padding:4px 10px;font-weight:700;font-size:12px}
    .ff-btn{height:32px;border:none;border-radius:16px;background:var(--ff-accent);color:#fff;padding:0 12px;cursor:pointer}
    .ff-btn--ghost{background:#fff;color:#c24a26;border:1px solid var(--ff-accent-ghost)}
    .ff-btn--disabled{background:#f0f0f0;color:#999;cursor:not-allowed}
    .ff-btn:hover{filter:brightness(0.98)} .ff-btn:active{transform:translateY(1px)}

    /* Global pager */
    .pager{display:flex;gap:6px;align-items:center;margin:8px 0 16px auto;flex-wrap:wrap;justify-content:flex-end}
    .pager-btn{height:28px;min-width:28px;padding:0 10px;border:1px solid var(--ff-border);background:#fff;border-radius:12px;cursor:pointer}
    .pager-btn[disabled]{opacity:.5;cursor:not-allowed}
    .pager-page{height:28px;min-width:28px;padding:0 10px;border:1px solid var(--ff-border);background:#fff;border-radius:12px;cursor:pointer}
    .pager-page.active{background:var(--ff-soft);border-color:#ffd6c7;font-weight:700}

    .dark .col,.dark .card{background:#151515;border-color:#333}
    .dark .col-count{background:#1d1d1d;border-color:#333}
    .dark .muted{color:#aaa}
    .dark .pager-btn,.dark .pager-page{background:#1a1a1a;border-color:#333;color:#eee}
    .dark .pager-page.active{background:#202020;border-color:#444}
  `;

  const grouped = useMemo(() => {
    const by = Object.fromEntries([...allColumns.map(c => [c, []])]);
    for (const o of orders) (by[o.status || STATUS.NEW] || by[STATUS.NEW]).push(o);
    return by;
  }, [orders]);

  // tổng số trang = max theo từng cột (mỗi cột PAGE_SIZE đơn / trang)
  const totalPages = useMemo(() => {
    const counts = allColumns.map(c => Math.ceil((grouped[c]?.length || 0) / PAGE_SIZE) || 1);
    return Math.max(1, ...counts);
  }, [grouped]);

  // khi dữ liệu thay đổi, giữ page trong biên
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [totalPages]); // eslint-disable-line

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
      if (ord.droneMissionId) {
        const r = await fetch(`${API_BASE}/droneMissions/${encodeURIComponent(ord.droneMissionId)}`);
        if (r.ok) return true;
      }
      if (!hasCoords(ord)) {
        alert("Không đủ tọa độ (nhà hàng/khách) để tạo Drone Mission.\nHãy bổ sung restaurantLocation và customerLocation cho đơn.");
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

      const res = await fetch(`${API_BASE}/droneMissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Tạo mission thất bại");
      const mission = await res.json();

      await api.patch(`/orders/${ord.id}`, {
        droneMissionId: mission.id,
        deliveryMode: "DRONE",
        updatedAt: new Date().toISOString(),
      });

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
        const current = orders.find((o) => o.id === order.id) || order;

        const hasRes = isNum(current?.restaurantLocation?.lat) && isNum(current?.restaurantLocation?.lng);
        if (!hasRes) current.restaurantLocation = RESTAURANT_COORDS;

        const ok = await ensureMissionFor(current);
        if (!ok) {
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

  // === Edit/Cancel for Drawer ===
  function onEdit(order) {
    if (!canEditOrder(order)) return;
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
  function onAskCancel(order) {
    if (!canCancelOrder(order)) return;
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
        status: STATUS.CANCELLED, cancelReason: reason, cancelBy: "merchant",
        cancelNote: note, cancelledAt: now, updatedAt: now,
      });
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

  // Tự hoàn thành đơn khi DroneTracker bắn event "order:statusChanged"
useEffect(() => {
  function onAutoDone(e) {
    const { id, status } = e.detail || {};
    if (!id || String(status).toLowerCase() !== "completed") return;

    setOrders((list) => {
      const has = list.some(
        (o) =>
          String(o.id) === String(id) &&
          (o.status === STATUS.DELIVERING || String(o.status).toLowerCase() === "delivering")
      );
      if (!has) return list;

      const next = list.map((o) =>
        String(o.id) === String(id) ? { ...o, status: STATUS.COMPLETED } : o
      );

      // (tuỳ chọn) đồng bộ “API” mock
      try {
        api.patch(`/orders/${id}`, {
          status: STATUS.COMPLETED,
          updatedAt: new Date().toISOString(),
        });
      } catch {}

      return next;
    });
  }

  window.addEventListener("order:statusChanged", onAutoDone);
  return () => window.removeEventListener("order:statusChanged", onAutoDone);
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

  // ==== Helpers render 1 cột (có cắt theo trang tổng) ====
  const renderColumn = (col) => {
    const items = grouped[col] || [];
    const start = (page - 1) * PAGE_SIZE;
    const view = items.slice(start, start + PAGE_SIZE);

    return (
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
          <span className="col-count">{items.length}</span>
        </div>

        {view.length ? (
          view.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onMove={moveStatus}
              onOpenDetail={openDetail}
            />
          ))
        ) : (
          <div className="muted">Không có đơn ở trang này</div>
        )}
      </section>
    );
  };

  // ==== Global Pager ====
  const GlobalPager = () => (
    <div className="pager">
      <button className="pager-btn" onClick={() => setPage(1)} disabled={page <= 1}>«</button>
      <button className="pager-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Trước</button>
      {Array.from({ length: totalPages }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            className={`pager-page ${n === page ? "active" : ""}`}
            onClick={() => setPage(n)}
          >
            {n}
          </button>
        );
      })}
      <button className="pager-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Sau</button>
      <button className="pager-btn" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</button>
    </div>
  );

  return (
    <div className="od-wrap">
      <style>{css}</style>

      <div className="top">
        <h2 className="title">Quản lý đơn hàng</h2>
        <button className="ff-btn" onClick={fetchOrders}>Làm mới</button>
      </div>

      {/* Pager tổng ở trên */}
      <GlobalPager />

      {loading ? (
        <div>Đang tải…</div>
      ) : (
        <>
          {/* Hàng trên: 4 cột chính */}
          <div className="board">
            {mainColumns.map(renderColumn)}
          </div>

          {/* Hàng dưới: 2 cột phụ */}
          <div className="bottom-board">
            {bottomColumns.map(renderColumn)}
          </div>
        </>
      )}

      {/* Pager tổng ở dưới */}
      <GlobalPager />

      {/* Drawer chi tiết */}
      <OrderDetailDrawer
        open={detailOpen}
        order={detailOrder}
        onClose={() => { setDetailOpen(false); setDetailOrder(null); }}
        onEdit={() => { setDetailOpen(false); setEditOrder(detailOrder); setEditOpen(true); }}
        onCancel={() => { setDetailOpen(false); setCancelOrderObj(detailOrder); setCancelOpen(true); }}
        canEdit={detailOrder ? canEditOrder(detailOrder) : false}
        canCancel={detailOrder ? canCancelOrder(detailOrder) : false}
      />

      {/* Modals */}
      <OrderEditModal
        open={editOpen}
        order={editOrder}
        onClose={() => { setEditOpen(false); setEditOrder(null); }}
        onSave={handleSaveEdit}
      />
      <CancelOrderModal
        open={cancelOpen}
        order={cancelOrderObj}
        onClose={() => { setCancelOpen(false); setCancelOrderObj(null); }}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
