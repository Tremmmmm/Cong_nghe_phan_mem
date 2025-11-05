// src/pages/DroneTracker.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { api, getOrder as apiGetOrder, getMissionById, getDronePositions } from "../utils/api";

/* ===== Helpers ===== */
const normalizeOrderId = (raw) => String(decodeURIComponent(raw || "")).replace(/^#/, "");
const toRad = (d) => (d * Math.PI) / 180;
const haversineKm = ([lat1, lng1], [lat2, lng2]) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};
const isLL = (ll) => Array.isArray(ll) && Number.isFinite(ll[0]) && Number.isFinite(ll[1]);

const VN_BBOX = { latMin: -10, latMax: 30, lngMin: 90, lngMax: 120 };
function asPair(p, flip = false) {
  let a, b;
  if (Array.isArray(p)) [a, b] = p;
  else { a = p?.lat ?? p?.latitude; b = p?.lng ?? p?.lon ?? p?.longitude; }
  if (flip) [a, b] = [b, a];
  return [Number(a), Number(b)];
}
function normalizePoint(p, ref = null) {
  const A = asPair(p, false);
  const B = asPair(p, true);
  const inA = isLL(A) && A[0] > VN_BBOX.latMin && A[0] < VN_BBOX.latMax && A[1] > VN_BBOX.lngMin && A[1] < VN_BBOX.lngMax;
  const inB = isLL(B) && B[0] > VN_BBOX.latMin && B[0] < VN_BBOX.latMax && B[1] > VN_BBOX.lngMin && B[1] < VN_BBOX.lngMax;
  if (inA && !inB) return A;
  if (inB && !inA) return B;
  if (ref && isLL(ref)) {
    const dA = haversineKm(A, ref), dB = haversineKm(B, ref);
    return dA <= dB ? A : B;
  }
  return A;
}
function normalizePathSmart(path = [], refStart = null) {
  const out = [];
  let prev = refStart;
  for (const p of path) {
    const chosen = normalizePoint(p, prev);
    if (isLL(chosen)) { out.push(chosen); prev = chosen; }
  }
  return out;
}

function ensureLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const l = document.createElement("link");
      l.id = cssId; l.rel = "stylesheet";
      l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(l);
    }
    const jsId = "leaflet-js";
    if (document.getElementById(jsId)) {
      const t = setInterval(() => { if (window.L) { clearInterval(t); resolve(window.L); } }, 50);
      return;
    }
    const s = document.createElement("script");
    s.id = jsId; s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.body.appendChild(s);
  }).then((L) => {
    const base = "https://unpkg.com/leaflet@1.9.4/dist/images/";
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: base + "marker-icon-2x.png",
      iconUrl: base + "marker-icon.png",
      shadowUrl: base + "marker-shadow.png",
    });
    return L;
  });
}

/* ===== Drone icon: Flaticon #4212570 ===== */
function makeDroneIcon(angleDeg = 0) {
  const rot = Number.isFinite(angleDeg) ? angleDeg : 0;
  return window.L.divIcon({
    className: "drone-icon",
    html: `
      <div style="width:36px;height:36px;display:grid;place-items:center;transform:rotate(${rot}deg)">
        <img src="https://cdn-icons-png.flaticon.com/512/4212/4212570.png"
             alt="drone" style="width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))" />
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

/* ===== Component ===== */
export default function DroneTracker() {
  const { id: rawId } = useParams();
  const orderId = normalizeOrderId(rawId);
  const location = useLocation();
  const backHref = location.pathname.startsWith("/admin") ? "/admin/drone" : "/orders";

  // Data
  const [order, setOrder] = useState(null);
  const [mission, setMission] = useState(null);

  // Telemetry
  const [positions, setPositions] = useState([]);
  const [etaMin, setEtaMin] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [follow, setFollow] = useState(true);
  const [canRefit, setCanRefit] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [demoOn, setDemoOn] = useState(false);
  const [justCompletedAt, setJustCompletedAt] = useState(0);

  // Refs
  const timerRef = useRef(null);
  const mapRef = useRef(null);
  const trailRef = useRef(null);
  const missionPathRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const markerRef = useRef(null);
  const arrivedRef = useRef(false);

  const ARRIVAL_THRESHOLD_M = 30;

  /* ===== Load order + mission ===== */
  const isCompleted = (s) => ["completed", "done", "delivered"].includes(String(s).toLowerCase());
  const isActive = (s) => String(s).toLowerCase() === "delivering";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const o = await apiGetOrder(orderId);
        if (!alive) return;
        setOrder(o);
        const m = o?.droneMissionId ? await getMissionById(o.droneMissionId) : null;
        if (!alive) return;
        setMission(m || null);
      } catch (e) { setErr(e.message || "Lỗi tải dữ liệu"); }
      finally { setLoading(false); }
    })();
    return () => { alive = false; };
  }, [orderId]);

  /* ===== Đặt vị trí ban đầu: Start (đang giao) hoặc Destination (đã xong) ===== */
  useEffect(() => {
    if (!Array.isArray(mission?.path) || mission.path.length < 1) return;
    if (positions.length > 0) return; // đã có điểm thì thôi

    const norm = normalizePathSmart(mission.path);
    const initial = isCompleted(order?.status) ? norm[norm.length - 1] : norm[0];
    if (isLL(initial)) {
      setPositions([{ lat: initial[0], lng: initial[1], timestamp: Date.now() }]);
    }
  }, [mission?.path, positions.length, order?.status]);

  /* ===== Demo flight (FE-only) ===== */
  const startDemoFlight = useCallback(() => {
    setPositions([]);
    if (trailRef.current && mapRef.current) { mapRef.current.removeLayer(trailRef.current); trailRef.current = null; }
    if (markerRef.current && mapRef.current) { mapRef.current.removeLayer(markerRef.current); markerRef.current = null; }

    const base = Array.isArray(mission?.path) && mission.path.length >= 2
      ? normalizePathSmart(mission.path)
      : normalizePathSmart([[10.776889, 106.700806], [10.800976, 106.653238]]);
    if (base.length < 2) return;

    const route = [];
    for (let i = 0; i < base.length - 1; i++) {
      const a = base[i], b = base[i + 1];
      const steps = 20;
      for (let s = 0; s < steps; s++) {
        const t = s / (steps - 1);
        route.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }

    if (route.length) {
      setPositions([{ lat: route[0][0], lng: route[0][1], timestamp: Date.now() }]);
    }

    let idx = 1;
    timerRef.current = setInterval(() => {
      if (idx >= route.length) { clearInterval(timerRef.current); timerRef.current = null; setDemoOn(false); return; }
      const [lat, lng] = route[idx++];
      setPositions((prev) => [...prev, { lat, lng, timestamp: Date.now() }]);
    }, 600);
    setDemoOn(true);
  }, [mission?.path]);

  const stopDemoFlight = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setDemoOn(false);
  }, []);

  /* ===== Derived path/center ===== */
  const path = useMemo(() => positions.map((p) => [p.lat, p.lng]).filter(isLL), [positions]);
  const lastPos = path[path.length - 1];
  const center = useMemo(() => (path.length ? path[path.length - 1] : [10.776, 106.701]), [path]);

  /* ===== Complete + KPI ===== */
  function publishOrderDone(detail) {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("ff_bus");
      bc.postMessage({ evt: "order:statusChanged", detail });
      bc.close();
    }
    window.dispatchEvent(new CustomEvent("order:statusChanged", { detail }));
  }

  useEffect(() => {
    if (!Array.isArray(mission?.path) || mission.path.length < 2 || !isLL(lastPos)) return;
    const route = normalizePathSmart(mission.path);
    const dest = route[route.length - 1];
    const distM = haversineKm(lastPos, dest) * 1000;

    // KPI
    setDistanceKm(distM / 1000);
    const eta = Math.ceil((distM / 1000 / 35) * 60);
    setEtaMin(Number.isFinite(eta) ? eta : null);

    // Tự hoàn thành nếu đang giao & đã tới gần đích
    if (isActive(order?.status) && !arrivedRef.current && distM <= ARRIVAL_THRESHOLD_M) {
      arrivedRef.current = true;
      const doneId = String(order?.id ?? orderId);
      (async () => {
        try {
          await api.patch(`/orders/${doneId}`, { status: "completed", updatedAt: new Date().toISOString() });
        } catch {}
        publishOrderDone({ id: doneId, status: "completed" });
        setJustCompletedAt(Date.now());
      })();
      stopDemoFlight();
    }
  }, [lastPos, mission?.path, order?.status, order?.id, orderId, stopDemoFlight]);

  // toast + Browser Notification (tùy quyền)
  useEffect(() => {
    if (!justCompletedAt) return;
    const t = setTimeout(() => setJustCompletedAt(0), 6000);
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Đơn đã hoàn thành", { body: `#${order?.id ?? orderId} đã giao xong.` });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((p) => {
            if (p === "granted") new Notification("Đơn đã hoàn thành", { body: `#${order?.id ?? orderId} đã giao xong.` });
          });
        }
      }
    } catch {}
    return () => clearTimeout(t);
  }, [justCompletedAt, order?.id, orderId]);

  /* ===== Leaflet map render ===== */
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await ensureLeaflet();
      if (disposed) return;

      // init map
      if (!mapRef.current) {
        const el = document.getElementById("drone-map");
        if (!el) return;
        if (el._leaflet_id) el._leaflet_id = null;
        const map = L.map(el).setView(center, 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(map);
        mapRef.current = map;
      }

      // planned route + start/end markers
      if (!missionPathRef.current && Array.isArray(mission?.path) && mission.path.length >= 2) {
        const latlngs = normalizePathSmart(mission.path);
        missionPathRef.current = window.L.polyline(latlngs, { color: "#2563eb", weight: 4, opacity: 0.6 }).addTo(mapRef.current);
        setCanRefit(true);
        mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] });

        const start = latlngs[0], end = latlngs[latlngs.length - 1];
        if (!startMarkerRef.current) {
          startMarkerRef.current = window.L.circleMarker(start, {
            radius: 6, color: "#10b981", fillColor: "#10b981", fillOpacity: 1
          }).addTo(mapRef.current).bindTooltip("Start");
        }
        if (!endMarkerRef.current) {
          endMarkerRef.current = window.L.circleMarker(end, {
            radius: 6, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1
          }).addTo(mapRef.current).bindTooltip("Destination");
        }
      }

      // actual trail
      if (path.length >= 2) {
        if (!trailRef.current) {
          trailRef.current = window.L.polyline(path, { color: "#111827", weight: 4, opacity: 0.9 }).addTo(mapRef.current);
        } else {
          trailRef.current.setLatLngs(path);
        }
      }

      // drone marker
      if (isLL(lastPos)) {
        const n = path.length;
        let ang = 0;
        if (n >= 2) {
          const p1 = path[n - 2], p2 = path[n - 1];
          ang = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
        }
        if (!markerRef.current) {
          markerRef.current = window.L.marker(lastPos, { icon: makeDroneIcon(ang) }).addTo(mapRef.current);
        } else {
          markerRef.current.setLatLng(lastPos);
          markerRef.current.setIcon(makeDroneIcon(ang));
        }
        if (follow) mapRef.current.setView(lastPos);
      }
    })();
    return () => { disposed = true; };
  }, [mission?.path, path, lastPos, follow, center]);

  // cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mapRef.current) mapRef.current.remove();
      timerRef.current = null; mapRef.current = null;
      trailRef.current = null; missionPathRef.current = null;
      markerRef.current = null; startMarkerRef.current = null; endMarkerRef.current = null;
      arrivedRef.current = false;
    };
  }, []);

  /* ===== Styles & UI ===== */
  const styles = `
    .wrap{padding:20px 0}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .btn{height:36px;border:none;border-radius:10px;background:#111;color:#fff;padding:0 14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
    .btn.secondary{background:#f3f4f6;color:#111;border:1px solid #e5e7eb}
    .btn.ghost{background:#fff;color:#111;border:1px solid #e5e7eb}
    .btn.on{background:#059669}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}
    .map{height:500px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;position:relative}
    .map-actions{position:absolute;right:12px;top:12px;display:flex;gap:8px;z-index:1000;flex-wrap:wrap}
    .kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .box{border:1px solid #eee;border-radius:12px;padding:10px}
    .label{font-size:12px;opacity:.7}
    .val{font-weight:900}
    .subtle{font-size:13px;opacity:.7;margin-top:4px}
    .drone-icon img{transition:transform .35s ease}
    .toast{position:fixed;right:16px;top:16px;background:#10b981;color:#fff;padding:12px 14px;border-radius:12px;
           box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:2000;display:flex;align-items:center;gap:10px;font-weight:700}
    .toast small{font-weight:600;opacity:.9}
    @media (max-width:980px){ .grid{grid-template-columns:1fr} .map{height:360px} }
  `;

  if (loading) return <div className="p-6">Đang tải dữ liệu…</div>;
  if (err) {
    return (
      <section className="ff-container wrap">
        <style>{styles}</style>
        <div className="hdr">
          <h2 style={{ margin: 0 }}>Theo dõi Drone</h2>
          <Link to={backHref} className="btn secondary" style={{ textDecoration: "none" }}>← Về danh sách Drone</Link>
        </div>
        <div className="card" style={{ borderColor: "#f9c7c7", background: "#fde8e8", color: "#b80d0d" }}>{err}</div>
      </section>
    );
  }

  const completed = isCompleted(order?.status);

  return (
    <section className="ff-container wrap">
      <style>{styles}</style>

      <div className="hdr">
        <div>
          <h2 style={{ margin: 0 }}>Theo dõi Drone</h2>
          <div className="subtle">Mã đơn: <b>#{String(order?.id ?? orderId)}</b></div>
        </div>
        <Link to={backHref} className="btn secondary" style={{ textDecoration: "none" }}>← Về danh sách Drone</Link>
      </div>

      <div className="grid">
        {/* Map + actions */}
        <div className="card">
          <div className="map">
            <div className="map-actions">
              <button className={`btn ghost ${follow ? "on" : ""}`} onClick={() => setFollow((f) => !f)} title="Bật/tắt bám theo">
                {follow ? "Follow: ON" : "Follow: OFF"}
              </button>
              {canRefit && missionPathRef.current && (
                <button className="btn ghost" onClick={() => mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] })} title="Canh theo tuyến">
                  Fit route
                </button>
              )}
              <button className="btn ghost" onClick={() => {
                const el = document.getElementById("drone-map");
                if (!document.fullscreenElement) { el.requestFullscreen?.(); setIsFull(true); }
                else { document.exitFullscreen?.(); setIsFull(false); }
              }} title="Toàn màn hình">
                {isFull ? "Exit full" : "Full screen"}
              </button>
              {!completed && (
                <button className="btn ghost" onClick={() => (demoOn ? stopDemoFlight() : startDemoFlight())} title={demoOn ? "Dừng mô phỏng" : "Mô phỏng bay"}>
                  {demoOn ? "Stop demo" : "Demo flight"}
                </button>
              )}
            </div>
            <div id="drone-map" style={{ height: "100%", width: "100%" }} />
          </div>

          {/* Quick info dưới map */}
          {isLL(lastPos) ? (
            <div className="text-sm" style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <>Vị trí hiện tại: <b>{lastPos[0].toFixed(6)}, {lastPos[1].toFixed(6)}</b></>
              <a className="btn ghost" href={`https://www.google.com/maps?q=${lastPos[0]},${lastPos[1]}`} target="_blank" rel="noreferrer">Mở Google Maps</a>
              <a className="btn ghost" href={`https://www.openstreetmap.org/?mlat=${lastPos[0]}&mlon=${lastPos[1]}#map=17/${lastPos[0]}/${lastPos[1]}`} target="_blank" rel="noreferrer">Mở OSM</a>
            </div>
          ) : (
            <div className="text-sm" style={{ marginTop: 8 }}>Chưa có dữ liệu vị trí.</div>
          )}

          {completed && (
            <div className="card" style={{marginTop:12, background:"#f8fafc", borderColor:"#e5e7eb"}}>
              <b>Đang xem lại hành trình</b> • Đơn đã giao xong. Dữ liệu hiển thị ở chế độ xem lại (không realtime).
            </div>
          )}
        </div>

        {/* KPI panel */}
        <div className="card">
          <div className="kpi">
            <div className="box">
              <div className="label">Tổng tiền</div>
              <div className="val">{(order?.finalTotal ?? order?.total ?? 0).toLocaleString("vi-VN")} ₫</div>
            </div>
            <div className="box">
              <div className="label">Mission</div>
              <div className="val">{mission?.id || "—"}</div>
            </div>
            <div className="box">
              <div className="label">Cập nhật</div>
              <div className="val">
                {positions.length ? new Date(positions[positions.length - 1].timestamp).toLocaleTimeString("vi-VN") : "—"}
              </div>
            </div>
            <div className="box">
              <div className="label">ETA</div>
              <div className="val">{etaMin != null ? `${etaMin} phút` : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast hoàn thành */}
      {justCompletedAt ? (
        <div className="toast">
          ✅ Đơn <b>#{String(order?.id ?? orderId)}</b> <small>đã hoàn thành</small>
        </div>
      ) : null}
    </section>
  );
}
