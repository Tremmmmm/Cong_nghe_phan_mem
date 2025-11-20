// src/pages/AdminOrders.jsx
// Lịch sử đơn hàng của Restaurant
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { myOrders } from '../utils/orderAPI.js';
import { exportCsv } from '../utils/exportCsv';
import { formatVND } from '../utils/format';
import { useAuth } from '../context/AuthContext.jsx';

const UI_STATUSES = ['order','processing','delivery','done','cancelled'];
const UI_SUMMARY  = ['order','processing','delivery','done'];

function normalizeStatus(db) {
  const s = (db || '').toLowerCase();
  if (!s) return 'order';
  if (['new','pending','confirmed'].includes(s)) return 'order';
  if (['accepted','preparing','ready'].includes(s)) return 'processing';
  if (s === 'delivering') return 'delivery';
  if (['delivered','completed','done'].includes(s)) return 'done';
  if (['cancelled','canceled'].includes(s)) return 'cancelled';
  return 'order';
}
const VND = (n) => formatVND(n);

// Label hiển thị khi huỷ
const CANCEL_BY_LABEL = {
  merchant: 'cửa hàng',
  customer: 'khách hàng',
  rider: 'drone',
  system: 'hệ thống',
};
const REASON_LABEL = {
  out_of_stock: 'Quán hết món',
  closed: 'Quán đóng cửa',
  other: 'Lý do khác',
};

export default function AdminOrders({ variant }) { 
  // Dùng currentUser giống RestaurantMenuManager
  const { currentUser, isMerchant } = useAuth();

  // Nếu đang login bằng tài khoản merchant thì luôn giới hạn theo merchantId của họ
  const merchantId = isMerchant ? currentUser?.merchantId : null;

  // isRestaurant giờ chủ yếu để chỉnh UI (title, text…)
  const isRestaurant = variant === 'restaurant' || Boolean(merchantId);

  // nhận biết mode drone: /admin/drone hoặc ?mode=drone
  const { pathname, search } = useLocation();
  const mode = useMemo(() => {
    if (pathname.endsWith('/admin/drone')) return 'drone';
    const qs = new URLSearchParams(search);
    return (qs.get('mode') || '').toLowerCase();
  }, [pathname, search]);

  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // filter/search/sort/pagination
  // filter/search/sort/pagination
  const [filter, setFilter] = useState('all'); // 💡 SỬ DỤNG filter NÀY CHO CÁC BUTTON
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    const saved = Number(localStorage.getItem('orders_limit') || 10);
    return [5,10,20,50].includes(saved) ? saved : 10;
  });
  const [pageCount, setPageCount] = useState(1);

  const fetchData = async () => {
    if (isRestaurant && !merchantId) return setLoading(false);
    try {
      setLoading(true);

      const res = await myOrders({
        page: 1, 
        limit: 10000, 
        status: 'all', 
        q: '',
        sort: 'createdAt', 
        order: 'desc',
        merchantId: merchantId 
      });

      const arr = Array.isArray(res) ? res : (res?.rows || res?.data || []);
      let list = (arr || []).map(o => ({ ...o, _uiStatus: normalizeStatus(o.status) }));

      if (mode === 'drone') {
        list = list.filter(o =>
          (o.deliveryMode || '').toLowerCase() === 'drone' ||
          (o.courier || '').toLowerCase() === 'drone' ||
          !!o.droneMissionId
        );
      }

            // Nếu là merchant => double-check: chỉ giữ đơn thuộc merchantId hiện tại
      if (merchantId) {
        list = list.filter(o => String(o.merchantId) === String(merchantId));
      }

      const t = (q || '').trim().toLowerCase();
      if (t) {
        list = list.filter(o =>
          String(o.id).toLowerCase().includes(t) ||
          (o.customerName || '').toLowerCase().includes(t) ||
          (o.phone || '').toLowerCase().includes(t) ||
          (o.address || '').toLowerCase().includes(t) ||
          (o.couponCode || '').toLowerCase().includes(t)
        );
      }

      // 💡 ÁP DỤNG FILTER THEO BUTTON ĐƯỢC CHỌN
      if (filter !== 'all') {
        list = list.filter(o => o._uiStatus === filter);
      } else if (isRestaurant) {
        list = list.filter(o => o._uiStatus !== 'cancelled');
      }

      const toTs = (v) => {
        if (!v) return 0;
        if (typeof v === 'number') return v;
        const p = Date.parse(v);
        return Number.isNaN(p) ? 0 : p;
      };
      list.sort((a,b) => toTs(b.createdAt) - toTs(a.createdAt));

      setFiltered(list);

      const pc = Math.max(1, Math.ceil(list.length / limit));
      const safePage = Math.min(page, pc);
      const start = (safePage - 1) * limit;
      const end = start + limit;
      setRows(list.slice(start, end));
      setPageCount(pc);
      if (safePage !== page) setPage(safePage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ fetchData(); }, [page, limit, filter, q, isRestaurant, mode, merchantId]);

  // Revalidate khi Tab focus lại
  useEffect(() => {
    const onFocus = () => fetchData();
    const onVis = () => { if (document.visibilityState === 'visible') fetchData(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [page, limit, filter, q, isRestaurant, mode, merchantId]);

  const ts = () => new Date().toISOString().replace(/[:.]/g,'-');
  const onExportPage = () => exportCsv(`orders_page_${page}_${ts()}.csv`, rows);
  const onExportAll  = () => exportCsv(`orders_all_filtered_${ts()}.csv`, filtered);

  const summary = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    let revenue = 0, todayCount = 0;
    const byStatus = Object.fromEntries(UI_STATUSES.map(s=>[s,0]));
    for (const o of filtered) {
      if (o._uiStatus !== 'cancelled') revenue += (o.finalTotal ?? o.total ?? 0);
      if (byStatus[o._uiStatus] != null) byStatus[o._uiStatus]++;
      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (d && d >= today) todayCount++;
    }

    const pageByStatus = Object.fromEntries(UI_SUMMARY.map(s=>[s,0]));
    let pageRevenue = 0;
    for (const o of rows) {
      if (o._uiStatus !== 'cancelled') pageRevenue += (o.finalTotal ?? o.total ?? 0);
      if (pageByStatus[o._uiStatus] != null) pageByStatus[o._uiStatus]++;
    }
    return {
      revenue, todayCount, byStatus, total: filtered.length,
      pageRevenue, pageByStatus, pageCount: rows.length
    };
  }, [filtered, rows]);

  const styles = `
    .adm-wrap{padding:20px 16px; max-width: 1200px; margin: 0 auto;}
    
    .topbar{display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center; margin-bottom:20px}
    .topbar h2 { font-size: 22px; margin: 0; width: 100%; }
    @media (min-width: 768px) { .topbar h2 { width: auto; } }

    .filters { display: flex; gap: 10px; flex-wrap: wrap; width: 100%; }
    .filters input { flex-grow: 1; min-width: 150px; }
    
    .orders{display:grid; grid-template-columns: 1fr; gap:16px;}
    @media (min-width: 768px) { .orders { grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); } }

    .order-card{background:#fff; border:1px solid #eee; border-radius:12px; padding:16px; box-shadow: 0 2px 5px rgba(0,0,0,0.03);}
    
    .order-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px; padding-bottom: 12px; border-bottom: 1px dashed #eee;}
    .order-id { font-size: 16px; font-weight: 700; color: #333; }
    
    .order-item-row{display:flex;gap:8px;justify-content:space-between;padding:6px 0; font-size: 14px;}
    
    .badge{display:inline-block;padding:3px 8px;border-radius:6px;background:#f7f7f7;border:1px solid #e8e8e8;text-transform:capitalize;font-weight:400;font-size:12px}
    .badge.order{background:#fff0e9;border-color:#ffd8c6;color:#c24a26}
    .badge.processing{background:#fff7cd;border-color:#ffeaa1;color:#7a5a00}
    .badge.delivery{background:#e8f5ff;border-color:#cfe8ff;color:#0b68b3}
    .badge.done{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    .badge.cancelled{background:#fde8e8;border-color:#f9c7c7;color:#b80d0d}
    
    .ff-btn{height:36px;border:none;border-radius:8px;background:#ff7a59;color:#fff;padding:0 14px;cursor:pointer; font-weight: 600; font-size: 13px;}
    select,input[type=text]{height:36px;border-radius:8px;border:1px solid #ddd;padding:0 10px; font-size: 14px;}
    
    /* Summary cards nhỏ gọn */
    .cards{display:grid;grid-template-columns:repeat(2, 1fr); gap:10px; margin-bottom:20px}
    @media (min-width: 600px) { .cards { grid-template-columns: repeat(4, 1fr); } }
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px; text-align: center;}
    .card b { display: block; font-size: 15px; color: #888; text-transform: uppercase; margin-bottom: 4px;}
    .sum{font-weight:800; font-size: 16px; color: #333;}
    
    /* 💡 NEW STYLES for clickable status buttons */
    .status-filters { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 10px; 
        margin-bottom: 20px; 
    }
    .status-button {
        flex: 1 1 20%; /* Chia thành 5 cột trên màn hình rộng */
        min-width: 140px; /* Chiều rộng tối thiểu cho mobile */
        cursor: pointer;
        background: #fff;
        border: 1px solid #e6e6ea;
        border-radius: 12px;
        padding: 10px 15px;
        transition: all 0.2s;
        display: flex;
        justify-content: space-between; /* Căn giữa nội dung */
        align-items: center;
        gap: 10px;
    }
    .status-button:hover, .status-button.active {
        border-color: #ff7a59;
        background: #fff0e9;
    }
    .status-button .status-label {
        font-size: 14px;
        font-weight: 600;
        text-transform: capitalize;
    }
    .status-button .status-count {
        font-weight: 600;
        font-size: 16px;
        color: #333;
    }
    @media (max-width: 600px) {
        .status-button {
             flex: 1 1 45%; /* Chia thành 2 cột trên mobile */
        }
    }


    .pager{display:flex;gap:8px;align-items:center;justify-content:center;margin-top:20px}
    .pager button{height:32px;border:none;border-radius:8px;padding:0 12px;background:#f0f0f0;cursor:pointer}
    .pager button:disabled { opacity: 0.5; }
  `;

  return (
    <section className="ff-container adm-wrap">
      <style>{styles}</style>

      <div className="topbar">
        <h2>
          {mode === 'drone'
            ? 'Đơn giao bằng Drone'
            : (merchantId ? `Lịch sử đơn hàng (${merchantId})` : 'Lịch sử tất cả đơn hàng')}
        </h2>
        <div className="grid-actions" style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
          <button className="ff-btn" onClick={fetchData}>Refresh</button>

          <input
            type="text"
            placeholder="Tìm theo ID/Name/Phone…"
            value={q}
            onChange={e=>{ setQ(e.target.value); setPage(1); }}
            style={{minWidth:220}}
          />

          {/* 💡 SỬA: CHỈ GIỮ LẠI BỘ LỌC HIỂN THỊ */}
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <span>Hiển thị:</span>
            <select
              value={limit}
              onChange={e=>{
                const val = Number(e.target.value);
                setLimit(val);
                localStorage.setItem('orders_limit', val);
                setPage(1);
              }}>
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </label>

          {mode !== 'drone' && !isRestaurant && (
            <>
              <button className="ff-btn" onClick={onExportPage}>Export CSV (trang)</button>
              <button className="ff-btn" onClick={onExportAll}>Export CSV (tất cả)</button>
            </>
          )}
        </div>
      </div>

      {/* Cards tổng quan */}
      <div className="cards">
        <div className="card">
          <div><b>Doanh thu</b></div>
          <div className="sum">{VND(summary.revenue)}</div>
          <div className="muted" style={{marginTop:4}}>Trang này: {VND(summary.pageRevenue)}</div>
        </div>
        <div className="card">
          <div><b>Đơn hôm nay</b></div>
          <div className="sum" style={{fontSize:20}}>{summary.todayCount}</div>
        </div>
        <div className="card">
          <div><b>Tổng đơn</b></div>
          <div className="sum">{summary.total}</div>
          <div className="muted" style={{marginTop:4}}>Trang này: {summary.pageCount}</div>
        </div>
        <div className="card">
          <div><b>Đơn chờ (order)</b></div>
          <div className="sum">{summary.byStatus.order || 0}</div>
        </div>
      </div>

      {/* 💡 THỐNG KÊ THEO TRẠNG THÁI (CLICKABLE & INLINE) */}
      <div className="status-filters">
        {/* Nút "Tất cả" (hiện tại) */}
        <button
          className={`card status-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => { setFilter('all'); setQ(''); setPage(1); }}
        >
          <div className="status-label">Tất cả ({summary.total})</div>
        </button>

        {UI_STATUSES.map(s => (
          <button
            key={s}
            // 💡 SỬ DỤNG filter STATE ĐỂ LỌC VÀ LÀM NỔI BẬT
            className={`status-button ${filter === s ? 'active' : ''}`}
            onClick={() => { setFilter(s); setQ(''); setPage(1); }}
          >
            <div className="status-label">
              <span className={`badge ${s}`}>{s}</span>
            </div>
            {/* 💡 SỐ LƯỢNG KẾ BÊN */}
            <b className="status-count">{summary.byStatus[s] || 0}</b>
          </button>
        ))}
      </div>

      {/* Danh sách đơn */}
      {loading ? 'Đang tải…' : (!rows.length ? 'Không có đơn.' : (
        <>
          <div className="orders">
            {rows.map(o => {
              const ui = o._uiStatus;
              return (
                <article key={o.id} className="order-card">
                  <header className="order-head">
                    <div>
                      <strong>Đơn #{o.id}</strong>
                      <div className="muted">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'}
                      </div>
                    </div>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <span className={`badge ${ui}`}>{ui}</span>
                      <div className="sum">{VND(o.finalTotal ?? o.total)}</div>
                      {/* ĐÃ BỎ nút Xem hành trình (Drone) theo yêu cầu */}
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

                  <footer style={{marginTop:8}}>
                    <div>
                      <div><strong>{o.customerName}</strong></div>
                      <div className="muted">{o.phone} — {o.address}</div>
                      {o.couponCode && (
                        <div className="muted">Mã: {o.couponCode} — Giảm: -{VND(o.discount||0)}</div>
                      )}
                    </div>

                    {ui === 'cancelled' && (
                      <div className="muted" style={{ marginTop: 6 }}>
                        {`Hủy bởi ${CANCEL_BY_LABEL[o.cancelBy] || 'khác'}`}
                        {o.cancelReason ? ` • ${REASON_LABEL[o.cancelReason] || o.cancelReason}` : ''}
                        {o.cancelledAt ? ` • ${new Date(o.cancelledAt).toLocaleString('vi-VN')}` : ''}
                        {o.cancelNote ? ` • Ghi chú: ${o.cancelNote}` : ''}
                      </div>
                    )}
                  </footer>
                </article>
              );
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
  );
} 