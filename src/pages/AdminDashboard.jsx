// src/pages/AdminDashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatVND } from '../utils/format';
import { myOrders } from "../utils/orderAPI";
// 💡 THÊM: Import API lấy thông tin quán
import { fetchMerchantById } from "../utils/merchantAPI"; 

// 💡 IMPORTS CHO BIỂU ĐỒ TRÒN
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const VND = (n) => formatVND(n);

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

// Component Biểu đồ tròn
function PieChartBreakdown({ data, totalRevenue }) {
    const palette = ['#FF5722', '#FFA62B', '#FFD233', '#1ABC9C', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12', '#777777'];
    
    const topItems = data.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    const significantItems = topItems.slice(0, 6);
    const otherRevenue = totalRevenue - significantItems.reduce((sum, item) => sum + item.value, 0);

    const chartLabels = significantItems.map(item => `${item.label} (${(item.value / totalRevenue * 100).toFixed(1)}%)`);
    const chartValues = significantItems.map(item => item.value);
    const chartColors = palette.slice(0, significantItems.length);

    if (otherRevenue > 0) {
        chartLabels.push(`Các món khác`);
        chartValues.push(otherRevenue);
        chartColors.push('#999');
    }

    const chartData = {
        labels: chartLabels,
        datasets: [{
            label: 'Doanh thu',
            data: chartValues,
            backgroundColor: chartColors,
            borderColor: '#fff',
            borderWidth: 2,
        }],
    };

    return (
        <div style={{ padding: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <div style={{ height: 280, width: 280 }}>
                {totalRevenue > 0 ? (
                    <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                ) : (
                    <p style={{ color: '#999', textAlign: 'center', marginTop: 80 }}>Không có dữ liệu bán hàng.</p>
                )}
            </div>
            <div style={{ marginTop: 20, width: '100%' }}>
                {chartLabels.map((label, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: chartColors[index] || '#999', marginRight: 8 }}></div>
                        <span style={{ fontSize: 13 }}>{label}</span>
                    </div>
                ))}
                <p style={{ marginTop: 15, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#555' }}>
                    Tổng doanh thu: {VND(totalRevenue)}
                </p>
            </div>
        </div>
    );
}

export default function AdminDashboard(){
  const [orders, setOrders] = useState([]);
  const [merchantInfo, setMerchantInfo] = useState(null); // 💡 State lưu thông tin quán
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const merchantId = user?.merchantId;

  const load = async () => {
    if (!merchantId) { 
        if (user?.role === 'Merchant') setError('Merchant ID không xác định.');
        return setLoading(false); 
    } 
    
    try {
      setLoading(true); setError('');
      
      // 💡 GỌI SONG SONG 2 API: Lấy đơn hàng & Lấy thông tin quán
      const [resOrders, resMerchant] = await Promise.all([
          myOrders({ page: 1, limit: 10000, status: 'all', q: '', merchantId: merchantId }),
          fetchMerchantById(merchantId).catch(() => null) // Nếu lỗi lấy info thì bỏ qua
      ]);
      
      // Xử lý đơn hàng
      const data = Array.isArray(resOrders) ? resOrders : (resOrders?.rows || resOrders?.data || []);
      const filteredData = data.filter(o => o.merchantId === merchantId);
      setOrders(filteredData);

      // Xử lý thông tin quán
      if (resMerchant) {
          setMerchantInfo(resMerchant);
      }

    } catch (e) {
      console.error(e);
      setError('Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); }, [merchantId]);

  // Logic tính toán thống kê (Giữ nguyên)
  const summary = useMemo(() => {
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);

    let revenueToday = 0; let revenueMonth = 0; let totalRevenue = 0; 
    const byStatus = { order:0, processing:0, delivery:0, done:0, cancelled:0 };
    const itemRevenueMap = {}; 

    for (const o of orders) {
      const total = o.finalTotal ?? o.total ?? 0;
      const s = normalizeStatus(o.status);
      if (byStatus[s] != null) byStatus[s]++;

      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (d && s !== 'cancelled') {
        if (d >= startOfToday) revenueToday += total;
        if (d >= startOfMonth) revenueMonth += total;
        for (const item of (o.items || [])) {
            const itemTotal = (item.price ?? 0) * (item.qty ?? 0);
            totalRevenue += itemTotal;
            itemRevenueMap[item.name] = (itemRevenueMap[item.name] || 0) + itemTotal;
        }
      }
    }

    const chartData = Object.entries(itemRevenueMap).map(([name, value]) => ({
        id: name, label: name, value: value, percentage: (value / totalRevenue) * 100,
    }));
    
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
    return { totalOrders: orders.length, revenueToday, revenueMonth, byStatus, days, maxVal, itemRevenueChart: chartData, totalRevenue };
  }, [orders, merchantId]);


  if (!merchantId && !user?.isSuperAdmin) return <div className="adb-wrap">Bạn không có quyền truy cập.</div>

  const styles = `
    .adb-wrap{padding:20px 16px; max-width: 1200px; margin: 0 auto;}
    .topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px}
    .topbar h2 { font-size: 24px; color: #333; }
    .btn{height:36px;border:none;border-radius:8px;background:#ff7a59;color:#fff;padding:0 16px;cursor:pointer;font-weight:600;font-size:14px;}
    
    /* 💡 STYLES CHO CẢNH BÁO */
    .locked-banner {
        background-color: #ffebee;
        color: #c62828;
        border: 1px solid #ef9a9a;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .locked-icon { font-size: 24px; }
    .locked-content strong { display: block; font-size: 16px; margin-bottom: 4px; }
    .locked-content p { margin: 0; font-size: 14px; opacity: 0.9; }

    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:24px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:16px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);}
    .title{font-size:13px;font-weight:600;color:#666; text-transform: uppercase; margin-bottom: 8px;}
    .val{font-size:26px;font-weight:800;color:#333; line-height: 1.2;}
    .row{display:flex;justify-content:space-between;align-items:center;margin:8px 0}
    .badge{display:inline-block;padding:4px 10px;border-radius:6px;background:#f7f7f7;border:1px solid #e8e8e8;text-transform:capitalize; font-weight: 600; font-size: 11px;}
    .badge.order{background:#fff0e9;border-color:#ffd8c6;color:#c24a26}
    .badge.processing{background:#fff7cd;border-color:#ffeaa1;color:#7a5a00}
    .badge.delivery{background:#e8f5ff;border-color:#cfe8ff;color:#0b68b3}
    .badge.done{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    .badge.cancelled{background:#fde8e8;border-color:#f9c7c7;color:#b80d0d}
    .bars{display:flex;gap:8px;align-items:flex-end;height:150px;margin-top:16px; overflow-x: auto; padding-bottom: 5px;}
    .bar{flex:1;background:#fff0e9;border:1px solid #ffb199;border-radius:6px 6px 0 0;display:flex;align-items:flex-end;justify-content:center; min-width: 30px;}
    .bar > span{font-size:10px;margin-bottom:4px;color:#c24a26;font-weight:600;}
    .xaxis{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:8px;font-size:11px;color:#888;text-align:center}
    .pie-breakdown-card { grid-column: span 2; }
    @media (max-width: 768px) { .pie-breakdown-card { grid-column: span 2; } .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .pie-breakdown-card { grid-column: span 1; } .grid { grid-template-columns: 1fr; } }
  `;

  return (
    <section className="ff-container adb-wrap">
      <style>{styles}</style>

      {/* 💡 HIỂN THỊ CẢNH BÁO NẾU BỊ KHÓA */}
      {merchantInfo?.isManuallyClosed && (
          <div className="locked-banner">
              <div className="locked-icon">⚠️</div>
              <div className="locked-content">
                  <strong>Cửa hàng đang TẠM NGƯNG HOẠT ĐỘNG</strong>
                  <p>
                      Cửa hàng của bạn đang ở trạng thái đóng cửa. Khách hàng sẽ không thể đặt món. 
                      <br/>
                      <i>Nếu bạn không thực hiện thao tác này, có thể <b>Quản trị viên (Server Admin)</b> đã tạm khóa cửa hàng của bạn. Vui lòng liên hệ Admin để mở lại.</i>
                  </p>
              </div>
          </div>
      )}

      <div className="topbar">
        <div>
            <h2 style={{margin:0}}>Dashboard</h2>
            <div style={{fontSize: 13, color:'#888', marginTop: 4}}>ID: {merchantId} {merchantInfo?.storeName ? `- ${merchantInfo.storeName}` : ''}</div>
        </div>
        <button className="btn" onClick={load}>Làm mới</button>
      </div>
      
      {/* (Phần Loading và Error giữ nguyên như cũ, chỉ rút gọn để code ngắn lại) */}
      {error && <div className="card" style={{background:'#fde8e8', color:'#b80d0d', padding: 20}}>❌ {error}</div>}

      {loading ? (
        <div className="grid">{[1,2,3,4].map(i => <div key={i} className="card"><Sk h={32}/></div>)}</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid">
            <div className="card"><div className="title">Doanh thu hôm nay</div><div className="val" style={{color:'#27ae60'}}>{VND(summary.revenueToday)}</div></div>
            <div className="card"><div className="title">Doanh thu tháng này</div><div className="val" style={{color:'#2980b9'}}>{VND(summary.revenueMonth)}</div></div>
            <div className="card"><div className="title">Tổng số đơn</div><div className="val">{summary.totalOrders}</div></div> 
          </div>

          {/* Status breakdown */}
          <div className="grid">
            {['order','processing','delivery','done'].map(s=>(
              <div className="card" key={s}>
                <div className="row"><span className={`badge ${s}`}>{s === 'order' ? 'Mới' : s}</span><b style={{fontSize: 20}}>{summary.byStatus[s]}</b></div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid">
             <div className="card pie-breakdown-card">
                <div className="title">TỶ TRỌNG DOANH THU (Top 6)</div>
                {summary.itemRevenueChart.length===0 ? <p style={{color:'#999'}}>Chưa có dữ liệu.</p> : <PieChartBreakdown data={summary.itemRevenueChart} totalRevenue={summary.totalRevenue}/>}
             </div>
             <div className="card" style={{gridColumn: 'span 2'}}>
                <div className="title">DOANH THU 7 NGÀY QUA</div>
                <div className="bars">{summary.days.map((d,i)=><div key={i} className="bar" style={{height:Math.max(12, Math.round(100*d.value/summary.maxVal))+'%'}}>{d.value>0&&<span>{VND(d.value)}</span>}</div>)}</div>
                <div className="xaxis">{summary.days.map((d,i)=><div key={i}>{d.label}</div>)}</div>
             </div>
          </div>
        </>
      )}
    </section>
  );
}