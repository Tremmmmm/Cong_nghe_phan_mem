// src/pages/AdminOrders.jsx
import { useEffect, useMemo, useState } from 'react'
import { myOrders, updateOrderStatus } from '../utils/api'

const RAW_STATUSES = ['new','pending','confirmed','preparing','delivering','delivered','cancelled']

function normalizeStatus(s) {
  // đồng bộ: 'new' (db) -> 'pending' (UI)
  if (!s) return 'pending'
  if (s === 'new') return 'pending'
  return s
}
function denormalizeStatus(ui) {
  // UI 'pending' -> db 'new'
  if (ui === 'pending') return 'new'
  return ui
}
function VND(n){ return (n ?? 0).toLocaleString('vi-VN') + '₫' }

export default function AdminOrders(){
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  // filter/search/sort/pagination
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pageCount, setPageCount] = useState(1)

  const [auto, setAuto] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      const { rows: data, pageCount: pc } = await myOrders({
        page, limit, status: filter, q, sort: 'createdAt', order: 'desc'
      })
      const norm = (data || []).map(o => ({ ...o, status: normalizeStatus(o.status) }))
      setRows(norm)
      setPageCount(pc)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ fetchData() }, [page, limit, filter, q])
  useEffect(() => {
    if (!auto) return
    const t = setInterval(fetchData, 5000) // 5s
    return () => clearInterval(t)
  }, [auto, page, limit, filter, q])

  const changeStatus = async (id, uiStatus) => {
    const serverStatus = denormalizeStatus(uiStatus)
    const updated = await updateOrderStatus(id, serverStatus)
    setRows(prev => prev.map(o =>
      o.id === id ? { ...o, ...(updated || {}), status: normalizeStatus(serverStatus) } : o
    ))
  }

  // Tổng quan (dựa trên trang hiện tại)
  const summary = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    let revenue = 0, todayCount = 0
    const byStatus = Object.fromEntries(RAW_STATUSES.map(s=>[normalizeStatus(s),0]))
    for (const o of rows) {
      revenue += (o.finalTotal ?? o.total ?? 0)
      const s = normalizeStatus(o.status)
      if (byStatus[s] != null) byStatus[s]++
      const d = o.createdAt ? new Date(o.createdAt) : null
      if (d && d >= today) todayCount++
    }
    return { revenue, todayCount, byStatus, total: rows.length }
  }, [rows])

  const styles = `
    .adm-wrap{padding:24px 0}
    .topbar{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-bottom:12px}
    .order-card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .orders{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:12px}
    .order-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
    .order-item-row{display:flex;gap:8px;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #e9e9e9}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#f7f7f7;border:1px solid #e8e8e8;text-transform:capitalize}
    .badge.pending{background:#fff0e9;border-color:#ffd8c6;color:#c24a26}
    .badge.confirmed{background:#e8f5ff;border-color:#cfe8ff;color:#0b68b3}
    .badge.preparing{background:#fff7cd;border-color:#ffeaa1;color:#7a5a00}
    .badge.delivering{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    .badge.delivered{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    .badge.cancelled{background:#fde8e8;border-color:#f9c7c7;color:#b80d0d}
    .sum{font-weight:800}
    .ff-btn{height:36px;border:none;border-radius:18px;background:#ff7a59;color:#fff;padding:0 14px;cursor:pointer}
    select,input[type=text]{height:32px;border-radius:8px;border:1px solid #ddd;padding:0 8px}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px}
    .pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px}
    .pager button{height:32px;border:none;border-radius:8px;padding:0 10px;background:#f0f0f0;cursor:pointer}
    .grid-actions{display:flex;gap:10px;align-items:center}
  `

  return (
    <section className="ff-container adm-wrap">
      <style>{styles}</style>

      <div className="topbar">
        <h2>Quản trị đơn hàng</h2>
        <div className="grid-actions">
          <button className="ff-btn" onClick={fetchData}>Refresh</button>
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)} /> Auto refresh (5s)
          </label>
          <input
            type="text"
            placeholder="Tìm theo ID/Name/Phone…"
            value={q}
            onChange={e=>{ setQ(e.target.value); setPage(1); }}
            style={{minWidth:220}}
          />
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <span>Lọc:</span>
            <select value={filter} onChange={e=>{ setFilter(e.target.value); setPage(1); }}>
              <option value="all">Tất cả</option>
              {['pending','confirmed','preparing','delivering','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <span>Hiển thị:</span>
            <select value={limit} onChange={e=>{ setLimit(Number(e.target.value)); setPage(1); }}>
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Tổng quan (trên trang hiện tại) */}
      <div className="cards">
        <div className="order-card"><div><b>Doanh thu (trang)</b></div><div className="sum" style={{fontSize:20}}>{VND(summary.revenue)}</div></div>
        <div className="order-card"><div><b>Đơn hôm nay (trang)</b></div><div className="sum" style={{fontSize:20}}>{summary.todayCount}</div></div>
        <div className="order-card"><div><b>Tổng đơn (trang)</b></div><div className="sum" style={{fontSize:20}}>{summary.total}</div></div>
        {['pending','confirmed','preparing','delivering','delivered','cancelled'].map(s=>(
          <div key={s} className="order-card">
            <div><span className={`badge ${s}`}>{s}</span></div>
            <div className="sum" style={{fontSize:20}}>{summary.byStatus[s] || 0}</div>
          </div>
        ))}
      </div>

      {loading ? 'Đang tải…' : (!rows.length ? 'Không có đơn.' : (
        <>
          <div className="orders">
            {rows.map(o => (
              <article key={o.id} className="order-card">
                <header className="order-head">
                  <div>
                    <strong>Đơn #{o.id}</strong>
                    <div style={{opacity:.7}}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'}
                    </div>
                  </div>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    <select
                      value={normalizeStatus(o.status)}
                      onChange={e=>changeStatus(o.id, e.target.value)}
                    >
                      {['pending','confirmed','preparing','delivering','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="sum">{VND(o.finalTotal ?? o.total)}</div>
                  </div>
                </header>

                <div className="order-items">
                  {o.items?.map((it, idx) => (
                    <div key={`${o.id}-${idx}`} className="order-item-row">
                      <div className="flex-1">{it.name}</div>
                      <div>x{it.qty}</div>
                      <div className="sum">{VND((it.price||0)*(it.qty||0))}</div>
                    </div>
                  ))}
                </div>

                <footer className="order-foot" style={{marginTop:8}}>
                  <div>
                    <div><strong>{o.customerName}</strong></div>
                    <div style={{opacity:.8}}>{o.phone} — {o.address}</div>
                    {o.couponCode && (
                      <div style={{opacity:.8}}>Mã: {o.couponCode} — Giảm: -{VND(o.discount||0)}</div>
                    )}
                  </div>
                </footer>
              </article>
            ))}
          </div>

          {/* Phân trang */}
          <div className="pager">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1, p-1))}>‹ Trước</button>
            <span>Trang {page} / {pageCount}</span>
            <button disabled={page>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount, p+1))}>Sau ›</button>
          </div>
        </>
      ))}
    </section>
  )
}
