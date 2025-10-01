import { useEffect, useMemo, useState } from 'react'
import { getAllOrders } from '../utils/api'

const VND = (n) => (n ?? 0).toLocaleString('vi-VN') + '₫'

// Chuẩn hoá DB → UI status
function normalizeStatus(db) {
  const s = (db || '').toLowerCase()
  if (!s) return 'order'
  if (['new','pending','confirmed'].includes(s)) return 'order'
  if (s === 'preparing')  return 'processing'
  if (s === 'delivering') return 'delivery'
  if (s === 'delivered')  return 'done'
  return 'order'
}

function Sk({ h=16, w='100%', style={} }){
  return (
    <div style={{
      height: h, width: w, borderRadius: 8,
      background: 'linear-gradient(90deg,#eee,#f7f7f7,#eee)',
      backgroundSize: '200% 100%',
      animation: 'adb-sk 1s linear infinite',
      ...style
    }}/>
  )
}
if (!document.getElementById('adb-sk-style')) {
  const s = document.createElement('style')
  s.id = 'adb-sk-style'
  s.innerHTML = `@keyframes adb-sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`
  document.head.appendChild(s)
}

export default function AdminDashboard(){
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true); setError('')
      const data = await getAllOrders()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setError('Không tải được dữ liệu. Vui lòng kiểm tra kết nối.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() },[])

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

  const summary = useMemo(() => {
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0)
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)

    let revenueToday = 0
    let revenueMonth = 0

    const byStatus = { order:0, processing:0, delivery:0, done:0 }
    for (const o of orders) {
      const total = o.finalTotal ?? o.total ?? 0
      const s = normalizeStatus(o.status)
      if (byStatus[s] != null) byStatus[s]++
      const d = o.createdAt ? new Date(o.createdAt) : null
      if (d) {
        if (d >= startOfToday) revenueToday += total
        if (d >= startOfMonth) revenueMonth += total
      }
    }

    // nhóm doanh thu 7 ngày
    const days = []
    const fmt = (d) => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' })
    for (let i = 6; i >= 0; i--) {
      const day = new Date(); day.setHours(0,0,0,0); day.setDate(day.getDate()-i)
      const next = new Date(day); next.setDate(day.getDate()+1)
      const sum = orders.reduce((s, o) => {
        const t = o.createdAt ? new Date(o.createdAt) : null
        if (t && t >= day && t < next) s += (o.finalTotal ?? o.total ?? 0)
        return s
      }, 0)
      days.push({ label: fmt(day), value: sum })
    }

    const maxVal = Math.max(...days.map(d=>d.value), 1)
    return {
      totalOrders: orders.length,
      revenueToday,
      revenueMonth,
      byStatus,
      days,
      maxVal
    }
  }, [orders])

  const styles = `
    .adb-wrap{padding:24px 0}
    .topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .title{font-size:20px;font-weight:800;margin:0 0 6px}
    .val{font-size:22px;font-weight:900}
    .muted{opacity:.75}
    .row{display:flex;justify-content:space-between;align-items:center;margin:6px 0}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#f7f7f7;border:1px solid #e8e8e8;text-transform:capitalize}
    .badge.order{background:#fff0e9;border-color:#ffd8c6;color:#c24a26}
    .badge.processing{background:#fff7cd;border-color:#ffeaa1;color:#7a5a00}
    .badge.delivery{background:#e8f5ff;border-color:#cfe8ff;color:#0b68b3}
    .badge.done{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    .bars{display:flex;gap:8px;align-items:flex-end;height:120px;margin-top:8px}
    .bar{flex:1;background:#ffe8e0;border:1px solid #ffb199;border-radius:6px 6px 0 0;display:flex;align-items:flex-end;justify-content:center}
    .bar > span{font-size:11px;margin-bottom:4px;opacity:.9}
    .xaxis{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:6px;font-size:11px;color:#666;text-align:center}
    .tools{display:flex;gap:8px;align-items:center}
    .btn{height:34px;border:none;border-radius:8px;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .dark .card{background:#151515;border-color:#333}
  `

  return (
    <section className="ff-container adb-wrap">
      <style>{styles}</style>

      <div className="topbar">
        <h2 style={{margin:0}}>Bảng điều khiển</h2>
        <div className="tools">
          <button className="btn" onClick={load}>Làm mới</button>
        </div>
      </div>

      {loading ? (
        <div className="grid">
          <div className="card"><Sk h={18} w="40%" style={{marginBottom:8}} /><Sk h={28} w="60%" /></div>
          <div className="card"><Sk h={18} w="50%" style={{marginBottom:8}} /><Sk h={28} w="70%" /></div>
          <div className="card"><Sk h={18} w="50%" style={{marginBottom:8}} /><Sk h={28} w="70%" /></div>
          <div className="card"><Sk h={18} w="50%" style={{marginBottom:8}} /><Sk h={28} w="70%" /></div>
        </div>
      ) : error ? (
        <div className="card" style={{borderColor:'#f9c7c7', background:'#fde8e8', color:'#b80d0d'}}>
          ❌ {error}
        </div>
      ) : (
        <>
          {/* Cards summary */}
          <div className="grid">
            <div className="card">
              <div className="title">Doanh thu hôm nay</div>
              <div className="val">{VND(summary.revenueToday)}</div>
            </div>
            <div className="card">
              <div className="title">Doanh thu tháng này</div>
              <div className="val">{VND(summary.revenueMonth)}</div>
            </div>
            <div className="card">
              <div className="title">Tổng số đơn</div>
              <div className="val">{summary.totalOrders}</div>
            </div>
            <div className="card">
              <div className="title">Đơn chờ (order)</div>
              <div className="val">{summary.byStatus.order}</div>
            </div>
          </div>

          {/* Status breakdown (không có cancelled) */}
          <div className="grid">
            {['order','processing','delivery','done'].map(s=>(
              <div className="card" key={s}>
                <div className="row">
                  <span className={`badge ${s}`}>{s}</span>
                  <b>{summary.byStatus[s]}</b>
                </div>
                <div className="muted">Số đơn theo trạng thái</div>
              </div>
            ))}
          </div>

          {/* 7-day revenue */}
          <div className="card" style={{marginTop:12}}>
            <div className="title">Doanh thu 7 ngày</div>
            <div className="bars">
              {summary.days.map(d => {
                const h = summary.maxVal ? Math.round(100 * d.value / summary.maxVal) : 0
                return (
                  <div key={d.label} className="bar" style={{height: Math.max(8, h) + '%'}}>
                    <span>{d.value ? VND(d.value) : ''}</span>
                  </div>
                )
              })}
            </div>
            <div className="xaxis">
              {summary.days.map(d => <div key={d.label}>{d.label}</div>)}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
