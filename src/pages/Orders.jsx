import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrders } from "../context/OrderContext.jsx";

export default function Orders() {
  const { user } = useAuth();
  const { orders, findByUser } = useOrders();
  const myOrders = user ? findByUser(user.id, user.email) : orders; // nếu chưa đăng nhập, show tất cả (demo)

  const styles = useMemo(() => `
    .od-wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .title{font-size:24px;font-weight:800;margin:0 0 12px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:14px;margin-bottom:12px}
    .row{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap}
    .label{color:#777}
    .badge{background:#ffe5d8;color:#c24a26;border:1px solid #ffb199;border-radius:999px;padding:4px 10px;font-weight:700}
    .items{margin-top:8px;color:#444}
    .dark .card{background:#151515;border-color:#333}
    .dark .label{color:#aaa}
    .dark .items{color:#ddd}
  `, []);

  useEffect(() => {
    const id = "orders-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  return (
    <div className="od-wrap">
      <h2 className="title">Đơn hàng của bạn</h2>

      {myOrders.length === 0 ? (
        <div>Chưa có đơn hàng nào.</div>
      ) : (
        myOrders.map(o => (
          <div className="card" key={o.id}>
            <div className="row">
              <div><span className="label">Mã đơn:</span> <strong>{o.id}</strong></div>
              <div><span className="label">Ngày tạo:</span> {new Date(o.createdAt).toLocaleString()}</div>
              <div><span className="label">Tổng:</span> <strong>{o.total.toLocaleString()}₫</strong></div>
              <div><span className="badge">{o.status}</span></div>
            </div>
            <div style={{marginTop:8}}>
              <div className="label">Giao đến:</div>
              <div>{o.name} • {o.phone}</div>
              <div>{o.address}</div>
            </div>
            <div className="items">
              {o.items.map(it => (
                <div key={it.id}>• {it.name} × {it.qty} — {(it.price*it.qty).toLocaleString()}₫</div>
              ))}
            </div>
            {o.note && <div style={{marginTop:6}}><span className="label">Ghi chú:</span> {o.note}</div>}
            <div style={{marginTop:6}}><span className="label">Thanh toán:</span> {o.payMethod === "cod" ? "COD" : "Chuyển khoản"}</div>
          </div>
        ))
      )}
    </div>
  );
}
