import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatVND } from '../utils/format';

const VND = (n)=>formatVND(n);

// ==== Helpers & APIs ====
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5181';
const normalizeOrderId = (raw) => String(decodeURIComponent(raw || '')).replace(/^#/, '');

async function getOrderById(id){
  const url = `${API_BASE}/orders/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không tìm thấy đơn');
  return res.json();
}
async function getDroneMission(missionId){
  const url = `${API_BASE}/drone_missions/${encodeURIComponent(missionId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không tìm thấy mission');
  return res.json();
}
async function findMissionByOrderId(orderId){
  const url = `${API_BASE}/drone_missions?orderId=${encodeURIComponent(orderId)}&_sort=createdAt&_order=desc&_limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const arr = await res.json();
  return arr?.[0] || null;
}
async function getDroneTelemetry(missionId){
  const url = `${API_BASE}/drone_telemetry?missionId=${encodeURIComponent(missionId)}&_sort=ts&_order=desc&_limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const arr = await res.json();
  return arr?.[0] || null;
}

// Leaflet loader
function ensureLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    const cssId = "leaflet-css-cdn";
    if (!document.getElementById(cssId)) {
      const l = document.createElement("link");
      l.id = cssId; l.rel = "stylesheet";
      l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(l);
    }
    const jsId = "leaflet-js-cdn";
    if (document.getElementById(jsId)) {
      const t = setInterval(()=>{ if(window.L){ clearInterval(t); resolve(window.L); }},50);
      return;
    }
    const s = document.createElement("script");
    s.id = jsId; s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.body.appendChild(s);
  }).then((L)=>{
    const iconBase = "https://unpkg.com/leaflet@1.9.4/dist/images/";
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: iconBase + "marker-icon-2x.png",
      iconUrl: iconBase + "marker-icon.png",
      shadowUrl: iconBase + "marker-shadow.png",
    });
    return L;
  });
}

const PILL = {
  queued:    {bg:'#f3f4f6', br:'#e5e7eb', tx:'#111827'},
  preflight: {bg:'#fff7cd', br:'#ffeaa1', tx:'#7a5a00'},
  takeoff:   {bg:'#e8f5ff', br:'#cfe8ff', tx:'#0b68b3'},
  enroute:   {bg:'#e8f5ff', br:'#cfe8ff', tx:'#0b68b3'},
  descending:{bg:'#e8f5ff', br:'#cfe8ff', tx:'#0b68b3'},
  dropoff:   {bg:'#dcfce7', br:'#bbf7d0', tx:'#166534'},
  returning: {bg:'#e8f5ff', br:'#cfe8ff', tx:'#0b68b3'},
  landed:    {bg:'#dcfce7', br:'#bbf7d0', tx:'#166534'},
  failed:    {bg:'#fde8e8', br:'#f9c7c7', tx:'#b80d0d'},
  cancelled: {bg:'#fde8e8', br:'#f9c7c7', tx:'#b80d0d'},
};

export default function DroneTracker(){
  const { id: rawId } = useParams();
  const orderId = normalizeOrderId(rawId);

  const [order, setOrder] = useState(null);
  const [mission, setMission] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  // Leaflet refs
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const pathRef = useRef(null);

  const styles = `
    .wrap{padding:20px 0}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .title{font-weight:800;margin-bottom:6px}
    .pill{display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:6px 10px;font-weight:700}
    .row{display:flex;justify-content:space-between;align-items:center;margin:6px 0}
    .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .kpi{background:#fff;border:1px solid #eee;border-radius:12px;padding:10px}
    .kpi .label{font-size:12px;opacity:.7}
    .kpi .val{font-weight:900;font-size:18px}
    .map{height:420px;border:1px dashed #ddd;border-radius:12px;overflow:hidden}
    .timeline{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
    .step{border:1px solid #eee;border-radius:999px;padding:6px 10px;font-size:12px}
    .tools{display:flex;gap:8px;margin-top:8px}
    .btn{height:34px;border:none;border-radius:8px;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    @media (max-width: 980px){ .grid{grid-template-columns:1fr} .map{height:340px} }
  `;

  const pillStyle = useMemo(()=>{
    const key = (mission?.status || 'queued').toLowerCase();
    const c = PILL[key] || PILL.queued;
    return { background:c.bg, borderColor:c.br, color:c.tx };
  }, [mission?.status]);

  // Load order + mission (+fallback by orderId) + telemetry
  useEffect(()=>{
    let ok = true;
    (async()=>{
      try{
        setLoading(true);
        const o = await getOrderById(orderId);
        if (!ok) return;
        setOrder(o);

        let m = null;
        if (o?.droneMissionId) {
          m = await getDroneMission(o.droneMissionId);
        } else {
          m = await findMissionByOrderId(orderId);
        }
        if (!ok) return;

        if (!m?.id) {
          setErr('Đơn này chưa có drone mission nên chưa thể theo dõi hành trình.');
          return;
        }
        setMission(m);

        const t = await getDroneTelemetry(m.id);
        if (!ok) return;
        if (t) setTelemetry(t);
      }catch(e){ setErr(e.message || 'Lỗi tải dữ liệu'); }
      finally{ setLoading(false); }
    })();
    return ()=>{ ok=false; };
  }, [orderId]);

  // Init/Update map
  useEffect(()=>{
    let disposed = false;
    (async ()=>{
      const L = await ensureLeaflet();
      if (disposed) return;

      const center = (telemetry?.lat && telemetry?.lng)
        ? [telemetry.lat, telemetry.lng]
        : [10.776, 106.701]; // fallback HCM

      if (!mapRef.current) {
        const map = L.map('drone-map', { zoomControl: true }).setView(center, 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(map);
        mapRef.current = map;
      } else {
        mapRef.current.setView(center, 14);
      }

      if (telemetry?.lat && telemetry?.lng && !markerRef.current) {
        markerRef.current = L.marker([telemetry.lat, telemetry.lng]).addTo(mapRef.current);
      }

      if (mission?.path && mission.path.length && !pathRef.current) {
        const latlngs = mission.path.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
        if (latlngs.length >= 2) {
          pathRef.current = L.polyline(latlngs, { color: '#2563eb', weight: 4, opacity: 0.8 }).addTo(mapRef.current);
          mapRef.current.fitBounds(pathRef.current.getBounds(), { padding: [20,20] });
        }
      }
    })();
    return ()=>{ disposed = true; };
  }, [mission?.path, telemetry?.lat, telemetry?.lng]);

  // Move marker when telemetry changes
  useEffect(()=>{
    let alive = true;
    (async ()=>{
      const L = await ensureLeaflet();
      if (!alive) return;
      if (telemetry?.lat && telemetry?.lng) {
        if (markerRef.current) {
          markerRef.current.setLatLng([telemetry.lat, telemetry.lng]);
        } else if (mapRef.current) {
          markerRef.current = L.marker([telemetry.lat, telemetry.lng]).addTo(mapRef.current);
        }
        if (mapRef.current) {
          mapRef.current.panTo([telemetry.lat, telemetry.lng], { animate: true, duration: 0.6 });
        }
      }
    })();
    return ()=>{ alive = false; };
  }, [telemetry?.lat, telemetry?.lng]);

  // Poll telemetry 5s
  useEffect(()=>{
    if (!mission?.id) return;
    const iv = setInterval(async ()=>{
      const t = await getDroneTelemetry(mission.id);
      if (t) setTelemetry(t);
    }, 5000);
    return ()=> clearInterval(iv);
  }, [mission?.id]);

  const disableMarkDelivered = !mission || !['dropoff','landed'].includes((mission?.status||'').toLowerCase());

  return (
    <section className="ff-container wrap">
      <style>{styles}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <h2 style={{margin:0}}>Theo dõi Drone</h2>
        <Link to="/admin/drone" className="btn" style={{textDecoration:'none',display:'inline-flex',alignItems:'center'}}>← Về danh sách Drone</Link>
      </div>

      {loading ? (
        <div className="card">Đang tải…</div>
      ) : err ? (
        <div className="card" style={{borderColor:'#f9c7c7', background:'#fde8e8', color:'#b80d0d'}}>❌ {err}</div>
      ) : (
        <div className="grid">
          {/* Map + live status */}
          <div className="card">
            <div className="row">
              <div className="title">Hành trình</div>
              <span className="pill" style={pillStyle}>
                {(mission?.status || 'queued').replaceAll('_',' ')}
              </span>
            </div>

            {!mission?.id && (
              <div className="muted" style={{marginBottom:8}}>
                Chưa có mission cho đơn này. Bản đồ hiển thị vị trí mặc định.
              </div>
            )}
            <div id="drone-map" className="map" />

            <div className="timeline">
              {['queued','preflight','takeoff','enroute','descending','dropoff','returning','landed'].map(st => (
                <div key={st} className="step" style={{background: (mission?.status||'').toLowerCase() === st ? '#eef2ff' : '#f9fafb'}}>
                  {st}
                </div>
              ))}
            </div>

            <div className="tools">
              <button className="btn" disabled={disableMarkDelivered} title={disableMarkDelivered ? 'Chỉ bật khi drone đã dropoff/landed' : ''}>
                Đánh dấu đã giao
              </button>
              <button className="btn" style={{background:'#6b7280'}} title="Sự cố: yêu cầu drone quay về">Yêu cầu quay về</button>
            </div>
          </div>

          {/* Order info */}
          <div className="card">
            <div className="title">Thông tin đơn #{order?.id}</div>
            <div className="meta">
              <div className="kpi"><div className="label">Tổng tiền</div><div className="val">{VND(order?.finalTotal ?? order?.total ?? 0)}</div></div>
              <div className="kpi"><div className="label">ETA</div><div className="val">{mission?.eta ? `${mission.eta} phút` : '—'}</div></div>
              <div className="kpi"><div className="label">Tốc độ</div><div className="val">{telemetry?.speed ? `${telemetry.speed} km/h` : '—'}</div></div>
              <div className="kpi"><div className="label">Độ cao</div><div className="val">{telemetry?.alt ? `${telemetry.alt} m` : '—'}</div></div>
              <div className="kpi"><div className="label">Pin</div><div className="val">{telemetry?.battery ? `${telemetry.battery}%` : '—'}</div></div>
              <div className="kpi"><div className="label">Cập nhật</div><div className="val" style={{fontSize:14}}>{telemetry?.ts ? new Date(telemetry.ts).toLocaleTimeString('vi-VN') : '—'}</div></div>
            </div>

            <div style={{marginTop:12}}>
              <div><b>Khách:</b> {order?.customerName}</div>
              <div className="muted">{order?.phone} — {order?.address}</div>
              <div style={{marginTop:8}}>
                <b>Món:</b>
                <ul style={{margin:'6px 0 0 18px'}}>
                  {order?.items?.map((it,i)=>(<li key={i}>{it.name} x{it.qty}</li>))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
