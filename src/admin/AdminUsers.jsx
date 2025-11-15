import { useEffect, useMemo, useState } from "react";
import { getAllOrders } from "../utils/orderAPI";
import {
  listUsers, upsertUser, setRole, setActive,
} from "../utils/usersStore";

const ROLES = ["user", "restaurant", "admin"]; // FE-only; có thể chặn 'admin' nếu muốn

function Sk({ h=16, w='100%', style={} }){
  return (
    <div style={{
      height: h, width: w, borderRadius: 8,
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
    .role{height:30px;border:1px solid #ddd;border-radius:8px;padding:0 8px}
    .pill{display:inline-block;padding:4px 10px;border-radius:999px;font-weight:700;border:1px solid #e8e8e8}
    .pill.ok{background:#eaf7ea;color:#2a7e2a;border-color:#cce9cc}
    .pill.off{background:#fde8e8;color:#b80d0d;border-color:#f9c7c7}
    .act{display:flex;gap:6px}
    .btn.ghost{background:#fff;color:#333;border:1px solid #ddd}
    .pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px}
    .pager button{height:32px;border:none;border-radius:8px;padding:0 10px;background:#f0f0f0;cursor:pointer}
    .dark td,.dark th{border-color:#333}
    .dark .inp,.dark .sel,.dark .role{background:#111;color:#eee;border-color:#333}
    .dark .btn.ghost{background:#111;color:#eee;border-color:#333}
  `;

  // hợp nhất: users (localStorage) + emails từ orders
  async function load() {
    setLoading(true);
    try {
      const base = listUsers(); // {email,name,phone,role,active}
      const orders = await getAllOrders().catch(()=>[]);
      const byEmail = new Map(base.map(u => [u.email, { ...u, orders: 0 }]));
      // gộp từ orders
      (orders || []).forEach(o => {
        const email = (o.userEmail || "").trim();
        if (!email) return;
        const prev = byEmail.get(email) || {
          email, name: email.split("@")[0], phone: o.phone || "",
          role: "user", active: true, orders: 0
        };
        prev.orders = (prev.orders || 0) + 1;
        // update phone nếu trống
        if (!prev.phone && o.phone) prev.phone = o.phone;
        byEmail.set(email, prev);
      });

      // lên mảng
      const arr = Array.from(byEmail.values())
        .sort((a,b)=> (b.orders||0)-(a.orders||0) || a.email.localeCompare(b.email));
      setRows(arr);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // filter + pagination
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
    setRole(email, role);
    setRows(prev => prev.map(u => u.email===email ? { ...u, role } : u));
  };
  const onToggleActive = (email) => {
    const u = rows.find(r => r.email===email);
    if (!u) return;
    setActive(email, !u.active);
    setRows(prev => prev.map(r => r.email===email ? { ...r, active: !u.active } : r));
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
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Đơn</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(u => {
                  const first = (u.name||u.email||"?").slice(0,1).toUpperCase();
                  return (
                    <tr key={u.email}>
                      <td style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="avatar">{first}</div>
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:800}}>{u.name || '—'}</div>
                          <div style={{fontSize:12,opacity:.75}}>#{u.email.split("@")[0]}</div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td>
                        <select
                          className="role"
                          value={u.role || 'user'}
                          onChange={e=>onRole(u.email, e.target.value)}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>
                        <span className={`pill ${u.active!==false ? 'ok':'off'}`}>
                          {u.active!==false ? 'Hoạt động' : 'Đã vô hiệu'}
                        </span>
                      </td>
                      <td>{u.orders || 0}</td>
                      <td className="act">
                        <button className="btn ghost" onClick={()=>onToggleActive(u.email)}>
                          {u.active!==false ? 'Vô hiệu hoá' : 'Kích hoạt'}
                        </button>
                        <a className="btn" href="/admin/orders" title="Xem đơn người này">Xem đơn</a>
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
