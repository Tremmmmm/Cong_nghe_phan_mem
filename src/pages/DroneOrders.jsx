// src/pages/DroneOrders.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { myOrders } from "../utils/orderAPI.js";
import { formatVND } from "../utils/format";
import { useAuth } from "../context/AuthContext.jsx";

const VND = (n) => formatVND(n);
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5181";

/* ====================== Telemetry helpers ====================== */
async function getLatestTelemetry(missionId) {
  if (!missionId) return null;
  const fetchOne = async (qs) => {
    const r = await fetch(`${API_BASE}/dronePositions?${qs.toString()}`);
    if (!r.ok) return null;
    const arr = await r.json();
    if (!arr?.[0]) return null;
    const t = arr[0];
    return { ...t, ts: typeof t.timestamp === "string" ? Date.parse(t.timestamp) : t.timestamp };
  };
  try {
    const q1 = new URLSearchParams({ missionId: String(missionId), _sort: "timestamp", _order: "desc", _limit: "1" });
    const t1 = await fetchOne(q1);
    if (t1) return t1;
    const q2 = new URLSearchParams({ droneId: String(missionId), _sort: "timestamp", _order: "desc", _limit: "1" });
    return await fetchOne(q2);
  } catch { return null; }
}

async function getMission(missionId) {
  if (!missionId) return null;
  try {
    const res = await fetch(`${API_BASE}/droneMissions/${encodeURIComponent(missionId)}`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function findMissionByOrderId(orderId) {
  try {
    const qs = new URLSearchParams({ orderId: String(orderId), _sort: "startTime", _order: "desc", _limit: "1" });
    const res = await fetch(`${API_BASE}/droneMissions?${qs.toString()}`);
    if (!res.ok) return null;
    const arr = await res.json();
    return arr?.[0] || null;
  } catch { return null; }
}

/* ====================== Status helpers ====================== */
const normalizeStatus = (s = "") => {
  const x = s.toLowerCase();
  if (["delivering"].includes(x)) return "delivery";
  if (["delivered", "completed", "done"].includes(x)) return "done";
  if (["cancelled", "canceled"].includes(x)) return "cancelled";
  if (["accepted", "preparing", "ready"].includes(x)) return "processing";
  if (["new", "pending", "confirmed"].includes(x)) return "order";
  return "order";
};

function missionGroup(ms) {
  const s = String(ms || "").toLowerCase();
  if (["queued","preflight","ready","pickup","waiting"].includes(s)) return "waiting";     
  if (["in_progress","delivering","flight","takeoff","enroute","descending","returning"].includes(s)) return "active"; 
  if (["dropoff","landed","delivered","completed"].includes(s)) return "done";            
  if (["failed","cancelled","canceled","error"].includes(s)) return "error";              
  return null;
}

function isOrderDone(order) {
  const os = String(order?.status || "").toLowerCase();
  return ["completed", "done", "delivered"].includes(os);
}

const canTrack = (order, mission) => {
    const st = normalizeStatus(order?.status);
    const hasMission = !!mission?.id || !!order?.droneMissionId;
    return st === "delivery" && hasMission;
};

/* ====================== UI Components ====================== */
function MissionCell3({ order, mission, telemetry }) {
  const g = missionGroup(mission?.status);
  let label = "Chờ lấy hàng";
  let group = "waiting";
  if (g === "active") { label = "Đang bay"; group = "active"; }
  else if (g === "done") { label = "Đã giao hàng"; group = "done"; }
  else if (g === "error") { label = "Lỗi/Hủy"; group = "error"; }

  const palette = {
    waiting: { bg:"#fff7cd", br:"#ffeaa1", tx:"#7a5900" },
    active:  { bg:"#e8f5ff", br:"#cfe8ff", tx:"#0b67b3" },
    done:    { bg:"#dcfce7", br:"#bbf7d0", tx:"#166534" },
    error:   { bg:"#fde8e8", br:"#f9c7c7", tx:"#b80d0d" },
    default: { bg:"#f3f4f6", br:"#e5e7eb", tx:"#111827" },
  };
  const c = palette[group] || palette.default;
  const updated = telemetry?.ts ? new Date(telemetry.ts).toLocaleTimeString("vi-VN") : "—";

  return (
    <div className="mission-status-box">
      <span style={{
          display:"inline-block", padding:"4px 10px", borderRadius:999,
          border:`1px solid ${c.br}`, background:c.bg, color:c.tx,
          fontWeight:700, fontSize:12, whiteSpace: "nowrap"
        }}>
        {label}
      </span>
      <div className="mini" style={{marginTop:4, lineHeight:1.2, opacity:.8}}>
        Cập nhật: {updated}
      </div>
    </div>
  );
}

function CoordText({ lat, lng }) {
  const has = Number.isFinite(lat) && Number.isFinite(lng);
  if (!has) return <span className="mini">—</span>;
  return (
    <div className="coord" title={`${lat}, ${lng}`}>
      <div className="coord-line mini">{lat.toFixed(5)}</div>
      <div className="coord-line mini">{lng.toFixed(5)}</div>
    </div>
  );
}
const Dash = () => <span className="mini">—</span>;

/* ====================== Main Page ====================== */
export default function DroneOrders() {
  const { user, isMerchant, isSuperAdmin } = useAuth(); 
  const merchantId = isMerchant ? user?.merchantId : null;
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [missionById, setMissionById] = useState({});
  const [missionByOrderId, setMissionByOrderId] = useState({});
  const [teleByMission, setTeleByMission] = useState({});

  // 💡 CSS Mobile-First & Desktop Responsive
  const styles = `
    .wrap{padding:20px 16px; max-width: 1200px; margin: 0 auto;}
    
    /* Header */
    .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px; flex-wrap: wrap;}
    .topbar h2 { font-size: 24px; color: #333333ff; }
    .btn{height:36px;border:none;border-radius:8px;background:#AB3A20;color:#fff;padding:0 16px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-weight:600; font-size: 14px; transition: opacity 0.2s;}
    .btn:hover{opacity: 0.9;}
    .btn:disabled{background:#d1d5db;color:#6b7280; cursor: not-allowed}

    /* Summary Cards */
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:16px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);}
    .title{font-weight:600;margin:0 0 6px; font-size: 13px; color: #666; text-transform: uppercase;}
    .val{font-size:24px;font-weight:800; color: #333;}

    /* --- DESKTOP TABLE STYLE --- */
    .desktop-view { display: block; overflow-x: auto; background: #fff; border-radius: 12px; border: 1px solid #eee; }
    .table{width:100%;border-collapse:collapse; min-width: 900px;}
    .row{border-bottom:1px solid #f0f0f0;}
    .row:last-child {border-bottom: none;}
    .cell{padding:14px 16px;vertical-align:middle; font-size: 14px;}
    .cell.right{text-align:right} .cell.center{text-align:center}
    .header{font-size:13px;color:#666;background: #f9fafb; font-weight: 600; text-transform: uppercase;}
    
    .mini{font-size:12px;color: #888;}
    .money-val { font-weight: 700; color: #333; }

    .badge{display:inline-block;padding:3px 8px;border-radius:6px;background:#f3f4f6;border:1px solid #e5e7eb;text-transform:capitalize;font-weight:600;font-size:12px; margin-left: 6px;}
    .badge.delivery{background:#e0f2fe;color:#0369a1;border-color:#bae6fd}
    .badge.done{background:#dcfce7;color:#15803d;border-color:#86efac}
    .badge.cancelled{background:#fee2e2;color:#b91c1c;border-color:#fecaca}

    /* --- MOBILE CARD STYLE (Ẩn Table, Hiện Card) --- */
    .mobile-view { display: none; grid-template-columns: 1fr; gap: 16px; }

    /* RESPONSIVE QUERY */
    @media (max-width: 900px) {
        .desktop-view { display: none; } /* Ẩn bảng trên màn nhỏ */
        .mobile-view { display: grid; }  /* Hiện dạng thẻ */
        
        .m-card { 
            background: #fff; border: 1px solid #eee; border-radius: 12px; 
            padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            display: flex; flex-direction: column; gap: 12px;
        }
        .m-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed #eee; padding-bottom: 12px; }
        .m-id { font-size: 16px; font-weight: 800; color: #333; }
        .m-time { font-size: 12px; color: #999; margin-top: 2px; }
        
        .m-body { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
        .m-label { color: #888; margin-bottom: 2px; font-size: 11px; text-transform: uppercase; }
        .m-val { font-weight: 600; color: #333; }

        .m-mission { background: #f9fafb; padding: 10px; border-radius: 8px; margin-top: 4px; }
        .m-actions { margin-top: 8px; }
        .m-btn { width: 100%; height: 40px; border-radius: 8px; background: #ff7a59; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; text-decoration: none; border: none; }
        .m-btn:disabled { background: #e5e7eb; color: #9ca3af; }
    }
  `;

  const load = async () => {
    if (isMerchant && !merchantId) return setLoading(false);

    setLoading(true);
    try {
      const res = await myOrders({ 
          page: 1, limit: 10000, status: "all", q: "", sort: "createdAt", order: "desc",
          merchantId: isMerchant ? merchantId : null 
      });
      
      const arr = Array.isArray(res) ? res : res?.rows || res?.data || [];
      
      // 💡 BƯỚC LỌC AN TOÀN BỔ SUNG: Chỉ giữ lại đơn hàng khớp Merchant ID (nếu là Merchant)
      const safeOrders = isMerchant ? arr.filter(o => o.merchantId === merchantId) : arr;
      
      const drones = safeOrders.filter((o) => { // ⬅️ Lọc trên safeOrders
        const s = String(o.status || "").toLowerCase();
        const isDelivering = s.includes("deliver");
        const isDone = ["completed", "done", "delivered"].includes(s);
        const isReady = s.includes("ready");
        const isDrone = String(o.deliveryMode || "").toLowerCase() === "drone" || String(o.courier || "").toLowerCase() === "drone" || !!o.droneMissionId;
        return isDelivering || isDone || (isReady && isDrone);
      });

      const sorted = [...drones].sort((a, b) => {
        const ta = Date.parse(a?.updatedAt || a?.createdAt || 0);
        const tb = Date.parse(b?.updatedAt || b?.createdAt || 0);
        return tb - ta;
      });
      setOrders(sorted);

      const missionList = await Promise.all(
        drones.map(async (o) => (o.droneMissionId ? await getMission(o.droneMissionId) : await findMissionByOrderId(o.id)))
      );

      const mMap = {}, mOrderMap = {};
      missionList.forEach((m) => {
        if (m?.id) {
          mMap[m.id] = m;
          if (m.orderId != null) mOrderMap[String(m.orderId)] = m;
        }
      });
      setMissionById(mMap);
      setMissionByOrderId(mOrderMap);

      const teleList = await Promise.all(missionList.map((m) => (m?.id ? getLatestTelemetry(m.id) : null)));
      const tMap = {};
      teleList.forEach((t) => {
        if (!t) return;
        if (t.missionId) tMap[t.missionId] = t;
        else if (t.droneId) tMap[t.droneId] = t;
      });
      setTeleByMission(tMap);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [merchantId]);

  const summary = useMemo(() => {
    const counts = { active: 0, waiting: 0, done: 0, error: 0, noMission: 0 };
    for (const o of orders) {
      const m = missionById[o.droneMissionId] || missionByOrderId[String(o.id)];
      if (!m) { counts.noMission++; continue; }
      const g = missionGroup(m.status);
      if (g === "waiting" && !isOrderDone(o)) counts.waiting++;
      else if (g === "active") counts.active++;
      else if (g === "done") counts.done++;
      else if (g === "error") counts.error++;
    }
    return { total: orders.length, ...counts };
  }, [orders, missionById, missionByOrderId]);

  // Render content helper
  const renderContent = (o) => {
    const m = missionById[o.droneMissionId] || missionByOrderId[String(o.id)] || null;
    const t = m ? (teleByMission[m.id] || teleByMission[o.droneMissionId]) : null;
    const lat = Number(t?.lat), lng = Number(t?.lng);
    const orderParam = encodeURIComponent(String(o.id).replace(/^#/, ""));
    const hasMission = !!m?.id;
    const trackable = canTrack(o, m);
    const href = isSuperAdmin ? `/admin/drone/${orderParam}` : isMerchant ? `/merchant/drone/${orderParam}` : `/orders/${orderParam}/tracking`;
    
    const orderCls = normalizeStatus(o.status);
    const orderLabelEN = { order: "Order", processing: "Ready", delivery: "Delivering", done: "Completed", cancelled: "Cancelled" }[orderCls] || (o.status || "—");

    return { o, m, t, lat, lng, trackable, href, orderCls, orderLabelEN, hasMission };
  };

  return (
    <section className="ff-container wrap">
      <style>{styles}</style>

      <div className="topbar">
        <h2 style={{ margin: 0 }}>Drone (theo dõi)</h2>
        <button className="btn" onClick={load}>↻ Làm mới</button>
      </div>

      <div className="grid">
        <div className="card"><div className="title">ĐANG BAY</div><div className="val" style={{color:'#0b67b3'}}>{summary.active}</div></div>
        <div className="card"><div className="title">CHỜ LẤY</div><div className="val" style={{color:'#7a5900'}}>{summary.waiting}</div></div>
        <div className="card"><div className="title">ĐÃ GIAO</div><div className="val" style={{color:'#166534'}}>{summary.done}</div></div>
        <div className="card"><div className="title">LỖI</div><div className="val" style={{color:'#b80d0d'}}>{summary.error}</div></div>
      </div>

      {loading ? (
        <div className="card" style={{textAlign:'center', padding: 40}}>Đang tải dữ liệu...</div>
      ) : !orders.length ? (
        <div className="card" style={{textAlign:'center', padding: 40}}>Chưa có đơn giao bằng Drone.</div>
      ) : (
        <>
          {/* --- DESKTOP TABLE VIEW --- */}
          <div className="desktop-view">
            <table className="table">
              <colgroup>
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "8%"  }} />
                <col style={{ width: "8%"  }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%"  }} />
              </colgroup>
              <thead>
                <tr className="row">
                  <th className="cell header">Đơn hàng</th>
                  <th className="cell header">Khách hàng</th>
                  <th className="cell header center">Tiền</th>
                  <th className="cell header center">Trạng thái Mission</th>
                  <th className="cell header center">Tốc độ</th>
                  <th className="cell header center">ETA</th>
                  <th className="cell header center">Vị trí</th>
                  <th className="cell header right"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const { m, t, lat, lng, trackable, href, orderCls, orderLabelEN, hasMission } = renderContent(o);
                  return (
                    <tr key={o.id} className="row">
                      <td className="cell">
                        <div style={{fontWeight:700}}>#{o.id} <span className={`badge ${orderCls}`}>{orderLabelEN}</span></div>
                        <span className="mini">{o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "—"}</span>
                      </td>
                      <td className="cell">
                        <div style={{fontWeight:600}}>{o.customerName}</div>
                        <span className="mini">{o.phone || "—"}</span>
                      </td>
                      <td className="cell center"><span className="money-val">{VND(o.finalTotal ?? o.total ?? 0)}</span></td>
                      <td className="cell center">
                        {hasMission ? <MissionCell3 order={o} mission={m} telemetry={t} /> : <Dash />}
                      </td>
                      <td className="cell center">{Number.isFinite(t?.speed) ? `${Number(t.speed).toFixed(1)} km/h` : <Dash />}</td>
                      <td className="cell center">{Number.isFinite(m?.eta) ? `~${m.eta} p` : <Dash />}</td>
                      <td className="cell center"><CoordText lat={lat} lng={lng} /></td>
                      <td className="cell right">
                        <Link to={trackable ? href : '#'} className="btn" style={{ minWidth: 120, background: trackable ? '#ff7a59' : '#e5e7eb', color: trackable ? '#fff' : '#9ca3af', pointerEvents: trackable ? 'auto' : 'none' }}>
                          Xem hành trình
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* --- MOBILE CARD VIEW --- */}
          <div className="mobile-view">
            {orders.map((o) => {
               const { m, t, lat, lng, trackable, href, orderCls, orderLabelEN, hasMission } = renderContent(o);
               return (
                <div className="m-card" key={o.id}>
                  <div className="m-head">
                    <div>
                      <div className="m-id">#{o.id}</div>
                      <div className="m-time">{o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "—"}</div>
                    </div>
                    <span className={`badge ${orderCls}`}>{orderLabelEN}</span>
                  </div>
                  
                  <div className="m-body">
                    <div>
                      <div className="m-label">Khách hàng</div>
                      <div className="m-val">{o.customerName}</div>
                      <div className="mini">{o.phone}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="m-label">Tổng tiền</div>
                      <div className="m-val" style={{color:'#ff7a59'}}>{VND(o.finalTotal ?? o.total ?? 0)}</div>
                    </div>
                  </div>

                  <div className="m-mission">
                     <div style={{display:'flex', justifyContent:'space-between', marginBottom: 6}}>
                        <span className="m-label">Trạng thái bay</span>
                        {hasMission ? <MissionCell3 order={o} mission={m} telemetry={t} /> : <span className="mini">Chưa có</span>}
                     </div>
                     <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, textAlign:'center'}}>
                        <div>
                            <div className="m-label">Tốc độ</div>
                            <div style={{fontWeight:600}}>{Number.isFinite(t?.speed) ? `${t.speed.toFixed(0)} km/h` : '-'}</div>
                        </div>
                        <div>
                            <div className="m-label">ETA</div>
                            <div style={{fontWeight:600}}>{Number.isFinite(m?.eta) ? `${m.eta}p` : '-'}</div>
                        </div>
                        <div>
                           <div className="m-label">Vị trí</div>
                           <CoordText lat={lat} lng={lng} />
                        </div>
                     </div>
                  </div>

                  <div className="m-actions">
                      <Link to={href} className="m-btn" style={{ opacity: trackable ? 1 : 0.5, pointerEvents: trackable ? 'auto' : 'none' }}>
                         Xem Bản Đồ Hành Trình
                      </Link>
                  </div>
                </div>
               )
            })}
          </div>
        </>
      )}
    </section>
  );
}