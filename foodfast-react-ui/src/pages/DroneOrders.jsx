import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { myOrders } from "../utils/api";
import { formatVND } from "../utils/format";

const VND = (n) => formatVND(n);

// ======= APIs DEMO (đổi sang API thật của bạn) =======
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5181";

async function getLatestTelemetry(missionId) {
  if (!missionId) return null;
  try {
    const res = await fetch(
      `${API_BASE}/drone_telemetry?missionId=${encodeURIComponent(
        missionId
      )}&_sort=ts&_order=desc&_limit=1`
    );
    if (!res.ok) return null;
    const arr = await res.json();
    return arr?.[0] || null;
  } catch {
    return null;
  }
}
async function getMission(missionId) {
  if (!missionId) return null;
  try {
    const res = await fetch(`${API_BASE}/drone_missions/${encodeURIComponent(missionId)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
async function findMissionByOrderId(orderId) {
  try {
    const res = await fetch(
      `${API_BASE}/drone_missions?orderId=${encodeURIComponent(
        String(orderId)
      )}&_sort=createdAt&_order=desc&_limit=1`
    );
    if (!res.ok) return null;
    const arr = await res.json();
    return arr?.[0] || null;
  } catch {
    return null;
  }
}
// ==============================================================

// Nạp Leaflet qua CDN nếu chưa có
function ensureLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    // CSS
    const cssId = "leaflet-css-cdn";
    if (!document.getElementById(cssId)) {
      const l = document.createElement("link");
      l.id = cssId;
      l.rel = "stylesheet";
      l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(l);
    }
    // JS
    const jsId = "leaflet-js-cdn";
    if (document.getElementById(jsId)) {
      const check = setInterval(() => {
        if (window.L) {
          clearInterval(check);
          resolve(window.L);
        }
      }, 50);
      return;
    }
    const s = document.createElement("script");
    s.id = jsId;
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.body.appendChild(s);
  }).then((L) => {
    // Fix icon khi dùng CDN
    const iconBase = "https://unpkg.com/leaflet@1.9.4/dist/images/";
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: iconBase + "marker-icon-2x.png",
      iconUrl: iconBase + "marker-icon.png",
      shadowUrl: iconBase + "marker-shadow.png",
    });
    return L;
  });
}

const BADGE = {
  queued:    { bg:"#f3f4f6", br:"#e5e7eb", tx:"#111827", label:"Queued" },
  preflight: { bg:"#fff7cd", br:"#ffeaa1", tx:"#7a5a00", label:"Preflight" },
  takeoff:   { bg:"#e8f5ff", br:"#cfe8ff", tx:"#0b68b3", label:"Takeoff" },
  enroute:   { bg:"#e8f5ff", br:"#cfe8ff", tx:"#0b68b3", label:"En route" },
  descending:{ bg:"#e8f5ff", br:"#cfe8ff", tx:"#0b68b3", label:"Descending" },
  dropoff:   { bg:"#dcfce7", br:"#bbf7d0", tx:"#166534", label:"Drop-off" },
  returning: { bg:"#e8f5ff", br:"#cfe8ff", tx:"#0b68b3", label:"Returning" },
  landed:    { bg:"#dcfce7", br:"#bbf7d0", tx:"#166534", label:"Landed" },
  failed:    { bg:"#fde8e8", br:"#f9c7c7", tx:"#b80d0d", label:"Failed" },
  cancelled: { bg:"#fde8e8", br:"#f9c7c7", tx:"#b80d0d", label:"Cancelled" },
};
function StatusPill({ status }) {
  const k = (status || "queued").toLowerCase();
  const c = BADGE[k] || BADGE.queued;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${c.br}`,
        background: c.bg,
        color: c.tx,
        fontWeight: 700,
        fontSize: 12,
      }}
      title={k}
    >
      {c.label}
    </span>
  );
}

// Mini map
function MiniMap({ lat, lng }) {
  const ref = useRef(null);
  useEffect(() => {
    let map;
    if (!lat || !lng) return;
    let canceled = false;
    ensureLeaflet().then((L) => {
      if (canceled || !ref.current) return;
      map = L.map(ref.current, {
        attributionControl: false, zoomControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false,
      }).setView([lat, lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(map);
      L.marker([lat, lng]).addTo(map);
    });
    return () => { canceled = true; if (map) map.remove(); };
  }, [lat, lng]);

  return <div ref={ref} style={{ width: 180, height: 120, borderRadius: 8, border: "1px solid #eee", overflow: "hidden" }}/>;
}

export default function DroneOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // missions indexed by missionId & by orderId
  const [missionById, setMissionById] = useState({});
  const [missionByOrderId, setMissionByOrderId] = useState({});
  const [teleByMission, setTeleByMission] = useState({});

  const styles = `
    .wrap{padding:24px 0}
    .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px}
    .btn{height:34px;border:none;border-radius:8px;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .title{font-weight:800;margin:0 0 6px}
    .val{font-size:22px;font-weight:900}
    .table{width:100%;border-collapse:separate;border-spacing:0 8px}
    .row{background:#fff;border:1px solid #eee;border-radius:12px}
    .cell{padding:10px 12px;vertical-align:top}
    .cell.right{text-align:right}
    .header{font-size:12px;color:#666;padding-bottom:6px}
    .mini{font-size:12px;opacity:.75}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#f7f7f7;border:1px solid #e8e8e8;text-transform:capitalize;font-weight:700}
    .badge.order{background:#fff0e9;border-color:#ffd8c6;color:#c24a26}
    .badge.processing{background:#fff7cd;border-color:#ffeaa1;color:#7a5a00}
    .badge.delivery{background:#e8f5ff;border-color:#cfe8ff;color:#0b68b3}
    .badge.done{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    @media(max-width:1060px){ .table{display:block} .row{display:grid;grid-template-columns:1fr 1fr;gap:6px} .cell{padding:8px 10px}}
  `;

  const load = async () => {
    setLoading(true);
    try {
      const res = await myOrders({
        page: 1, limit: 10000, status: "all", q: "",
        sort: "createdAt", order: "desc",
      });
      const arr = Array.isArray(res) ? res : res?.rows || res?.data || [];
      const drones = arr.filter(
        (o) =>
          (o.deliveryMode || "").toLowerCase() === "drone" ||
          (o.courier || "").toLowerCase() === "drone" ||
          !!o.droneMissionId
      );
      setOrders(drones);

      // Lấy mission: có droneMissionId -> lấy theo id, không có -> tìm theo orderId
      const missionList = await Promise.all(
        drones.map(async (o) => {
          if (o.droneMissionId) return await getMission(o.droneMissionId);
          return await findMissionByOrderId(o.id);
        })
      );

      const mMap = {};
      const mOrderMap = {};
      missionList.forEach((m) => {
        if (m?.id) {
          mMap[m.id] = m;
          if (m.orderId != null) mOrderMap[String(m.orderId)] = m;
        }
      });
      setMissionById(mMap);
      setMissionByOrderId(mOrderMap);

      // Lấy telemetry theo các mission thực có
      const teleList = await Promise.all(
        missionList.map((m) => (m?.id ? getLatestTelemetry(m.id) : null))
      );
      const tMap = {};
      teleList.forEach((t) => {
        if (t?.missionId) tMap[t.missionId] = t;
      });
      setTeleByMission(tMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Summary
  const summary = useMemo(() => {
    const counts = { active: 0, waiting: 0, landed: 0, error: 0 };
    for (const o of orders) {
      // tìm mission từ id hoặc orderId
      const m =
        missionById[o.droneMissionId] ||
        missionByOrderId[String(o.id)] ||
        null;
      const st = (m?.status || "queued").toLowerCase();
      if (["queued", "preflight"].includes(st)) counts.waiting++;
      else if (["takeoff", "enroute", "descending", "returning"].includes(st))
        counts.active++;
      else if (["dropoff", "landed"].includes(st)) counts.landed++;
      else if (["failed", "cancelled"].includes(st)) counts.error++;
    }
    return { total: orders.length, ...counts };
  }, [orders, missionById, missionByOrderId]);

  return (
    <section className="ff-container wrap">
      <style>{styles}</style>

      <div className="topbar">
        <h2 style={{ margin: 0 }}>Drone (theo dõi)</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={load}>Làm mới</button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid">
        <div className="card"><div className="title">Tổng đơn Drone</div><div className="val">{summary.total}</div></div>
        <div className="card"><div className="title">Đang bay</div><div className="val">{summary.active}</div></div>
        <div className="card"><div className="title">Chờ cất cánh</div><div className="val">{summary.waiting}</div></div>
        <div className="card"><div className="title">Đã hạ cánh</div><div className="val">{summary.landed}</div></div>
        <div className="card"><div className="title">Lỗi/Huỷ</div><div className="val">{summary.error}</div></div>
      </div>

      {/* Bảng */}
      {loading ? (
        <div className="card">Đang tải…</div>
      ) : !orders.length ? (
        <div className="card">Không có đơn Drone.</div>
      ) : (
        <table className="table">
          <thead>
            <tr className="row">
              <th className="cell header">Đơn</th>
              <th className="cell header">Khách</th>
              <th className="cell header">Số tiền</th>
              <th className="cell header">Mission</th>
              <th className="cell header">Pin</th>
              <th className="cell header">Tốc độ</th>
              <th className="cell header">ETA</th>
              <th className="cell header">Bản đồ</th>
              <th className="cell header right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const m =
                missionById[o.droneMissionId] ||
                missionByOrderId[String(o.id)] ||
                null;
              const t = m ? teleByMission[m.id] : null;

              const ui = (o.status || "").toLowerCase();
              const lat = t?.lat,
                lng = t?.lng;

              // FIX link id: bỏ dấu # + encode
              const orderParam = encodeURIComponent(String(o.id).replace(/^#/, ""));

              const hasMission = !!m?.id;

              return (
                <tr key={o.id} className="row">
                  <td className="cell">
                    <div>
                      <b>#{o.id}</b> &nbsp;
                      <span
                        className={`badge ${
                          ui.includes("deliver")
                            ? "delivery"
                            : ui.includes("prepar") || ui.includes("accept")
                            ? "processing"
                            : ui.includes("done") || ui.includes("complete")
                            ? "done"
                            : "order"
                        }`}
                      >
                        {o.status || "order"}
                      </span>
                    </div>
                    <div className="mini">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "—"}
                    </div>
                  </td>

                  <td className="cell">
                    <div><b>{o.customerName}</b></div>
                    <div className="mini">{o.phone}</div>
                  </td>

                  <td className="cell">{VND(o.finalTotal ?? o.total ?? 0)}</td>

                  <td className="cell">
                    {hasMission ? <StatusPill status={m?.status} /> : <span className="mini">Chưa có mission</span>}
                    <div className="mini" style={{ marginTop: 2 }}>
                      {t?.ts ? `Cập nhật: ${new Date(t.ts).toLocaleTimeString("vi-VN")}` : "—"}
                    </div>
                  </td>

                  <td className="cell">{t?.battery != null ? `${t.battery}%` : "—"}</td>
                  <td className="cell">{t?.speed != null ? `${t.speed} km/h` : "—"}</td>
                  <td className="cell">{m?.eta != null ? `${m.eta} phút` : "—"}</td>
                  <td className="cell">{lat && lng ? <MiniMap lat={lat} lng={lng} /> : <span className="mini">Chưa có tọa độ</span>}</td>

                  <td className="cell right">
                    {hasMission ? (
                      <Link to={`/drone/${orderParam}`} className="btn" style={{ textDecoration: "none" }}>
                        Xem hành trình
                      </Link>
                    ) : (
                      <button className="btn" disabled title="Đơn này chưa tạo mission cho Drone">
                        Xem hành trình
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
