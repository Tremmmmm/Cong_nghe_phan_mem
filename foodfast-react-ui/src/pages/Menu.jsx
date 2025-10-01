// src/pages/Menu.jsx
import { useEffect, useMemo } from "react";
import MENU_ALL, { SINGLES, COMBOS } from "../data/menuData";
import { useCart } from "../context/CartContext.jsx";
import { useFav } from "../context/FavContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Menu() {
  const styles = useMemo(
    () => `
    .menu-wrap{max-width:1140px;margin:24px auto;padding:0 16px}
    .menu-head{display:flex;align-items:end;gap:12px;margin-bottom:8px}
    .menu-head h2{margin:0;font-size:22px}
    .menu-sub{color:#666;margin-bottom:18px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .card{border:1px solid #eee;border-radius:14px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
    .thumb{aspect-ratio:16/10;background:#f6f6f6;display:block;width:100%;object-fit:cover}
    .body{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
    .name{font-weight:700}
    .desc{color:#666;font-size:14px;min-height:36px}
    .price{font-weight:700}
    .row{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .btn{border:none;background:#111;color:#fff;border-radius:10px;padding:10px 12px;cursor:pointer}
    .ghost{border:1px solid #ddd;background:#fff;color:#111}
    /* Tim đỏ */
    .heart{border:1px solid #ffb3b3;background:#fff;color:#b00000;padding:10px 12px;border-radius:10px;display:inline-flex;gap:6px;align-items:center}
    .heart.active{background:#ffe5e5;border-color:#ff9b9b}
    .section{margin-top:28px}
    @media (max-width:1024px){.grid{grid-template-columns:repeat(2,1fr)}}
    @media (max-width:620px){.grid{grid-template-columns:1fr}}
    .dark .card{background:#151515;border-color:#333}
    .dark .desc{color:#aaa}
    .dark .ghost,.dark .heart{background:#111;border-color:#555;color:#eee}
    .dark .heart.active{background:#331717;border-color:#aa5555}
    `,
    []
  );

  useEffect(() => {
    const id = "menu-inline-style-linked-to-cart-fav-toast-red-heart";
    if (!document.getElementById(id)) {
      const tag = document.createElement("style");
      tag.id = id;
      tag.innerHTML = styles;
      document.head.appendChild(tag);
    }
  }, [styles]);

  const cart = useCart();
  const fav = useFav();
  const toast = useToast();

  const ph =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'>
        <rect width='100%' height='100%' fill='#f1f1f1'/>
        <text x='50%' y='50%' text-anchor='middle' fill='#bbb' font-size='20' font-family='Arial'>Food Image</text>
      </svg>`
    );

  const handleAddCart = (item) => {
    cart.add({ id: item.id, name: item.name, price: item.price, image: item.image });
    toast.show(`Đã thêm ${item.name} vào giỏ`, 'success');
  };

  const handleToggleFav = (item) => {
    const wasFav = fav.has(item.id);
    fav.toggle(item.id);
    toast.show(wasFav ? `Đã bỏ lưu ${item.name}` : `Đã lưu ${item.name}`, 'info');
  };

  const Card = (item) => {
    const isFav = fav.has(item.id);
    return (
      <div key={item.id} className="card">
        <img className="thumb" src={item.image || ph} alt={item.name} />
        <div className="body">
          <div className="name">{item.name}</div>
          <div className="desc">{item.desc}</div>
          <div className="row">
            <div className="price">{(item.price || 0).toLocaleString("vi-VN")}₫</div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost" onClick={() => handleAddCart(item)}>
                Thêm vào giỏ
              </button>
              <button
                className={`heart ${isFav ? "active" : ""}`}
                onClick={() => handleToggleFav(item)}
                title={isFav ? "Bỏ lưu" : "Lưu vào yêu thích"}
              >
                <span role="img" aria-label="heart">❤️</span>
                {isFav ? "Đã lưu" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="menu-wrap">
      <div className="menu-head">
        <h2>Thực đơn</h2>
        <span style={{ color: "#999" }}>— {MENU_ALL.length} món</span>
      </div>
      <div className="menu-sub">Món lẻ hiển thị trước, sau đó là các combo.</div>

      <section className="section">
        <h3 style={{ margin: "0 0 10px 2px" }}>Món lẻ</h3>
        <div className="grid">{SINGLES.map(Card)}</div>
      </section>

      <section className="section">
        <h3 style={{ margin: "20px 0 10px 2px" }}>Combo</h3>
        <div className="grid">{COMBOS.map(Card)}</div>
      </section>
    </div>
  );
}
