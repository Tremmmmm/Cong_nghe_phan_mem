// src/pages/DetailsHistory.jsx
import { useEffect, useMemo, useState } from 'react'
import { myOrders } from '../utils/orderAPI.js'
// 💡 IMPORT TỪ MENU API, BỎ menuData.js
import { fetchMenuItems } from '../utils/menuAPI.js' 
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useNavigate } from 'react-router-dom'

const FALLBACK = '/assets/images/Delivery.png'
const VND = (n) => (n || 0).toLocaleString('vi-VN') + '₫'

// Map DB → 4 trạng thái chuẩn
function normalizeStatus(db) {
  const s = (db || '').toLowerCase()
  if (!s) return 'order'
  if (['new','pending','confirmed'].includes(s)) return 'order'
  if (s === 'preparing') return 'processing'
  if (s === 'delivering') return 'delivery'
  if (s === 'delivered') return 'done'
  if (s === 'cancelled') return 'cancelled'
  return 'order'
}

function StatusBadge({ s }) {
  const ui = normalizeStatus(s)
  const map = {
    order:      { bg:'#fff0e9', bd:'#ffe896ff', c:'#f78811ff', label:'order' },
    processing: { bg:'#fff7cd', bd:'#ffeaa1', c:'#7a5a00', label:'processing' },
    delivery:   { bg:'#e8f5ff', bd:'#cfe8ff', c:'#0b68b3', label:'delivery' },
    done:       { bg:'#eaf7ea', bd:'#cce9cc', c:'#2a7e2a', label:'done' },
    cancelled:  { bg:'#fde8e8', bd:'#f9c7c7', c:'#b80d0d', label:'cancelled' },
  }
  const t = map[ui] || map.order
  return (
    <span style={{
      display:'inline-block', padding:'2px 10px', borderRadius:999,
      background:t.bg, border:`1px solid ${t.bd}`, color:t.c,
      textTransform:'capitalize', fontWeight:700
    }}>{t.label}</span>
  )
}

export default function DetailsHistory(){
  const { user } = useAuth();
  const cartCtx = useCart?.() || {};
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [menuMap, setMenuMap] = useState({}); // 💡 Dùng map thay vì array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState({});

  const load = async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true); setError('');
      
      // 💡 Lấy đơn hàng VÀ lấy tất cả món ăn từ API (để hiển thị hình ảnh, tên món...)
      const [{ rows }, menuData] = await Promise.all([
        myOrders({ page: 1, limit: 250, status: 'all', sort: 'createdAt', order: 'desc', userId: user.id }),
        // 💡 Gọi fetchMenuItems từ API thay vì import file tĩnh
        fetchMenuItems().catch(() => []) 
      ]);

      setOrders(Array.isArray(rows) ? rows : []);
      
      // Tạo map id -> item để tra cứu nhanh
      const m = {};
      if (Array.isArray(menuData)) {
          menuData.forEach(it => { m[it.id] = it; });
      }
      setMenuMap(m);

    } catch (e) {
      console.error(e);
      setError('Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load() }, [user]);

  // revalidate khi quay lại tab/cửa sổ
  useEffect(() => {
    const onFocus = () => load()
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  const my = useMemo(() => {
     return [...orders].sort((a,b) => (b.createdAt||0)-(a.createdAt||0))
  }, [orders]);

  // const menuMap = useMemo(() => {
  //   const m = {}
  //   ;(menu || []).forEach(it => { m[it.id] = it })
  //   ;(MENU_ALL || []).forEach(it => { m[it.id] = it })
  //   return m
  // }, [menu])

  // const my = useMemo(() => {
  //   let arr = (!user?.email) ? orders : orders.filter(o => o.userEmail === user.email)
  //   return [...arr].sort((a,b) => (b.createdAt||0)-(a.createdAt||0))
  // }, [orders, user?.email])
const css = `
    /* --- GLOBAL LAYOUT --- */
    .dh-wrap{max-width:1000px;margin:0 auto;padding:20px 16px; background: #ffffffff; min-height: 100vh;}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .title{font-size:24px;font-weight:800;margin:0; color: #333;}
    
    .ff-btn{height:36px;border:none;border-radius:8px;background:#fff; border: 1px solid #ddd; color:#333;padding:0 14px;cursor:pointer; font-size: 14px; font-weight: 600;}
    .ff-btn:active{background:#f0f0f0}
    
    .list{display:grid;gap:16px}
    
    /* --- USER CARD (THÔNG TIN KHÁCH HÀNG) --- */
    .user-card{
        background:#fff; border-radius:12px; padding:16px; margin-bottom: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .user-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* Responsive grid */
        gap: 12px 20px; 
        font-size: 14px;
    }
    .user-grid div { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .user-grid b { 
        display: block; 
        font-weight: 700; 
        color: #ff7a59; /* Màu thương hiệu */
        margin-bottom: 2px;
        font-size: 11px;
        text-transform: uppercase;
    }

    /* --- ORDER CARD MOBILE & WEB --- */
    .card{
        background:#fff; border-radius:12px; padding:16px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.08); /* Bóng đổ mạnh hơn cho nổi bật */
        border: none; /* Bỏ border khi có shadow */
    }
    
    /* Header của Card: Mã đơn + Trạng thái */
    .head{ 
        display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px; 
        padding-bottom: 12px; border-bottom: 1px dashed #eee; 
    }
    .order-id { font-size: 18px; font-weight: 800; color: #333; }
    .order-date { font-size: 13px; color: #888; margin-top: 2px; }
    
    /* Tổng tiền nổi bật */
    .sum-row { display: flex; justify-content: flex-end; align-items: baseline; gap: 8px; margin-bottom: 16px; }
    .sum-label { font-size: 14px; color: #666; font-weight: 500;}
    .sum-val { 
        font-size: 22px; 
        font-weight: 900; 
        color: #ff7a59; 
        letter-spacing: -0.5px;
    }

    /* Nút hành động */
    .actions{ display:flex; gap:10px; }
    .btn { 
        flex: 1; height: 44px; border-radius: 8px; 
        font-size: 14px; font-weight: 700; color: #333; cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
    }
    .btn.secondary { background: #f0f0f0; border: none; color: #333; }
    .btn.secondary:hover { background: #e0e0e0; }
    .btn.primary { background: #ff7a59; color: #fff; border: none; }
    .btn.primary:hover { background: #e06a4b; }


    /* Chi tiết mở rộng */
    .items { 
        margin-top: 16px; border-top: 1px solid #eee; padding-top: 16px; 
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 15px;
    }
    .it { 
        display: flex; 
        gap: 12px; 
        background: #fcfcfc; /* Nền nhẹ cho item */
        padding: 8px;
        border-radius: 8px;
        border: 1px solid #f0f0f0;
    }
    .thumb { 
        width: 60px; height: 60px; 
        border-radius: 8px; 
        object-fit: cover; 
        background: #eee; 
        flex-shrink: 0;
    }
    .meta { flex: 1; font-size: 14px; }
    .meta b { display: block; margin-bottom: 2px; color: #333; font-weight: 600; font-size: 15px;}
    .meta .muted { color: #888; font-size: 13px; }
    .meta .sum { font-weight: 700; color: #ff7a59; }

    /* --- RESPONSIVE MOBILE --- */
    @media (max-width: 600px) {
        .dh-wrap { padding: 10px; }
        .title { font-size: 20px; }
        .ff-btn { height: 32px; padding: 0 10px; font-size: 12px; }
        .user-grid { grid-template-columns: 1fr; gap: 8px 0; } /* 1 cột trên mobile */
        .card { padding: 12px; }
        .order-id { font-size: 16px; }
        .sum-val { font-size: 20px; }
        .btn { height: 40px; font-size: 13px; }
        .items { grid-template-columns: 1fr; gap: 10px; }
    }

    .dark .dh-wrap { background: #121212; }
    .dark .card, .dark .user-card { background: #1e1e1e; box-shadow: 0 4px 8px rgba(0,0,0,0.4); }
    .dark .title, .dark .order-id, .dark .meta b { color: #eee; }
    .dark .ff-btn { background: #222; border-color: #444; color: #eee; }
    .dark .btn.secondary { background: #333; color: #eee; }
    .dark .btn.secondary:hover { background: #444; }
    .dark .items { background: #1f1f1f; }
    .dark .it { background: #2a2a2a; border-color: #444; }
  `;

  const getItemImage = (it) => it.image || menuMap[it.id]?.image || FALLBACK;
  const toggle = (id) => setOpen(v => ({ ...v, [id]: !v[id] }));
  
  const reorder = (order) => {
      const { add } = cartCtx;
      for (const it of (order.items || [])) {
          const menuItem = menuMap[it.id] || it;
          const payload = { 
              id: it.id, 
              name: menuItem.name || it.name, 
              price: menuItem.price || it.price, 
              image: menuItem.image || getItemImage(it), 
              merchantId: menuItem.merchantId || it.merchantId
          };
          if (typeof add === 'function') add(payload, it.qty || 1);
      }
      navigate('/cart');
    }

  return (
    <section className="dh-wrap">
      <style>{css}</style>

      <div className="top">
        <h2 className="title">Lịch sử đơn hàng</h2>
        <button className="ff-btn" onClick={load}>Refresh</button>
      </div>

      {error && <div className="card" style={{color: '#b80d0d', borderColor: '#f9c7c7'}}>{error}</div>}

      {/* user block */}
      <div className="user-card">
        <div className="user-grid">
          <div><b>Name</b>{user?.name || user?.email?.split('@')[0] || '—'}</div>
          <div><b>Email</b>{user?.email || '—'}</div>
          <div><b>Contact</b>{my[0]?.phone || '—'}</div>
          <div><b>Address</b>{my[0]?.address || '—'}</div>
        </div>
      </div>

      {loading ? (
        <div className="card">Đang tải…</div>
      ) : my.length === 0 ? (
        <div className="card">Chưa có đơn hàng nào.</div>
      ) : (
        <div className="list">
            {my.map((o) => {
            const created = o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN', { 
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '—'
            const items = Array.isArray(o.items) ? o.items : []
            const subtotal = items.reduce((s,it)=>s+(it.price||0)*(it.qty||0),0)
            const total = o.finalTotal ?? o.total ?? subtotal
            return (
              <article className="card" key={o.id}>
                <div className="head">
                    <div>
                        <div className="order-id">#{o.id}</div>
                        <div className="order-date">{created}</div>
                    </div>
                    <StatusBadge s={o.status} />
                </div>
            
                <div className="sum-row">
                    <span className="sum-label">Tổng cộng:</span>
                    <span className="sum-val">{VND(total)}</span>
                </div>

                {/* Hàng nút: luôn bám lề trái */}
                <div className="actions">
                    <button className="btn secondary" onClick={()=>toggle(o.id)}>
                        {open[o.id] ? 'Ẩn món' : `Xem món (${items.length})`}
                    </button>
                    {items.length > 0 && (
                        <button className="btn primary" onClick={()=>reorder(o)}>
                        Đặt lại
                        </button>
                    )}
                </div>

                {open[o.id] && (
                  <div className="items">
                    {items.map((it, i) => (
                      <div className="it" key={`${o.id}-${i}`}>
                        <img className="thumb" src={getItemImage(it)} alt={it.name}
                             onError={(e)=>{e.currentTarget.src=FALLBACK}} />
                        <div className="meta">
                          <b>{it.name}</b>
                          <div className="muted">
                            {VND(it.price)} × {it.qty} → <span className="sum">{VND((it.price||0)*(it.qty||0))}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}