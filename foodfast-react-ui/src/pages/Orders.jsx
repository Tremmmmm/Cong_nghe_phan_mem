// src/pages/Orders.jsx
import { useEffect, useMemo, useState } from "react";
import { myOrders } from "../utils/api"; // <-- GIỮ NGUYÊN, nhưng lấy rows từ object trả về
import { useAuth } from "../context/AuthContext.jsx";
import MENU_ALL from "../data/menuData.js";

function VND(n){ return (n||0).toLocaleString('vi-VN') + '₫' }
const FALLBACK = "/assets/images/Delivery.png";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [error, setError] = useState(""); // thêm để bắt lỗi hiển thị friendly

  // map id -> menu item để lấy ảnh nếu item trong order chưa có image
  const menuMap = useMemo(() => {
    const m = {};
    for (const it of MENU_ALL) m[it.id] = it;
    return m;
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      // Lấy đúng rows từ API kiểu mới (server-side pagination)
      const { rows } = await myOrders({
        page: 1,
        limit: 50,     // đủ lớn để thấy hết đơn của user; tuỳ bạn chỉnh
        status: "all", // có thể cho người dùng filter sau
        q: "",         // ô search nếu bạn muốn
        sort: "createdAt",
        order: "desc",
      });
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setError("Không tải được đơn hàng. Vui lòng thử lại.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(fetchOrders, 5000); // auto refresh 5s
    return () => clearInterval(t);
  }, [auto]);

  const my = useMemo(() => {
    if (!user?.email) return orders;
    return orders.filter(o => o.userEmail === user.email);
  }, [orders, user?.email]);

  const css = `
    .od-wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .top{display:flex;gap:12px;align-items:center;margin-bottom:10px}
    .title{font-size:24px;font-weight:800;margin:0}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:14px;margin-bottom:12px}
    .row{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap}
    .label{color:#777}
    .badge{background:#ffe5d8;color:#c24a26;border:1px solid #ffb199;border-radius:999px;padding:4px 10px;font-weight:700;text-transform:capitalize}
    .items{margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
    .it{display:flex;gap:10px;align-items:center;border:1px dashed #eee;border-radius:10px;padding:8px}
    .thumb{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#f6f6f6}
    .meta{flex:1}
    .meta b{display:block}
    .sum-row{display:flex;justify-content:flex-end;gap:20px;margin-top:12px}
    .ff-btn{height:32px;border:none;border-radius:16px;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .dark .card{background:#151515;border-color:#333}
    .dark .label{color:#aaa}
  `;

  const getItemImage = (it) =>
    it.image || menuMap[it.id]?.image || FALLBACK;

  return (
    <div className="od-wrap">
      <style>{css}</style>

      <div className="top">
        <h2 className="title">Đơn hàng của bạn</h2>
        <button className="ff-btn" onClick={fetchOrders}>Refresh</button>
        <label style={{display:'flex',alignItems:'center',gap:6}}>
          <input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)} /> Auto (5s)
        </label>
      </div>

      {loading ? (
        <div>Đang tải…</div>
      ) : error ? (
        <div style={{color:'#c24a26'}}>{error}</div>
      ) : my.length === 0 ? (
        <div>Chưa có đơn hàng nào.</div>
      ) : (
        my.map(o => (
          <div className="card" key={o.id}>
            <div className="row">
              <div><span className="label">Mã đơn:</span> <strong>{o.id}</strong></div>
              <div><span className="label">Ngày tạo:</span> {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'}</div>
              <div><span className="label">Tạm tính:</span> <strong>{VND(o.total)}</strong></div>
              <div><span className="badge">{o.status || 'new'}</span></div>
            </div>

            <div style={{marginTop:8}}>
              <div className="label">Người nhận:</div>
              <div><strong>{o.customerName}</strong> • {o.phone}</div>
              <div>{o.address}</div>
            </div>

            <div className="items">
              {o.items?.map(it => (
                <div className="it" key={`${o.id}-${it.id}`}>
                  <img className="thumb" src={getItemImage(it)} alt={it.name} onError={(e)=>{e.currentTarget.src=FALLBACK}} />
                  <div className="meta">
                    <b>{it.name}</b>
                    <div>x{it.qty} — {VND((it.price||0)*(it.qty||0))}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sum-row">
              {o.couponCode && <div>Mã: <strong>{o.couponCode}</strong></div>}
              <div>Giảm: <strong>-{VND(o.discount||0)}</strong></div>
              <div>Phải trả: <strong>{VND(o.finalTotal ?? o.total ?? 0)}</strong></div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
