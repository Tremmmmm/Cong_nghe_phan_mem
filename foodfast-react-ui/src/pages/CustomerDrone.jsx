// src/pages/CustomerDrone.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { myOrders } from "../utils/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5181";

/* ===== Helpers lấy mission/telemetry (reuse từ DroneOrders) ===== */
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
    const r = await fetch(`${API_BASE}/droneMissions/${encodeURIComponent(missionId)}`);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function findMissionByOrderId(orderId) {
  try {
    const qs = new URLSearchParams({ orderId: String(orderId), _sort: "startTime", _order: "desc", _limit: "1" });
    const r = await fetch(`${API_BASE}/droneMissions?${qs.toString()}`);
    if (!r.ok) return null;
    const arr = await r.json();
    return arr?.[0] || null;
  } catch { return null; }
}

/* ===== Status + UI mini ===== */
const normalizeStatus = (s = "") => {
  const x = s.toLowerCase();
  if (["delivering"].includes(x)) return "delivery";
  if (["delivered", "completed", "done"].includes(x)) return "done";
  if (["cancelled", "canceled"].includes(x)) return "cancelled";
  if (["accepted", "preparing", "ready"].includes(x)) return "processing";
  if (["new", "pending", "confirmed"].includes(x)) return "order";
  return "order";
};
const canTrack = (order, mission) => normalizeStatus(order?.status) === "delivery" && !!mission?.id;
const Dash = () => <span className="mini">—</span>;

function CoordText({ lat, lng }) {
  const ok = Number.isFinite(lat) && Number.isFinite(lng);
  return ok ? (
    <div className="coord" title={`${lat}, ${lng}`}>
      <span className="coord-line mini">{lat.toFixed(6)}</span>
      <span className="coord-line mini">{lng.toFixed(6)}</span>
    </div>
  ) : (
    <div className="coord">
      <span className="coord-line mini">—</span>
      <span className="coord-line mini">—</span>
    </div>
  );
}

const BADGE = {
  queued:{bg:"#f3f4f6",br:"#e5e7eb",tx:"#111827",label:"Queued"},
  preflight:{bg:"#fff7cd",br:"#ffeaa1",tx:"#7a5a00",label:"Preflight"},
  takeoff:{bg:"#e8f5ff",br:"#cfe8ff",tx:"#0b68b3",label:"Takeoff"},
  enroute:{bg:"#e8f5ff",br:"#cfe8ff",tx:"#0b68b3",label:"En route"},
  descending:{bg:"#e8f5ff",br:"#cfe8ff",tx:"#0b68b3",label:"Descending"},
  dropoff:{bg:"#dcfce7",br:"#bbf7d0",tx:"#166534",label:"Drop-off"},
  returning:{bg:"#e8f5ff",br:"#cfe8ff",tx:"#0b68b3",label:"Returning"},
  landed:{bg:"#dcfce7",br:"#bbf7d0",tx:"#166534",label:"Landed"},
  failed:{bg:"#fde8e8",br:"#f9c7c7",tx:"#b80d0d",label:"Failed"},
  cancelled:{bg:"#fde8e8",br:"#f9c7c7",tx:"#b80d0d",label:"Cancelled"},
};
function StatusPill({ status }) {
  const k = (status || "queued").toLowerCase();
  const c = BADGE[k] || BADGE.queued;
  return (
    <span style={{
      display:"inline-block",padding:"4px 10px",borderRadius:999,
      border:`1px solid ${c.br}`,background:c.bg,color:c.tx,fontWeight:700,fontSize:12
    }}>{c.label}</span>
  );
}

/* ===== PAGE ===== */
export default function CustomerDrone() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [missionById, setMissionById] = useState({});
  const [missionByOrderId, setMissionByOrderId] = useState({});
  const [teleByMission, setTeleByMission] = useState({});

  const styles = `
    .wrap{padding:24px 0}
    .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px}
    .btn{height:36px;border:none;border-radius:10px;background:#111;color:#fff;padding:0 14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-weight:600}
    .btn:disabled{background:#d1d5db;color:#6b7280}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}
    .title{font-weight:800;margin:0 0 6px}
    .val{font-size:22px;font-weight:900}
    .table{width:100%;border-collapse:separate;border-spacing:0 8px;table-layout:fixed;font-variant-numeric:tabular-nums}
    .row{background:#fff;border:1px solid #eee;border-radius:12px}
    .cell{padding:10px 12px;vertical-align:middle}
    .cell.center{text-align:center}
    .cell.right{text-align:right}
    .header{font-size:12px;color:#666;padding-bottom:6px}
    .mini{font-size:12px;opacity:.75}
    .coord{font-variant-numeric:tabular-nums;line-height:1.2}
    .coord-line{display:block}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#f7f7f7;border:1px solid #e8e8e8;text-transform:capitalize;font-weight:700}
    .badge.delivery{background:#e8f5ff;border-color:#cfe8ff;color:#0b68b3}
    .badge.done{background:#eaf7ea;border-color:#cce9cc;color:#2a7e2a}
    .badge.processing{background:#fff7cd;border-color:#ffeaa1;color:#7a5a00}
    .badge.order{background:#fff0e9;border-color:#ffd8c6;color:#c24a26}
  `;

  const load = async () => {
    setLoading(true);
    try {
      const res = await myOrders({ page: 1, limit: 10000, status: "all", q: "", sort: "createdAt", order: "desc" });
      const arr = Array.isArray(res) ? res : res?.rows || res?.data || [];
      const drones = arr.filter(
        (o) =>
          (o.deliveryMode || "").toLowerCase() === "drone" ||
          (o.courier || "").toLowerCase() === "drone" ||
          !!o.droneMissionId
      );
      setOrders(drones);

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

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const summary = useMemo(() => {
    const counts = { active: 0, waiting: 0, landed: 0, error: 0 };
    for (const o of orders) {
      const m = missionById[o.droneMissionId] || missionByOrderId[String(o.id)] || null;
      const st = (m?.status || "queued").toLowerCase();
      if (["queued", "preflight"].includes(st)) counts.waiting++;
      else if (["takeoff", "enroute", "descending", "returning"].includes(st)) counts.active++;
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
        <button className="btn" onClick={load}>Làm mới</button>
      </div>

      <div className="grid">
        <div className="card"><div className="title">Tổng đơn Drone</div><div className="val">{summary.total}</div></div>
        <div className="card"><div className="title">Đang bay</div><div className="val">{summary.active}</div></div>
        <div className="card"><div className="title">Chờ cất cánh</div><div className="val">{summary.waiting}</div></div>
        <div className="card"><div className="title">Đã hạ cánh</div><div className="val">{summary.landed}</div></div>
        <div className="card"><div className="title">Lỗi/Huỷ</div><div className="val">{summary.error}</div></div>
      </div>

      {loading ? (
        <div className="card">Đang tải…</div>
      ) : !orders.length ? (
        <div className="card">Bạn chưa có đơn giao bằng Drone.</div>
      ) : (
        <table className="table">
          <colgroup>
            <col style={{ width: "24%" }} /> {/* Đơn */}
            <col style={{ width: "20%" }} /> {/* Mission */}
            <col style={{ width: "10%" }} /> {/* Tốc độ */}
            <col style={{ width: "10%" }} /> {/* ETA */}
            <col style={{ width: "24%" }} /> {/* Toạ độ */}
            <col style={{ width: "12%" }} /> {/* Thao tác */}
          </colgroup>
          <thead>
            <tr className="row">
              <th className="cell header">Đơn</th>
              <th className="cell header center">Trạng thái</th>
              <th className="cell header center">Tốc độ</th>
              <th className="cell header center">ETA</th>
              <th className="cell header center">Toạ độ</th>
              <th className="cell header right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const m = missionById[o.droneMissionId] || missionByOrderId[String(o.id)] || null;
              const t = m ? (teleByMission[m.id] || teleByMission[o.droneMissionId]) : null;
              const lat = t?.lat, lng = t?.lng;
              const orderParam = encodeURIComponent(String(o.id).replace(/^#/, ""));
              const hasMission = !!m?.id;
              const trackable = canTrack(o, m);
              return (
                <tr key={o.id} className="row">
                  <td className="cell">
                    <div><b>#{o.id}</b></div>
                    <span className="mini">{o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "—"}</span>
                  </td>
                  <td className="cell center">
                    {hasMission ? <StatusPill status={m?.status} /> : <span className="mini">Chưa có mission</span>}
                    <span className="mini">{t?.ts ? `Cập nhật: ${new Date(t.ts).toLocaleTimeString("vi-VN")}` : "—"}</span>
                  </td>
                  <td className="cell center">{t?.speed != null ? `${t.speed} km/h` : <Dash />}</td>
                  <td className="cell center">{m?.eta   != null ? `${m.eta} phút` : <Dash />}</td>
                  <td className="cell center"><CoordText lat={lat} lng={lng} /></td>
                  <td className="cell right">
                    {trackable ? (
                      <Link to={`/orders/${orderParam}/tracking`} className="btn" style={{ textDecoration: "none", minWidth: 140 }}>
                        Xem hành trình
                      </Link>
                    ) : (
                      <button className="btn" disabled style={{ minWidth: 140 }}>Xem hành trình</button>
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
