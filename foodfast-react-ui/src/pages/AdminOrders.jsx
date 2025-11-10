// src/pages/AdminOrders.jsx
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
  const isRestaurant = variant === 'restaurant';
  const { user, isMerchant } = useAuth();
  // Nếu là trang restaurant (variant='restaurant') HOẶC user đang login là merchant, thì lấy ID
  const merchantId = (isRestaurant || isMerchant) ? user?.merchantId : null;
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
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    const saved = Number(localStorage.getItem('orders_limit') || 10);
    return [5,10,20,50].includes(saved) ? saved : 10;
  });
  const [pageCount, setPageCount] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);

     //TRUYỀN MERCHANT ID VÀO API
      // Lưu ý: pagination ở đây đang làm ở FE (limit 10000), 
      // nếu muốn làm ở BE thì cần sửa lại logic này.
      const res = await myOrders({
        page: 1, 
        limit: 10000, 
        status: 'all', 
        q: '',
        sort: 'createdAt', 
        order: 'desc',
        merchantId: merchantId // <-- Truyền ID vào đây
      });

      const arr = Array.isArray(res) ? res : (res?.rows || res?.data || []);
      let list = (arr || []).map(o => ({ ...o, _uiStatus: normalizeStatus(o.status) }));

      // lọc theo Drone mode (nếu đang ở /admin/drone)
      if (mode === 'drone') {
        list = list.filter(o =>
          (o.deliveryMode || '').toLowerCase() === 'drone' ||
          (o.courier || '').toLowerCase() === 'drone' ||
          !!o.droneMissionId
        );
      }

      // search
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

      // filter theo UI status
      if (filter !== 'all') {
        list = list.filter(o => o._uiStatus === filter);
      } else if (isRestaurant) {
        list = list.filter(o => o._uiStatus !== 'cancelled');
      }

      // sort createdAt desc (kể cả string)
      const toTs = (v) => {
        if (!v) return 0;
        if (typeof v === 'number') return v;
        const p = Date.parse(v);
        return Number.isNaN(p) ? 0 : p;
      };
      list.sort((a,b) => toTs(b.createdAt) - toTs(a.createdAt));

      setFiltered(list);

      // pagination
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

  // Tổng hợp: "tất cả đã lọc" + số phụ cho trang hiện tại
  const summary = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    let revenue = 0, todayCount = 0;
    const byStatus = Object.fromEntries(UI_SUMMARY.map(s=>[s,0]));
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
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .row{display:flex;justify-content:space-between;align-items:center;margin:6px 0}
    .muted{color:#777}
    .pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px}
    .pager button{height:32px;border:none;border-radius:8px;padding:0 10px;background:#f0f0f0;cursor:pointer}
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

          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <span>Lọc:</span>
            <select value={filter} onChange={e=>{ setFilter(e.target.value); setPage(1); }}>
              <option value="all">Tất cả{isRestaurant ? ' (ẩn cancelled)' : ''}</option>
              {UI_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

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

      {/* Thống kê theo trạng thái */}
      <div className="cards">
        {['order','processing','delivery','done'].map(s => (
          <div key={s} className="card">
            <div className="row">
              <span className={`badge ${s}`}>{s}</span>
              <b>{summary.byStatus[s] || 0}</b>
            </div>
            <div className="muted">Số đơn theo trạng thái</div>
          </div>
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
