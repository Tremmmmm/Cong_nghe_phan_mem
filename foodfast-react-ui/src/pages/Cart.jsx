import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { formatVND } from "../utils/format";

export default function Cart() {
  const { items, add, dec, remove, clear, total } = useCart();
  const navigate = useNavigate();

  const styles = useMemo(() => `
    .cart-wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .cart-title{font-size:26px;margin:0 0 16px}
    .item{display:grid;grid-template-columns:90px 1fr auto auto;gap:14px;align-items:center;border:1px solid #eee;border-radius:16px;padding:14px;margin-bottom:14px;background:#fff}
    .thumb{width:90px;height:70px;background:#f6f6f6;object-fit:cover;border-radius:10px}
    .name{font-weight:700;margin-bottom:4px}
    .price{font-weight:700}
    .counter{display:flex;align-items:center;gap:8px}
    .btn, .btn-ghost, .pill{border:none;border-radius:10px;cursor:pointer}
    .btn{background:#ff7a59;color:#fff;padding:10px 14px}
    .btn-ghost{background:#fff;color:#111;border:1px solid #ddd;padding:10px 14px}
    .pill{background:#ff7a59;color:#fff;width:36px;height:36px;display:grid;place-items:center;font-weight:700}
    .danger{background:#ff6b6b}
    .row-end{display:flex;gap:12px;justify-content:flex-end;margin-top:14px}
    .total{font-weight:700;margin-top:12px}
    @media (max-width:800px){.item{grid-template-columns:70px 1fr auto;}.price{display:none}}
    .dark .item{background:#151515;border-color:#333}
    .dark .btn-ghost{background:#111;border-color:#555;color:#eee}
  `, []);

  useEffect(() => {
    const id = "cart-inline-style-orange";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  return (
    <div className="cart-wrap">
      <h2 className="cart-title">Giỏ hàng</h2>

      {items.length === 0 ? (
        <div>Giỏ hàng đang trống.</div>
      ) : (
        <>
          {items.map((it) => (
            <div className="item" key={it.id}>
              <img className="thumb" src={it.image || "/assets/images/placeholder.png"} alt={it.name} />
              <div>
                <div className="name">{it.name}</div>
                <div style={{opacity:.7}}>{formatVND(it.price)}</div>
              </div>

              <div className="counter">
                <button className="pill" onClick={() => dec(it.id)}>-</button>
                <div style={{minWidth:18,textAlign:'center'}}>{it.qty}</div>
                <button className="pill" onClick={() => add(it)}>+</button>
              </div>

              <div className="price">{formatVND((it.price || 0) * (it.qty || 0))}</div>

              <div style={{gridColumn:'1 / -1'}}>
                <button className="btn danger" onClick={() => remove(it.id)}>Xoá</button>
              </div>
            </div>
          ))}

          <div className="total">Tổng: {formatVND(total)}</div>
          <div className="row-end">
            <button className="btn-ghost" onClick={clear}>Xoá giỏ</button>
            <button className="btn" onClick={() => navigate("/checkout")} disabled={items.length === 0}>
              Thanh toán
            </button>
          </div>
        </>
      )}
    </div>
  );
}
