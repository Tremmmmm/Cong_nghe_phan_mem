import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useFav } from "../context/FavContext.jsx";

import logo from "/assets/images/logo.png";

export default function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { items } = useCart();
  const { count: favCount } = useFav();

  const cartCount = items.reduce((s, it) => s + (it.qty || 0), 0);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  const styles = useMemo(() => `
    .ff-header{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #eee}
    /* Thêm flex-wrap để cho phép xuống dòng trên mobile */
    .ff-h-wrap{max-width:1140px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:20px; flex-wrap: nowrap;} 
    
    .brand{display:flex;align-items:center;gap:10px;text-decoration:none; flex-shrink: 0;}
    .brand img{height:32px;width:auto;display:block}

    /* DELIVERY INFO */
    .delivery-info {
        display: none; /* Ẩn trên Desktop mặc định */
        flex-direction: column;
        justify-content: center;
        line-height: 1.2;
        cursor: pointer;
        margin-right: auto;
    }
    .delivery-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .delivery-address { 
        font-size: 13px; font-weight: 700; color: #333; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
        display: flex; align-items: center; gap: 4px;
    }
    .delivery-icon { color: #ff7a59; font-size: 14px; }

    .nav{display:flex;justify-content:center}
    .nav ul{display:flex;gap:22px;margin:0;padding:0;list-style:none}
    .nav a{text-decoration:none;color:#333;font-weight:600;white-space:nowrap}
    .nav a.active{color:#ff6b35}

    .right{display:flex;align-items:center;gap:12px;justify-content:flex-end; flex-shrink: 0;}
    
    /* Search */
    .search{display:flex;align-items:center;border:1px solid #e6e6ea;border-radius:22px;height:36px;overflow:hidden; max-width: 100%}
    .search input{border:none;outline:none;padding:0 12px;width:200px;background:#fff}
    .search button{border:none;background:#f4f4f6;height:36px;width:40px;cursor:pointer;flex-shrink:0}

    /* Icons */
    .icon-box{position:relative;display:inline-grid;place-items:center;width:36px;height:36px;border-radius:12px;
      background:#fff;box-shadow:0 6px 14px rgba(0,0,0,.08), inset 0 0 0 1px #eee;color:#333;text-decoration:none;flex-shrink:0}
    .icon-box .ico{font-size:18px;line-height:1}
    .icon-box .badge{
      position:absolute;right:-4px;top:-6px;min-width:18px;height:18px;padding:0 5px;display:grid;place-items:center;border-radius:12px;
      font-size:11px;font-weight:700;background:#ffe8e0;color:#d24c1f;border:1px solid #ffb199;box-shadow:0 2px 6px rgba(0,0,0,.15)
    }
    .mobile-home-icon { display: none; } /* Ẩn icon Home trên desktop */

    /* User */
    .user{position:relative}
    .user-btn{display:flex;align-items:center;gap:8px;border:1px solid #eee;background:#fafafa;border-radius:99px;padding:6px 12px;cursor:pointer;max-width:180px}
    .avatar{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#ff6b35;color:#fff;font-weight:800;flex-shrink:0}
    .uname{max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700}

    .dropdown{
      position:absolute;right:0;top:calc(100% + 8px);
      min-width:220px;background:#fff;border:1px solid #eee;border-radius:16px;
      box-shadow:0 12px 32px rgba(0,0,0,.12);
      overflow:hidden;padding:6px 0; z-index: 100;
    }
    .dropdown a,.dropdown button{
      display:flex;align-items:center;justify-content:center;
      width:100%;height:44px;background:none;border:none;text-decoration:none;cursor:pointer;
      color:#2b2b2b;font-size:14.5px;font-weight:700;letter-spacing:.2px;text-align:center;padding:0;
      transition:background .15s ease;
    }
    .dropdown a:hover,.dropdown button:hover{background:#f3f3f5}
    .dropdown a + a,.dropdown a + button,.dropdown button + a,.dropdown button + button{border-top:1px solid #eee}

    /* --- RESPONSIVE MOBILE --- */
    @media (max-width: 940px) { 
        .nav { display: none; } 
    }
    
    @media (max-width: 600px) {
        /* Cấu trúc Flex dạng dòng (wrap) */
        .ff-h-wrap { 
            gap: 10px 8px; /* Gap dòng 10px, gap cột 8px */
            padding: 10px 12px; 
            flex-wrap: wrap; 
        }
        
        .brand { display: none; } /* Ẩn Logo text */

        /* DÒNG 1: CÁC CÔNG CỤ (RIGHT) */
        .right { 
            flex-grow: 1; 
            width: 100%; 
            justify-content: space-between; /* Dàn đều các icon */
            gap: 8px;
            order: 1; /* Đưa lên đầu */
        }

        /* Thanh tìm kiếm giãn ra */
        .search { 
            flex-grow: 1; /* Chiếm hết khoảng trống còn lại */
            width: auto; 
            max-width: none;
            background: #f9f9f9;
        }
        .search input { display: block; width: 100%; min-width: 50px; background: transparent; } 

        /* Icon trang chủ trên mobile */
        .mobile-home-icon { display: inline-grid; } 

        /* Icon nhỏ hơn chút để vừa hàng */
        .icon-box { width: 34px; height: 34px; }

        /* User Name: Hiện nhưng ngắn */
        .user-btn { padding: 4px 8px; gap: 4px; max-width: 90px; }
        .uname { display: block; font-size: 12px; max-width: 45px; } /* Cắt chữ nếu dài */
        .user-btn span[aria-hidden] { display: none; } /* Ẩn mũi tên */

        /* DÒNG 2: DELIVERY INFO */
        .delivery-info { 
            display: flex; 
            order: 2; /* Đưa xuống dưới */
            width: 100%; /* Chiếm trọn dòng */
            max-width: none;
            margin: 0;
            padding-top: 8px;
            border-top: 1px dashed #eee; /* Đường kẻ ngăn cách nhẹ */
            flex-direction: row; /* Xếp ngang label và address */
            align-items: center;
            gap: 8px;
        }
        .delivery-label { font-size: 11px; margin-bottom: 0; white-space: nowrap;}
        .delivery-address { font-size: 13px; }
        
        .dropdown { position: fixed; top: 60px; left: 10px; right: 10px; width: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border: 1px solid #ddd; }
    }

    .dark .ff-header{background:#111;border-color:#333}
    .dark .delivery-address { color: #eee; }
    .dark .nav a{color:#ddd}.dark .nav a.active{color:#ffb199}
    .dark .search{border-color:#333}.dark .search input{background:transparent;color:#ddd}
    .dark .search button{background:#222;color:#eee}
    .dark .icon-box{background:#151515;box-shadow:0 6px 14px rgba(0,0,0,.25), inset 0 0 0 1px #333;color:#eee}
    .dark .user-btn{background:#1a1a1a;border-color:#333}
  `, []);

  useEffect(() => {
    const id = "ff-header-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  const onSearch = (e) => {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  const first = (user?.name || user?.email || "U").slice(0, 1).toUpperCase();
  
  const getUserAddress = () => {
    if (!user?.address) return "Vui lòng chọn địa chỉ";
    if (typeof user.address === 'string') return user.address;
    if (typeof user.address === 'object') {
        const { street, ward, city } = user.address;
        return [street, ward, city].filter(Boolean).join(", ");
    }
    return "Địa chỉ không hợp lệ";
  };

  const userAddress = getUserAddress();
  return (
    <header className="ff-header">
      <div className="ff-h-wrap">
        
        {/* Logo (Chỉ hiện Desktop) */}
        <Link to="/" className="brand" aria-label="FoodFast">
          <img src={logo} alt="FoodFast Logo" />
        </Link>

        {/* GIAO ĐẾN: Mobile (Dòng 2) */}
        <div className="delivery-info" onClick={() => user ? navigate('/profile') : navigate('/signin')}>
             <div className="delivery-label">Giao đến:</div>
             <div className="delivery-address">
                 <span className="delivery-icon">📍</span>
                 {userAddress} <span style={{fontSize: 10, marginLeft: 4}}>▼</span>
             </div>
        </div>

        {/* Nav center (Desktop only) */}
        <nav className="nav">
          <ul>
            <li><NavLink to="/" end className={({isActive})=>isActive?"active":""}>Trang chủ</NavLink></li>
            {user && (
              <li><NavLink to="/favorites" className={({isActive})=>isActive?"active":""}>Yêu thích</NavLink></li>
            )}
          </ul>
        </nav>

        {/* Right (Mobile: Dòng 1) */}
        <div className="right">
          
          {/* Search Bar */}
          <form className="search" onSubmit={onSearch}>
            <input placeholder="Tìm món..." value={q} onChange={(e)=>setQ(e.target.value)} />
            <button type="submit" title="Tìm kiếm">🔍</button>
          </form>

          {/* Icon Trang chủ (Mobile only) */}
          <NavLink to="/" className="icon-box mobile-home-icon" title="Trang chủ">
             <span className="ico" role="img" aria-label="home">🏠</span>
          </NavLink>

          {/* Icon Tim */}
          {user && (
            <NavLink to="/favorites" className="icon-box" title="Yêu thích">
              <span className="ico" role="img" aria-label="heart">❤️</span>
              {favCount > 0 && <span className="badge">{favCount}</span>}
            </NavLink>
          )}

          {/* Icon Giỏ hàng */}
          <NavLink to="/cart" className="icon-box" title="Giỏ hàng">
            <span className="ico" role="img" aria-label="cart">🛒</span>
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </NavLink>

          {/* User (Avatar + Tên ngắn) */}
          {!user ? (
            <NavLink to="/signin" className={({isActive})=>isActive?"active":""} style={{fontWeight:600, textDecoration:'none', color:'#333', whiteSpace:'nowrap', fontSize: 13}}>
                Đăng nhập
            </NavLink>
          ) : (
            <div className="user" ref={ddRef}>
              <button
                type="button"
                className="user-btn"
                onClick={(e)=>{e.stopPropagation(); setOpen(v=>!v);}}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <span className="avatar">{first}</span>
                <span className="uname">{user.name || user.email}</span>
                <span aria-hidden>▾</span>
              </button>
              {open && (
                <div className="dropdown" role="menu" aria-label="User menu">
                  <NavLink to="/orders" onClick={()=>setOpen(false)}>Đơn của tôi</NavLink>
                  <NavLink to="/history" onClick={()=>setOpen(false)}>Lịch sử đơn</NavLink>
                  <NavLink to="/profile" onClick={()=>setOpen(false)}>Cài đặt</NavLink>
                  {(user.isAdmin || user.isSuperAdmin || user.isMerchant) && (
                    <NavLink to={user.isSuperAdmin ? "/admin" : "/merchant"} onClick={()=>setOpen(false)} style={{color:'#ff6b35'}}>
                       Trang quản trị
                    </NavLink>
                  )}
                  <button onClick={()=>{ signOut(); setOpen(false); navigate("/signin"); }}>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}