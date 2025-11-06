// src/pages/AdminServerDashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { getAllOrders } from '../utils/api'; // Giả định hàm này lấy TẤT CẢ đơn hàng trên hệ thống
import { fetchMerchants } from '../utils/merchantAPI'; // 💡 Import thêm API lấy merchants
import { formatVND } from '../utils/format';

const VND = (n) => formatVND(n);

// Chuẩn hoá trạng thái đơn hàng
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

// Component Skeleton loading
function Sk({ h=16, w='100%', style={} }){
  return (
    <div style={{
      height: h, width: w, borderRadius: 8,
      background: 'linear-gradient(90deg,#eee,#f7f7f7,#eee)',
      backgroundSize: '200% 100%',
      animation: 'adb-sk 1s linear infinite',
      ...style
    }}/>
  );
}
// Inject CSS cho Skeleton (chỉ chạy 1 lần)
if (!document.getElementById('adb-sk-style')) {
  const s = document.createElement('style');
  s.id = 'adb-sk-style';
  s.innerHTML = `@keyframes adb-sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
  document.head.appendChild(s);
}

export default function AdminServerDashboard(){
  const [orders, setOrders] = useState([]);
  const [merchants, setMerchants] = useState([]); // 💡 State mới lưu danh sách merchants
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Hàm tải dữ liệu tổng hợp
  const load = async () => {
    try {
      setLoading(true); setError('');
      // 💡 Gọi song song cả 2 API để lấy dữ liệu toàn hệ thống
      const [ordersData, merchantsData] = await Promise.all([
        getAllOrders(),
        fetchMerchants()
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setMerchants(Array.isArray(merchantsData) ? merchantsData : []);
    } catch (e) {
      console.error(e);
      setError('Không tải được dữ liệu hệ thống. Vui lòng kiểm tra kết nối.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); },[]);

  // Tự động tải lại khi focus vào tab
  useEffect(() => {
    const onFocus = () => load();
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Tính toán các chỉ số tổng hợp
  const summary = useMemo(() => {
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);

    let revenueToday = 0;
    let revenueMonth = 0;
    const byStatus = { order:0, processing:0, delivery:0, done:0, cancelled:0 };

    // 1. Tổng hợp từ Đơn hàng
    for (const o of orders) {
      const total = o.finalTotal ?? o.total ?? 0;
      const s = normalizeStatus(o.status);
      if (byStatus[s] != null) byStatus[s]++;

      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (d) {
        if (s !== 'cancelled' && d >= startOfToday) revenueToday += total;
        if (s !== 'cancelled' && d >= startOfMonth) revenueMonth += total;
      }
    }

    // 2. Tổng hợp từ Merchants (💡 NGHIỆP VỤ MỚI CHO SUPER ADMIN)
    const totalMerchants = merchants.length;
    const activeMerchants = merchants.filter(m => m.status === 'Active').length;
    const pendingMerchants = merchants.filter(m => m.status === 'Pending').length;

    // 3. Biểu đồ doanh thu 7 ngày toàn sàn
    const days = [];
    const fmt = (d) => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
    for (let i = 6; i >= 0; i--) {
      const day = new Date(); day.setHours(0,0,0,0); day.setDate(day.getDate()-i);
      const next = new Date(day); next.setDate(day.getDate()+1);
      
      const sum = orders.reduce((s, o) => {
        const t = o.createdAt ? new Date(o.createdAt) : null;
        const st = normalizeStatus(o.status);
        if (t && t >= day && t < next && st !== 'cancelled') s += (o.finalTotal ?? o.total ?? 0);
        return s;
      }, 0);
      days.push({ label: fmt(day), value: sum });
    }
    const maxVal = Math.max(...days.map(d=>d.value), 1);

    return {
      totalOrders: orders.length,
      revenueToday,
      revenueMonth,
      byStatus,
      days,
      maxVal,
      // Thêm chỉ số merchant vào summary
      totalMerchants,
      activeMerchants,
      pendingMerchants
    };
  }, [orders, merchants]);

  const styles = `
    .adb-wrap{padding:24px 0}
    .topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}
    .section-title{font-size:18px;font-weight:700;margin:24px 0 12px;color:#444}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
    .title{font-size:15px;font-weight:600;color:#666;margin:0 0 8px}
    .val{font-size:28px;font-weight:800;color:#111}
    .muted{opacity:.75;font-size:13px}
    .row{display:flex;justify-content:space-between;align-items:center;margin:8px 0}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#f7f7f7;border:1px solid #e8e8e8;text-transform:capitalize;font-size:12px;font-weight:600}
    .badge.order{background:#fff0e9;border-color:#ffd8c6;color:#c24a26}
    .badge.processing{background:#fff7cd;border-color:#ffeaa1;color:#7a5a00}
    .badge.delivery{background:#e8f5ff;border-color:#cfe8ff;color:#0b68b3}
    .badge.done{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    .badge.cancelled{background:#fde8e8;border-color:#f9c7c7;color:#b80d0d}
    .bars{display:flex;gap:8px;align-items:flex-end;height:150px;margin-top:16px;padding-top:20px;border-top:1px dashed #eee}
    .bar{flex:1;background:#e3f2fd;border:1px solid #90caf9;border-bottom:none;border-radius:6px 6px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:4px;transition:all .2s}
    .bar:hover{background:#bbdefb;transform:scaleY(1.02)}
    .bar > span{font-size:11px;font-weight:600;color:#1565c0}
    .xaxis{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:8px;font-size:12px;color:#666;text-align:center;font-weight:500}
    .btn{height:36px;border:none;border-radius:8px;background:#2196f3;color:#fff;padding:0 16px;cursor:pointer;font-weight:600;transition:background .2s}
    .btn:hover{background:#1976d2}
    
    /* Style riêng cho các thẻ Merchant */
    .merchant-card-total { background: #e8eaf6; border-color: #c5cae9; }
    .merchant-card-total .val { color: #283593; }
    .merchant-card-active { background: #e8f5e9; border-color: #c8e6c9; }
    .merchant-card-active .val { color: #2e7d32; }
    .merchant-card-pending { background: #fff3e0; border-color: #ffe0b2; }
    .merchant-card-pending .val { color: #ef6c00; }

    .dark .card{background:#1e1e1e;border-color:#333}
    .dark .section-title{color:#ccc}
    .dark .title{color:#aaa}
    .dark .val{color:#eee}
  `;

  return (
    <section className="ff-container adb-wrap">
      <style>{styles}</style>

      <div className="topbar">
        <div>
           <h2 style={{margin:'0 0 4px'}}>Tổng quan Hệ thống</h2>
           <div className="muted">Dữ liệu toàn sàn FoodFast</div>
        </div>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {loading ? (
        // Skeleton loading hiệu ứng
        <div className="grid">
           {[1,2,3,4].map(i => (
             <div className="card" key={i}>
               <Sk h={20} w="60%" style={{marginBottom:12}} />
               <Sk h={36} w="40%" />
             </div>
           ))}
        </div>
      ) : error ? (
        <div className="card" style={{borderColor:'#f9c7c7', background:'#fde8e8', color:'#b80d0d', padding: 20}}>
          <h3>⚠️ Đã xảy ra lỗi</h3>
          <p>{error}</p>
          <button className="btn" onClick={load} style={{marginTop:10, background:'#d32f2f'}}>Thử lại ngay</button>
        </div>
      ) : (
        <>
          {/* 💡 PHẦN 1: TỔNG QUAN ĐỐI TÁC (MERCHANTS) - NGHIỆP VỤ MỚI */}
          <div className="section-title">🏢 Đối tác Nhà hàng</div>
          <div className="grid">
            <div className="card merchant-card-total">
              <div className="title">Tổng số Đối tác</div>
              <div className="val">{summary.totalMerchants}</div>
            </div>
            <div className="card merchant-card-active">
              <div className="title">Đang Hoạt động</div>
              <div className="val">{summary.activeMerchants}</div>
            </div>
            <div className="card merchant-card-pending">
              <div className="title">Chờ Duyệt</div>
              <div className="val">{summary.pendingMerchants}</div>
            </div>
             <div className="card">
              <div className="title">Tổng Đơn toàn sàn</div>
              <div className="val">{summary.totalOrders}</div>
            </div>
          </div>

          {/* PHẦN 2: TỔNG QUAN TÀI CHÍNH TOÀN SÀN */}
          <div className="section-title">💰 Tài chính Nền tảng</div>
          <div className="grid">
            <div className="card">
              <div className="title">Tổng Doanh thu Hôm nay</div>
              <div className="val" style={{color:'#2e7d32'}}>{VND(summary.revenueToday)}</div>
            </div>
            <div className="card">
              <div className="title">Tổng Doanh thu Tháng này</div>
              <div className="val" style={{color:'#1565c0'}}>{VND(summary.revenueMonth)}</div>
            </div>
          </div>

          {/* PHẦN 3: TRẠNG THÁI ĐƠN HÀNG & BIỂU ĐỒ */}
          <div className="grid" style={{gridTemplateColumns: '1fr 2fr'}}>
             {/* Cột trái: Trạng thái đơn hàng */}
             <div>
                <div className="section-title" style={{marginTop:0}}>📦 Trạng thái Đơn hàng</div>
                <div className="card" style={{display:'flex', flexDirection:'column', gap:12}}>
                  {['order','processing','delivery','done','cancelled'].map(s=>(
                    <div className="row" key={s} style={{margin:0, padding:'8px 0', borderBottom: s!=='cancelled'?'1px dashed #eee':'none'}}>
                      <span className={`badge ${s}`}>{s === 'order' ? 'Mới/Chờ xử lý' : s}</span>
                      <b style={{fontSize:16}}>{summary.byStatus[s]}</b>
                    </div>
                  ))}
                </div>
             </div>

             {/* Cột phải: Biểu đồ doanh thu */}
             <div>
                <div className="section-title" style={{marginTop:0}}>📈 Xu hướng Doanh thu (7 ngày)</div>
                <div className="card" style={{height:'calc(100% - 40px)'}}>
                  <div className="bars">
                    {summary.days.map((d, i) => {
                      const h = summary.maxVal ? Math.round(100 * d.value / summary.maxVal) : 0;
                      return (
                        <div key={i} className="bar" style={{height: Math.max(12, h) + '%', opacity: d.value ? 1 : 0.5}}>
                          {d.value > 0 && <span>{VND(d.value)}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="xaxis">
                    {summary.days.map((d, i) => <div key={i}>{d.label}</div>)}
                  </div>
                </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}