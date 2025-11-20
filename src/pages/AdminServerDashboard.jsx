 // src/pages/AdminServerDashboard.jsx
import { useEffect, useMemo, useState } from "react"
import { getAllOrders } from "../utils/orderAPI.js"
import { fetchMerchants } from "../utils/merchantAPI.js"
import { formatVND } from "../utils/format"

// ====== CẤU HÌNH NGHIỆP VỤ CHO SUPER ADMIN ======
const PLATFORM_FEE_RATE = 0.15 // 15% commission tạm giả định

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

// Component Skeleton loading
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

// Inject CSS cho Skeleton (chỉ chạy 1 lần, ở client)
if (typeof document !== 'undefined' && !document.getElementById('adb-sk-style')) {
  const s = document.createElement('style')
  s.id = 'adb-sk-style'
  s.innerHTML =
    '@keyframes adb-sk{0%{background-position:200% 0}100%{background-position:-200% 0}}'
  document.head.appendChild(s)
}

export default function AdminServerDashboard() {
  const [orders, setOrders] = useState([])
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ====== TẢI DỮ LIỆU TOÀN HỆ THỐNG ======
  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [ordersData, merchantsData] = await Promise.all([
        getAllOrders(), // tất cả orders toàn hệ thống
        fetchMerchants(), // danh sách merchant (cấu hình + hợp đồng)
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

  // ====== TÍNH TOÁN CHỈ SỐ NGHIỆP VỤ CHO SUPER ADMIN ======
  const summary = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const startOf7 = new Date()
    startOf7.setHours(0, 0, 0, 0)
    startOf7.setDate(startOf7.getDate() - 6) // 7 ngày gần nhất

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

    const delivery = {
      drone: { count: 0, gmv: 0 },
      rider: { count: 0, gmv: 0 },
      pickup: { count: 0, gmv: 0 },
      other: { count: 0, gmv: 0 },
    }

    const merchantAgg7Days = new Map()

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

        // Top merchant 7 ngày gần nhất (không tính huỷ)
        if (!isCancelled && d >= startOf7) {
          const mid = String(o.merchantId || '')
          if (mid) {
            const prev =
              merchantAgg7Days.get(mid) || { merchantId: mid, gmv: 0, orders: 0 }
            prev.gmv += total
            prev.orders += 1
            merchantAgg7Days.set(mid, prev)
          }
        }
      }

      // Chia theo phương thức giao
      const rawMode = (o.deliveryMode || '').toString().toLowerCase()
      let key = 'other'
      if (rawMode === 'drone') key = 'drone'
      else if (['rider', 'shipper', 'delivery'].includes(rawMode)) key = 'rider'
      else if (['pickup', 'takeaway'].includes(rawMode)) key = 'pickup'

      if (!isCancelled) {
        delivery[key].count += 1
        delivery[key].gmv += total
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

    // Top merchant (theo GMV 7 ngày)
    const topMerchants = Array.from(merchantAgg7Days.values())
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
      merchantStats: {
        total: totalMerchants,
        active: activeMerchants,
        pending: pendingMerchants,
        suspended: suspendedMerchants,
      },
      delivery,
      topMerchants,
    }
  }, [orders, merchants])

  // Biểu đồ GMV 7 ngày gần nhất
  const daily = useMemo(() => {
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
    .adb-wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
      background: #f5f5f5;
      min-height: 100vh;
    }
    .adb-wrap h1 {
      font-size: 22px;
      margin: 0 0 4px;
    }
    .adb-wrap .sub {
      color: #666;
      font-size: 13px;
      margin: 0;
    }
    .adb-wrap .adb-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    @media (min-width: 768px) {
      .adb-wrap .adb-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
      }
    }
    .adb-wrap .btn-refresh {
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid #ddd;
      background: #fff;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .adb-wrap .btn-refresh:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .adb-wrap .grid {
      display: grid;
      gap: 16px;
    }
    @media (min-width: 900px) {
      .adb-wrap .grid-2 {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr);
      }
    }
    .adb-wrap .card {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .adb-wrap .card h2 {
      font-size: 15px;
      margin: 0 0 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .adb-wrap .card h3 {
      font-size: 14px;
      margin: 12px 0 6px;
    }
    .adb-wrap .kpi-main {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .adb-wrap .kpi-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 13px;
      color: #555;
    }
    .adb-wrap .kpi-label {
      color: #777;
      font-size: 12px;
    }
    .adb-wrap .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      background: #f3f4f6;
      font-size: 12px;
    }
    .adb-wrap .pill span.num {
      font-weight: 600;
    }
    .adb-wrap .status-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
      font-size: 12px;
    }
    .adb-wrap .status-pill {
      padding: 4px 8px;
      border-radius: 999px;
      background: #f3f4f6;
    }
    .adb-wrap .status-pill strong {
      margin-right: 4px;
    }
    .adb-wrap .status-pill.order { background: #e5f1ff; }
    .adb-wrap .status-pill.processing { background: #fff4e5; }
    .adb-wrap .status-pill.delivery { background: #e5f7ff; }
    .adb-wrap .status-pill.done { background: #e6ffed; }
    .adb-wrap .status-pill.cancelled { background: #ffe5e5; }

    .adb-wrap .delivery-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
      font-size: 13px;
    }
    .adb-wrap .delivery-card {
      padding: 8px;
      border-radius: 8px;
      background: #f9fafb;
    }
    .adb-wrap .delivery-card h4 {
      margin: 0 0 4px;
      font-size: 13px;
    }

    .adb-wrap .top-list {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
    }
    .adb-wrap .top-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid #f1f1f1;
    }
    .adb-wrap .top-item:last-child {
      border-bottom: none;
    }
    .adb-wrap .top-rank {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }
    .adb-wrap .top-name {
      font-size: 13px;
      font-weight: 600;
    }
    .adb-wrap .top-meta {
      font-size: 12px;
      color: #666;
    }

    .adb-wrap .chart-wrap {
      margin-top: 8px;
    }
    .adb-wrap .bars {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 140px;
      padding: 8px 4px;
      border-radius: 8px;
      background: #f9fafb;
    }
    .adb-wrap .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #666;
    }
    .adb-wrap .bar {
      width: 100%;
      border-radius: 4px 4px 0 0;
      background: linear-gradient(180deg,#ff7a59,#ffb199);
    }
    .adb-wrap .bar-val {
      font-size: 11px;
      color: #444;
      white-space: nowrap;
    }
    .adb-wrap .empty-note {
      font-size: 13px;
      color: #777;
      padding: 12px 0;
    }
    .adb-wrap .adb-alert {
      margin-bottom: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
    }
    .adb-wrap .adb-alert-error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
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
    merchantStats,
    delivery,
    topMerchants,
  } = summary

  return (
    <section className="ff-container adb-wrap">
      <style>{styles}</style>

      <div className="adb-header">
        <div>
          <h1>Bảng điều khiển Server Admin</h1>
          <p className="sub">
            Tổng quan GMV, doanh thu platform và sức khỏe merchant toàn hệ thống
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
        <div className="grid grid-2">
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <Sk h={20} w={180} />
              <Sk h={28} w={140} style={{ marginTop: 12 }} />
              <Sk h={14} w={220} style={{ marginTop: 6 }} />
            </div>
            <div className="card">
              <Sk h={20} w={160} />
              <Sk h={60} w="100%" style={{ marginTop: 12 }} />
            </div>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <Sk h={20} w={180} />
              <Sk h={40} w="100%" style={{ marginTop: 12 }} />
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
                <h2>Tổng quan GMV & đơn hàng</h2>
                <div className="kpi-main">{VND(revenueToday)} hôm nay</div>
                <div className="kpi-row" style={{ marginBottom: 8 }}>
                  <div>
                    <div className="kpi-label">GMV tháng này</div>
                    <div>{VND(revenueMonth)}</div>
                  </div>
                  <div>
                    <div className="kpi-label">GMV toàn hệ thống</div>
                    <div>{VND(revenueAll)}</div>
                  </div>
                </div>

                <div className="kpi-row">
                  <div>
                    <div className="kpi-label">Số đơn hôm nay</div>
                    <div>{ordersTodayCount} đơn</div>
                  </div>
                  <div>
                    <div className="kpi-label">Số đơn tháng này</div>
                    <div>{ordersMonthCount} đơn</div>
                  </div>
                  <div>
                    <div className="kpi-label">Tổng số đơn (lịch sử)</div>
                    <div>{totalOrders} đơn</div>
                  </div>
                </div>

                <h3>Doanh thu Platform (ước tính {PLATFORM_FEE_RATE * 100}%)</h3>
                <div className="kpi-row">
                  <div>
                    <div className="kpi-label">Hôm nay</div>
                    <div>{VND(platformRevenueToday)}</div>
                  </div>
                  <div>
                    <div className="kpi-label">Tháng này</div>
                    <div>{VND(platformRevenueMonth)}</div>
                  </div>
                </div>

                <h3>Giá trị giỏ hàng trung bình</h3>
                <div className="kpi-row">
                  <div>
                    <div className="kpi-label">Hôm nay</div>
                    <div>{VND(avgToday)}</div>
                  </div>
                  <div>
                    <div className="kpi-label">Tháng này</div>
                    <div>{VND(avgMonth)}</div>
                  </div>
                </div>

                <h3>Phí giao hàng (net)</h3>
                <div className="kpi-row">
                  <div>
                    <div className="kpi-label">Hôm nay</div>
                    <div>{VND(shippingToday)}</div>
                  </div>
                  <div>
                    <div className="kpi-label">Tháng này</div>
                    <div>{VND(shippingMonth)}</div>
                  </div>
                </div>
              </article>

              <article className="card" style={{ marginTop: 16 }}>
                <h2>Trạng thái đơn hàng</h2>
                <div className="status-list">
                  <div className="status-pill order">
                    <strong>Đơn mới</strong> {byStatus.order}
                  </div>
                  <div className="status-pill processing">
                    <strong>Đang chuẩn bị</strong> {byStatus.processing}
                  </div>
                  <div className="status-pill delivery">
                    <strong>Đang giao</strong> {byStatus.delivery}
                  </div>
                  <div className="status-pill done">
                    <strong>Hoàn tất</strong> {byStatus.done}
                  </div>
                  <div className="status-pill cancelled">
                    <strong>Huỷ</strong> {byStatus.cancelled}
                  </div>
                </div>
              </article>
            </div>

            {/* CỘT PHẢI: MERCHANT & PHƯƠNG THỨC GIAO */}
            <div>
              <article className="card">
                <h2>Đối tác & Cửa hàng</h2>
                <div className="kpi-row" style={{ marginBottom: 8 }}>
                  <div className="pill">
                    <span className="num">{merchantStats.total}</span>
                    <span>Tổng merchant</span>
                  </div>
                  <div className="pill">
                    <span className="num">{merchantStats.active}</span>
                    <span>Đang hoạt động</span>
                  </div>
                  <div className="pill">
                    <span className="num">{merchantStats.pending}</span>
                    <span>Chờ duyệt</span>
                  </div>
                  <div className="pill">
                    <span className="num">{merchantStats.suspended}</span>
                    <span>Bị treo / khoá</span>
                  </div>
                </div>
                <p className="kpi-label">
                  * Các merchant Pending / Suspended là workload cần đội vận hành xử lý.
                </p>
              </article>

              <article className="card" style={{ marginTop: 16 }}>
                <h2>Chia theo phương thức giao</h2>
                <div className="delivery-grid">
                  <div className="delivery-card">
                    <h4>Drone</h4>
                    <div>{delivery.drone.count} đơn</div>
                    <div className="kpi-label">
                      GMV: {VND(delivery.drone.gmv)}
                    </div>
                  </div>
                  <div className="delivery-card">
                    <h4>Rider/shipper</h4>
                    <div>{delivery.rider.count} đơn</div>
                    <div className="kpi-label">
                      GMV: {VND(delivery.rider.gmv)}
                    </div>
                  </div>
                  <div className="delivery-card">
                    <h4>Pickup</h4>
                    <div>{delivery.pickup.count} đơn</div>
                    <div className="kpi-label">
                      GMV: {VND(delivery.pickup.gmv)}
                    </div>
                  </div>
                  <div className="delivery-card">
                    <h4>Khác</h4>
                    <div>{delivery.other.count} đơn</div>
                    <div className="kpi-label">
                      GMV: {VND(delivery.other.gmv)}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          {/* HÀNG DƯỚI: TOP MERCHANT + BIỂU ĐỒ 7 NGÀY */}
          <div className="grid" style={{ marginTop: 16 }}>
            <article className="card">
              <h2>Top merchant 7 ngày gần nhất</h2>
              {!topMerchants.length ? (
                <div className="empty-note">Chưa có dữ liệu 7 ngày gần nhất.</div>
              ) : (
                <ul className="top-list">
                  {topMerchants.map((m, idx) => (
                    <li key={m.merchantId || idx} className="top-item">
                      <div className="top-rank">#{idx + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="top-name">{m.name}</div>
                        <div className="top-meta">
                          {m.orders} đơn · GMV {VND(m.gmv)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="card">
              <h2>GMV 7 ngày gần nhất</h2>
              {!daily.days.length || daily.maxVal === 0 ? (
                <div className="empty-note">Chưa có dữ liệu để vẽ biểu đồ.</div>
              ) : (
                <div className="chart-wrap">
                  <div className="bars">
                    {daily.days.map((d, idx) => {
                      const heightPct = daily.maxVal
                        ? Math.max(5, (d.total / daily.maxVal) * 100)
                        : 0
                      return (
                        <div key={idx} className="bar-col">
                          <div
                            className="bar"
                            style={{ height: `${heightPct}%` }}
                            title={VND(d.total)}
                          />
                          <div className="bar-val">
                            {d.total ? VND(d.total) : ''}
                          </div>
                          <div>{d.label}</div>
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
