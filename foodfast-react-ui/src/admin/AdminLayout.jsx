import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useMemo } from "react";

export default function AdminLayout(){
  const css = useMemo(()=>`
    .admin-layout{display:grid;grid-template-columns:220px 1fr;gap:16px;max-width:1200px;margin:16px auto;padding:0 16px}
    .aside{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;height:max-content;position:sticky;top:72px}
    .a-title{font-size:18px;font-weight:900;margin:4px 0 10px}
    .a-nav{display:grid;gap:6px}
    .a-link{display:block;padding:10px 12px;border-radius:10px;text-decoration:none;color:#333;font-weight:700;border:1px solid #eee}
    .a-link:hover{background:#f7f7f7}
    .a-link.active{background:#ffefe9;border-color:#ffb199;color:#c24a26}
    .main{min-width:0}
    .dark .aside{background:#151515;border-color:#333}
    .dark .a-link{color:#eee;border-color:#333}
    .dark .a-link:hover{background:#1c1c1c}
    .dark .a-link.active{background:#2a1c17;border-color:#ffb199;color:#ffc2a8}
    @media (max-width:960px){
      .admin-layout{grid-template-columns:1fr}
      .aside{position:static}
    }
  `,[])

  useEffect(()=>{
    const id='admin-layout-style'
    if(!document.getElementById(id)){
      const s=document.createElement('style');
      s.id=id;
      s.innerHTML=css;
      document.head.appendChild(s)
    }
  },[css])

  return (
    <div className="admin-layout">
      <aside className="aside">
        <div className="a-title">Trang quản trị</div>
        <nav className="a-nav">
          <NavLink to="/admin/dashboard" className={({isActive})=>`a-link ${isActive?'active':''}`}>
            Bảng điều khiển
          </NavLink>
          <NavLink to="/admin/orders" className={({isActive})=>`a-link ${isActive?'active':''}`}>
            Đơn hàng
          </NavLink>
          {/* Kitchen / Restaurant nằm trong Admin */}
          <NavLink to="/admin/restaurant" className={({isActive})=>`a-link ${isActive?'active':''}`}>
            Khu nhà hàng (PoC)
          </NavLink>
        </nav>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
