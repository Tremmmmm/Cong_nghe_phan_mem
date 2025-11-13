// src/admin/ResLayout.jsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import { NavLink, useMatch } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

export default function ResLayout() { 
  const navigate = useNavigate();
  const { logout } = useAuth();
  // ẩn sidebar + full-width
  const isDroneTracker = !!useMatch("/merchant/drone/:id");

  const css = useMemo(
    () => `
    .admin-layout{
      display:grid;
      grid-template-columns:220px 1fr;
      gap:16px;
      max-width:1200px;
      margin:16px auto;
      padding:0 16px;
    }
    /* ➜ Full-width thật sự khi xem tracker */
    .admin-layout.full{
      grid-template-columns:1fr;
      max-width:100vw;   /* bỏ giới hạn chiều ngang */
      margin:0;          /* sát mép */
      padding:0;         /* bỏ padding 2 bên */
    }
    .aside{
      background:#fff;border:1px solid #eee;border-radius:12px;
      padding:12px;height:max-content;position:sticky;top:72px
    }
    .aside.hidden{display:none}
    .a-title{font-size:18px;font-weight:900;margin:4px 0 10px}
    .a-nav{display:grid;gap:6px}
    .a-link{display:block;padding:10px 12px;border-radius:10px;text-decoration:none;color:#333;font-weight:700;border:1px solid #eee}
    .a-link:hover{background:#f7f7f7}
    .a-link.active{background:#ffefe9;border-color:#ffb199;color:#c24a26}

    .logout-btn { color: #e74c3c; border-color: #fadbd8; }
    .logout-btn:hover { background: #fdedec; }

    .main{min-width:0}
    .dark .aside{background:#151515;border-color:#333}
    .dark .a-link{color:#eee;border-color:#333}
    .dark .a-link:hover{background:#1c1c1c}
    .dark .a-link.active{background:#2a1c17;border-color:#ffb199;color:#ffc2a8}
    @media (max-width:960px){
      .admin-layout{grid-template-columns:1fr}
      .aside{position:static}
    }
  `,
    []
  );

  useEffect(() => {
    const id = "admin-layout-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.innerHTML = css;
      document.head.appendChild(s);
    }
  }, [css]);
// Hàm xử lý đăng xuất
  const handleLogout = () => {
      logout();
      navigate('/signin');
  };
  return (
    <div className={`admin-layout ${isDroneTracker ? "full" : ""}`}>
      <aside className={`aside ${isDroneTracker ? "hidden" : ""}`}>
        <div className="a-title">Trang quản trị cửa hàng</div>
        <nav className="a-nav">
          <NavLink to="/merchant/dashboard" className={({ isActive }) => `a-link ${isActive ? "active" : ""}`}>Dashboard</NavLink>
          <NavLink to="/merchant/orders" className={({ isActive }) => `a-link ${isActive ? "active" : ""}`}>Lịch sử đơn hàng</NavLink>
          <NavLink to="/merchant/kitchen" className={({ isActive }) => `a-link ${isActive ? "active" : ""}`}>Quản lý đơn (Bếp)</NavLink>
          <NavLink to="/merchant/menu" className={({ isActive }) => `a-link ${isActive ? "active" : ""}`}>Quản lý Menu</NavLink>
          <NavLink to="/merchant/settings" className={({ isActive }) => `a-link ${isActive ? "active" : ""}`}>Cài đặt cửa hàng</NavLink>
          <NavLink to="/merchant/drone" className={({ isActive }) => `a-link ${isActive ? "active" : ""}`}>Drone (theo dõi)</NavLink>
          
          <hr style={{margin: '10px 0', border: 'none', borderTop: '1px solid #eee'}} />
          <button onClick={handleLogout} className="a-link logout-btn">
                      Đăng xuất
                    </button>
        </nav>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
