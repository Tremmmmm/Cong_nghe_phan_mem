import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { formatVND } from "../utils/format";

export default function Cart() {
  const { items, add, dec, remove, clear, total, merchantId } = useCart();
  const navigate = useNavigate();

  const styles = useMemo(() => `
    .cart-wrap{max-width:800px;margin:20px auto;padding:0 16px; min-height: 80vh; display: flex; flex-direction: column;}
    .cart-title{font-size:24px; margin:0 0 20px; font-weight: 800; color: #333;}

    /* --- ITEM CARD (Mobile Optimized) --- */
    .item {
        display: grid;
        grid-template-columns: 80px 1fr; /* Ảnh trái - Nội dung phải */
        grid-template-rows: auto auto;
        gap: 12px;
        padding: 12px;
        background: #fff;
        border: 1px solid #eee;
        border-radius: 12px;
        margin-bottom: 12px;
        position: relative; /* Để định vị nút xóa */
        box-shadow: 0 2px 5px rgba(0,0,0,0.03);
    }

    /* Ảnh */
    .thumb {
        width: 80px; height: 80px;
        border-radius: 8px;
        object-fit: cover;
        background: #f6f6f6;
        grid-row: 1 / 3; /* Ảnh cao 2 dòng */
    }

    /* Tên và Giá */
    .info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-right: 30px; /* Chừa chỗ cho nút xóa */
    }
    .name { font-weight: 700; font-size: 15px; color: #333; line-height: 1.3; margin-bottom: 4px; }
    .unit-price { font-size: 13px; color: #888; }

    /* Bộ đếm và Tổng tiền item */
    .actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .counter {
        display: flex; align-items: center; gap: 0; /* Gap 0, dùng border để chia */
        border: 1px solid #ddd; border-radius: 8px; overflow: hidden;
    }
    .pill {
        width: 32px; height: 32px;
        background: #fff; color: #333;
        border: none;
        font-weight: 700; font-size: 16px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
    }
    .pill:active { background: #f0f0f0; }
    .qty-val {
        width: 30px; text-align: center; font-size: 14px; font-weight: 600;
        border-left: 1px solid #eee; border-right: 1px solid #eee;
        height: 32px; line-height: 32px;
    }

    .item-total { font-weight: 700; color: #ff7a59; font-size: 15px; }

    /* Nút xóa (Icon thùng rác) */
    .btn-remove {
        position: absolute;
        top: 10px; right: 10px;
        background: transparent; border: none;
        color: #999; font-size: 18px;
        padding: 5px;
        cursor: pointer;
    }
    .btn-remove:hover { color: #e74c3c; }

    /* --- FOOTER --- */
    .cart-footer {
        margin-top: auto; /* Đẩy xuống đáy nếu content ngắn */
        padding-top: 20px;
        border-top: 1px dashed #ddd;
    }
    .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 18px; }
    .total-label { font-weight: 600; color: #555; }
    .total-val { font-weight: 800; color: #ff7a59; font-size: 22px; }

    .row-end { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }
    
    .btn { height: 44px; border: none; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; }
    .btn-checkout { background: #ff7a59; color: #fff; box-shadow: 0 4px 12px rgba(255, 122, 89, 0.3); }
    .btn-clear { background: #fff; color: #e74c3c; border: 1px solid #ffdada; }
    
    .dark .item { background: #151515; border-color: #333; }
    .dark .name { color: #eee; }
    .dark .pill { background: #222; color: #eee; }
    .dark .counter { border-color: #444; }
    .dark .qty-val { border-color: #444; }
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
        <div style={{textAlign:'center', marginTop: 50, color: '#888'}}>
            <div style={{fontSize: 40, marginBottom: 10}}>🛒</div>
            Giỏ hàng đang trống.
        </div>
      ) : (
        <>
          <div>
              {items.map((it) => (
                <div className="item" key={it.id}>
                  {/* Nút xóa góc trên phải */}
                  <button className="btn-remove" onClick={() => remove(it.id)} title="Xóa">×</button>

                  <img className="thumb" src={it.image || "/assets/images/placeholder.png"} alt={it.name} />
                  
                  <div className="info">
                    <div className="name">{it.name}</div>
                    <div className="unit-price">{formatVND(it.price)}</div>
                  </div>

                  <div style={{gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5}}>
                      <div className="counter">
                        <button className="pill" onClick={() => dec(it.id)}>−</button>
                        <div className="qty-val">{it.qty}</div>
                        <button className="pill" onClick={() => add(it, merchantId)}>+</button>
                      </div>
                      
                      <div className="item-total">{formatVND((it.price || 0) * (it.qty || 0))}</div>
                  </div>
                </div>
              ))}
          </div>

          <div className="cart-footer">
              <div className="total-row">
                  <span className="total-label">Tổng cộng:</span>
                  <span className="total-val">{formatVND(total)}</span>
              </div>
              <div className="row-end">
                <button className="btn btn-clear" onClick={clear}>Xoá hết</button>
                <button className="btn btn-checkout" onClick={() => navigate("/checkout")} disabled={items.length === 0}>
                  Thanh toán
                </button>
              </div>
          </div>
        </>
      )}
    </div>
  );
}
