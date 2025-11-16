// src/pages/SearchResults.jsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
// 💡 BỎ menuData.js
import { fetchMenuItems } from '../utils/menuAPI.js'; // Import fetchMenuItems (sẽ cần sửa menuAPI một chút để hỗ trợ search text nếu chưa có)
import { formatVND } from '../utils/format';

// Nếu fetchMenuItems chưa hỗ trợ search text, ta có thể fetch all rồi filter ở FE (đơn giản cho PoC)
// Hoặc dùng json-server like operator: /menuItems?name_like=...

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function SearchResults() {
  const q = (useQuery().get('q') || '').trim().toLowerCase();
  const nav = useNavigate();

  const { items = [], add } = useCart();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qtyMap, setQtyMap] = useState({});

  const setQty = (id, v) =>
    setQtyMap(s => ({ ...s, [id]: Math.max(1, parseInt(v || 1, 10)) }));

  const inCart = (id) => items.some(c => String(c.id) === String(id));

  useEffect(() => {
    async function searchApi() {
        setLoading(true);
        try {
            // 💡 Lấy toàn bộ menu items (đã duyệt) rồi lọc ở FE
            // Hoặc gọi API: fetchMenuItems(null, 'approved')
            // Trong menuAPI.js:
            const allItems = await fetchMenuItems(null, 'approved');
            
            const res = allItems.filter(x => {
                const name = (x.name || '').toLowerCase();
                const cat  = (x.category || '').toLowerCase();
                return q ? (name.includes(q) || cat.includes(q)) : true;
            });
            setList(res);
        } catch (e) {
            console.error(e);
            setList([]);
        } finally {
            setLoading(false);
        }
    }
    searchApi();
  }, [q]);
  
  const css = useMemo(() => `
    .sr-wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .sr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
    .card{
      border:1px solid #eee;background:#fff;border-radius:12px;overflow:hidden;
      max-width:360px;margin:0 auto;
    }
    .thumb{
      width:100%;
      aspect-ratio:4/3;
      height:auto;
      object-fit:cover;
      object-position:center;
      background:#f6f6f6;
      display:block;
      image-rendering:-webkit-optimize-contrast;
    }
    .card-body{padding:12px}
    .name{font-weight:800;margin:0 0 6px}
    .price{font-weight:700;margin-bottom:8px}
    .act{display:flex;gap:8px;align-items:center}
    .qty{width:64px;height:36px;border:1px solid #e6e6ea;border-radius:10px;text-align:center}
    .btn{flex:1;height:36px;border:1px solid #eee;background:#fff;border-radius:18px;cursor:pointer;font-weight:800}
    .btn.primary{background:#ff7a59;color:#fff;border-color:#ff7a59}
    .to-cart{flex:1;height:36px;border:none;border-radius:18px;background:#ff7a59;color:#fff;font-weight:800;cursor:pointer}
    .dark .card{background:#151515;border-color:#333}
    .dark .btn,.dark .qty{background:#111;color:#eee;border-color:#333}
  `, []);

  return (
    <section className="sr-wrap">
      <style>{css}</style>
      <h2>Kết quả cho: “{q || 'tất cả'}”</h2>

      {loading ? <p>Đang tìm kiếm...</p> : !list.length ? (
        <p>Không tìm thấy món phù hợp. <Link to="/">Về trang chủ</Link></p>
      ) : (
        <div className="sr-grid">
          {list.map(it => {
            const has = inCart(it.id);
            const qty = qtyMap[it.id] || 1;
            return (
                <article className="card" key={it.id}>
                  <img className="thumb" src={it.image} onError={e=>e.target.src='/assets/images/Delivery.png'} />
                  <div className="card-body">
                      <div className="name">{it.name}</div>
                      <div className="price">{formatVND(it.price)}</div>
                      
                      {/* Form thêm vào giỏ - Lưu ý cần merchantId */}
                      {has ? (
                          <div className="act"><button className="to-cart" onClick={()=>nav('/cart')}>Tới giỏ hàng</button></div>
                      ) : (
                          <form className="act" onSubmit={(e)=>{
                              e.preventDefault();
                              // 💡 QUAN TRỌNG: Cần merchantId để add vào giỏ
                              if (!it.merchantId) { alert('Món ăn lỗi: Thiếu merchantId'); return; }
                              add({ id: it.id, name: it.name, price: it.price, image: it.image }, it.merchantId, qty);
                          }}>
                              <input type="number" min="1" className="qty" value={qty} onChange={e=>setQty(it.id, e.target.value)} />
                              <button type="submit" className="btn primary">+ Thêm</button>
                          </form>
                      )}
                    </div>
                </article>
            )
          })}
        </div>
      )}
    </section>
  );
}
