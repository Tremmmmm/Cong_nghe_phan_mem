import { useEffect, useMemo, useState } from "react";
import { getAllOrders } from "../utils/orderAPI";
import { listUsers, upsertUser, setActive} from "../utils/usersStore"; // usersStore phải có hàm upsert/setRole

// 💡 SỬA: Vai trò nghiệp vụ
const ROLES = ["Customer", "Merchant", "SuperAdmin"]; 

// ... (Sk function giữ nguyên)
function Sk({ h=16, w='100%', style={} }){
  return (
    <div style={{
      height: h, w: w, borderRadius: 8,
      background: 'linear-gradient(90deg,#eee,#f7f7f7,#eee)',
      backgroundSize: '200% 100%',
      animation: 'u-sk 1s linear infinite',
      ...style
    }}/>
  );
}
if (typeof document !== 'undefined' && !document.getElementById('u-sk-style')) {
  const s = document.createElement('style');
  s.id = 'u-sk-style';
  s.innerHTML = `@keyframes u-sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
  document.head.appendChild(s);
}

export default function AdminUsers(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [tempMerchantId, setTempMerchantId] = useState({}); 

  const css = `
    .u-wrap{padding:16px 0}
    .top{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap}
    .tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .inp{height:34px;border:1px solid #ddd;border-radius:8px;padding:0 10px}
    .sel{height:34px;border:1px solid #ddd;border-radius:8px;padding:0 8px}
    .btn{height:34px;border:none;border-radius:8px;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .grid{overflow:auto}
    table{width:100%;border-collapse:separate;border-spacing:0}
    th,td{padding:10px;border-bottom:1px solid #eee;text-align:left;white-space:nowrap}
    th{font-size:12px;text-transform:uppercase;color:#666}
    .avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#ff7a59;color:#fff;font-weight:900}
    
    /* 💡 TỐI ƯU MOBILE: Giảm padding cho select */
    .role{height:30px;border:1px solid #ddd;border-radius:8px;padding:0 4px; font-size: 13px; max-width: 130px; }
    
    .pill{display:inline-block;padding:4px 10px;border-radius:999px;font-weight:700;border:1px solid #e8e8e8; font-size: 12px;}
    .pill.ok{background:#eaf7ea;color:#2a7e2a;border-color:#cce9cc}
    .pill.off{background:#fde8e8;color:#b80d0d;border-color:#f9c7c7}
    .act{display:flex;gap:6px}
    .btn.ghost{background:#fff;color:#333;border:1px solid #ddd}
    .pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px}
    .pager button{height:32px;border:none;border-radius:8px;padding:0 10px;background:#f0f0f0;cursor:pointer}
    .dark td,.dark th{border-color:#333}
    .dark .inp,.dark .sel,.dark .role{background:#111;color:#eee;border-color:#333}
    .dark .btn.ghost{background:#111;color:#eee;border-color:#333}
    
    /* 💡 CSS CHO CỘT VAI TRÒ/MERCHANT ID */
    .role-cell { display: flex; flex-direction: column; gap: 5px; min-width: 140px; }
    .role-input { height: 24px; font-size: 12px; }
    .merchant-id-tag { font-size: 10px; color: #ff7a59; font-weight: 600; }

    /* 💡 MEDIA QUERY CHO MOBILE */
    @media (max-width: 600px) {
        .u-wrap { padding: 10px 5px; }
        .top { justify-content: center; }
        .tools { justify-content: center; width: 100%; }
        .inp, .sel { flex-grow: 1; }
        .grid { overflow-x: auto; }
        table { min-width: 900px; } /* Đảm bảo bảng không vỡ */
    }
  `;

  // hợp nhất: users (localStorage) + emails từ orders
  async function load() {
    setLoading(true);
    try {
      const base = listUsers(); 
      const orders = await getAllOrders().catch(()=>[]);
      
      const byEmail = new Map(base.map(u => [u.email, { ...u, orders: 0 }]));
      
      (orders || []).forEach(o => {
        const email = (o.userEmail || "").trim();
        if (!email) return;
        const prev = byEmail.get(email) || {
          email, name: o.customerName || email.split("@")[0], phone: o.phone || "",
          role: "Customer", active: true, orders: 0, // 💡 MẶC ĐỊNH LÀ Customer
          merchantId: o.merchantId || null, 
          id: o.userId || null, 
        };
        prev.orders = (prev.orders || 0) + 1;
        if (!prev.phone && o.phone) prev.phone = o.phone;
        byEmail.set(email, prev);
      });

      const arr = Array.from(byEmail.values())
        .sort((a,b)=> (b.orders||0)-(a.orders||0) || a.email.localeCompare(b.email));
      setRows(arr);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // filter + pagination (giữ nguyên)
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return !t ? rows :
      rows.filter(u =>
        (u.email||"").toLowerCase().includes(t) ||
        (u.name||"").toLowerCase().includes(t) ||
        (u.phone||"").toLowerCase().includes(t)
      );
  }, [rows, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage-1)*limit, (safePage-1)*limit + limit);

  // actions
  const onRole = (email, role) => {
    const u = rows.find(r => r.email === email);
    if (!u) return;
    
    // 💡 NGHIỆP VỤ ADMIN SERVER: HẠN CHẾ CHỈNH SỬA VAI TRÒ SUPERADMIN
    if (u.role === 'SuperAdmin' && role !== 'SuperAdmin') {
        alert("Không thể hạ cấp SuperAdmin. Hãy vô hiệu hoá tài khoản nếu cần.");
        // Giữ nguyên vai trò cũ
        return; 
    }

    const newMerchantId = role === 'Merchant' ? (tempMerchantId[email] || u.merchantId || '') : null;
    
    const updatedUser = {
        ...u,
        role: role,
        merchantId: newMerchantId || null,
        id: u.id || `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` 
    };

    upsertUser(updatedUser); 
    
    setRows(prev => prev.map(r => r.email === email ? updatedUser : r));
    
    if (role !== 'Merchant') {
      setTempMerchantId(prev => { delete prev[email]; return { ...prev }; });
    }
  };
  
  const onToggleActive = (email) => {
    const u = rows.find(r => r.email===email);
    if (!u) return;
    
    // 💡 NGHIỆP VỤ: Không vô hiệu hoá SuperAdmin/Admin Server
    if (u.role === 'SuperAdmin' && !u.active) {
        alert("Không thể vô hiệu hoá SuperAdmin/Admin Server.");
        return;
    }
    
    setActive(email, !u.active);
    setRows(prev => prev.map(r => r.email===email ? { ...r, active: !u.active } : r));
  };
  
  const handleTempMerchantIdChange = (email, value) => {
      setTempMerchantId(prev => ({ ...prev, [email]: value }));
  };

  return (
    <section className="u-wrap">
      <style>{css}</style>

      <div className="top">
        <h2 style={{margin:0}}>Người dùng</h2>
        <div className="tools">
          <input className="inp" placeholder="Tìm theo email / tên / SĐT…" value={q} onChange={e=>{setQ(e.target.value); setPage(1);}} />
          <select className="sel" value={limit} onChange={e=>{setLimit(Number(e.target.value)); setPage(1);}}>
            {[10,20,50].map(n=><option key={n} value={n}>{n}/trang</option>)}
          </select>
          <button className="btn" onClick={load}>Làm mới</button>
        </div>
      </div>

      {loading ? (
        <div className="grid">
          <table><tbody>
            {Array.from({length:8}).map((_,i)=>(
              <tr key={i}>
                <td><Sk w="160px"/></td>
                <td><Sk w="220px"/></td>
                <td><Sk w="120px"/></td>
                <td><Sk w="90px"/></td>
                <td><Sk w="120px"/></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      ) : (
        <>
          <div className="grid">
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Vai trò / Merchant ID</th> 
                  <th>Trạng thái</th>
                  <th>Đơn</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(u => {
                  const first = (u.name||u.email||"?").slice(0,1).toUpperCase();
                  const isMerchant = u.role === 'Merchant';
                  const isSuperAdmin = u.role === 'SuperAdmin'; // 💡 Lấy trạng thái SuperAdmin
                  const currentMerchantId = tempMerchantId[u.email] || u.merchantId;
                  const canEditRole = !isSuperAdmin; // 💡 Hạn chế SuperAdmin chỉnh SuperAdmin khác
                  
                  return (
                    <tr key={u.email}>
                      <td style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="avatar">{first}</div>
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:800}}>{u.name || '—'}</div>
                          <div style={{fontSize:12,opacity:.75}}>ID: {u.id || '—'}</div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      
                      {/* CỘT VAI TRÒ/MERCHANT ID */}
                      <td className="role-cell">
                        <select
                          className="role"
                          value={u.role || 'Customer'}
                          onChange={e=>onRole(u.email, e.target.value)}
                          disabled={!canEditRole} // 💡 KHÔNG CHO CHỈNH SUPERADMIN
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {isMerchant && (
                            <input
                                className="inp role-input"
                                placeholder="Merchant ID (vd: m001)"
                                value={currentMerchantId || ''}
                                onChange={e => handleTempMerchantIdChange(u.email, e.target.value)}
                                onBlur={() => onRole(u.email, 'Merchant')} // Lưu khi focus out
                                title="Nhập Merchant ID và nhấn Enter hoặc click ra ngoài"
                            />
                        )}
                        {u.merchantId && (
                           <span className="merchant-id-tag">Đã gán: {u.merchantId}</span>
                        )}
                      </td>
                      
                      <td>
                        <span className={`pill ${u.active!==false ? 'ok':'off'}`}>
                          {u.active!==false ? 'Hoạt động' : 'Vô hiệu'}
                        </span>
                      </td>
                      <td>{u.orders || 0}</td>
                      <td className="act">
                        <button 
                            className="btn ghost" 
                            onClick={()=>onToggleActive(u.email)}
                            disabled={isSuperAdmin} // 💡 Không cho vô hiệu hoá Admin Server
                        >
                          {u.active!==false ? 'Vô hiệu hoá' : 'Kích hoạt'}
                        </button>
                        <a className="btn" href={`/admin/orders?q=${u.email}`} title="Xem đơn người này">Xem đơn</a>
                      </td>
                    </tr>
                  );
                })}
                {!pageRows.length && (
                  <tr><td colSpan={7} style={{padding:20,opacity:.75}}>Không có người dùng phù hợp.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹ Trước</button>
            <span>Trang {safePage} / {pageCount}</span>
            <button disabled={safePage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Sau ›</button>
          </div>
        </>
      )}
    </section>
  );
}