// src/pages/DroneTracker.jsx (Leaflet + OSM, no Google key)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getOrder as apiGetOrder,
  getMissionById,
  getDronePositions,
  createDemoMission,
  postDronePosition,
} from '../utils/api';

// ====== Config ======
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5181';
const normalizeOrderId = (raw) => String(decodeURIComponent(raw || '')).replace(/^#/, '');

// ====== Leaflet loader (CDN) ======
function ensureLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    // CSS
    const cssId = 'leaflet-css-cdn';
    if (!document.getElementById(cssId)) {
      const l = document.createElement('link');
      l.id = cssId;
      l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    // JS
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
    // default marker icons for CDN
    const iconBase = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: iconBase + 'marker-icon-2x.png',
      iconUrl: iconBase + 'marker-icon.png',
      shadowUrl: iconBase + 'marker-shadow.png',
    });
    return L;
  });
}

export default function DroneTracker() {
  const { id: rawId } = useParams();
  const orderId = normalizeOrderId(rawId);
  const navigate = useNavigate();

  // data state
  const [order, setOrder] = useState(null);
  const [mission, setMission] = useState(null);
  const [positions, setPositions] = useState([]); // [{lat,lng,timestamp,...}]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [simulating, setSimulating] = useState(false);

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

  // ===== Helpers compatible with your DB (missionId vs droneId) =====
  const fetchPositionsCompat = useCallback(async (missionId, since = 0) => {
    // 1) try standard missionId
    try {
      const arr = await getDronePositions({ missionId, since });
      if (arr?.length) {
        return arr.map(p => ({
          ...p,
          timestamp: typeof p.timestamp === 'string' ? Date.parse(p.timestamp) : p.timestamp,
        }));
      }
    } catch { /* ignore */ }

    // 2) fallback DB that used "droneId"
    try {
      const q = new URLSearchParams({
        droneId: String(missionId),
        _sort: 'timestamp',
        _order: 'asc',
      });
      if (since && Number(since) > 0) q.set('timestamp_gte', String(since));
      const r = await fetch(`${API_BASE}/dronePositions?${q.toString()}`);
      if (!r.ok) return [];
      const arr = await r.json();
      return (arr || []).map(p => ({
        ...p,
        timestamp: typeof p.timestamp === 'string' ? Date.parse(p.timestamp) : p.timestamp,
      }));
    } catch {
      return [];
    }
  }, []);

  const findMissionByOrderId = useCallback(async (oid) => {
    const url = `${API_BASE}/droneMissions?orderId=${encodeURIComponent(oid)}&_sort=startTime&_order=desc&_limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.json();
    return arr?.[0] || null;
  }, []);

  // ===== Load order + mission =====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const o = await apiGetOrder(orderId);
        if (!alive) return;
        setOrder(o);

        let m = null;
        if (o?.droneMissionId) m = await getMissionById(o.droneMissionId);
        else m = await findMissionByOrderId(orderId);
        if (!alive) return;

        if (!m?.id) {
          setMission(null);
          setErr('Đơn này chưa có drone mission nên chưa thể theo dõi hành trình.');
          return;
        }
        setMission(m);
      } catch (e) {
        console.error(e);
        setErr(e.message || 'Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [orderId, findMissionByOrderId]);

  // ===== Poll realtime positions =====
  const startPolling = useCallback((missionId) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await fetchPositionsCompat(missionId, lastTsRef.current);
        if (data?.length) {
          lastTsRef.current = data[data.length - 1].timestamp || lastTsRef.current;
          setPositions(prev => [...prev, ...data]);
        }
      } catch (e) {
        console.error('poll error', e);
      }
    }, 2000);
  }, [fetchPositionsCompat]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => { stopPolling(); stopSimulator(); }, [stopPolling]);

  useEffect(() => {
    if (mission?.id) startPolling(mission.id);
  }, [mission?.id, startPolling]);

  // ===== Simulator (if no mission; optional button) =====
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
        try {
          await postDronePosition({ missionId: m.id, lat, lng, heading, speed: 12, timestamp: ts });
        } catch (e) { console.error('sim post err', e); }
        if (i >= steps) stopSimulator();
      }, 2000);

      setSimulating(true);
      startPolling(m.id);
    } catch (e) {
      console.error(e);
      setErr('Không thể khởi tạo mission demo.');
    }
  }, [startPolling]);

  const stopSimulator = useCallback(() => {
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
    setSimulating(false);
  }, []);

  // ===== Derived =====
  const path = useMemo(() => positions.map(p => [p.lat, p.lng]), [positions]);
  const center = useMemo(() => {
    if (path.length) return path[path.length - 1];
    if (mission?.path?.length) return [mission.path[0].lat, mission.path[0].lng];
    return [10.776, 106.701]; // HCM fallback
  }, [path, mission?.path]);
  const lastPos = path[path.length - 1];

  // ===== Init / update Leaflet map =====
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await ensureLeaflet();
      if (disposed) return;

      // init map once
      if (!mapRef.current) {
        const map = L.map('drone-map', { zoomControl: true }).setView(center, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(map);
        mapRef.current = map;
      } else {
        // keep camera near the last position if exists
        if (lastPos) mapRef.current.panTo(lastPos, { animate: true });
      }

      // draw planned mission path once (if exists)
      if (!missionPathRef.current && mission?.path?.length >= 2 && mapRef.current) {
        const latlngs = mission.path.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
        missionPathRef.current = L.polyline(latlngs, { color: '#2563eb', weight: 4, opacity: 0.6 }).addTo(mapRef.current);
        if (!didFitRef.current) {
          mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] });
          didFitRef.current = true;
        }
      }

      // draw/update trail polyline (positions)
      if (!trailRef.current && path.length >= 2 && mapRef.current) {
        trailRef.current = L.polyline(path, { color: '#111827', weight: 4, opacity: 0.9 }).addTo(mapRef.current);
      } else if (trailRef.current && path.length >= 2) {
        trailRef.current.setLatLngs(path);
      }

      // draw/update moving marker
      if (lastPos && mapRef.current) {
        if (!markerRef.current) {
          markerRef.current = L.marker(lastPos).addTo(mapRef.current);
        } else {
          markerRef.current.setLatLng(lastPos);
        }
      }
    })();
    return () => { disposed = true; };
  }, [mission?.path, center, lastPos, path]);

  // ===== UI =====
  const styles = `
    .wrap{padding:20px 0}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .btn{height:36px;border:none;border-radius:10px;background:#111;color:#fff;padding:0 14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
    .btn.secondary{background:#f3f4f6;color:#111;border:1px solid #e5e7eb}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}
    .map{height:420px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb}
    .kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .box{border:1px solid #eee;border-radius:12px;padding:10px}
    .label{font-size:12px;opacity:.7}
    .val{font-weight:900}
    @media (max-width: 980px){ .grid{grid-template-columns:1fr} .map{height:340px} }
  `;

  if (loading) return <div className="p-6">Đang tải dữ liệu…</div>;

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
          {!mission?.id && (
            <button className="btn" onClick={startSimulator}>Tạo mission demo</button>
          )}
          <Link to="/admin/drone" className="btn secondary" style={{textDecoration:'none'}}>← Về danh sách Drone</Link>
          <button className="btn secondary" onClick={() => navigate(-1)}>Quay lại</button>
        </div>
      </div>

      {err && <div className="card" style={{borderColor:'#f9c7c7', background:'#fde8e8', color:'#b80d0d'}}>❌ {err}</div>}

      <div className="grid">
        {/* Map + trail */}
        <div className="card">
          <div id="drone-map" className="map" />
          <div className="text-sm" style={{marginTop:8}}>
            {lastPos ? (
              <>Vị trí hiện tại: <b>{lastPos[0].toFixed(6)}, {lastPos[1].toFixed(6)}</b></>
            ) : <>Chưa có dữ liệu vị trí.</>}
          </div>
        </div>

        {/* Order & Telemetry */}
        <div className="card">
          <div className="kpi">
            <div className="box"><div className="label">Tổng tiền</div><div className="val">{(order?.finalTotal ?? order?.total ?? 0).toLocaleString('vi-VN')} ₫</div></div>
            <div className="box"><div className="label">Mission status</div><div className="val">{mission?.status || '—'}</div></div>
            <div className="box"><div className="label">Cập nhật</div><div className="val">{positions.length ? new Date(positions[positions.length-1].timestamp).toLocaleTimeString('vi-VN') : '—'}</div></div>
            <div className="box"><div className="label">ETA</div><div className="val">{mission?.eta != null ? `${mission.eta} phút` : '—'}</div></div>
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
