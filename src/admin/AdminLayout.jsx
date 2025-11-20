import { NavLink, Outlet, useNavigate } from "react-router-dom"; // 💡 THÊM useNavigate
import { useEffect, useMemo, useState } from "react"; // 💡 THÊM useState
import { useAuth } from "../context/AuthContext";

export default function AdminLayout(){
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 💡 TRẠNG THÁI MENU MOBILE

  const css = useMemo(()=>`
    /* --- DESKTOP LAYOUT --- */
    .admin-layout{display:grid;grid-template-columns:220px 1fr;gap:16px;max-width:1200px;margin:16px auto;padding:0 16px}
    
    /* --- ASIDE DESKTOP --- */
    .aside{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;height:max-content;position:sticky;top:72px; z-index: 10}
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
        grid-template-columns:1fr;
        padding: 0;
        margin: 0;
      }
      
      /* --- MENU TOGGLE BUTTON --- */
      .menu-toggle {
        display: block;
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
        position: fixed;
        top: 0;
        left: 0;
        width: 80%;
        height: 100vh;
        z-index: 100;
        transform: translateX(-100%);
        transition: transform 0.3s ease-out;
        box-shadow: 4px 0 10px rgba(0,0,0,0.2);
        padding-top: 50px;
        overflow-y: auto;
        border-radius: 0;
      }
      .aside.open {
        transform: translateX(0);
      }
      
      /* --- OVERLAY KHI MENU MỞ --- */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 90;
        display: none;
      }
      .overlay.open { display: block; }
      
      .main { padding: 16px; }
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
  
  const handleLogout = () => {
      logout();
      navigate('/signin'); 
  };
  
  const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
  };
  
  useEffect(() => {
      if (isMenuOpen) {
          setIsMenuOpen(false);
      }
  }, [navigate]);

  return (
    <>
      {/* --- MOBILE TOGGLE BUTTON --- */}
      <button className="menu-toggle" onClick={toggleMenu}>
        ☰ Menu Quản trị Server
      </button>

      {/* --- OVERLAY --- */}
      {isMenuOpen && <div className="overlay open" onClick={toggleMenu} />}

      <div className="admin-layout">
        <aside className={`aside ${isMenuOpen ? "open" : ""}`}>
          <div className="a-title">Trang quản trị</div>
          <nav className="a-nav" onClick={toggleMenu}> {/* Thêm onClick để đóng menu sau khi chọn */}
              <NavLink to="/admin/dashboard" className={({isActive})=>`a-link ${isActive?'active':''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/users" className={({isActive})=>`a-link ${isActive?'active':''}`}>
              Người dùng
            </NavLink>

            <NavLink to="/admin/merchants" className={({isActive})=>`a-link ${isActive?'active':''}`}>
              Quản lý cửa hàng
            </NavLink>

            <NavLink to="/admin/drone" className={({isActive})=>`a-link ${isActive?'active':''}`}>
              Drone (theo dõi)
            </NavLink>

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
  )
}