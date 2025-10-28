import { useEffect } from "react";

const VND = (n) => (n || n === 0) ? n.toLocaleString("vi-VN") + " ₫" : "—";

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

export default function OrderDetailDrawer({
  open, order, onClose, onEdit, onCancel,
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

  // số liệu hiển thị (tuỳ có/không):
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
              display:"grid",
              gridTemplateColumns:"1fr auto auto",
              gap:8, alignItems:"center",
              padding:"10px 12px",
              borderTop: idx ? "1px solid #f3f3f3" : "none",
              background:"#fff"
            }}>
              <div style={{fontWeight:600}}>{name(it)}</div>
              <div style={{color:"#666"}}>x {qty(it)}</div>
              <div style={{fontWeight:700}}>{VND(price(it)*qty(it))}</div>
            </div>
          )) : (
            <div style={{padding:"12px"}}>—</div>
          )}
        </div>

        {/* Tổng tiền (bỏ “phí đóng gói”, “khách ghi chú”) */}
        <div style={{marginTop:14, padding:"12px", border:"1px solid #eee", borderRadius:12}}>
          <Row label="Tổng tiền món (giá gốc)"><span>{VND(subTotal)}</span></Row>
          {discount ? <Row label="Chiết khấu">{VND(-discount)}</Row> : null}
          <Row label="Phí giao hàng"><span>{VND(shipping)}</span></Row>
          <div style={{height:8}} />
          <Row label={<span style={{fontWeight:800}}>Tổng tiền cần nhận</span>}>
            <span style={{color:"#ff7a59"}}>{VND(finalTotal)}</span>
          </Row>
        </div>

        {/* Thông tin khác ngắn gọn */}
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
            style={{height:34, padding:"0 14px", borderRadius:17, background:"#ff7a59", color:"#fff", border:"none", cursor:"pointer"}}
          >Chỉnh sửa</button>
          <button
            onClick={onCancel}
            style={{height:34, padding:"0 14px", borderRadius:17, background:"#fff", color:"#c24a26", border:"1px solid #ffb199", cursor:"pointer"}}
          >Huỷ đơn</button>
        </div>
      </aside>
    </div>
  );
}
