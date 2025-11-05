// src/pages/DroneTracker.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getOrder as apiGetOrder, getMissionById, getDronePositions } from '../utils/api';

/* ================= Helpers & setup ================= */

const normalizeOrderId = (raw) => String(decodeURIComponent(raw || '')).replace(/^#/, '');
const normalizeStatus = (s = '') => {
  const x = s.toLowerCase();
  if (['delivering'].includes(x)) return 'delivery';
  if (['delivered', 'completed', 'done'].includes(x)) return 'done';
  if (['cancelled', 'canceled'].includes(x)) return 'cancelled';
  if (['accepted', 'preparing', 'ready'].includes(x)) return 'processing';
  if (['new', 'pending', 'confirmed'].includes(x)) return 'order';
  return 'order';
};

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
      const t = setInterval(() => {
        if (window.L) { clearInterval(t); resolve(window.L); }
      }, 50);
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
    const base = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: base + 'marker-icon-2x.png',
      iconUrl: base + 'marker-icon.png',
      shadowUrl: base + 'marker-shadow.png',
    });
    return L;
  });
}

/* ===== Chuẩn hóa toạ độ (chọn hướng CHO TỪNG ĐIỂM) ===== */
const VN_BBOX = { latMin: -10, latMax: 30, lngMin: 90, lngMax: 120 };

function asPair(p, flip = false) {
  let a = null, b = null;
  if (Array.isArray(p)) { a = p[0]; b = p[1]; }
  else { a = p?.lat ?? p?.latitude ?? p?.y; b = p?.lng ?? p?.lon ?? p?.longitude ?? p?.x; }
  if (flip) [a, b] = [b, a];
  a = Number(a); b = Number(b);
  return [a, b];
}
const isLL = (ll) => Array.isArray(ll) && Number.isFinite(ll[0]) && Number.isFinite(ll[1]);

const toRad = (d) => (d * Math.PI) / 180;
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Chọn hướng tốt nhất cho 1 điểm (ưu tiên bbox, sau đó gần 'ref' hơn) */
function normalizePoint(p, ref = null) {
  const A = asPair(p, false);
  const B = asPair(p, true);

  const inA = isLL(A) && A[0] > VN_BBOX.latMin && A[0] < VN_BBOX.latMax && A[1] > VN_BBOX.lngMin && A[1] < VN_BBOX.lngMax;
  const inB = isLL(B) && B[0] > VN_BBOX.latMin && B[0] < VN_BBOX.latMax && B[1] > VN_BBOX.lngMin && B[1] < VN_BBOX.lngMax;
  if (inA && !inB) return A;
  if (inB && !inA) return B;

  if (ref && isLL(ref)) {
    const dA = isLL(A) ? haversineKm(A, ref) : Infinity;
    const dB = isLL(B) ? haversineKm(B, ref) : Infinity;
    return dA <= dB ? A : B;
  }
  return A;
}

/** Chuẩn hoá tuyến theo phương pháp “đi từng điểm” */
function normalizePathSmart(path = [], refStart = null) {
  const out = [];
  let prev = refStart;
  for (const p of path) {
    const chosen = normalizePoint(p, prev);
    if (isLL(chosen)) { out.push(chosen); prev = chosen; }
  }
  return out;
}

/* ===== Snap point về tuyến (FE-only) ===== */
const EARTH_R = 6371000; // m
const rad = (d) => (d * Math.PI) / 180;
function ll2xy([lat, lng], lat0 = 10.775) {
  const x = EARTH_R * rad(lng) * Math.cos(rad(lat0));
  const y = EARTH_R * rad(lat);
  return [x, y];
}
function xy2ll([x, y], lat0 = 10.775) {
  const lat = (y / EARTH_R) * (180 / Math.PI);
  const lng = (x / (EARTH_R * Math.cos(rad(lat0)))) * (180 / Math.PI);
  return [lat, lng];
}
function nearestOnSeg(P, A, B, lat0) {
  const p = ll2xy(P, lat0), a = ll2xy(A, lat0), b = ll2xy(B, lat0);
  const ab = [b[0] - a[0], b[1] - a[1]];
  const ap = [p[0] - a[0], p[1] - a[1]];
  const ab2 = ab[0] * ab[0] + ab[1] * ab[1] || 1;
  let t = (ap[0] * ab[0] + ap[1] * ab[1]) / ab2;
  t = Math.max(0, Math.min(1, t));
  const proj = [a[0] + ab[0] * t, a[1] + ab[1] * t];
  const dx = proj[0] - p[0], dy = proj[1] - p[1];
  const dist = Math.hypot(dx, dy);
  return { ll: xy2ll(proj, lat0), dist }; // mét
}
function snapToPath(P, path) {
  if (!isLL(P) || !Array.isArray(path) || path.length < 2) return { ll: P, dist: 0 };
  const lat0 = P[0];
  let best = { ll: P, dist: Infinity };
  for (let i = 0; i < path.length - 1; i++) {
    const r = nearestOnSeg(P, path[i], path[i + 1], lat0);
    if (r.dist < best.dist) best = r;
  }
  return best; // { ll: [lat,lng], dist: mét }
}

/* ===== Drone icon (divIcon) xoay theo heading, không cần ảnh PNG ===== */
function makeDroneIcon(angleDeg = 0) {
  const rot = Number.isFinite(angleDeg) ? angleDeg : 0;
  return window.L.divIcon({
    className: 'drone-icon',
    html: `
      <div style="width:28px;height:28px;display:grid;place-items:center;transform:rotate(${rot}deg)">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M12 2l4 8h-3v12h-2V10H8l4-8z" fill="#111827"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/* ================== Component ================== */

export default function DroneTracker() {
  const { id: rawId } = useParams();
  const orderId = normalizeOrderId(rawId);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const backHref = isAdmin ? '/admin/drone' : '/orders';

  // data state
  const [order, setOrder] = useState(null);
  const [mission, setMission] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // view state
  const [follow, setFollow] = useState(false);
  const [canRefit, setCanRefit] = useState(false);
  const [showPlanned, setShowPlanned] = useState(true);
  const [isFull, setIsFull] = useState(false);

  // KPI
  const [etaMin, setEtaMin] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  // refs
  const pollRef = useRef(null);
  const lastTsRef = useRef(0);
  const mapRef = useRef(null);
  const trailRef = useRef(null);
  const missionPathRef = useRef(null);
  const markerRef = useRef(null);
  const didFitRef = useRef(false);
  const prevPosRef = useRef(null); // chuẩn hoá từng vị trí mới
  const demoRef = useRef(null);    // timer demo flight

  /* ===== Load order + mission ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const o = await apiGetOrder(orderId);
        if (!alive) return;
        setOrder(o);

        if (normalizeStatus(o?.status) !== 'delivery') {
          setErr('❌ Đơn này chưa ở trạng thái đang giao nên không thể xem hành trình.');
          setMission(null);
          setLoading(false);
          return;
        }

        const m = o?.droneMissionId ? await getMissionById(o.droneMissionId) : null;
        if (!alive) return;

        if (!m?.id) {
          setMission(null);
          setErr('❌ Đơn đang giao nhưng chưa có drone mission.');
          setLoading(false);
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
  }, [orderId]);

  // reset mốc khi đổi mission / unmount
  useEffect(() => { prevPosRef.current = null; }, [mission?.id]);
  useEffect(() => () => { if (demoRef.current) clearInterval(demoRef.current); }, []);

  /* ===== Poll realtime (FE-only, chỉ đọc) ===== */
  const startPolling = useCallback((missionId) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const arr = (await getDronePositions({ missionId, since: lastTsRef.current })) || [];
        if (!arr.length) return;

        const cleaned = [];
        for (const raw of arr) {
          const ref = prevPosRef.current;
          const [lat, lng] = normalizePoint(raw, ref);
          if (isLL([lat, lng])) {
            cleaned.push({ ...raw, lat, lng });
            prevPosRef.current = [lat, lng];
          }
        }
        if (!cleaned.length) return;
        lastTsRef.current = cleaned[cleaned.length - 1].timestamp || lastTsRef.current;
        setPositions((prev) => [...prev, ...cleaned]);
      } catch (e) {
        console.error('poll error', e);
      }
    }, 2000);
  }, []);
  useEffect(() => {
    if (mission?.id) startPolling(mission.id);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [mission?.id, startPolling]);

  /* ===== DEMO FLIGHT (FE-only) ===== */
  function densifyRoute(path, pointsPerKm = 14) {
    if (!Array.isArray(path) || path.length < 2) return [];
    const out = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const distKm = haversineKm(a, b);
      const steps = Math.max(2, Math.round(distKm * pointsPerKm));
      for (let s = 0; s < steps; s++) {
        const t = s / (steps - 1);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return out;
  }

  const clearTrack = useCallback(() => {
    // dừng demo & poll
    if (demoRef.current) { clearInterval(demoRef.current); demoRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    // reset state & mốc
    setPositions([]);
    prevPosRef.current = null;
    lastTsRef.current = 0;
    // gỡ layer cũ
    if (trailRef.current && mapRef.current) { mapRef.current.removeLayer(trailRef.current); trailRef.current = null; }
    if (markerRef.current && mapRef.current) { mapRef.current.removeLayer(markerRef.current); markerRef.current = null; }
  }, []);

  const startDemoFlight = useCallback(() => {
    clearTrack(); // reset sạch trước khi demo
    const base =
      Array.isArray(mission?.path) && mission.path.length >= 2
        ? normalizePathSmart(mission.path)
        : normalizePathSmart([[10.776889, 106.700806], [10.800976, 106.653238]]);
    if (base.length < 2) { alert('Không có route để mô phỏng.'); return; }
    const route = densifyRoute(base, 14);
    let i = 0;
    demoRef.current = setInterval(() => {
      if (i >= route.length) { clearInterval(demoRef.current); demoRef.current = null; return; }
      const here = route[i];
      const ts = Date.now();
      setPositions(prev => [...prev, { lat: here[0], lng: here[1], timestamp: ts }].slice(-500)); // giữ tối đa 500 điểm cho mượt
      prevPosRef.current = [here[0], here[1]];
      i++;
    }, 800);
  }, [mission?.path, clearTrack]);

  const stopDemoFlight = useCallback(() => {
    if (demoRef.current) { clearInterval(demoRef.current); demoRef.current = null; }
  }, []);

  /* ===== Derived path/center ===== */
  const path = useMemo(() => positions.map((p) => [p.lat, p.lng]).filter(isLL), [positions]);
  const center = useMemo(() => {
    if (path.length) return path[path.length - 1];
    if (Array.isArray(mission?.path) && mission.path.length) {
      const firsts = normalizePathSmart(mission.path, null);
      if (firsts.length) return firsts[0];
    }
    return [10.776, 106.701]; // fallback TP.HCM
  }, [path, mission?.path]);
  const lastPos = path[path.length - 1];

  /* ===== ETA + distance (luôn SNAP) ===== */
  useEffect(() => {
    const basePath = normalizePathSmart(mission?.path || [], lastPos);
    if (!isLL(lastPos) || !basePath.length) { setEtaMin(null); setDistanceKm(null); return; }
    const { ll: usePos } = snapToPath(lastPos, basePath); // luôn dùng snap
    const dest = basePath[basePath.length - 1];
    const dist = haversineKm(usePos, dest);
    setDistanceKm(dist);
    const v = 35; // km/h giả định
    const minutes = v > 0 ? Math.ceil((dist / v) * 60) : null;
    setEtaMin(Number.isFinite(minutes) ? minutes : null);
  }, [lastPos, mission?.path]);

  /* ===== Init/update Leaflet map ===== */
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await ensureLeaflet();
      if (disposed) return;

      // init once
      if (!mapRef.current) {
        const el = document.getElementById('drone-map');
        if (!el) return;
        if (el._leaflet_id) el._leaflet_id = null;
        const map = L.map(el, { zoomControl: true }).setView(center, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(map);
        mapRef.current = map;
      }

      // Planned route
      if (showPlanned && !missionPathRef.current && Array.isArray(mission?.path) && mission.path.length >= 2 && mapRef.current) {
        const latlngs = normalizePathSmart(mission.path, lastPos);
        if (latlngs.length >= 2) {
          missionPathRef.current = L.polyline(latlngs, { color: '#2563eb', weight: 4, opacity: 0.5 }).addTo(mapRef.current);
          if (!didFitRef.current) { mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] }); didFitRef.current = true; setCanRefit(true); }
        }
      } else if (!showPlanned && missionPathRef.current && mapRef.current) {
        mapRef.current.removeLayer(missionPathRef.current);
        missionPathRef.current = null;
      }

      // Actual trail
      if (!trailRef.current && path.length >= 2 && mapRef.current) {
        trailRef.current = L.polyline(path, { color: '#111827', weight: 4, opacity: 0.9 }).addTo(mapRef.current);
      } else if (trailRef.current) {
        trailRef.current.setLatLngs(path);
      }

      // Start/Destination (circleMarker)
      if (Array.isArray(mission?.path) && mission.path.length >= 2 && mapRef.current) {
        const latlngs2 = normalizePathSmart(mission.path, lastPos);
        const start = latlngs2[0], end = latlngs2[latlngs2.length - 1];
        if (start && !mapRef.current._startMarker) {
          mapRef.current._startMarker = L.circleMarker(start, { radius: 6, color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }).addTo(mapRef.current).bindTooltip('Start');
        }
        if (end && !mapRef.current._destMarker) {
          mapRef.current._destMarker = L.circleMarker(end, { radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }).addTo(mapRef.current).bindTooltip('Destination');
        }
      }

      // Drone marker — luôn dùng điểm snap để vẽ + tính heading từ 2 điểm cuối
      if (isLL(lastPos) && mapRef.current) {
        const route = normalizePathSmart(mission?.path || [], lastPos);
        const { ll: drawPos } = snapToPath(lastPos, route);
        // heading từ 2 điểm cuối (độ)
        let ang = 0;
        if (path.length >= 2) {
          const p1 = path[path.length - 2], p2 = path[path.length - 1];
          ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
        }

        if (!markerRef.current) {
          markerRef.current = L.marker(drawPos, { icon: makeDroneIcon(ang) }).addTo(mapRef.current);
        } else {
          markerRef.current.setLatLng(drawPos);
          markerRef.current.setIcon(makeDroneIcon(ang));
        }
        if (follow) mapRef.current.setView(drawPos, mapRef.current.getZoom() ?? 16, { animate: true });
      }
    })();
    return () => { disposed = true; };
  }, [mission?.path, center, path, lastPos, follow, showPlanned]);

  // cleanup map on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      trailRef.current = null; missionPathRef.current = null; markerRef.current = null; didFitRef.current = false;
    };
  }, []);

  /* ================== UI ================== */

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
    .drone-icon{filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));}
    @media (max-width:980px){ .grid{grid-template-columns:1fr} .map{height:340px} }
  `;

  if (loading) return <div className="p-6">Đang tải dữ liệu…</div>;

  if (err) {
    return (
      <section className="ff-container wrap">
        <style>{styles}</style>
        <div className="hdr">
          <h2 style={{ margin: 0 }}>Theo dõi Drone</h2>
          <Link to={backHref} className="btn secondary" style={{ textDecoration: 'none' }}>
            ← Về danh sách Drone
          </Link>
        </div>
        <div className="card" style={{ borderColor: '#f9c7c7', background: '#fde8e8', color: '#b80d0d' }}>
          {err}
        </div>
      </section>
    );
  }

  return (
    <section className="ff-container wrap">
      <style>{styles}</style>

      <div className="hdr">
        <div><h2 style={{ margin: 0 }}>Theo dõi Drone</h2></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={backHref} className="btn secondary" style={{ textDecoration: 'none' }}>← Về danh sách Drone</Link>
        </div>
      </div>

      <div className="grid">
        {/* Map */}
        <div className="card">
          <div className="map">
            <div className="map-actions">
              <button className={`btn ghost ${follow ? 'on' : ''}`} onClick={() => setFollow((f) => !f)} title="Bật/tắt tự bám theo">
                {follow ? 'Follow: ON' : 'Follow: OFF'}
              </button>

              {canRefit && missionPathRef.current && (
                <button className="btn ghost" onClick={() => {
                  if (mapRef.current && missionPathRef.current) {
                    mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] });
                  }
                }} title="Canh bản đồ theo toàn tuyến">
                  Fit route
                </button>
              )}

              <button className="btn ghost" onClick={() => setShowPlanned((v) => !v)} title="Ẩn/hiện tuyến dự kiến">
                {showPlanned ? 'Hide planned' : 'Show planned'}
              </button>

              <button className="btn ghost" onClick={() => {
                const el = document.getElementById('drone-map');
                if (!el) return;
                if (!document.fullscreenElement) { el.requestFullscreen?.(); setIsFull(true); }
                else { document.exitFullscreen?.(); setIsFull(false); }
              }} title="Toàn màn hình">
                {isFull ? 'Exit full' : 'Full screen'}
              </button>

              {/* DEMO & tiện ích */}
              <button className="btn ghost" onClick={startDemoFlight} title="Mô phỏng bay (FE)">Demo flight</button>
              <button className="btn ghost" onClick={stopDemoFlight} title="Dừng mô phỏng">Stop demo</button>
              <button className="btn ghost" onClick={clearTrack} title="Xoá đường & marker hiện tại">Clear map</button>
            </div>

            <div id="drone-map" style={{ height: '100%', width: '100%' }} />
          </div>

          {/* Quick actions */}
          {isLL(lastPos) ? (
            <div className="text-sm" style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <>Vị trí hiện tại: <b>{lastPos[0].toFixed(6)}, {lastPos[1].toFixed(6)}</b></>
              <a className="btn ghost" href={`https://www.google.com/maps?q=${lastPos[0]},${lastPos[1]}`} target="_blank" rel="noreferrer">Mở Google Maps</a>
              <a className="btn ghost" href={`https://www.openstreetmap.org/?mlat=${lastPos[0]}&mlon=${lastPos[1]}#map=17/${lastPos[0]}/${lastPos[1]}`} target="_blank" rel="noreferrer">Mở OSM</a>
            </div>
          ) : (
            <div className="text-sm" style={{ marginTop: 8 }}>Chưa có dữ liệu vị trí.</div>
          )}
        </div>

        {/* Info (không Telemetry) */}
        <div className="card">
          <div className="kpi">
            <div className="box">
              <div className="label">Tổng tiền</div>
              <div className="val">{(order?.finalTotal ?? order?.total ?? 0).toLocaleString('vi-VN')} ₫</div>
            </div>
            <div className="box">
              <div className="label">Mission</div>
              <div className="val">{mission?.id || '—'}</div>
            </div>
            <div className="box">
              <div className="label">Cập nhật</div>
              <div className="val">
                {positions.length ? new Date(positions[positions.length - 1].timestamp).toLocaleTimeString('vi-VN') : '—'}
              </div>
            </div>
            <div className="box">
              <div className="label">ETA</div>
              <div className="val">{etaMin != null ? `${etaMin} phút` : '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
