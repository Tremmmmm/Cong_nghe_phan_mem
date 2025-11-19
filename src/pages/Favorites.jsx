import { useEffect, useMemo, useState } from "react"; 
import { Link } from "react-router-dom";
import { fetchMenuItems } from "../utils/menuAPI.js"; 
import { useFav } from "../context/FavContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Favorites() {
  const { ids, toggle, has, count,clearAll } = useFav();
  const { add } = useCart();
  const toast = useToast();
  
  const [menuMap, setMenuMap] = useState(new Map());
  useEffect(() => {
    fetchMenuItems() 
      .then(items => {
        setMenuMap(new Map(items.map(item => [item.id, item])));
      });
  }, []);

  const items = useMemo(() => 
    ids.map(id => menuMap.get(id)).filter(Boolean),
    [ids, menuMap]
  );

  const styles = useMemo(
    () => `
      .fav-wrap{max-width:1140px;margin:0 auto;padding:16px; min-height: 80vh; background: #ffffffff;}
      
      /* Header gọn gàng */
      .fav-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .title{font-size:20px; font-weight: 800; margin:0; color: #333;}
      .sub{ font-size: 13px; color: #666; }

      /* Hành động nhanh (Sticky bottom hoặc top) */
      .actions{ display:flex; gap:8px; overflow-x: auto; padding-bottom: 4px; }
      .btn-action { 
          font-size: 12px; padding: 6px 12px; border-radius: 20px; border: none; font-weight: 600; cursor: pointer; white-space: nowrap;
      }
      .btn-primary{background:#ff7a59;color:#fff; box-shadow: 0 2px 6px rgba(255,122,89,0.3);}
      .btn-danger{background:#fff; color:#e74c3c; border: 1px solid #e74c3c;}

      /* --- GRID 2 CỘT CHO MOBILE --- */
      .grid{ display:grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      
      @media (min-width: 768px) {
          .grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
          .fav-wrap { padding: 24px; }
      }

      /* Card Style */
      .card{ 
          background:#fff; border-radius: 12px; overflow:hidden; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 1px solid #eee;
          display: flex; flex-direction: column;
      }
      
      .thumb-link { display: block; position: relative; padding-top: 100%; }
      .thumb{ position: absolute; top: 0; left: 0; width:100%; height:100%; object-fit:cover; }
      
      .body{ padding: 10px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
      .name{ font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .price{ font-size: 15px; font-weight: 700; color: #ff7a59; margin-bottom: 8px; }
      
      .row{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top: auto; }
      
      /* Nút thêm vào giỏ nhỏ gọn */
      .btn-add { 
          flex: 1; background: #ff7a59; color: #fff; border: none; border-radius: 6px; 
          padding: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      /* Nút tim */
      .btn-heart {
          background: #fff5f5; color: #e74c3c; border: 1px solid #ffdada; border-radius: 6px;
          padding: 5px 8px; cursor: pointer; font-size: 14px;
      }

      .empty{ text-align: center; padding: 40px 20px; color: #999; }
      .empty a { color: #ff7a59; text-decoration: none; }

      .dark .fav-wrap { background: #121212; }
      .dark .card{background:#1e1e1e; border-color:#333;}
      .dark .name { color: #eee; }
      .dark .title { color: #eee; }
    `,
    []
  );

  useEffect(() => {
    const id = "favorites-mobile-style";
    if (!document.getElementById(id)) {
      const tag = document.createElement("style");
      tag.id = id;
      tag.textContent = styles;
      document.head.appendChild(tag);
    }
  }, [styles]);

  const ph = "/assets/images/menu/placeholder.png";

  const handleAddAllToCart = () => {
    if (items.length === 0) return;
    const firstMerchantId = items[0].merchantId;
    let count = 0;
    for (const it of items) {
        if (it.merchantId === firstMerchantId) {
            add(it, it.merchantId);
            count++;
        }
    }
    toast.show(`Đã thêm ${count} món vào giỏ`, "success");
  };

  const handleClearAllFav = () => {
    if (ids.length === 0) return;
    
    // GỌI HÀM CLEAR TỪ CONTEXT (chỉ 1 lần API call)
    clearAll(); 
    
    toast.show("Đã xoá hết danh sách yêu thích", "info");
};

  return (
    <div className="fav-wrap">
      <div className="fav-header">
          <div>
            <h2 className="title">Yêu thích</h2>
            <span className="sub">{count} món đã lưu</span>
          </div>
          {items.length > 0 && (
            <div className="actions">
                <button className="btn-action btn-primary" onClick={handleAddAllToCart}>+ Tất cả vào giỏ</button>
                <button className="btn-action btn-danger" onClick={handleClearAllFav}>Xoá hết</button>
            </div>
          )}
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div style={{fontSize: 40, marginBottom: 10}}>💔</div>
          Chưa có món yêu thích.<br/>
          Vào <Link to="/">Trang chủ</Link> thả tim nhé!
        </div>
      ) : (
        <div className="grid">
          {items.map(it => {
            const isFav = has(it.id);
            return (
              <div className="card" key={it.id}>
                <div className="thumb-link">
                    <img className="thumb" src={it.image || ph} alt={it.name} onError={e=>e.target.src=ph} />
                </div>
                <div className="body">
                  <div>
                    <div className="name">{it.name}</div>
                    <div className="price">{it.price.toLocaleString()}₫</div>
                  </div>

                  <div className="row">
                    <button
                      className="btn-add"
                      onClick={() => add(it, it.merchantId)}
                    >
                      + Thêm
                    </button>

                    <button
                      className="btn-heart"
                      onClick={() => {
                        toggle(it.id);
                        toast.show("Đã bỏ thích", "info");
                      }}
                    >
                      ❤️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}