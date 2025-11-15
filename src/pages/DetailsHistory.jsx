// src/pages/DetailsHistory.jsx
import { useEffect, useMemo, useState } from 'react'
import { myOrders, getMenu } from '../utils/orderAPI.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useNavigate } from 'react-router-dom'
import MENU_ALL from '../data/menuData.js'

const FALLBACK = 'public/assets/images/Delivery.png'
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
    order:      { bg:'#fff0e9', bd:'#ffd8c6', c:'#c24a26', label:'order' },
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
  const { user } = useAuth()
  const cartCtx = useCart?.() || {}
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState({})

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [{ rows }, mn] = await Promise.all([
        myOrders({ page: 1, limit: 250, status: 'all', sort: 'createdAt', order: 'desc' }),
        getMenu().catch(()=> MENU_ALL)
      ])
      setOrders(Array.isArray(rows) ? rows : [])
      setMenu((Array.isArray(mn) ? mn : MENU_ALL) || [])
    } catch (e) {
      console.error(e)
      setOrders([])
      setMenu(MENU_ALL || [])
      setError('Không tải được dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [])

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

  const menuMap = useMemo(() => {
    const m = {}
    ;(menu || []).forEach(it => { m[it.id] = it })
    ;(MENU_ALL || []).forEach(it => { m[it.id] = it })
    return m
  }, [menu])

  const my = useMemo(() => {
    let arr = (!user?.email) ? orders : orders.filter(o => o.userEmail === user.email)
    return [...arr].sort((a,b) => (b.createdAt||0)-(a.createdAt||0))
  }, [orders, user?.email])

  const css = `
    .dh-wrap{max-width:1000px;margin:24px auto;padding:0 16px}
    .title{font-size:28px;font-weight:900;text-align:center;margin:0 0 12px}
    .top{display:flex;justify-content:center;gap:12px;margin-bottom:12px}
    .ff-btn{height:32px;border:none;border-radius:16px;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .err{color:#c24a26;text-align:center;margin:6px 0}

    .user-card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;margin:0 auto 16px;max-width:860px}
    .user-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .user-grid div b{display:block;font-size:12px;color:#777}
    .dark .user-card{background:#151515;border-color:#333}
    .dark .user-grid div b{color:#aaa}

    .list{display:grid;grid-template-columns:1fr;gap:12px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:12px}
    .dark .card{background:#151515;border-color:#333}
    .head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
    .left h4{margin:0 0 4px;font-size:18px}
    .muted{opacity:.8}
    .right{text-align:right}
    .sum{font-weight:900}

    /* Luôn bám lề trái, tránh thừa CSS từ page khác */
    .actions{
      margin-top:10px;
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      justify-content:flex-start;   /* ← bám lề trái */
      align-items:center;
      text-align:left;
    }

    /* Scoped button styles để không bị "sáng" khi đổi route */
    .dh-wrap .btn{
      height:32px;
      border:none;
      border-radius:16px;
      padding:0 12px;
      background:#f4f4f6;
      cursor:pointer;
      color:#111;
      appearance:none;
      box-shadow:none;
      filter:none;
      margin:0 !important;          /* ← chặn margin:auto từ global */
      display:inline-flex;
      align-items:center;
      justify-content:center;
      transition:all .1s ease-in-out;
    }
    .dh-wrap .btn.primary{
      background:#ff7a59;
      color:#fff;
      appearance:none;
      box-shadow:none;
      filter:none;
      margin:0 !important;
    }
    .dh-wrap .btn:hover{filter:brightness(.98)}
    .dh-wrap .btn:active{transform:translateY(1px)}
    .dh-wrap .btn:disabled{opacity:.6;cursor:not-allowed}

    .items{margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
    .it{display:flex;gap:10px;align-items:center;border:1px dashed #eee;border-radius:12px;padding:8px}
    .thumb{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#f6f6f6}
    .meta b{display:block}
  `

  const getItemImage = (it) => it.image || menuMap[it.id]?.image || FALLBACK
  const toggle = (id) => setOpen(v => ({ ...v, [id]: !v[id] }))

  // Đặt lại giỏ hàng từ order
  const reorder = (order) => {
    const { add, addItem, addToCart } = cartCtx
    const tryAdd = (p, q) => {
      if (typeof add === 'function')      return add(p, q)
      if (typeof addItem === 'function')  return addItem(p, q)
      if (typeof addToCart === 'function')return addToCart(p, q)
      return false
    }

    let usedContext = false
    for (const it of (order.items || [])) {
      const payload = { id: it.id, name: it.name, price: it.price, image: getItemImage(it), qty: it.qty }
      const r = tryAdd(payload, it.qty || 1)
      if (r !== false) usedContext = true
    }

    if (!usedContext) {
      try { sessionStorage.setItem('ff_reorder_buffer', JSON.stringify(order.items || [])) } catch {}
    }
    navigate('/cart')
  }

  return (
    <section className="dh-wrap">
      <style>{css}</style>

      <div className="top">
        <button className="ff-btn" onClick={load}>Refresh</button>
      </div>

      <h2 className="title">Lịch sử đơn hàng</h2>
      {error && <div className="err">{error}</div>}

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
            const created = o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'
            const items = Array.isArray(o.items) ? o.items : []
            const subtotal = items.reduce((s,it)=>s+(it.price||0)*(it.qty||0),0)
            const total = o.finalTotal ?? o.total ?? subtotal
            return (
              <article className="card" key={o.id}>
                <div className="head">
                  <div className="left">
                    <h4>Order <b>#{o.id}</b></h4>
                    <div className="muted">Thời gian: {created}</div>
                    <div style={{marginTop:6}}>
                      <StatusBadge s={o.status} />
                    </div>
                  </div>
                  <div className="right">
                    {o.couponCode && (
                      <div className="muted">Mã: <b>{o.couponCode}</b> — Giảm: -{VND(o.discount || 0)}</div>
                    )}
                    <div className="sum" style={{fontSize:18}}>Tổng đơn: {VND(total)}</div>
                    <div className="muted">Tạm tính: {VND(subtotal)}</div>
                  </div>
                </div>

                {/* Hàng nút: luôn bám lề trái */}
                <div className="actions">
                  <button className="btn" onClick={()=>toggle(o.id)}>
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
