import { useEffect, useMemo, useState } from 'react'
import { myOrders, updateOrderStatus } from '../utils/api'
import { exportCsv } from '../utils/exportCsv'

const UI_STATUSES = ['order','processing','delivery','done','cancelled'];
const UI_SUMMARY  = ['order','processing','delivery','done'];

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
function denormalizeStatus(ui) {
  const s = (ui || '').toLowerCase()
  if (s === 'order') return 'confirmed'
  if (s === 'processing') return 'preparing'
  if (s === 'delivery') return 'delivering'
  if (s === 'done') return 'delivered'
  if (s === 'cancelled') return 'cancelled'
  return 'confirmed'
}
const VND = (n)=> (n ?? 0).toLocaleString('vi-VN') + '₫'

export default function AdminOrders({ variant }) {
  const isRestaurant = variant === 'restaurant'

  const [rows, setRows] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)

  // filter/search/sort/pagination
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pageCount, setPageCount] = useState(1)

  const fetchData = async () => {
    try {
      setLoading(true)

      // Luôn lấy full rồi FE filter
      const res = await myOrders({
        page: 1,
        limit: 10000,
        status: 'all',
        q: '',
        sort: 'createdAt',
        order: 'desc'
      })

      const arr = Array.isArray(res) ? res : (res?.rows || res?.data || [])
      let list = (arr || []).map(o => ({ ...o, _uiStatus: normalizeStatus(o.status) }))

      // search
      const t = (q || '').trim().toLowerCase()
      if (t) {
        list = list.filter(o =>
          String(o.id).toLowerCase().includes(t) ||
          (o.customerName || '').toLowerCase().includes(t) ||
          (o.phone || '').toLowerCase().includes(t) ||
          (o.address || '').toLowerCase().includes(t) ||
          (o.couponCode || '').toLowerCase().includes(t)
        )
      }

      // filter theo UI status
      if (filter !== 'all') {
        list = list.filter(o => o._uiStatus === filter)
      } else if (isRestaurant) {
        // Restaurant: mặc định ẩn cancelled khi filter = all
        list = list.filter(o => o._uiStatus !== 'cancelled')
      }

      // sort createdAt desc
      list.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0))

      setFiltered(list)

      // pagination
      const pc = Math.max(1, Math.ceil(list.length / limit))
      const safePage = Math.min(page, pc)
      const start = (safePage - 1) * limit
      const end = start + limit

      setRows(list.slice(start, end))
      setPageCount(pc)
      if (safePage !== page) setPage(safePage)
    } finally {
      setLoading(false)
    }
  }

  // tải lần đầu + khi điều kiện lọc/sort/trang thay đổi
  useEffect(()=>{ fetchData() }, [page, limit, filter, q, isRestaurant])

  // ✅ Revalidate khi cửa sổ/Tab lấy lại focus
  useEffect(() => {
    const onFocus = () => fetchData()
    const onVis = () => { if (document.visibilityState === 'visible') fetchData() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [page, limit, filter, q, isRestaurant])

  // Transitions tuần tự
  const canToProcessing = (ui) => ui === 'order'
  const canToDelivery   = (ui) => ui === 'processing'
  const canToDone       = (ui) => ui === 'delivery'

  const changeStatus = async (id, targetUi) => {
    const serverStatus = denormalizeStatus(targetUi)
    const updated = await updateOrderStatus(id, serverStatus)
    const apply = (o)=> o.id === id
      ? { ...o, ...(updated || {}), status: serverStatus, _uiStatus: targetUi }
      : o
    setRows(prev => prev.map(apply))
    setFiltered(prev => prev.map(apply))
  }

  const ts = () => new Date().toISOString().replace(/[:.]/g,'-')
  const onExportPage = () => exportCsv(`orders_page_${page}_${ts()}.csv`, rows)
  const onExportAll  = () => exportCsv(`orders_all_filtered_${ts()}.csv`, filtered)

  const summary = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    let revenue = 0, todayCount = 0
    const byStatus = Object.fromEntries(UI_SUMMARY.map(s=>[s,0]))
    for (const o of rows) {
      if (o._uiStatus !== 'cancelled') revenue += (o.finalTotal ?? o.total ?? 0)
      if (byStatus[o._uiStatus] != null) byStatus[o._uiStatus]++
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
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#f7f7f7;border:1px solid #e8e8e8;text-transform:capitalize;font-weight:700}
    .badge.order{background:#fff0e9;border-color:#ffd8c6;color:#c24a26}
    .badge.processing{background:#fff7cd;border-color:#ffeaa1;color:#7a5a00}
    .badge.delivery{background:#e8f5ff;border-color:#cfe8ff;color:#0b68b3}
    .badge.done{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    .badge.cancelled{background:#fde8e8;border-color:#f9c7c7;color:#b80d0d}
    .sum{font-weight:800}
    .ff-btn{height:36px;border:none;border-radius:18px;background:#ff7a59;color:#fff;padding:0 14px;cursor:pointer}
    select,input[type=text]{height:32px;border-radius:8px;border:1px solid #ddd;padding:0 8px}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px}
    .pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px}
    .pager button{height:32px;border:none;border-radius:8px;padding:0 10px;background:#f0f0f0;cursor:pointer}
    .grid-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .act{display:flex;gap:8px;flex-wrap:wrap}
    .btn{height:32px;border:none;border-radius:16px;padding:0 12px;background:#f4f4f6;cursor:pointer}
    .btn.primary{background:#ff7a59;color:#fff}
    .btn:disabled{opacity:.5;cursor:not-allowed}
  `

  return (
    <section className="ff-container adm-wrap">
      <style>{styles}</style>

      <div className="topbar">
        <h2>{isRestaurant ? 'Restaurant Orders' : 'Quản trị đơn hàng'}</h2>
        <div className="grid-actions">
          <button className="ff-btn" onClick={fetchData}>Refresh</button>

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
              <option value="all">Tất cả{isRestaurant ? ' (ẩn cancelled)' : ''}</option>
              {UI_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <span>Hiển thị:</span>
            <select value={limit} onChange={e=>{ setLimit(Number(e.target.value)); setPage(1); }}>
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </label>

          {!isRestaurant && (
            <>
              <button className="ff-btn" onClick={onExportPage}>Export CSV (trang)</button>
              <button className="ff-btn" onClick={onExportAll}>Export CSV (tất cả)</button>
            </>
          )}
        </div>
      </div>

      {/* Cards tổng quan (trang hiện tại) */}
      <div className="cards">
        <div className="order-card">
          <div><b>Doanh thu (trang)</b></div>
          <div className="sum" style={{fontSize:20}}>{VND(summary.revenue)}</div>
        </div>
        <div className="order-card">
          <div><b>Đơn hôm nay (trang)</b></div>
          <div className="sum" style={{fontSize:20}}>{summary.todayCount}</div>
        </div>
        <div className="order-card">
          <div><b>Tổng đơn (trang)</b></div>
          <div className="sum" style={{fontSize:20}}>{summary.total}</div>
        </div>
        {UI_SUMMARY.map(s=>(
          <div key={s} className="order-card">
            <div><span className={`badge ${s}`}>{s}</span></div>
            <div className="sum" style={{fontSize:20}}>{summary.byStatus[s] || 0}</div>
          </div>
        ))}
      </div>

      {loading ? 'Đang tải…' : (!rows.length ? 'Không có đơn.' : (
        <>
          <div className="orders">
            {rows.map(o => {
              const ui = o._uiStatus
              return (
                <article key={o.id} className="order-card">
                  <header className="order-head">
                    <div>
                      <strong>Đơn #{o.id}</strong>
                      <div style={{opacity:.7}}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'}
                      </div>
                    </div>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <span className={`badge ${ui}`}>{ui}</span>
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

                  <footer className="order-foot" style={{marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                    <div>
                      <div><strong>{o.customerName}</strong></div>
                      <div style={{opacity:.8}}>{o.phone} — {o.address}</div>
                      {o.couponCode && (
                        <div style={{opacity:.8}}>Mã: {o.couponCode} — Giảm: -{VND(o.discount||0)}</div>
                      )}
                    </div>

                    <div className="act">
                      <button
                        className="btn"
                        disabled={ui !== 'order'}
                        onClick={()=>changeStatus(o.id, 'processing')}
                      >Start processing</button>

                      <button
                        className="btn"
                        disabled={ui !== 'processing'}
                        onClick={()=>changeStatus(o.id, 'delivery')}
                      >Start delivery</button>

                      <button
                        className="btn primary"
                        disabled={ui !== 'delivery'}
                        onClick={()=>changeStatus(o.id, 'done')}
                      >Mark done</button>
                    </div>
                  </footer>
                </article>
              )
            })}
          </div>

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
