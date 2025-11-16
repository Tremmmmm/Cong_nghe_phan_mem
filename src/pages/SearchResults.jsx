import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { fetchMenuItems } from '../utils/menuAPI.js'; 
import { formatVND } from '../utils/format';

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

  useEffect(() => {
    async function searchApi() {
        setLoading(true);
        try {
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
    .sr-wrap{max-width:1100px;margin:0 auto;padding:20px 16px; background: #f5f5f5; min-height: 100vh;}
    h2 { font-size: 18px; margin-bottom: 16px; color: #333; }

    /* --- GRID 2 CỘT MOBILE --- */
    .sr-grid{ display:grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    
    @media (min-width: 768px) {
        .sr-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .sr-wrap { padding: 24px; }
    }

    .card{
        background:#fff; border-radius:12px; overflow:hidden; 
        border:1px solid #eee; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        display: flex; flex-direction: column;
    }
    .thumb-box { position: relative; padding-top: 100%; display: block; }
    .thumb{ position: absolute; top: 0; left: 0; width:100%; height:100%; object-fit:cover; }
    
    .card-body{ padding:10px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .name{ font-size:14px; font-weight:700; margin-bottom:4px; line-height: 1.3; }
    .price{ font-size:15px; font-weight:700; color:#ff7a59; margin-bottom: 8px; }
    
    .act{ display:flex; gap:6px; align-items:center; }
    .qty{ width:30px; height:32px; border:1px solid #ddd; border-radius:6px; text-align:center; font-size: 13px; }
    .btn{ flex:1; height:32px; border:none; border-radius:6px; background:#ff7a59; color:#fff; font-weight:600; cursor:pointer; font-size: 12px; }
    .to-cart{ flex:1; height:32px; border:1px solid #ff7a59; background:#fff; color:#ff7a59; border-radius:6px; font-weight:600; cursor:pointer; font-size: 12px; }
    
    .dark .card{background:#1e1e1e;border-color:#333}
    .dark .name {color:#eee}
    .dark .qty {background:#222; color:#eee; border-color:#444;}
  `, []);

  return (
    <section className="sr-wrap">
      <style>{css}</style>
      <h2>Kết quả: “{q}”</h2>

      {loading ? <p style={{textAlign:'center', color:'#888'}}>Đang tìm...</p> : !list.length ? (
        <div style={{textAlign:'center', padding: 40, color:'#999'}}>
            <div style={{fontSize: 40}}>🔍</div>
            Không tìm thấy món nào.
        </div>
      ) : (
        <div className="sr-grid">
          {list.map(it => {
            const qty = qtyMap[it.id] || 1;
            return (
              <article className="card" key={it.id}>
                <div className="thumb-box">
                    <img className="thumb" src={it.image} alt={it.name} onError={e=>{e.currentTarget.src='/assets/images/menu/placeholder.png'}} />
                </div>
                <div className="card-body">
                  <div>
                    <div className="name">{it.name}</div>
                    <div className="price">{formatVND(it.price || 0)}</div>
                  </div>

                  <form
                      className="act"
                      onSubmit={(e)=>{
                        e.preventDefault();
                        if (!it.merchantId) { alert('Món ăn lỗi'); return; }
                        add({ id: it.id, name: it.name, price: it.price, image: it.image }, it.merchantId, qty);
                      }}
                    >
                      <input type="number" min="1" className="qty" value={qty} onChange={e=>setQty(it.id, e.target.value)} />
                      <button type="submit" className="btn">+ Thêm</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}