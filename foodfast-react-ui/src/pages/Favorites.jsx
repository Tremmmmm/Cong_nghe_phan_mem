import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import MENU_ALL from "../data/menuData";
import { useFav } from "../context/FavContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Favorites() {
  const { ids, toggle, has, count } = useFav();
  const { add } = useCart();
  const toast = useToast();

  // map id -> item
  const items = ids.map(id => MENU_ALL.find(x => x.id === id)).filter(Boolean);

  const styles = useMemo(
    () => `
      .fav-wrap{max-width:1140px;margin:24px auto;padding:0 16px}
      .title{font-size:24px;margin:0 0 10px}
      .sub{color:#666;margin-bottom:12px}
      .actions{display:flex;gap:12px;margin-bottom:18px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
      .card{border:1px solid #eee;border-radius:14px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
      .thumb{aspect-ratio:16/10;background:#f6f6f6;display:block;width:100%;object-fit:cover}
      .body{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
      .name{font-weight:700}
      .price{font-weight:700}
      .row{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .btn{border:none;border-radius:10px;cursor:pointer;padding:10px 12px}
      .btn.primary{background:#ff7a59;color:#fff}
      .btn.ghost{background:#fff;border:1px solid #ddd;color:#111}
      .btn.danger{background:#ff6b6b;color:#fff}
      .heart{border:1px solid #ffb3b3;background:#ffe5e5;color:#b00000;padding:10px 12px;border-radius:10px;display:inline-flex;gap:6px;align-items:center}
      .empty{padding:18px;border:1px dashed #ddd;border-radius:12px;background:#fff}
      @media (max-width:1024px){.grid{grid-template-columns:repeat(2,1fr)}}
      @media (max-width:620px){.grid{grid-template-columns:1fr}}
      .dark .card{background:#151515;border-color:#333}
      .dark .sub{color:#aaa}
      .dark .btn.ghost{background:#111;border-color:#555;color:#eee}
      .dark .empty{background:#111;border-color:#333}
    `,
    []
  );

  useEffect(() => {
    const id = "favorites-inline-style-v2-actions";
    if (!document.getElementById(id)) {
      const tag = document.createElement("style");
      tag.id = id;
      tag.textContent = styles;
      document.head.appendChild(tag);
    }
  }, [styles]);

  const ph =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'>
        <rect width='100%' height='100%' fill='#f1f1f1'/>
        <text x='50%' y='50%' text-anchor='middle' fill='#bbb' font-size='20' font-family='Arial'>Hình món</text>
      </svg>`
    );

  const handleAddAllToCart = () => {
    if (items.length === 0) return;
    items.forEach(it => add({ id: it.id, name: it.name, price: it.price, image: it.image }));
    toast.show(`Đã thêm ${items.length} món vào giỏ`, "success");
  };

  const handleClearAllFav = () => {
    if (ids.length === 0) return;
    const snapshot = [...ids]; // tránh thay đổi mảng khi đang lặp
    snapshot.forEach(id => has(id) && toggle(id));
    toast.show("Đã xoá hết danh sách yêu thích", "info");
  };

  return (
    <div className="fav-wrap">
      <h2 className="title">Món yêu thích ({count})</h2>

      {items.length === 0 ? (
        <div className="empty">
          Chưa có món yêu thích. Vào trang <Link to="/menu" style={{fontWeight:700}}>Thực đơn</Link> bấm ❤️ để thêm nhé.
        </div>
      ) : (
        <>
          <div className="sub">Bạn có {items.length} món đã lưu.</div>

          {/* Hành động nhanh */}
          <div className="actions">
            <button className="btn primary" onClick={handleAddAllToCart}>
              Thêm tất cả vào giỏ
            </button>
            <button className="btn danger" onClick={handleClearAllFav}>
              Xoá hết yêu thích
            </button>
          </div>

          <div className="grid">
            {items.map(it => {
              const isFav = has(it.id);
              return (
                <div className="card" key={it.id}>
                  <img className="thumb" src={it.image || ph} alt={it.name} />
                  <div className="body">
                    <div className="name">{it.name}</div>
                    <div style={{opacity:.7}}>{it.price.toLocaleString()}₫</div>

                    <div className="row">
                      <button
                        className="btn primary"
                        onClick={() => {
                          add({ id: it.id, name: it.name, price: it.price, image: it.image });
                          toast.show(`Đã thêm ${it.name} vào giỏ`, "success");
                        }}
                      >
                        Thêm vào giỏ
                      </button>

                      <button
                        className="heart"
                        onClick={() => {
                          toggle(it.id);
                          toast.show(
                            isFav
                              ? `Đã bỏ khỏi yêu thích ${it.name}`
                              : `Đã thêm vào yêu thích ${it.name}`,
                            "info"
                          );
                        }}
                        title={isFav ? "Bỏ lưu" : "Lưu"}
                      >
                        <span role="img" aria-label="trái tim">❤️</span> {isFav ? "Bỏ lưu" : "Lưu"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
