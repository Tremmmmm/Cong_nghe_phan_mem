// src/pages/Confirmation.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getOrder } from "../utils/api";
import { formatVND } from "../utils/format";
import { estimateETA, etaWindowLabel, formatArrivalClock, formatCountdown } from "../utils/eta";

const FALLBACK = "/assets/images/Delivery.png";
const VND = (n) => formatVND(n);

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function payMethodLabel(order) {
  const m = String(order?.payment || "").toUpperCase();
  if (m === "MOMO") return "MoMo";
  if (m === "VNPAY") return "VNPay";
  if (m === "COD") return "COD";
  return m || "—";
}

export default function Confirmation() {
  const q = useQuery();
  const paramId = (q.get("id") || "").trim();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ETA state
  const [eta, setEta] = useState(null);  // {minutes, windowMin, windowMax, arriveTs}
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr("");

      let id = paramId;
      if (!id) {
        try { id = sessionStorage.getItem("lastOrderId") || ""; } catch {}
      }
      if (!id) {
        setErr("Không tìm thấy mã đơn để hiển thị.");
        setLoading(false);
        return;
      }

      try {
        const data = await getOrder(id);
        if (!data || !data.id) {
          setErr("Đơn hàng không tồn tại hoặc đã bị xoá.");
        } else {
          setOrder(data);
          const e = estimateETA({
            // luôn dùng Drone
            deliveryMode: data.deliveryMode || "DRONE",
            itemCount: data.items?.length || 1,
            createdAt: data.createdAt
          });
          setEta(e);
        }
      } catch (e) {
        console.error(e);
        setErr("Không tải được đơn hàng. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [paramId]);

  // countdown ETA
  useEffect(() => {
    if (!eta?.arriveTs) return;
    const tick = () => setCountdown(formatCountdown(eta.arriveTs - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [eta?.arriveTs]);

  const styles = useMemo(
    () => `
    .confirm-wrap{max-width:960px;margin:32px auto;padding:0 16px}
    .hero{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;margin-bottom:16px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px}
    .title{font-size:28px;font-weight:900;margin:0 0 8px}
    .sub{font-size:16px;color:#666;margin:0 0 14px}
    .ok{background:#eaf7ea;border:1px solid #cce9cc;color:#2a7e2a;border-radius:12px;padding:10px;margin-bottom:10px;font-weight:700}
    .bad{background:#fde8e8;border:1px solid #f9c7c7;color:#b80d0d;border-radius:12px;padding:10px;margin-bottom:10px;font-weight:700}
    .btn{height:40px;padding:0 16px;border:none;border-radius:20px;background:#ff7a59;color:#fff;font-weight:800;cursor:pointer;text-decoration:none;display:inline-grid;place-items:center}
    .btn.alt{background:#fff;color:#333;border:1px solid #eee}
    .grid{display:grid;grid-template-columns:2fr 1fr;gap:16px}
    .items{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}
    .it{display:flex;gap:10px;align-items:center;border:1px dashed #eee;border-radius:12px;padding:8px}
    .thumb{width:64px;height:64px;border-radius:10px;object-fit:cover;background:#f6f6f6}
    .meta b{display:block}
    .row{display:flex;justify-content:space-between;margin:6px 0}
    .sum{font-weight:900}
    .center{text-align:center}
    .muted{opacity:.75}
    .eta{margin:8px 0 12px; padding:10px; border-radius:10px; font-weight:700; background:#f4f8ff; border:1px solid #d6e7ff}
    .sk{height:14px;background:linear-gradient(90deg,#eee,#f7f7f7,#eee);background-size:200% 100%;animation:sh 1s linear infinite;border-radius:8px}
    @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .dark .card{background:#151515;border-color:#333}
    .dark .btn.alt{background:#111;color:#eee;border-color:#333}
    @media (max-width:860px){ .hero{grid-template-columns:1fr} .grid{grid-template-columns:1fr} }
    `,
    []
  );

  return (
    <section className="confirm-wrap">
      <style>{styles}</style>

      {loading && (
        <div className="card">
          <div className="sk" style={{width:'40%', height:20, marginBottom:8}}/>
          <div className="sk" style={{width:'60%', height:14, marginBottom:6}}/>
          <div className="sk" style={{width:'35%', height:14}}/>
        </div>
      )}
      {err && !loading && <div className="bad">{err}</div>}

      {!loading && !err && order && (
        <>
          {/* Hero */}
          <div className="hero">
            <div className="card">
              <div className="ok">✅ Đặt hàng thành công!</div>
              <h2 className="title">Cảm ơn bạn đã đặt món 🎉</h2>
              <p className="sub">
                Mã đơn: <b>#{order.id}</b><br/>
                Thời gian: {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}<br/>
                Trạng thái: <b>{order.status || "new"}</b><br/>
                Thanh toán: <b>{payMethodLabel(order)}</b><br/>
                Giao bằng: <b>{order.deliveryMode === 'DRONE' ? 'Drone' : 'Tài xế'}</b>
              </p>

              {/* ETA box */}
              {eta && (
                <div className="eta">
                  ⏱️ Dự kiến giao: <b>{formatArrivalClock(eta.arriveTs)}</b>&nbsp;
                  ({etaWindowLabel(eta)}) — Còn lại: <b>{countdown}</b>
                </div>
              )}

              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <Link className="btn" to="/orders">Xem lịch sử đơn</Link>
                <Link className="btn alt" to="/menu">Tiếp tục đặt món</Link>
              </div>
            </div>
            <div className="card center">
              <img src="/assets/images/Delivery.png" alt="Fast Delivery" style={{maxWidth:360,width:'100%'}} />
              <div className="muted">Dự kiến giao trong ~45 phút.</div>
            </div>
          </div>

          {/* Chi tiết */}
          <div className="grid">
            <div className="card">
              <h3 style={{marginTop:0}}>Món đã đặt</h3>
              <div className="items">
                {(order.items || []).map((it, idx) => (
                  <div className="it" key={`${order.id}-${idx}`}>
                    <img
                      className="thumb"
                      src={it.image || FALLBACK}
                      alt={it.name}
                      onError={(e)=>{e.currentTarget.src=FALLBACK}}
                    />
                    <div className="meta">
                      <b>{it.name}</b>
                      <div className="muted">
                        {VND(it.price)} × {it.qty} → <span className="sum">{VND((it.price||0)*(it.qty||0))}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{marginTop:0}}>Tóm tắt thanh toán</h3>
              <div className="row"><span>Tạm tính</span><span>{VND(order.total)}</span></div>
              <div className="row"><span>Giảm giá</span><span>-{VND(order.discount || 0)}</span></div>

              {/* Ship & Freeship */}
              <div className="row">
                <span>Giao hàng</span>
                <span>{order.deliveryMode === 'DRONE' ? 'Drone (nhanh)' : 'Tài xế'}</span>
              </div>
              <div className="row">
                <span>Phí vận chuyển</span>
                <span>
                  {(order.shippingDiscount || 0) > 0
                    ? <s>{VND(order.shippingFee || 0)}</s>
                    : VND(order.shippingFee || 0)}
                </span>
              </div>
              {(order.shippingDiscount || 0) > 0 && (
                <div className="row">
                  <span>Miễn phí vận chuyển</span>
                  <span>-{VND(order.shippingDiscount)}</span>
                </div>
              )}

              <div className="row sum"><span>Phải trả</span><span>{VND(order.finalTotal ?? order.total ?? 0)}</span></div>
              {order.couponCode && (
                <div className="row"><span>Mã áp dụng</span><span><b>{order.couponCode}</b></span></div>
              )}
              <hr />
              <div className="row"><span>Người nhận</span><span>{order.customerName}</span></div>
              <div className="row"><span>Liên hệ</span><span>{order.phone}</span></div>
              <div className="row"><span>Địa chỉ</span><span style={{textAlign:'right',maxWidth:260}}>{order.address}</span></div>
            </div>
          </div>
        </>
      )}

      {!loading && !err && !order && (
        <div className="card center">
          <h3 style={{marginTop:0}}>Không có đơn để hiển thị</h3>
          <p className="muted">Hãy đặt món từ trang Menu nhé.</p>
          <Link to="/menu" className="btn">Đến Menu</Link>
        </div>
      )}
    </section>
  );
}
