// src/admin/ResLayout.jsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import { NavLink, useMatch } from "react-router-dom";
import { useEffect, useMemo, useState } from "react"; // 💡 THÊM useState
import { useAuth } from "../context/AuthContext";

export default function ResLayout() { 
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 💡 TRẠNG THÁI MENU MOBILE
  
  // ẩn sidebar + full-width
  const isDroneTracker = !!useMatch("/merchant/drone/:id");

  const css = useMemo(
    () => `
    /* --- DESKTOP LAYOUT --- */
    .admin-layout{
      display:grid;
      grid-template-columns:220px 1fr;
      gap:16px;
      max-width:1200px;
      margin:16px auto;
      padding:0 16px;
    }
    
    /* ➜ FULL-WIDTH/DRONE TRACKER */
    .admin-layout.full{
      grid-template-columns:1fr;
      max-width:100vw;
      margin:0;
      padding:0;
    }
    
    /* --- ASIDE DESKTOP --- */
    .aside{
      background:#fff;border:1px solid #eee;border-radius:12px;
      padding:12px;height:max-content;position:sticky;top:72px;
      z-index: 10; /* Đảm bảo nổi lên trên content */
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
    .menu-toggle { display: none; } /* Mặc định ẩn trên desktop */
    
    /* --- DARK MODE --- */
    .dark .aside{background:#151515;border-color:#333}
    .dark .a-link{color:#eee;border-color:#333}
    .dark .a-link:hover{background:#1c1c1c}
    .dark .a-link.active{background:#2a1c17;border-color:#ffb199;color:#ffc2a8}
    .dark .menu-toggle { background: #222; color: #eee; border-color: #444; }

    /* ============ MOBILE OPTIMIZATION (<= 960px) ============ */
    @media (max-width:960px){
      .admin-layout{
        grid-template-columns:1fr; /* Luôn là 1 cột */
        padding: 0; /* Bỏ padding ngoài */
        margin: 0; /* Bỏ margin ngoài */
      }
      
      /* --- MENU TOGGLE BUTTON --- */
      .menu-toggle {
        display: block; /* Hiện nút toggle */
        position: sticky;
        top: 0;
        z-index: 20;
        background: #fff;
        border: 1px solid #eee;
        padding: 10px 16px;
        font-weight: 700;
        cursor: pointer;
      }

      /* --- ASIDE MOBILE DRAWER --- */
      .aside {
        position: fixed; /* Làm menu nổi */
        top: 0;
        left: 0;
        width: 80%; /* Chiếm 80% màn hình */
        height: 100vh;
        z-index: 100; /* Nổi trên tất cả */
        transform: translateX(-100%); /* Ẩn ngoài màn hình */
        transition: transform 0.3s ease-out;
        box-shadow: 4px 0 10px rgba(0,0,0,0.2);
        padding-top: 50px;
        overflow-y: auto;
        border-radius: 0;
      }
      .aside.open {
        transform: translateX(0); /* Hiện menu */
      }
      .aside.hidden { display: none !important; } /* Vẫn ẩn nếu đang xem Tracker */
      
      /* --- OVERLAY KHI MENU MỞ --- */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 90;
        display: none;
      }
      .overlay.open { display: block; }

      .main { padding: 16px; } /* Thêm padding cho nội dung chính */
      
      /* Fix cho Drone Tracker */
      .admin-layout.full {
        max-width: 100%;
        grid-template-columns: 1fr;
      }
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
  
  const handleLogout = () => {
      logout();
      navigate('/signin');
  };
  
  const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
  };
  
  // Tự động đóng menu khi chuyển route (chỉ trên mobile)
  useEffect(() => {
      if (isMenuOpen) {
          setIsMenuOpen(false);
      }
  }, [navigate]);

  return (
    <>
      {/* --- MOBILE TOGGLE BUTTON --- */}
      {!isDroneTracker && (
        <button className="menu-toggle" onClick={toggleMenu}>
          ☰ Menu Quản trị Cửa hàng
        </button>
      )}

      {/* --- OVERLAY --- */}
      {isMenuOpen && <div className="overlay open" onClick={toggleMenu} />}

      <div className={`admin-layout ${isDroneTracker ? "full" : ""}`}>
        <aside className={`aside ${isDroneTracker ? "hidden" : ""} ${isMenuOpen ? "open" : ""}`}>
          <div className="a-title">Trang quản trị cửa hàng</div>
          <nav className="a-nav" onClick={toggleMenu}> {/* Thêm onClick để đóng menu sau khi chọn */}
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
    </>
  );
}