// src/pages/DroneTracker.jsx
// Leaflet + OSM (không cần Google key)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  getOrder as apiGetOrder,
  getMissionById,
  getDronePositions,
  createDemoMission,
  postDronePosition,
} from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5181';
const normalizeOrderId = (raw) => String(decodeURIComponent(raw || '')).replace(/^#/, '');

// ====== Status helper: chỉ cho phép khi Delivering ======
const normalizeStatus = (s='') => {
  const x = s.toLowerCase();
  if (['delivering'].includes(x)) return 'delivery';
  if (['delivered','completed','done'].includes(x)) return 'done';
  if (['cancelled','canceled'].includes(x)) return 'cancelled';
  if (['accepted','preparing','ready'].includes(x)) return 'processing';
  if (['new','pending','confirmed'].includes(x)) return 'order';
  return 'order';
};

// ====== Leaflet loader (CDN) ======
function ensureLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    const cssId = 'leaflet-css-cdn';
    if (!document.getElementById(cssId)) {
      const l = document.createElement('link');
      l.id = cssId;
      l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    const jsId = 'leaflet-js-cdn';
    if (document.getElementById(jsId)) {
      const t = setInterval(() => { if (window.L) { clearInterval(t); resolve(window.L); } }, 50);
      return;
    }
    const s = document.createElement('script');
    s.id = jsId;
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.body.appendChild(s);
  }).then((L) => {
    const iconBase = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: iconBase + 'marker-icon-2x.png',
      iconUrl: iconBase + 'marker-icon.png',
      shadowUrl: iconBase + 'marker-shadow.png',
    });
    return L;
  });
}

// ====== Helpers tọa độ & tính khoảng cách ======
const toLL = (p) => Array.isArray(p) ? p : [p?.lat, p?.lng ?? p?.lon ?? p?.longitude];
const isLL = (ll) => Array.isArray(ll) && Number.isFinite(ll[0]) && Number.isFinite(ll[1]);
const validLL = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
const normPoint = (p) => {
  let lat = Number(p.lat), lng = Number(p.lng ?? p.lon ?? p.longitude);
  if (!(Math.abs(lat) <= 90) && Math.abs(lng) <= 90) [lat, lng] = [lng, lat]; // đảo -> sửa
  return { ...p, lat, lng };
};
// Haversine (km)
const toRad = (d) => (d * Math.PI) / 180;
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function DroneTracker() {
  const { id: rawId } = useParams();
  const orderId = normalizeOrderId(rawId);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const backHref = isAdmin ? '/admin/drone' : '/orders';

  // data state
  const [order, setOrder] = useState(null);
  const [mission, setMission] = useState(null);
  const [positions, setPositions] = useState([]); // [{lat,lng,timestamp,...}]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [simulating, setSimulating] = useState(false);

  // view controls
  const [follow, setFollow] = useState(false);     // mặc định OFF
  const [canRefit, setCanRefit] = useState(false); // hiện nút Fit Route sau khi fit 1 lần
  const [etaMin, setEtaMin] = useState(null);      // ETA phút (FE)

  // timers
  const pollRef = useRef(null);
  const simRef = useRef(null);
  const lastTsRef = useRef(0);

  // leaflet refs
  const mapRef = useRef(null);
  const trailRef = useRef(null);
  const missionPathRef = useRef(null);
  const markerRef = useRef(null);
  const didFitRef = useRef(false);

  // ===== Load positions (tương thích 2 kiểu missionId/droneId) =====
  const fetchPositionsCompat = useCallback(async (missionId, since = 0) => {
    try {
      const arr = await getDronePositions({ missionId, since });
      if (arr?.length) return arr.map(normPoint);
    } catch {}
    try {
      const q = new URLSearchParams({ droneId: String(missionId), _sort: 'timestamp', _order: 'asc' });
      if (since && Number(since) > 0) q.set('timestamp_gte', String(since));
      const r = await fetch(`${API_BASE}/dronePositions?${q.toString()}`);
      if (!r.ok) return [];
      const arr = await r.json();
      return arr.map(normPoint);
    } catch { return []; }
  }, []);

  const findMissionByOrderId = useCallback(async (oid) => {
    const res = await fetch(`${API_BASE}/droneMissions?orderId=${encodeURIComponent(oid)}&_sort=startTime&_order=desc&_limit=1`);
    if (!res.ok) return null;
    const arr = await res.json();
    return arr?.[0] || null;
  }, []);

  // ===== Load order + mission (CHẶN nếu chưa Delivering / chưa có mission) =====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const o = await apiGetOrder(orderId);
        if (!alive) return;
        setOrder(o);

        // Chỉ cho xem khi đang giao
        if (normalizeStatus(o?.status) !== 'delivery') {
          setErr('❌ Đơn này chưa ở trạng thái đang giao nên không thể xem hành trình.');
          setMission(null);
          setLoading(false);
          return;
        }

        const m = o?.droneMissionId ? await getMissionById(o.droneMissionId) : await findMissionByOrderId(orderId);
        if (!alive) return;

        if (!m?.id) {
          setMission(null);
          setErr('❌ Đơn đang giao nhưng chưa có drone mission.');
          setLoading(false);
          return;
        }
        setMission(m);
      } catch (e) { console.error(e); setErr(e.message || 'Lỗi tải dữ liệu'); }
      finally { setLoading(false); }
    })();
    return () => { alive = false; };
  }, [orderId, findMissionByOrderId]);

  // ===== Poll realtime positions =====
  const startPolling = useCallback((missionId) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        let data = await fetchPositionsCompat(missionId, lastTsRef.current);
        data = (data || [])
          .filter(p => (p.missionId == null || String(p.missionId) === String(missionId)))
          .map(normPoint)
          .filter(p => validLL(p.lat, p.lng));

        if (data.length) {
          lastTsRef.current = data[data.length - 1].timestamp || lastTsRef.current;
          setPositions(prev => [...prev, ...data]);
        }
      } catch (e) { console.error('poll error', e); }
    }, 2000);
  }, [fetchPositionsCompat]);

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
  }, []);
  useEffect(() => stopAll, [stopAll]);

  useEffect(() => { if (mission?.id) startPolling(mission.id); }, [mission?.id, startPolling]);

  // ===== Simulator (optional, hiện đã bị chặn bởi điều kiện trên) =====
  const startSimulator = useCallback(async () => {
    if (simRef.current) return;
    const origin = { lat: 10.777642, lng: 106.695242 };     // Bến Thành
    const destination = { lat: 10.800976, lng: 106.653238 }; // gần Landmark
    try {
      const m = await createDemoMission({ origin, destination });
      setMission(m);
      setOrder(o => o ? ({ ...o, droneMissionId: m.id }) : o);

      const t0 = Date.now();
      lastTsRef.current = t0;
      await postDronePosition({ missionId: m.id, lat: origin.lat, lng: origin.lng, heading: 0, speed: 0, timestamp: t0 });

      const steps = 90;
      const dLat = (destination.lat - origin.lat) / steps;
      const dLng = (destination.lng - origin.lng) / steps;
      let i = 0;

      simRef.current = setInterval(async () => {
        i++;
        const lat = origin.lat + dLat * i;
        const lng = origin.lng + dLng * i;
        const heading = Math.atan2(dLng, dLat) * 180 / Math.PI;
        const ts = Date.now();
        await postDronePosition({ missionId: m.id, lat, lng, heading, speed: 12, timestamp: ts }).catch(()=>{});
        if (i >= steps) { clearInterval(simRef.current); simRef.current = null; setSimulating(false); }
      }, 2000);

      setSimulating(true);
      startPolling(m.id);
    } catch (e) { console.error(e); setErr('Không thể khởi tạo mission demo.'); }
  }, [startPolling]);

  // ===== Derived =====
  const path = useMemo(() => positions.map(p => [p.lat, p.lng]).filter(isLL), [positions]);
  const center = useMemo(() => {
    if (path.length && isLL(path[path.length - 1])) return path[path.length - 1];
    if (mission?.path?.length) {
      const first = toLL(mission.path[0]);
      if (isLL(first)) return first;
    }
    return [10.776, 106.701];
  }, [path, mission?.path]);
  const lastPos = path[path.length - 1];

  // ===== Tính ETA (phút) ở FE =====
  useEffect(() => {
    const mPath = (mission?.path || []).map(toLL).filter(isLL);
    if (!isLL(lastPos) || !mPath.length) { setEtaMin(null); return; }
    const dest = mPath[mPath.length - 1];
    const distKm = haversineKm(lastPos, dest);
    const speed = Number(mission?.speedKmh) > 0 ? Number(mission.speedKmh) : 35; // km/h
    const minutes = speed > 0 ? Math.ceil((distKm / speed) * 60) : null;
    setEtaMin(Number.isFinite(minutes) ? minutes : null);
  }, [lastPos, mission?.path, mission?.speedKmh]);

  // ===== Init / update Leaflet map =====
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await ensureLeaflet();
      if (disposed) return;

      // init map once
      if (!mapRef.current) {
        const el = document.getElementById('drone-map');
        if (!el) return;
        if (el._leaflet_id) el._leaflet_id = null; // Strict Mode protection
        const map = L.map(el, { zoomControl: true }).setView(center, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(map);
        mapRef.current = map;
      }

      // mission path (xanh)
      if (!missionPathRef.current && mission?.path?.length >= 2 && mapRef.current) {
        const latlngs = (mission.path || []).map(toLL).filter(isLL);
        if (latlngs.length >= 2) {
          missionPathRef.current = L.polyline(latlngs, { color: '#2563eb', weight: 4, opacity: 0.5 })
            .addTo(mapRef.current);
          if (!didFitRef.current) {
            mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] });
            didFitRef.current = true;
            setCanRefit(true);
          }
        }
      }

      // trail (đen) — theo dữ liệu thật
      if (!trailRef.current && path.length >= 2 && mapRef.current) {
        trailRef.current = L.polyline(path.filter(isLL), { color: '#111827', weight: 4, opacity: 0.9 })
          .addTo(mapRef.current);
      } else if (trailRef.current && path.length >= 2) {
        trailRef.current.setLatLngs(path.filter(isLL));
      }

      // moving marker
      if (isLL(lastPos) && mapRef.current) {
        if (!markerRef.current) markerRef.current = L.marker(lastPos).addTo(mapRef.current);
        else markerRef.current.setLatLng(lastPos);
      }

      // chỉ center khi Follow bật
      if (follow && isLL(lastPos) && mapRef.current) {
        mapRef.current.setView(lastPos, mapRef.current.getZoom() || 16, { animate: true });
      }
    })();
    return () => { disposed = true; };
  }, [mission?.path, center, lastPos, path, follow]);

  // cleanup toàn cục khi unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (simRef.current)  { clearInterval(simRef.current);  simRef.current  = null; }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      trailRef.current = null;
      missionPathRef.current = null;
      markerRef.current = null;
      didFitRef.current = false;
    };
  }, []);

  // ===== UI =====
  const styles = `
    .wrap{padding:20px 0}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .btn{height:36px;border:none;border-radius:10px;background:#111;color:#fff;padding:0 14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
    .btn.secondary{background:#f3f4f6;color:#111;border:1px solid #e5e7eb}
    .btn.ghost{background:#fff;color:#111;border:1px solid #e5e7eb}
    .btn.on{background:#059669}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}
    .map{height:420px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;position:relative}
    .kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .box{border:1px solid #eee;border-radius:12px;padding:10px}
    .label{font-size:12px;opacity:.7}
    .val{font-weight:900}
    .map-actions{position:absolute;right:12px;top:12px;display:flex;gap:8px;z-index:1000}
    @media (max-width:980px){ .grid{grid-template-columns:1fr} .map{height:340px} }
  `;

  if (loading) return <div className="p-6">Đang tải dữ liệu…</div>;

  // Nếu không hợp lệ, chỉ hiển thị thông báo + nút quay lại
  if (err) {
    return (
      <section className="ff-container wrap">
        <style>{styles}</style>
        <div className="hdr">
          <h2 style={{margin:0}}>Theo dõi Drone</h2>
          <Link to={backHref} className="btn secondary" style={{textDecoration:'none'}}>← Về danh sách Drone</Link>
        </div>
        <div className="card" style={{borderColor:'#f9c7c7',background:'#fde8e8',color:'#b80d0d'}}>
          {err}
        </div>
      </section>
    );
  }

  return (
    <section className="ff-container wrap">
      <style>{styles}</style>

      <div className="hdr">
        <div>
          <h2 style={{margin:0}}>Theo dõi Drone</h2>
          <div className="text-sm text-gray-500">Đơn: #{orderId}</div>
          {mission?.id ? (
            <div className="text-sm" style={{color:'#059669'}}>Mission: {mission.id} {simulating ? '(demo)' : ''}</div>
          ) : (
            <div className="text-sm" style={{color:'#b45309'}}>Chưa có mission cho đơn này.</div>
          )}
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link to={backHref} className="btn secondary" style={{textDecoration:'none'}}>← Về danh sách Drone</Link>
        </div>
      </div>

      <div className="grid">
        {/* Map + hành động hữu ích cho tọa độ */}
        <div className="card">
          <div className="map">
            <div className="map-actions">
              <button
                className={`btn ghost ${follow ? 'on' : ''}`}
                onClick={() => setFollow(f => !f)}
                title="Bật/tắt tự bám theo drone"
              >
                {follow ? 'Follow: ON' : 'Follow: OFF'}
              </button>
              {canRefit && missionPathRef.current && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    if (mapRef.current && missionPathRef.current) {
                      mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] });
                    }
                  }}
                  title="Canh bản đồ theo toàn tuyến"
                >
                  Fit route
                </button>
              )}
            </div>
            <div id="drone-map" style={{height:'100%', width:'100%'}} />
          </div>

          {/* Hành động hữu ích */}
          <div className="text-sm" style={{marginTop:8, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            {isLL(lastPos) ? (
              <>
                <>Vị trí hiện tại: <b>{lastPos[0].toFixed(6)}, {lastPos[1].toFixed(6)}</b></>
                <a
                  className="btn ghost"
                  href={`https://www.google.com/maps?q=${lastPos[0]},${lastPos[1]}`}
                  target="_blank" rel="noreferrer"
                  title="Mở trên Google Maps"
                >
                  Mở Google Maps
                </a>
                <a
                  className="btn ghost"
                  href={`https://www.openstreetmap.org/?mlat=${lastPos[0]}&mlon=${lastPos[1]}#map=17/${lastPos[0]}/${lastPos[1]}`}
                  target="_blank" rel="noreferrer"
                  title="Mở trên OpenStreetMap"
                >
                  Mở OSM
                </a>
                <button
                  className="btn ghost"
                  onClick={() => {
                    const s = window.prompt(
                      'Dán tọa độ "lat,lng" để nhảy tới:',
                      `${lastPos[0].toFixed(6)}, ${lastPos[1].toFixed(6)}`
                    );
                    if (!s) return;
                    const m = s.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
                    if (!m) return alert('Định dạng không hợp lệ. Ví dụ: 10.776889, 106.700806');
                    const lat = parseFloat(m[1]), lng = parseFloat(m[3]);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return alert('Toạ độ không hợp lệ.');
                    if (mapRef.current) mapRef.current.setView([lat, lng], 16, { animate: true });
                  }}
                  title="Dán lat,lng để pan tới"
                >
                  Đi đến tọa độ…
                </button>
              </>
            ) : <>Chưa có dữ liệu vị trí.</>}
          </div>
        </div>

        {/* Order & Telemetry */}
        <div className="card">
          <div className="kpi">
            <div className="box">
              <div className="label">Tổng tiền</div>
              <div className="val">{(order?.finalTotal ?? order?.total ?? 0).toLocaleString('vi-VN')} ₫</div>
            </div>
            <div className="box">
              <div className="label">Mission status</div>
              <div className="val">{mission?.status || '—'}</div>
            </div>
            <div className="box">
              <div className="label">Cập nhật</div>
              <div className="val">
                {positions.length ? new Date(positions[positions.length-1].timestamp).toLocaleTimeString('vi-VN') : '—'}
              </div>
            </div>
            <div className="box">
              <div className="label">ETA</div>
              <div className="val">{etaMin != null ? `${etaMin} phút` : '—'}</div>
            </div>
          </div>

          <div style={{marginTop:12}}>
            <div><b>Khách:</b> {order?.customerName}</div>
            <div className="text-sm" style={{opacity:.75}}>{order?.phone} — {order?.address}</div>
            <div style={{marginTop:8}}>
              <b>Món:</b>
              <ul style={{margin:'6px 0 0 18px'}}>
                {order?.items?.map((it,i)=>(<li key={i}>{it.name} x{it.qty}</li>))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
