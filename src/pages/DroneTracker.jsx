// src/pages/DroneTracker.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import * as API from "../utils/orderAPI.js";
import { useAuth } from "../context/AuthContext.jsx";

/* ========== Helpers ========== */
const normalizeOrderId = (raw) => String(decodeURIComponent(raw || "")).replace(/^#/, "");
const toRad = (d) => (d * Math.PI) / 180;
const haversineKm = ([lat1, lng1], [lat2, lng2]) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};
const isLL = (ll) => Array.isArray(ll) && Number.isFinite(ll[0]) && Number.isFinite(ll[1]);

const VN_BBOX = { latMin: -10, latMax: 30, lngMin: 90, lngMax: 120 };
function asPair(p, flip = false) {
  let a, b;
  if (Array.isArray(p)) [a, b] = p;
  else {
    a = p?.lat ?? p?.latitude;
    b = p?.lng ?? p?.lon ?? p?.longitude;
  }
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
    if (isLL(chosen)) {
      out.push(chosen);
      prev = chosen;
    }
  }
  return out;
}

function ensureLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const l = document.createElement("link");
      l.id = cssId;
      l.rel = "stylesheet";
      l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(l);
    }
    const jsId = "leaflet-js";
    if (document.getElementById(jsId)) {
      const t = setInterval(() => {
        if (window.L) {
          clearInterval(t);
          resolve(window.L);
        }
      }, 50);
      return;
    }
    const s = document.createElement("script");
    s.id = "leaflet-js";
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
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

/* ========== API-safe ========== */
const getOrderSafe = async (id) => {
  if (typeof API.getOrder === "function") return API.getOrder(id);
  if (API.default && typeof API.default.getOrder === "function") return API.default.getOrder(id);
  throw new Error("Không tìm thấy hàm getOrder trong utils/api");
};
const getMissionByIdSafe = async (id) => {
  if (typeof API.getMissionById === "function") return API.getMissionById(id);
  if (API.default && typeof API.default.getMissionById === "function") return API.default.getMissionById(id);
  return null;
};
const patchOrderStatusSafe = async (id, status) => {
  try {
    if (API.api && typeof API.api.patch === "function") {
      await API.api.patch(`/orders/${id}`, { status, updatedAt: new Date().toISOString() });
      return true;
    }
    if (API.default && typeof API.default.patch === "function") {
      await API.default.patch(`/orders/${id}`, { status, updatedAt: new Date().toISOString() });
      return true;
    }
  } catch (e) {
    console.warn("PATCH order status failed, FE fallback:", e?.message || e);
  }
  return false;
};

/* ========== Component ========== */
export default function DroneTracker() {
  const { id: rawId } = useParams();
  const orderId = normalizeOrderId(rawId);
  const { user, isMerchant, isSuperAdmin } = useAuth();; 
const backHref = isSuperAdmin ? "/admin/drone"
                  : isMerchant   ? "/merchant/drone"
                                  : "/orders";  
  // data
  const [order, setOrder] = useState(null);
  const [mission, setMission] = useState(null);

  // telemetry
  const [positions, setPositions] = useState([]);
  const [etaMin, setEtaMin] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [follow, setFollow] = useState(true);
  const [canRefit, setCanRefit] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [demoOn, setDemoOn] = useState(false);
  const [justCompletedAt, setJustCompletedAt] = useState(0);

  // refs
  const timerRef = useRef(null);
  const mapRef = useRef(null);
  const trailRef = useRef(null);
  const missionPathRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const markerRef = useRef(null);
  const arrivedRef = useRef(false);

  const ARRIVAL_THRESHOLD_M = 30;
  const isCompleted = (s) => ["completed", "done", "delivered"].includes(String(s).toLowerCase());
  const isActive = (s) => String(s).toLowerCase() === "delivering";

  // Chỉ merchant chủ của đơn mới được bấm "Bắt đầu giao hàng"
  const merchantOwnsThisOrder = isMerchant && (() => {
    const uMid = String(user?.merchantId ?? "");
    const cand = [
      order?.merchantId,
      order?.restaurant?.merchantId,
      order?.store?.merchantId,
      order?.merchant?.id,
    ]
    // 💡 SỬA: Lọc bỏ các giá trị rỗng/null, sau đó map sang string
    .filter(v => v != null && v !== "")
    .map(String); 
    
    // Kiểm tra xem ID của người dùng có tồn tại trong các ID hợp lệ của đơn hàng hay không
    return uMid && cand.includes(uMid);
  })();
  
  const canStart = merchantOwnsThisOrder && !isCompleted(order?.status);
  /* ----- fetch order + mission ----- */
useEffect(() => {
    let alive = true;
    (async () => {
        try {
            setLoading(true);
            const o = await getOrderSafe(orderId);
            if (!alive) return;
            setOrder(o);
            const m = o?.droneMissionId ? await getMissionByIdSafe(o.droneMissionId) : null;
            if (!alive) return;
            setMission(m || null);
            
            // 💡 SỬA: Thêm dòng này để reset trạng thái đã đến đích
            arrivedRef.current = false; 
            
        } catch (e) {
            // ...
        } finally {
            setLoading(false);
        }
    })();
    return () => { alive = false; };
}, [orderId]);

  /* ----- initial position based on route ----- */
  useEffect(() => {
    if (!Array.isArray(mission?.path) || mission.path.length < 1) return;
    if (positions.length > 0) return;
    const norm = normalizePathSmart(mission.path);
    const initial = isCompleted(order?.status) ? norm[norm.length - 1] : norm[0];
    if (isLL(initial)) setPositions([{ lat: initial[0], lng: initial[1], timestamp: Date.now() }]);
  }, [mission?.path, positions.length, order?.status]);

  /* ----- demo flight (FE) ----- */
  const startDemoFlight = useCallback(() => {
    if (isCompleted(order?.status)) return;
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
    if (route.length) setPositions([{ lat: route[0][0], lng: route[0][1], timestamp: Date.now() }]);

    let idx = 1;
    timerRef.current = setInterval(() => {
      if (idx >= route.length) { clearInterval(timerRef.current); timerRef.current = null; setDemoOn(false); return; }
      const [lat, lng] = route[idx++];
      setPositions((prev) => [...prev, { lat, lng, timestamp: Date.now() }]);
    }, 600);
    setDemoOn(true);
  }, [mission?.path, order?.status]);

  const stopDemoFlight = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setDemoOn(false);
  }, []);
useEffect(() => {
    // Nếu trạng thái đơn hàng KHÔNG phải là Delivering và demoOn đang bật (demoOn = true),
    // hãy dừng mô phỏng và reset demoOn về false.
    if (!isActive(order?.status) && demoOn) {
        stopDemoFlight();
    }
}, [order?.status, demoOn, stopDemoFlight]);
  /* ----- derived ----- */
  const path = useMemo(() => positions.map((p) => [p.lat, p.lng]).filter(isLL), [positions]);
  const lastPos = path[path.length - 1];
  const center = useMemo(() => (path.length ? path[path.length - 1] : [10.776, 106.701]), [path]);

  /* ----- KPI + auto-complete ----- */
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

    setDistanceKm(distM / 1000);
    const eta = Math.ceil((distM / 1000 / 35) * 60);
    setEtaMin(Number.isFinite(eta) ? eta : null);

    if (isActive(order?.status) && !arrivedRef.current && distM <= ARRIVAL_THRESHOLD_M) {
      arrivedRef.current = true;
      const doneId = String(order?.id ?? orderId);
      (async () => {
        await patchOrderStatusSafe(doneId, "completed");
        setOrder((prev) => (prev ? { ...prev, status: "completed" } : prev));
        publishOrderDone({ id: doneId, status: "completed" });
        setJustCompletedAt(Date.now());
      })();
      stopDemoFlight();
    }
  }, [lastPos, mission?.path, order?.status, order?.id, orderId, stopDemoFlight]);

  /* ----- listen cross-tab status ----- */
  useEffect(() => {
    const idStr = String(order?.id ?? orderId);
    let bc = null;
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("ff_bus");
      bc.onmessage = (ev) => {
        if (ev?.data?.evt === "order:statusChanged" && String(ev.data.detail?.id) === idStr) {
          setOrder((prev) => (prev ? { ...prev, status: ev.data.detail.status } : prev));
        }
      };
    }
    const onCustom = (ev) => {
      const d = ev?.detail;
      if (d?.id && String(d.id) === idStr) {
        setOrder((prev) => (prev ? { ...prev, status: d.status } : prev));
      }
    };
    window.addEventListener("order:statusChanged", onCustom);
    return () => {
      if (bc) bc.close();
      window.removeEventListener("order:statusChanged", onCustom);
    };
  }, [order?.id, orderId]);

  /* ----- notify completed ----- */
  useEffect(() => {
    if (!justCompletedAt) return;
    const t = setTimeout(() => setJustCompletedAt(0), 6000);
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted")
          new Notification("Đơn đã hoàn thành", { body: `#${order?.id ?? orderId} đã giao xong.` });
        else if (Notification.permission !== "denied")
          Notification.requestPermission().then((p) => {
            if (p === "granted")
              new Notification("Đơn đã hoàn thành", { body: `#${order?.id ?? orderId} đã giao xong.` });
          });
      }
    } catch {}
    return () => clearTimeout(t);
  }, [justCompletedAt, order?.id, orderId]);

  /* ----- KPI FE (không cần backend) ----- */
  const totalKmPlanned = useMemo(() => {
    const route = Array.isArray(mission?.path) ? normalizePathSmart(mission.path) : [];
    if (route.length < 2) return null;
    let sum = 0;
    for (let i = 1; i < route.length; i++) sum += haversineKm(route[i - 1], route[i]);
    return sum;
  }, [mission?.path]);

  const traveledKm = useMemo(() => {
    if (path.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < path.length; i++) sum += haversineKm(path[i - 1], path[i]);
    return sum;
  }, [path]);

  const topSpeedKmh = useMemo(() => {
    if (positions.length < 2) return null;
    let top = 0;
    for (let i = 1; i < positions.length; i++) {
      const a = positions[i - 1], b = positions[i];
      const dtH = (b.timestamp - a.timestamp) / 3600000;
      if (dtH <= 0) continue;
      const dKm = haversineKm([a.lat, a.lng], [b.lat, b.lng]);
      top = Math.max(top, dKm / dtH);
    }
    return Math.round(top);
  }, [positions]);

  /* ----- pickup info ----- */
  const pickupLL = useMemo(() => {
    if (Array.isArray(mission?.path) && mission.path.length) {
      const first = normalizePathSmart(mission.path)[0];
      if (first && Number.isFinite(first[0]) && Number.isFinite(first[1])) return { lat: first[0], lng: first[1] };
    }
    return null;
  }, [mission?.path]);

  const pickupText = useMemo(() => {
    return (
      order?.restaurantAddress ||
      order?.pickupAddress ||
      mission?.pickupAddress ||
      (pickupLL ? `${pickupLL.lat.toFixed(6)}, ${pickupLL.lng.toFixed(6)}` : null)
    );
  }, [order?.restaurantAddress, order?.pickupAddress, mission?.pickupAddress, pickupLL]);

  /* ----- FE flight log ----- */
  const feEvents = useMemo(() => {
    const out = [];
    const fmt = (t) => new Date(t).toLocaleTimeString("vi-VN");
    if (positions[0]) out.push({ ts: positions[0].timestamp, msg: "Cất cánh" });
    for (let i = 1; i < positions.length; i += 5)
      out.push({ ts: positions[i].timestamp, msg: `Qua điểm #${i}` });
    if (Array.isArray(mission?.path) && mission.path.length >= 2 && path.length) {
      const route = normalizePathSmart(mission.path);
      const dest = route[route.length - 1];
      const distM = haversineKm(path[path.length - 1], dest) * 1000;
      if (distM <= 40) out.push({ ts: Date.now(), msg: "Thả hàng / Hạ cánh" });
    }
    return out
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .map((e) => ({ ...e, time: fmt(e.ts) }));
  }, [positions, path, mission?.path]);

  /* ====== các biến phụ thuộc effect, đặt TRƯỚC effect & return ====== */
  const statusText = (order?.status || mission?.status || "queued").toUpperCase();
  const completed = isCompleted(order?.status);

  /* ----- Leaflet render ----- */
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await ensureLeaflet();
      if (disposed) return;

      if (!mapRef.current) {
        const el = document.getElementById("drone-map");
        if (!el) return;
        if (el._leaflet_id) el._leaflet_id = null;
        const map = L.map(el).setView(center, 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(map);
        mapRef.current = map;
      }

      // (✅) Không khóa pan/zoom khi Completed nữa

      // Vẽ route & chấm đỏ điểm đích
      if (!missionPathRef.current && Array.isArray(mission?.path) && mission.path.length >= 2) {
        const latlngs = normalizePathSmart(mission.path);
        missionPathRef.current = window.L.polyline(latlngs, { color: "#2563eb", weight: 4, opacity: 0.6 }).addTo(mapRef.current);
        setCanRefit(true);
        mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] });

        const dest = latlngs[latlngs.length - 1];
        if (dest) {
          if (!endMarkerRef.current) {
            endMarkerRef.current = window.L.circleMarker(dest, {
              radius: 6, color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.9, weight: 2
            }).addTo(mapRef.current);
          } else {
            endMarkerRef.current.setLatLng(dest);
          }
        }
      }

      // Vẽ dấu vết drone
      if (path.length >= 2) {
        if (!trailRef.current) {
          trailRef.current = window.L.polyline(path, { color: "#111827", weight: 4, opacity: 0.9 }).addTo(mapRef.current);
        } else {
          trailRef.current.setLatLngs(path);
        }
      }

      // Drone marker
      if (isLL(lastPos)) {
        const n = path.length;
        let ang = 0;
        if (n >= 2) {
          const p1 = path[n - 2], p2 = path[n - 1];
          ang = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
        }
        if (!markerRef.current) markerRef.current = window.L.marker(lastPos, { icon: makeDroneIcon(ang) }).addTo(mapRef.current);
        else {
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
      timerRef.current = null;
      mapRef.current = null;
      trailRef.current = null;
      missionPathRef.current = null;
      markerRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      arrivedRef.current = false;
    };
  }, []);

  /* ----- styles ----- */
  const styles = `
    .wrap{padding:12px}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .btn{height:36px;border:none;border-radius:10px;background:#111;color:#fff;padding:0 14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
    .btn.secondary{background:#f3f4f6;color:#111;border:1px solid #e5e7eb}
    .btn.ghost{background:#fff;color:#111;border:1px solid #e5e7eb}
    .btn.on{background:#059669}
    .btn[disabled]{opacity:.5;cursor:not-allowed}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}
    .map{height:78vh;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;position:relative}
    .map-actions{position:absolute;right:12px;top:12px;display:flex;gap:8px;z-index:1000;flex-wrap:wrap}
    .label{font-size:12px;opacity:.7}
    .val{font-weight:900}
    .subtle{font-size:13px;opacity:.7;margin-top:4px}
    .drone-icon img{transition:transform .35s ease}
    .toast{position:fixed;right:16px;top:16px;background:#10b981;color:#fff;padding:12px 14px;border-radius:12px;
           box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:2000;display:flex;align-items:center;gap:10px;font-weight:700}
    .right-col{display:grid;grid-template-columns:1fr;gap:12px}
    .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    @media (max-width:980px){ .grid{grid-template-columns:1fr} .map{height:68vh} }
  `;

  /* ----- order items (đặt TRƯỚC return điều kiện) ----- */
  const orderItems = useMemo(() => {
    const lst = (order?.items || order?.orderItems || order?.cart?.items || []).map((it, i) => ({
      name: it?.name || it?.title || it?.productName || `Món #${i + 1}`,
      qty: Number(it?.qty ?? it?.quantity ?? 1),
      price: Number(it?.price ?? it?.unitPrice ?? 0),
    }));
    const subtotal = lst.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0) * it.qty, 0);
    return { lst, subtotal };
  }, [order]);

  /* ----- early returns ----- */
  if (loading) return <div className="p-6">Đang tải dữ liệu…</div>;
  if (err) {
    return (
      <section className="wrap">
        <style>{styles}</style>
        <div className="hdr">
          <h2 style={{ margin: 0 }}>Theo dõi Drone</h2>
          <Link to={backHref}  className="btn secondary" style={{ textDecoration: "none" }}>
            ← Về danh sách Drone
          </Link>
        </div>
        <div className="card" style={{ borderColor: "#f9c7c7", background: "#fde8e8", color: "#b80d0d" }}>{err}</div>
      </section>
    );
  }

  return (
    <section className="wrap">
      <style>{styles}</style>

      <div className="hdr">
        <div>
          <h2 style={{ margin: 0 }}>Theo dõi Drone</h2>
          <div className="subtle">Mã đơn: <b>#{String(order?.id ?? orderId)}</b></div>
        </div>
        <Link to={backHref} className="btn secondary" style={{ textDecoration: "none" }}>
          ← Về danh sách Drone
        </Link>
      </div>

      <div className="grid">
        {/* LEFT */}
        <div className="card">
          <div className="map">
            <div className="map-actions">
              <button className={`btn ghost ${follow ? "on" : ""}`} onClick={() => setFollow((f) => !f)}>
                {follow ? "Follow: ON" : "Follow: OFF"}
              </button>

              {canRefit && missionPathRef.current && (
                <button
                  className="btn ghost"
                  onClick={() => mapRef.current.fitBounds(missionPathRef.current.getBounds(), { padding: [24, 24] })}
                >
                  Fit route
                </button>
              )}

              <button
                className="btn ghost"
                onClick={() => {
                  const el = document.getElementById("drone-map");
                  if (!document.fullscreenElement) { el.requestFullscreen?.(); setIsFull(true); }
                  else { document.exitFullscreen?.(); setIsFull(false); }
                }}
              >
                {isFull ? "Exit full" : "Full screen"}
              </button>

                {canStart && (
                <button
                    className="btn ghost"
                    onClick={() => (demoOn ? stopDemoFlight() : startDemoFlight())}
                    title={!canStart ? "Chỉ chủ cửa hàng của đơn này mới có quyền bắt đầu giao hàng" : ""}
                >
                    {/* Nếu demoOn là true -> Nút Dừng, ngược lại -> Nút Bắt đầu */}
                    {demoOn ? "Dừng giao hàng" : "Bắt đầu giao hàng"}
                </button>
            )}
  </div>
            <div id="drone-map" style={{ height: "100%", width: "100%" }} />
          </div>

          {isLL(lastPos) ? (
            <div className="text-sm" style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <>Vị trí hiện tại: <b>{lastPos[0].toFixed(6)}, {lastPos[1].toFixed(6)}</b></>
              <a className="btn ghost" href={`https://www.google.com/maps?q=${lastPos[0]},${lastPos[1]}`} target="_blank" rel="noreferrer">
                Mở Google Maps
              </a>
              <a className="btn ghost" href={`https://www.openstreetmap.org/?mlat=${lastPos[0]}&mlon=${lastPos[1]}#map=17/${lastPos[0]}/${lastPos[1]}`} target="_blank" rel="noreferrer">
                Mở OSM
              </a>
            </div>
          ) : (
            <div className="text-sm" style={{ marginTop: 8 }}>Chưa có dữ liệu vị trí.</div>
          )}

          {completed && (
            <div className="card" style={{ marginTop: 12, background: "#f8fafc", borderColor: "#e5e7eb" }}>
              <b>Đang xem lại hành trình</b> • Đơn đã giao xong. Dữ liệu hiển thị ở chế độ xem lại (không realtime).
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="right-col">
          <div className="card">
            <div className="label">Trạng thái</div>
            <div className="val">{statusText}</div>

            <div className="label" style={{ marginTop: 10 }}>Điểm lấy</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span>{pickupText || "—"}</span>
              {pickupLL && (
                <>
                  <a className="btn ghost" href={`https://www.google.com/maps?q=${pickupLL.lat},${pickupLL.lng}`} target="_blank" rel="noreferrer">Google Maps</a>
                  <a className="btn ghost" href={`https://www.openstreetmap.org/?mlat=${pickupLL.lat}&mlon=${pickupLL.lng}#map=17/${pickupLL.lat}/${pickupLL.lng}`} target="_blank" rel="noreferrer">OSM</a>
                </>
              )}
            </div>

            <div className="label" style={{ marginTop: 6 }}>Điểm giao</div>
            <div>{mission?.dropoffAddress || order?.address || "—"}</div>

            <div className="label" style={{ marginTop: 10 }}>Khách hàng</div>
            <div className="val">{order?.customerName || "—"}</div>
            <div className="label" style={{ marginTop: 6 }}>Điện thoại</div>
            <div>{order?.phone || "—"}</div>
          </div>

          <div className="card">
            <div className="grid2">
              <div><div className="label">ETA</div><div className="val">{etaMin != null ? `${etaMin} phút` : "—"}</div></div>
              <div><div className="label">Cập nhật</div><div className="val">{positions.length ? new Date(positions[positions.length - 1].timestamp).toLocaleTimeString("vi-VN") : "—"}</div></div>
              <div><div className="label">Độ dài tuyến</div><div className="val">{totalKmPlanned != null ? `${totalKmPlanned.toFixed(2)} km` : "—"}</div></div>
              <div><div className="label">Đã di chuyển</div><div className="val">{`${traveledKm.toFixed(2)} km`}</div></div>
              <div><div className="label">Tốc độ lớn nhất</div><div className="val">{topSpeedKmh != null ? `${topSpeedKmh} km/h` : "—"}</div></div>
              <div><div className="label">Còn lại tới đích</div><div className="val">{distanceKm != null ? `${distanceKm.toFixed(2)} km` : "—"}</div></div>
            </div>
          </div>

          {orderItems.lst.length > 0 && (
            <div className="card">
              <div className="label">Món đã đặt</div>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {orderItems.lst.map((it, idx) => (
                  <li key={idx}>
                    {it.name} × {it.qty}
                    {Number.isFinite(it.price) && ` — ${(it.price * it.qty).toLocaleString("vi-VN")} ₫`}
                  </li>
                ))}
              </ul>
              <div style={{ borderTop: "1px dashed #e5e7eb", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span className="label">Tạm tính</span>
                <b>{orderItems.subtotal.toLocaleString("vi-VN")} ₫</b>
              </div>
            </div>
          )}

          <div className="card">
            <div className="label">Nhật ký bay</div>
            <ul style={{ margin: "6px 0 0 16px" }}>
              {feEvents.length ? feEvents.map((e, i) => <li key={i}><b>{e.time}</b> — {e.msg}</li>) : <li>Chưa có sự kiện.</li>}
            </ul>
          </div>
        </div>
      </div>

      {justCompletedAt ? (
        <div className="toast">✅ Đơn <b>#{String(order?.id ?? orderId)}</b> <small>đã hoàn thành</small></div>
      ) : null}
    </section>
  );
}
