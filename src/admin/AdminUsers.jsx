import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom"; // Dùng Link thay vì thẻ a để không load lại trang
import { getAllOrders } from "../utils/orderAPI";

const API_URL = "http://localhost:5181/users";

// --- CSS NẰM TRONG FILE NHƯNG ĐƯỢC XỬ LÝ ĐỂ KHÔNG BỊ LỖI GIAO DIỆN ---
const STYLES = `
  .u-wrap { max-width: 1200px; margin: 0 auto; padding: 16px 10px; font-family: 'Segoe UI', sans-serif; }
  .top { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; }
  .tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .inp { height: 38px; border: 1px solid #ddd; border-radius: 8px; padding: 0 12px; outline: none; transition: 0.2s; }
  .inp:focus { border-color: #ff7a59; box-shadow: 0 0 0 3px rgba(255,122,89,0.1); }
  .sel { height: 38px; border: 1px solid #ddd; border-radius: 8px; padding: 0 8px; outline: none; }
  .btn { height: 38px; border: none; border-radius: 8px; background: #ff7a59; color: #fff; padding: 0 16px; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; }
  .btn:hover { background: #e06040; }
  .btn:disabled { background: #ccc; cursor: not-allowed; opacity: 0.7; }
  
  /* GRID & TABLE */
  .grid { overflow-x: auto; background: #fff; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
  table { width: 100%; border-collapse: collapse; min-width: 900px; }
  th { background: #f9f9f9; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; color: #888; padding: 16px; text-align: left; font-weight: 700; border-bottom: 1px solid #eee; }
  td { padding: 10px; border-bottom: 1px solid #eee; vertical-align: middle; color: #444; font-size: 14px; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fafafa; }

  /* COMPONENTS */
  .avatar { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #ff9f43, #ff6b6b); color: #fff; font-weight: 700; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
  
  .role-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; }
  .role-badge.superadmin { background: #ffe2e6; color: #ff3e4e; border-color: #ffccd2; }
  .role-badge.merchant { background: #fff4e6; color: #fd7e14; border-color: #ffe0b2; }
  .role-badge.customer { background: #e6f7ff; color: #0099ff; border-color: #bce6ff; }

  .status-pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; }
  .status-pill.ok { background: #e3fcef; color: #00a854; }
  .status-pill.off { background: #ffe8e6; color: #f03e3e; }
  
  /* ACTIONS */
  .act { display: flex; gap: 8px; }
  .btn.ghost { background: #fff; color: #555; border: 1px solid #ddd; }
  .btn.ghost:hover { border-color: #999; color: #333; background: #f5f5f5; }
  .btn.sm { height: 32px; font-size: 12px; padding: 0 12px; }

  /* SKELETON */
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .sk { height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }

  /* MOBILE */
  .mobile-list { display: none; gap: 16px; margin-top: 20px; }
  .m-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .m-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
  .m-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 12px; }
  .m-label { color: #888; font-size: 11px; margin-bottom: 2px; }
  
  @media (max-width: 900px) {
    .grid table { display: none; }
    .mobile-list { display: flex; flex-direction: column; }
    .tools { width: 100%; }
    .inp { flex: 1; }
  }
`;

function Sk({ w = '100%' }) { return <div className="sk" style={{ width: w }} />; }

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // --- 1. KHẮC PHỤC FOUC: Chèn CSS vào head trước khi render ---
  useLayoutEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = STYLES;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [usersRes, ordersRes] = await Promise.all([
        fetch(API_URL),
        getAllOrders().catch(() => [])
      ]);
      const usersData = await usersRes.json();
      const ordersData = ordersRes || [];

      // Đếm đơn
      const counts = {};
      ordersData.forEach(o => {
        const email = (o.userEmail || "").trim();
        if (email) counts[email] = (counts[email] || 0) + 1;
      });

      // Merge data
      const final = usersData.map(u => ({
        ...u,
        orders: counts[u.email] || 0,
        active: u.active !== undefined ? u.active : true
      }));

      // Sort: Mới nhất lên đầu
      final.sort((a, b) => (b.id > a.id ? 1 : -1));
      setRows(final);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Filter & Pagination
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return !t ? rows : rows.filter(u =>
      (u.email || "").toLowerCase().includes(t) ||
      (u.name || "").toLowerCase().includes(t) ||
      (u.username || "").toLowerCase().includes(t) ||
      (u.phone || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * limit, safePage * limit);

  // Toggle Active
  const onToggleActive = async (user) => {
    // Logic chặn sẽ được xử lý ở UI (disabled), đây là chặn logic ngầm
    if (user.role === 'SuperAdmin' || user.role === 'Merchant') return;

    const newStatus = !user.active;
    setRows(prev => prev.map(r => r.id === user.id ? { ...r, active: newStatus } : r));
    try {
      await fetch(`${API_URL}/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newStatus })
      });
    } catch (e) {
      load(); // Revert
    }
  };

  // --- UI RENDER ROW (Dùng chung cho Desktop & Mobile để đỡ lặp code logic) ---
  const renderActionButtons = (u) => {
    const isSuperAdmin = u.role === 'SuperAdmin';
    const isMerchant = u.role === 'Merchant';
    
    // Nút 1: Khóa / Mở (Disable nếu là Merchant hoặc SuperAdmin)
    const canToggle = !isSuperAdmin && !isMerchant;
    
    // Nút 2: Xem đơn / Xem cửa hàng / Ẩn
    let secondBtn = null;
    if (isMerchant) {
        // Nếu là Merchant -> Xem cửa hàng
        secondBtn = (
            <Link className="btn sm" to={`/admin/merchants/${u.merchantId}`} title="Xem thông tin quán">
                Cửa hàng
            </Link>
        );
    } else if (!isSuperAdmin) {
        // Nếu là Customer -> Xem đơn
        secondBtn = (
            <Link className="btn sm ghost" to={`/admin/orders?q=${u.email}`} title="Lịch sử mua hàng">
                Xem Đơn
            </Link>
        );
    }
    // Nếu là SuperAdmin -> Không hiện nút thứ 2 (secondBtn = null)

    return (
      <div className="act">
        <button
          className="btn sm ghost"
          onClick={() => onToggleActive(u)}
          disabled={!canToggle}
          style={{ opacity: canToggle ? 1 : 0.5, cursor: canToggle ? 'pointer' : 'not-allowed' }}
        >
          {u.active ? 'Khóa' : 'Mở'}
        </button>
        {secondBtn}
      </div>
    );
  };

  return (
    <section className="u-wrap">
      {/* Header Tools */}
      <div className="top">
        <h2 style={{ margin: 0, color: '#333' }}>Quản lý Người dùng</h2>
        <div className="tools">
          <input className="inp" placeholder="Tìm kiếm..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
          <button className="btn" onClick={load}>Làm mới</button>
        </div>
      </div>

      {loading ? (
        <div className="grid" style={{ padding: 20 }}>
          <Sk w="100%" /> <br /><Sk w="80%" /> <br /><Sk w="90%" />
        </div>
      ) : (
        <>
          {/* --- DESKTOP TABLE --- */}
          <div className="grid">
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Liên hệ</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thống kê</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(u => {
                  const roleClass = (u.role || 'customer').toLowerCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="avatar">{(u.name?.[0] || u.username?.[0] || '?').toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#333' }}>{u.name || u.username}</div>
                            <div style={{ fontSize: 11, color: '#999' }}>ID: {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u.email}</div>
                        <div style={{ fontSize: 12, color: '#777' }}>{u.phone || '---'}</div>
                      </td>
                      <td>
                        <span className={`role-badge ${roleClass}`}>
                          {u.role} {u.role === 'Merchant' && u.merchantId ? `(#${u.merchantId})` : ''}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${u.active ? 'ok' : 'off'}`}>
                          {u.active ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td>
                         {/* Merchant/Admin không mua hàng nên không hiện số đơn để tránh nhầm lẫn */}
                         {u.role === 'customer' ? `${u.orders} đơn` : '---'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ justifyContent: 'flex-end', display: 'flex' }}>
                            {renderActionButtons(u)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* --- MOBILE LIST --- */}
          <div className="mobile-list">
            {pageRows.map(u => (
              <div key={u.id} className="m-card">
                <div className="m-head">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="avatar">{(u.name?.[0] || '?').toUpperCase()}</div>
                    <div>
                        <div style={{ fontWeight: 700 }}>{u.name}</div>
                        <span className={`role-badge ${(u.role||'').toLowerCase()}`} style={{fontSize:10, padding:'2px 6px'}}>
                            {u.role}
                        </span>
                    </div>
                  </div>
                  <span className={`status-pill ${u.active ? 'ok' : 'off'}`}>{u.active ? 'Active' : 'Locked'}</span>
                </div>
                <div className="m-row">
                  <div><div className="m-label">Email</div><div>{u.email}</div></div>
                  <div><div className="m-label">Phone</div><div>{u.phone || '-'}</div></div>
                  {u.role === 'customer' && (
                      <div><div className="m-label">Đơn hàng</div><div>{u.orders}</div></div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {renderActionButtons(u)}
                </div>
              </div>
            ))}
          </div>

          {/* Pager */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button className="btn ghost sm" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
            <span style={{ lineHeight: '32px', fontSize: 13, fontWeight: 600 }}>Trang {safePage}/{pageCount}</span>
            <button className="btn ghost sm" disabled={safePage >= pageCount} onClick={() => setPage(p => p + 1)}>Sau</button>
          </div>
        </>
      )}
    </section>
  );
}