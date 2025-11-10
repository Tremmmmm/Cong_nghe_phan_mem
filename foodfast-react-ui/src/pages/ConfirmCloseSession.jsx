// src/pages/ConfirmCloseSession.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getOrder, closeSession as apiClose } from "../utils/orderAPI.js";
import { useOrderCtx } from "../context/OrderContext.jsx";

export default function ConfirmCloseSession() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { session, closeSession: ctxClose, currentOrderId } = useOrderCtx();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const orderId = currentOrderId || sp.get("orderId");

  useEffect(() => {
    if (orderId) getOrder(orderId).then(setOrder).catch(() => {});
  }, [orderId]);

  const onConfirm = async () => {
    try {
      setLoading(true);
      if (ctxClose) await ctxClose();
      else if (session?.id) await apiClose(session.id);
      if (orderId) navigate(`/orders?focus=${orderId}`, { replace: true });
      else navigate("/orders", { replace: true });
    } catch (e) {
      alert("Đóng session thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const btnStyle = {
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: "#ff6b35",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
  };

  return (
    <div className="container" style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h2>Đặt hàng thành công 🎉</h2>
      <p>
        Nhấn <b>Xác nhận hoàn tất</b> để đóng phiên đặt hàng (session) của bạn.
      </p>

      {order && (
        <div style={{ margin: "16px 0", padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
          <div>
            <b>Order:</b> #{order.id}
          </div>
          <div>
            <b>Tổng tiền:</b> {order.total?.toLocaleString()} ₫
          </div>
          <div>
            <b>Trạng thái:</b> {order.status}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onConfirm} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Đang đóng session…" : "Xác nhận hoàn tất"}
        </button>

        <Link to="/orders" style={btnStyle}>
          Về danh sách đơn
        </Link>
      </div>
    </div>
  );
}
