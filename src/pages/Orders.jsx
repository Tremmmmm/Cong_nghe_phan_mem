import { useEffect, useMemo, useState } from "react";
import { myOrders } from "../utils/orderAPI.js"; // Đảm bảo import từ file mới (nếu đã đổi)
import { useAuth } from "../context/AuthContext.jsx";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
// import MENU_ALL from "../data/menuData.js"; // 💡 Bỏ import dữ liệu tĩnh nếu không cần
import { estimateETA, etaWindowLabel, formatCountdown } from "../utils/eta";

function VND(n){ return (n||0).toLocaleString('vi-VN') + '₫' }
const FALLBACK = "public/assets/images/Delivery.png";

// chuẩn hoá trạng thái
const normalizeStatus = (s="") => {
  const x = String(s).toLowerCase();
  if (["delivering"].includes(x)) return "delivery";
  if (["delivered","completed","done"].includes(x)) return "done";
  if (["cancelled","canceled"].includes(x)) return "cancelled";
  if (["accepted","preparing","ready"].includes(x)) return "processing";
  if (["new","pending","confirmed"].includes(x)) return "order";
  return "order";
};

// 💡 Hàm kiểm tra xem đơn hàng có "đang hoạt động" không
const isActiveOrder = (o) => {
    const status = (o.status || '').toLowerCase();
    const excludeStatus = ['completed', 'done', 'delivered', 'cancelled', 'canceled'];
    return !excludeStatus.includes(status);
};

// 💡 Hàm kiểm tra xem đơn có phải đặt hôm nay không
const isToday = (dateString) => {
    if (!dateString) return false;
    try {
        const orderDate = new Date(dateString);
        const today = new Date();
        return orderDate.getDate() === today.getDate() &&
               orderDate.getMonth() === today.getMonth() &&
               orderDate.getFullYear() === today.getFullYear();
    } catch (e) {
        return false;
    }
};

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const focusId = sp.get("focus");
  const closedFlag = sp.get("closed") === "1";
  const promptClose = sp.get("promptClose") === "1";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const [justClosed, setJustClosed] = useState(closedFlag);

  // 💡 Bỏ menuMap nếu không dùng, hoặc sửa để lấy từ API
  // const menuMap = useMemo(() => {
  //   const m = {};
  //   // for (const it of MENU_ALL) m[it.id] = it; // Dùng dữ liệu tĩnh
  //   return m;
  // }, []);

  const fetchOrders = async () => {
    if (!user) { // Nếu chưa login thì không fetch
        setLoading(false);
        setOrders([]);
        return;
    }
    try {
      setLoading(true);
      setError("");
      
      // 💡 Chỉ gọi API cho user hiện tại (nếu API hỗ trợ)
      // Nếu myOrders chưa hỗ trợ lọc theo user, ta sẽ lọc ở frontend
      const { rows } = await myOrders({
        page: 1, limit: 50, status: "all", q: "",
        sort: "createdAt", order: "desc",
        // (Nếu API hỗ trợ) userId: user.id
      });
      
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setError("Không tải được đơn hàng. Vui lòng thử lại.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [user]); // 💡 Thêm user vào dependency

  useEffect(() => {
    const onFocus = () => fetchOrders();
    const onVis = () => { if (document.visibilityState === "visible") fetchOrders(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`ord-${focusId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightId(focusId);
      const timer = setTimeout(() => setHighlightId(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [focusId, orders]);

  useEffect(() => {
    if (!justClosed) return;
    const t = setTimeout(() => setJustClosed(false), 4000);
    return () => clearTimeout(t);
  }, [justClosed]);

  // Lọc theo user & SẮP XẾP MỚI NHẤT LÊN TRÊN
  // 💡 SỬA LẠI LOGIC LỌC
  const myCurrentOrders = useMemo(() => {
    if (!user) return [];
    
    // 1. Lọc theo user
    const userEmail = user.email; // Hoặc user.id tùy vào db.json
    const my = orders.filter(o => (o.userEmail === userEmail || o.userId === user.id));

    // 2. Lọc các đơn "Hiện tại" (Hôm nay VÀ Chưa xong)
    const current = my.filter(o => 
        isActiveOrder(o) && isToday(o.createdAt)
    );
    
    // 3. Sắp xếp (mới nhất lên đầu)
    current.sort((a,b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    
    return current;
  }, [orders, user]);


  const css = `
    .od-wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .top{display:flex;gap:12px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
    .title{font-size:24px;font-weight:800;margin:0}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:14px;margin-bottom:12px;transition:box-shadow .2s,border-color .2s}
    .card.focus{border-color:#ffb199; box-shadow:0 0 0 3px #ffe8e0}
    .row{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap}
    .label{color:#777}
    .badge{background:#ffe5d8;color:#c24a26;border:1px solid #ffb199;border-radius:999px;padding:4px 10px;font-weight:700;text-transform:capitalize}
    .items{margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
    .it{display:flex;gap:10px;align-items:center;border:1px dashed #eee;border-radius:10px;padding:8px}
    .thumb{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#f6f6f6}
    .meta{flex:1}
    .meta b{display:block}
    .sum-row{display:flex;justify-content:flex-end;gap:20px;margin-top:12px}
    .banner-ok{margin:8px 0 14px; padding:10px 12px; border-radius:10px; font-weight:700;
               background:#eaf7ea; border:1px solid #cce9cc; color:#2a7e2a}
    .banner-warn{margin:8px 0 14px; padding:10px 12px; border-radius:10px; font-weight:700;
                 background:#fff3e2; border:1px solid #ffc9a6; color:#c24a26}
    .muted{opacity:.75}
    .eta-line{opacity:.9}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .btn{height:32px;border:none;border-radius:10px;background:#111;color:#fff;padding:0 12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
    .btn[disabled]{background:#d1d5db;color:#6b7280}
    .dark .card{background:#151515;border-color:#333}
    .dark .label{color:#aaa}
  `;
// 💡 Sửa lại hàm này nếu không dùng menuMap
  const getItemImage = (it) => it.image || FALLBACK;

  // ETA badge + countdown
  function EtaBadge({ order }) {
    const st = String(order.status || '').toLowerCase();
    if (['done','delivered','cancelled'].includes(st)) return null;

    const eta = useMemo(() => estimateETA({
      // Bạn chỉ dùng Drone nên set cố định 'DRONE'
      deliveryMode: 'DRONE',
      itemCount: order.items?.length || 1,
      createdAt: order.createdAt
    }), [order.items?.length, order.createdAt]);

    const [cd, setCd] = useState('');
    useEffect(() => {
      const tick = () => setCd(formatCountdown(eta.arriveTs - Date.now()));
      tick();
      const t = setInterval(tick, 1000);
      return () => clearInterval(t);
    }, [eta.arriveTs]);

    return (
      <div className="eta-line">
        ETA: <b>{etaWindowLabel(eta)}</b> — Còn lại: <b>{cd}</b>
      </div>
    );
  }

  // Nút theo dõi Drone (chỉ hiện khi đang giao)
  const TrackBtn = ({ order }) => {
    const show = normalizeStatus(order?.status) === "delivery";
    if (!show) return null;
    const orderParam = encodeURIComponent(String(order?.id ?? "").replace(/^#/, ""));
    return (
      <Link
        to={`/orders/${orderParam}/tracking`}
        className="btn"
        style={{textDecoration: "none",background: "#ff7a59",color: "#fff",border: "none",borderRadius: "10px",fontWeight: "600",padding: "6px 14px",
        }}
        aria-label={`Xem hành trình đơn #${order?.id}`}
      >
        Xem hành trình
      </Link>
    );
  };

  return (
    <div className="od-wrap">
      <style>{css}</style>

      <div className="top">
        <h2 className="title">Đơn hàng hiện tại</h2>
        <button className="btn" onClick={fetchOrders}>Refresh</button>
      </div>

      {justClosed && (
        <div className="banner-ok">✅ Phiên đặt hàng (session) đã được đóng. Cảm ơn bạn!</div>
      )}

      {promptClose && (
        <div className="banner-warn">
          🔒 Bạn vừa đặt xong đơn.
          <button
            className="btn"
            style={{ marginLeft: 8, height: 28, borderRadius: 14 }}
            onClick={() => navigate(`/checkout/confirm?orderId=${encodeURIComponent(focusId || "")}`)}
          >
            Đóng phiên ngay
          </button>
        </div>
      )}

      {loading ? (
        <div>Đang tải…</div>
      ) : error ? (
        <div style={{color:'#c24a26'}}>{error}</div>
      ) : !user ? (
        <div>Vui lòng <Link to="/signin">đăng nhập</Link> để xem đơn hàng.</div>
      ) : myCurrentOrders.length === 0 ? (
        <div>Bạn không có đơn hàng nào đang hoạt động hôm nay.</div>
      ) : (
        // 💡 Map qua myCurrentOrders
        myCurrentOrders.map(o => (
          <div className={`card ${String(o.id)===String(highlightId)?'focus':''}`} key={o.id} id={`ord-${o.id}`}>
            <div className="row">
              <div><span className="label">Mã đơn:</span> <strong>{o.id}</strong></div>
              <div><span className="label">Ngày tạo:</span> {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'}</div>
              <div><span className="label">Tạm tính:</span> <strong>{VND(o.total)}</strong></div>
              <div><span className="badge">{o.status || 'pending'}</span></div>
            </div>

            <div style={{marginTop:8}}>
              <div className="label">Người nhận:</div>
              <div><strong>{o.customerName}</strong> • {o.phone}</div>
              <div>{o.address}</div>
              <div className="muted">Giao bằng: <b>Drone</b></div>
              {/* <div className="muted"><EtaBadge order={o} /></div> */}
            </div>

            <div className="items">
              {o.items?.map((it, idx) => (
                <div className="it" key={`${o.id}-${idx}`}>
                  <img className="thumb" src={getItemImage(it)} alt={it.name} onError={(e)=>{e.currentTarget.src=FALLBACK}} />
                  <div className="meta">
                    <b>{it.name}</b>
                    <div>x{it.qty} — {VND((it.price||0)*(it.qty||0))}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sum-row">
              {o.couponCode && <div>Mã: <strong>{o.couponCode}</strong></div>}
              <div>Giảm: <strong>-{VND(o.discount||0)}</strong></div>
              <div>Phải trả: <strong>{VND(o.finalTotal ?? o.total ?? 0)}</strong></div>
            </div>

            {/* hành động */}
            <div className="actions">
              <TrackBtn order={o} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
