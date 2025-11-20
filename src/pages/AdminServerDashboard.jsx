// src/pages/AdminServerDashboard.jsx
import { useEffect, useMemo, useState, useCallback } from "react" // 💡 THÊM useCallback
import { getAllOrders } from "../utils/orderAPI.js"
import { fetchMerchants } from "../utils/merchantAPI.js"
import { formatVND } from "../utils/format"

// ====== CẤU HÌNH NGHIỆP VỤ CHO SUPER ADMIN ======
const PLATFORM_FEE_RATE = 0.15 // 15% commission tạm giả định
const MAX_BAR_HEIGHT = 150 // Chiều cao tối đa của thanh biểu đồ cột

const VND = (n) => formatVND(n || 0)

// Chuẩn hoá trạng thái đơn hàng
function normalizeStatus(db) {
  const s = (db || '').toString().toLowerCase()
  if (!s) return 'order'
  if (['new', 'pending', 'confirmed'].includes(s)) return 'order'
  if (['accepted', 'preparing', 'ready'].includes(s)) return 'processing'
  if (s === 'delivering') return 'delivery'
  if (['delivered', 'completed', 'done'].includes(s)) return 'done'
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled'
  return 'order'
}

// Lấy status merchant từ nhiều kiểu object khác nhau
function getMerchantStatus(m) {
  if (!m) return ''
  const raw =
    m.status ||
    (m.contract && m.contract.status) ||
    (m.setting && m.setting.status) ||
    ''
  return raw.toString().toLowerCase()
}

function getMerchantName(m, fallbackId) {
  if (!m) return `Merchant ${fallbackId || ''}`
  return (
    m.storeName ||
    m.name ||
    (m.setting && m.setting.storeName) ||
    (m.contract && m.contract.name) ||
    `Merchant ${fallbackId || ''}`
  )
}

// Component Skeleton loading (giữ nguyên)
function Sk({ h = 16, w = '100%', style = {} }) {
return (
    <div
      style={{
        height: h,
        width: w,
        borderRadius: 8,
        background: 'linear-gradient(90deg,#eee,#f7f7f7,#eee)',
        backgroundSize: '200% 100%',
        animation: 'adb-sk 1s linear infinite',
        ...style,
      }}
    />
  )
}
if (typeof document !== 'undefined' && !document.getElementById('adb-sk-style')) {
  const s = document.createElement('style')
  s.id = 'adb-sk-style'
  s.innerHTML =
    '@keyframes adb-sk{0%{background-position:200% 0}100%{background-position:-200% 0}}'
  document.head.appendChild(s)
}

// Component Biểu đồ Cột Xếp chồng Trạng thái
const StackedStatusBar = ({ byStatus, total }) => {
    if (total === 0) return <div className="adb-empty-note">Chưa có đơn hàng để phân tích.</div>;
    
    const statusOrder = ['order', 'processing', 'delivery', 'done', 'cancelled'];
    
    // Tỷ lệ cho các thanh stacked bar
    const bars = statusOrder.map(status => ({
        status,
        count: byStatus[status],
        percent: (byStatus[status] / total) * 100,
        color: status === 'order' ? '#fca960ff' : 
              status === 'processing' ? '#ffed49ff' : 
              status === 'delivery' ? '#a6ff8dff' : 
              status === 'done' ? '#41dffee7' : 
              status === 'cancelled' ? '#ff6e5eff' : '#95a5a6'
    })).filter(b => b.percent > 0);

    return (
        <div className="adb-stacked-bar-wrap">
            {/* Thanh Bar chính */}
            <div className="adb-stacked-bar">
                {bars.map(b => (
                    <div 
                        key={b.status}
                        className="adb-stacked-segment"
                        style={{ width: `${b.percent}%`, backgroundColor: b.color }}
                        title={`${b.status}: ${b.count} đơn (${b.percent.toFixed(1)}%)`}
                    />
                ))}
            </div>
            
            {/* Legend/Chi tiết */}
            <ul className="adb-status-legend">
                {bars.map(b => (
                    <li key={b.status} className="adb-legend-item">
                        <span className="adb-legend-color" style={{ backgroundColor: b.color }}></span>
                        <span className="adb-legend-label">
                            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}: 
                            <strong> {b.percent.toFixed(1)}%</strong> ({b.count})
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Component Biểu đồ Tròn cho GMV Merchant
const MerchantGMVDoughnut = ({ topMerchants, timeRange }) => {
    const totalGMV = topMerchants.reduce((sum, m) => sum + m.gmv, 0);
    if (totalGMV === 0) return <div className="adb-empty-note">Chưa có GMV trong phạm vi đã chọn.</div>;
    
    let currentAngle = 0;
    const colors = ['#69deffff', '#ffa556ff', '#4dff97ff', '#f1c40f', '#e74c3c', '#9b59b6']; // Thêm nhiều màu
    
    const segments = topMerchants.map((m, index) => {
      const percentage = (m.gmv / totalGMV) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return { 
        name: m.name, 
        percentage: percentage.toFixed(1), 
        gmv: VND(m.gmv), 
        startAngle, 
        endAngle: currentAngle,
        color: colors[index % colors.length]
      };
    });

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            {/* Chart Holder (CSS Doughnut) */}
            <div 
                className="adb-doughnut-chart"
                style={{
                    background: `conic-gradient(
                        ${segments.map(s => `${s.color} ${s.endAngle}deg`).join(', ')}
                    )`,
                }}
            >
                <div className="adb-doughnut-hole">
                    <div className="adb-doughnut-center">{VND(totalGMV)}</div>
                    <div className="adb-doughnut-sub-text">Tổng GMV</div>
                </div>
            </div>

            {/* Legend */}
            <ul className="adb-legend-list">
                {segments.map(s => (
                    <li key={s.name} className="adb-legend-item">
                        <span className="adb-legend-color" style={{ backgroundColor: s.color }}></span>
                        <span className="adb-legend-label">
                            {s.name}: 
                            <strong> {s.percentage}%</strong> ({s.gmv})
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default function AdminServerDashboard() {
  const [orders, setOrders] = useState([])
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // 💡 STATE MỚI: Quản lý phạm vi thời gian cho Biểu đồ Merchant GMV
  const [merchantTimeRange, setMerchantTimeRange] = useState('7days'); 
  const TIME_OPTIONS = {
      'today': 'Hôm nay',
      '7days': '7 ngày gần nhất',
      'month': 'Tháng này',
      'all': 'Toàn bộ',
  };


  // ====== TẢI DỮ LIỆU TOÀN HỆ THỐNG ======
  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [ordersData, merchantsData] = await Promise.all([
        getAllOrders(), 
        fetchMerchants(),
      ])
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setMerchants(Array.isArray(merchantsData) ? merchantsData : [])
    } catch (e) {
      console.error(e)
      setError('Không tải được dữ liệu hệ thống. Vui lòng kiểm tra kết nối.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Tự động reload khi quay lại tab
  useEffect(() => {
    const onFocus = () => load()
    const onVis = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Hàm helper để xác định mốc thời gian bắt đầu
  const getStartDate = useCallback((range) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (range === 'today') return d;
    if (range === '7days') {
        d.setDate(d.getDate() - 6);
        return d;
    }
    if (range === 'month') {
        d.setDate(1);
        return d;
    }
    return new Date(0); // Epoch start cho 'all'
  }, []);
  
  // ====== TÍNH TOÁN CHỈ SỐ NGHIỆP VỤ CHO SUPER ADMIN ======
  const summary = useMemo(() => {
    const startOfToday = getStartDate('today');
    const startOfMonth = getStartDate('month');
    const startOf7Days = getStartDate('7days');
    const startOfMerchantRange = getStartDate(merchantTimeRange); // Mốc thời gian linh hoạt
    
    let revenueToday = 0
    let revenueMonth = 0
    let revenueAll = 0
    let shippingToday = 0
    let shippingMonth = 0
    let ordersTodayCount = 0
    let ordersMonthCount = 0

    const byStatus = {
      order: 0,
      processing: 0,
      delivery: 0,
      done: 0,
      cancelled: 0,
    }

    const merchantAgg = new Map() // Merchant Aggregation (linh hoạt)
    
    for (const o of orders) {
      const total = Number(o.finalTotal ?? o.total ?? 0) || 0
      const shippingNet =
        Number(o.shippingFee ?? 0) - Number(o.shippingDiscount ?? 0)
      const s = normalizeStatus(o.status)
      if (byStatus[s] != null) byStatus[s] += 1

      const isCancelled = s === 'cancelled'
      const d = o.createdAt ? new Date(o.createdAt) : null

      // GMV all time (không tính huỷ)
      if (!isCancelled) {
        revenueAll += total
      }

      if (d) {
        if (!isCancelled && d >= startOfToday) {
          revenueToday += total
          shippingToday += shippingNet
          ordersTodayCount += 1
        }
        if (!isCancelled && d >= startOfMonth) {
          revenueMonth += total
          shippingMonth += shippingNet
          ordersMonthCount += 1
        }

        // Top merchant (linh hoạt)
        if (!isCancelled && d >= startOfMerchantRange) {
          const mid = String(o.merchantId || '')
          if (mid) {
            const prev = merchantAgg.get(mid) || { merchantId: mid, gmv: 0, orders: 0 }
            prev.gmv += total
            prev.orders += 1
            merchantAgg.set(mid, prev)
          }
        }
      }
    }

    // Merchant stats
    const totalMerchants = merchants.length
    let activeMerchants = 0
    let pendingMerchants = 0
    let suspendedMerchants = 0

    for (const m of merchants) {
      const st = getMerchantStatus(m)
      if (st === 'active') activeMerchants += 1
      else if (st === 'pending') pendingMerchants += 1
      else if (['suspended', 'blocked', 'inactive'].includes(st))
        suspendedMerchants += 1
    }

    // Top merchant (theo GMV range linh hoạt)
    const topMerchants = Array.from(merchantAgg.values())
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5)
      .map((entry) => {
        const meta =
          merchants.find(
            (m) =>
              m.id === entry.merchantId ||
              m.merchantId === entry.merchantId ||
              (m.setting && m.setting.id === entry.merchantId) ||
              (m.contract && m.contract.id === entry.merchantId),
          ) || {}
        return {
          ...entry,
          name: getMerchantName(meta, entry.merchantId),
        }
      })

    const platformRevenueToday = revenueToday * PLATFORM_FEE_RATE
    const platformRevenueMonth = revenueMonth * PLATFORM_FEE_RATE

    const avgToday =
      ordersTodayCount > 0 ? revenueToday / ordersTodayCount : 0
    const avgMonth =
      ordersMonthCount > 0 ? revenueMonth / ordersMonthCount : 0
      
    const totalCurrentOrders = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return {
      totalOrders: orders.length,
      revenueAll,
      revenueToday,
      revenueMonth,
      platformRevenueToday,
      platformRevenueMonth,
      shippingToday,
      shippingMonth,
      ordersTodayCount,
      ordersMonthCount,
      avgToday,
      avgMonth,
      byStatus,
      totalCurrentOrders, 
      merchantStats: {
            total: totalMerchants,
            active: activeMerchants,
            pending: pendingMerchants,
            suspended: suspendedMerchants,
        },
      topMerchants,
    }
  }, [orders, merchants, getStartDate, merchantTimeRange])

  // Biểu đồ GMV 7 ngày gần nhất (Giữ nguyên logic)
  const daily = useMemo(() => {
    // ... (logic giữ nguyên)
    if (!orders.length) return { days: [], maxVal: 0 }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('vi-VN', { weekday: 'short' })

      const total = orders.reduce((sum, o) => {
        const s = normalizeStatus(o.status)
        if (s === 'cancelled') return sum
        if (!o.createdAt) return sum
        const cd = new Date(o.createdAt)
        const cKey = cd.toISOString().slice(0, 10)
        if (cKey !== key) return sum
        return sum + Number(o.finalTotal ?? o.total ?? 0) || 0
      }, 0)

      days.push({ label, total })
    }

    const maxVal = days.reduce(
      (m, d) => (d.total > m ? d.total : m),
      0,
    )

    return { days, maxVal }
  }, [orders])

  const styles = useMemo(
    () => `
    /* --- GENERAL LAYOUT --- */
    .adb-wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
      background: #f5f5f5;
      min-height: 100vh;
      color: #333;
    }
    .adb-wrap h1 {
      font-size: 26px;
      font-weight: 900;
      margin: 0 0 4px;
      color: #111;
    }
    .adb-wrap .sub {
      color: #777;
      font-size: 14px;
      margin: 0;
    }
    .adb-wrap .adb-header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    @media (min-width: 768px) {
      .adb-wrap .adb-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
      }
    }
    .adb-wrap .btn-refresh {
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      background: #ff7a59;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 8px rgba(255, 122, 89, 0.2);
    }
    .adb-wrap .btn-refresh:disabled {
      opacity: 0.6;
      cursor: default;
      box-shadow: none;
    }
    .adb-wrap .grid {
      display: grid;
      gap: 16px;
    }
    @media (min-width: 900px) {
      .adb-wrap .grid-2 {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); 
      }
    }
    
    /* --- CARD GENERAL --- */
    .adb-wrap .card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
    }
    .adb-wrap .card h2 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    .adb-wrap .card h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0 8px;
      color: #ff7a59;
    }
    
    /* --- KPI SECTION --- */
    .adb-wrap .kpi-main {
      font-size: 32px;
      font-weight: 900;
      color: #ff7a59;
      margin-bottom: 10px;
      letter-spacing: -0.5px;
    }
    .adb-wrap .kpi-row {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 16px;
      border-bottom: 1px dashed #eee;
      padding-bottom: 12px;
    }
    .adb-wrap .kpi-item div { 
        font-weight: 600; 
        color: #111; 
        font-size: 15px; 
    }
    .adb-wrap .kpi-label {
      color: #777;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    
    /* --- MERCHANT PILLS --- */
    .adb-wrap .pill-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .adb-wrap .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      background: #f3f4f6;
      font-size: 13px;
      font-weight: 600;
    }
    .adb-wrap .pill span.num {
      font-weight: 800;
      color: #ff7a59;
    }
    
    /* --- CHART (BIỂU ĐỒ TRÒN) --- */
    .adb-doughnut-chart {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      position: relative;
      background: #eee;
    }
    .adb-doughnut-hole {
      position: absolute;
      inset: 25px; 
      background: #fff;
      border-radius: 50%;
      display: grid;
      place-items: center;
    }
    .adb-doughnut-center {
        font-size: 20px;
        font-weight: 800;
        color: #ff7a59;
    }
    .adb-doughnut-sub-text {
        position: absolute;
        bottom: 15px;
        font-size: 10px;
        color: #666;
        font-weight: 600;
        text-align: center;
        width: 100%;
        line-height: 1;
    }
    
    /* --- LEGEND (Chung cho cả hai biểu đồ) --- */
    .adb-legend-list {
        list-style: none;
        padding: 0;
        margin: 0;
        font-size: 13px;
    }
    .adb-legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
    }
    .adb-legend-color {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        flex-shrink: 0;
    }
    .adb-legend-label strong {
        font-weight: 700;
    }

    /* --- STACKED STATUS BAR --- */
    .adb-stacked-bar-wrap {
        padding: 10px 0;
    }
    .adb-stacked-bar {
        display: flex;
        width: 100%;
        height: 25px;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 10px;
    }
    .adb-stacked-segment {
        height: 100%;
        transition: width 0.3s ease;
    }

    /* --- TOP MERCHANT LIST --- */
    .adb-wrap .top-list {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
    }
    .adb-wrap .top-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px dashed #f1f1f1;
    }
    .adb-wrap .top-item:last-child {
      border-bottom: none;
    }
    .adb-wrap .top-rank {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: #ff7a59;
      flex-shrink: 0;
    }
    .adb-wrap .top-name {
      font-size: 15px;
      font-weight: 700;
      color: #111;
    }
    .adb-wrap .top-meta {
      font-size: 13px;
      color: #666;
    }

    /* --- BAR CHART --- */
    .adb-wrap .chart-wrap {
      margin-top: 20px; 
    }
    .adb-wrap .bars {
      display: flex;
      
      align-items: flex-end;
      gap: 10px;
      height: ${MAX_BAR_HEIGHT}px;
      padding: 10px 4px;
      border-radius: 8px;
      background: #f9fafb;
      border-bottom: 1px solid #ddd;
    }
    .adb-wrap .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #666;
      position: relative;
    }
    .adb-wrap .bar {
      width: 100%;
      border-radius: 4px 4px 0 0;
      background: linear-gradient(180deg,#3498db,#2980b9);
      transition: height 0.5s ease-out;
    }
    .adb-wrap .bar-val {
      font-size: 11px;
      color: #111;
      font-weight: 600;
      white-space: nowrap;
      position: absolute; 
      display: flex; flex-direction: column;
      line-height: 1;
    }
    .adb-wrap .bar-col-label {
        font-size: 12px;
        font-weight: 600;
        margin-top: 10px;
    }
    /* Mobile Bar Adjustments */
    @media (max-width: 600px) {
        .adb-wrap .bar-val {
            font-size: 10px;
            top: -12px;
        }
        .adb-wrap .bars {
            height: 200px;
            gap: 6px;
        }
        .adb-wrap .bar-col-label {
            font-size: 10px;
        }
    }

    .adb-wrap .empty-note {
      font-size: 14px;
      color: #999;
      padding: 16px 0;
      text-align: center;
    }
    .adb-wrap .adb-alert {
      margin-bottom: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }
    .adb-wrap .adb-alert-error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* SELECT OPTION */
    .adb-select {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #ddd;
        background: #fff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
    }
  `,
    [],
  )

  const {
    totalOrders,
    revenueAll,
    revenueToday,
    revenueMonth,
    platformRevenueToday,
    platformRevenueMonth,
    shippingToday,
    shippingMonth,
    ordersTodayCount,
    ordersMonthCount,
    avgToday,
    avgMonth,
    byStatus,
    totalCurrentOrders,
    merchantStats= {},
    topMerchants, // Đã được tính toán dựa trên merchantTimeRange
  } = summary || {}

  return (
    <section className="ff-container adb-wrap">
      <style>{styles}</style>

      <div className="adb-header">
        <div>
          <h1>Bảng điều khiển Server Admin</h1>
          <p className="sub">
            Tổng quan GMV, doanh thu & merchant toàn hệ thống
          </p>
        </div>
        <button
          type="button"
          className="btn-refresh"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Đang tải…' : '↻ Làm mới dữ liệu'}
        </button>
      </div>

      {error && <div className="adb-alert adb-alert-error">{error}</div>}

      {loading && !orders.length ? (
        // ... (Skeleton loading giữ nguyên)
        <div className="grid grid-2">
          {/* Skeleton giữ nguyên */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <Sk h={20} w={180} />
              <Sk h={32} w={200} style={{ marginTop: 12 }} />
              <Sk h={14} w={220} style={{ marginTop: 10 }} />
              <div className="kpi-row" style={{ marginTop: 10, paddingBottom: 0, borderBottom: 'none' }}><Sk h={16} w={100} /><Sk h={16} w={120} /></div>
              <Sk h={14} w={160} style={{ marginTop: 10 }} />
              <div className="kpi-row" style={{ marginTop: 6, paddingBottom: 0, borderBottom: 'none' }}><Sk h={16} w={80} /><Sk h={16} w={100} /></div>
            </div>
            <div className="card">
              <Sk h={20} w={160} />
              <div style={{display: 'flex', gap: 20, alignItems: 'center', marginTop: 12}}><Sk h={120} w={120} /><Sk h={100} w={150} /></div>
            </div>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <Sk h={20} w={180} />
              <Sk h={40} w="100%" style={{ marginTop: 12 }} />
              <Sk h={14} w={300} style={{ marginTop: 10 }} />
            </div>
            <div className="card">
              <Sk h={20} w={140} />
              <Sk h={80} w="100%" style={{ marginTop: 12 }} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-2">
            {/* CỘT TRÁI: GMV & ĐƠN HÀNG */}
            <div>
              <article className="card">
                <h2>Tổng quan GMV & Đơn hàng</h2>
                <div className="kpi-main">{VND(revenueToday)}</div>
                <p className="kpi-label" style={{marginTop: '-10px', marginBottom: '20px', fontSize: '13px'}}>GMV hôm nay</p>
                
                {/* GMV Tổng quan */}
                <div className="kpi-row">
                  <div className="kpi-item">
                    <div className="kpi-label">GMV tháng này</div>
                    <div>{VND(revenueMonth)}</div>
                  </div>
                  <div className="kpi-item">
                    <div className="kpi-label">GMV toàn hệ thống</div>
                    <div>{VND(revenueAll)}</div>
                  </div>
                </div>

                {/* Số đơn */}
                <div className="kpi-row">
                  <div className="kpi-item">
                    <div className="kpi-label">Số đơn hôm nay</div>
                    <div>{ordersTodayCount} đơn</div>
                  </div>
                  <div className="kpi-item">
                    <div className="kpi-label">Số đơn tháng này</div>
                    <div>{ordersMonthCount} đơn</div>
                  </div>
                  <div className="kpi-item">
                    <div className="kpi-label">Tổng đơn (lịch sử)</div>
                    <div>{totalOrders} đơn</div>
                  </div>
                </div>

                <h3>Doanh thu Platform (ước tính {PLATFORM_FEE_RATE * 100}%)</h3>
                <div className="kpi-row">
                  <div className="kpi-item">
                    <div className="kpi-label">Hôm nay</div>
                    <div>{VND(platformRevenueToday)}</div>
                  </div>
                  <div className="kpi-item">
                    <div className="kpi-label">Tháng này</div>
                    <div>{VND(platformRevenueMonth)}</div>
                  </div>
                </div>

                <h3>Giá trị giỏ hàng trung bình</h3>
                <div className="kpi-row">
                  <div className="kpi-item">
                    <div className="kpi-label">Hôm nay</div>
                    <div>{VND(avgToday)}</div>
                  </div>
                  <div className="kpi-item">
                    <div className="kpi-label">Tháng này</div>
                    <div>{VND(avgMonth)}</div>
                  </div>
                </div>

                <h3>Phí giao hàng (net)</h3>
                <div className="kpi-row" style={{borderBottom: 'none'}}>
                  <div className="kpi-item">
                    <div className="kpi-label">Hôm nay</div>
                    <div>{VND(shippingToday)}</div>
                  </div>
                  <div className="kpi-item">
                    <div className="kpi-label">Tháng này</div>
                    <div>{VND(shippingMonth)}</div>
                  </div>
                </div>
              </article>
              
              <article className="card" style={{ marginTop: 16 }}>
                <h2>Đối tác & Cửa hàng</h2>
                <div className="pill-list">
                  <div className="pill">
                    <span className="num">{merchantStats.total}</span>
                    <span>Tổng merchant</span>
                  </div>
                  <div className="pill" style={{background: '#e6ffed', color: '#27ae60'}}>
                    <span className="num">{merchantStats.active}</span>
                    <span>Đang hoạt động</span>
                  </div>
                  <div className="pill" style={{background: '#fff4e5', color: '#ff7a59'}}>
                    <span className="num">{merchantStats.pending}</span>
                    <span>Chờ duyệt</span>
                  </div>
                  <div className="pill" style={{background: '#ffe5e5', color: '#e74c3c'}}>
                    <span className="num">{merchantStats.suspended}</span>
                    <span>Bị treo / khoá</span>
                  </div>
                </div>
                <p className="kpi-label" style={{marginTop: 10}}>
                  * Các merchant Pending / Suspended là workload cần đội vận hành xử lý.
                </p>
              </article>
            </div>

            {/* CỘT PHẢI: TRẠNG THÁI & TOP MERCHANT */}
            <div>
              <article className="card">
                <h2>Trạng thái Đơn hàng (Tổng {totalCurrentOrders})</h2>
                {totalCurrentOrders > 0 ? (
                    <StackedStatusBar byStatus={byStatus} total={totalCurrentOrders} />
                ) : (
                    <div className="empty-note">Chưa có đơn hàng để phân tích.</div>
                )}
              </article>

              <article className="card" style={{ marginTop: 16 }}>
                <h2>
                    Top Merchant GMV
                    <select 
                        className="adb-select" 
                        value={merchantTimeRange} 
                        onChange={e => setMerchantTimeRange(e.target.value)}
                        disabled={loading}
                    >
                        {Object.entries(TIME_OPTIONS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </h2>
                {totalCurrentOrders > 0 ? (
                    <MerchantGMVDoughnut topMerchants={topMerchants} timeRange={merchantTimeRange} />
                ) : (
                    <div className="empty-note">Chưa có GMV để phân tích.</div>
                )}
              </article>
            </div>
          </div>

          {/* HÀNG DƯỚI: BIỂU ĐỒ 7 NGÀY (Full width) */}
          <div className="grid" style={{ marginTop: 16 }}>
            <article className="card" style={{ gridColumn: 'span 2' }}>
              <h2>GMV 7 ngày gần nhất</h2>
              {!daily.days.length || daily.maxVal === 0 ? (
                <div className="empty-note">Chưa có dữ liệu để vẽ biểu đồ GMV.</div>
              ) : (
                <div className="chart-wrap">
                  <div className="bars">
                    {daily.days.map((d, idx) => {
                        const ratio = daily.maxVal ? d.total / daily.maxVal : 0;
                          // Chiều cao bar tối thiểu 8px, tối đa MAX_BAR_HEIGHT
                          const finalHeight = d.total > 0
                          ? Math.max(8, ratio * MAX_BAR_HEIGHT)
                          : 0;

                      return (
                        <div key={idx} className="bar-col" style={{position: 'relative'}}>
                            {/* Giá trị trên cùng */}
                            <div
                                className="bar-val"
                                title={VND(d.total)}
                                // 💡 Giá trị tuyệt đối, đặt phía trên cùng của cột (không phụ thuộc vào thanh bar)
                                style={{ position: 'absolute', top: -15, fontWeight: 700, color: d.total > 0 ? '#ff7a59' : '#999' }}
                            >
                                {VND(d.total)}
                            </div>
                            {/* Thanh bar thực sự */}
                            <div
                                className="bar"
                                // 💡 SỬA: Thay thế height cũ, đảm bảo bar nằm dưới val
                                style={{ height: `${finalHeight}px` }}
                            />
                            <div className="bar-col-label">{d.label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </article>
          </div>
        </>
      )}
    </section>
  )
}