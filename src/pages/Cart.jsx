import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { formatVND } from "../utils/format";

const STYLE_ID = "cart-inline-style-orange";

export default function Cart() {
  const { items, add, dec, remove, clear, total, merchantId } = useCart();
  const navigate = useNavigate();

  // --- Styles (ĐÃ SỬA: Thêm tiền tố cart-) ---
  const styles = useMemo(() => `
    .cart-wrap{max-width:800px;margin:20px auto;padding:0 16px; min-height: 80vh; display: flex; flex-direction: column;}
    .cart-title{font-size:24px; margin:0 0 20px; font-weight: 800; color: #333;}

    /* --- ITEM CART (Mobile Optimized) --- */
    .cart-item {
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
    .cart-thumb {
        width: 80px; height: 80px;
        border-radius: 8px;
        object-fit: cover;
        background: #f6f6f6;
        grid-row: 1 / 3; /* Ảnh cao 2 dòng */
    }

    /* Tên và Giá */
    .cart-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-right: 30px; /* Chừa chỗ cho nút xóa */
    }
    .cart-name { font-weight: 700; font-size: 15px; color: #333; line-height: 1.3; margin-bottom: 4px; }
    .cart-unit-price { font-size: 13px; color: #888; }

    /* Bộ đếm và Tổng tiền item */
    .cart-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .cart-counter {
        display: flex; align-items: center; gap: 0; /* Gap 0, dùng border để chia */
        border: 1px solid #ddd; border-radius: 8px; overflow: hidden;
    }
    .cart-pill {
        width: 32px; height: 32px;
        background: #fff; color: #333;
        border: none;
        font-weight: 700; font-size: 16px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
    }
    .cart-pill:active { background: #f0f0f0; }
    .cart-qty-val {
        width: 30px; text-align: center; font-size: 14px; font-weight: 600;
        border-left: 1px solid #eee; border-right: 1px solid #eee;
        height: 32px; line-height: 32px;
    }

    .cart-item-total { font-weight: 700; color: #ff7a59; font-size: 15px; }

    /* Nút xóa (Icon thùng rác) */
    .cart-btn-remove {
        position: absolute;
        top: 10px; right: 10px;
        background: transparent; border: none;
        color: #999; font-size: 18px;
        padding: 5px;
        cursor: pointer;
    }
    .cart-btn-remove:hover { color: #e74c3c; }

    /* --- FOOTER --- */
    .cart-footer {
        margin-top: auto; /* Đẩy xuống đáy nếu content ngắn */
        padding-top: 20px;
        border-top: 1px dashed #ddd;
    }
    .cart-total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 18px; }
    .cart-total-label { font-weight: 600; color: #555; }
    .cart-total-val { font-weight: 800; color: #ff7a59; font-size: 22px; }

    .cart-row-end { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }
    
    .cart-btn { height: 44px; border: none; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; }
    .cart-btn-checkout { background: #ff7a59; color: #fff; box-shadow: 0 4px 12px rgba(255, 122, 89, 0.3); }
    .cart-btn-clear { background: #fff; color: #e74c3c; border: 1px solid #ffdada; }
    
    .dark .cart-item { background: #151515; border-color: #333; }
    .dark .cart-name { color: #eee; }
    .dark .cart-pill { background: #222; color: #eee; }
    .dark .cart-counter { border-color: #444; }
    .dark .cart-qty-val { border-color: #444; }
  `, []);

  // SỬA: Thêm logic cleanup để gỡ style khi component unmount
  useEffect(() => {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = styles;
      document.head.appendChild(s);
    }

    return () => {
        const cleanupTag = document.getElementById(STYLE_ID);
        if (cleanupTag) {
            cleanupTag.remove();
        }
    };
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
                <div className="cart-item" key={it.id}>
                  {/* Nút xóa góc trên phải */}
                  <button className="cart-btn-remove" onClick={() => remove(it.id)} title="Xóa">×</button>

                  <img className="cart-thumb" src={it.image || "/assets/images/placeholder.png"} alt={it.name} />
                  
                  <div className="cart-info">
                    <div className="cart-name">{it.name}</div>
                    <div className="cart-unit-price">{formatVND(it.price)}</div>
                  </div>

                  <div style={{gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5}}>
                      <div className="cart-counter">
                        <button className="cart-pill" onClick={() => dec(it.id)}>−</button>
                        <div className="cart-qty-val">{it.qty}</div>
                        <button className="cart-pill" onClick={() => add(it, merchantId)}>+</button>
                      </div>
                      
                      <div className="cart-item-total">{formatVND((it.price || 0) * (it.qty || 0))}</div>
                  </div>
                </div>
              ))}
          </div>

          <div className="cart-footer">
              <div className="cart-total-row">
                  <span className="cart-total-label">Tổng cộng:</span>
                  <span className="cart-total-val">{formatVND(total)}</span>
              </div>
              <div className="cart-row-end">
                <button className="cart-btn cart-btn-clear" onClick={clear}>Xoá hết</button>
                <button className="cart-btn cart-btn-checkout" onClick={() => navigate("/checkout")} disabled={items.length === 0}>
                  Thanh toán
                </button>
              </div>
          </div>
        </>
      )}
    </div>
  );
}