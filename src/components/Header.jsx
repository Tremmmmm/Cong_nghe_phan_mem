import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFav } from "../context/FavContext.jsx";

export default function Header() {
  const navigate = useNavigate();
  const { items } = useCart();
  const cartCount = items.reduce((s, it) => s + (it.qty || 0), 0);
  const { count: favCount } = useFav();
  const { user, signOut } = useAuth();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onEsc);
    return () => { window.removeEventListener("click", onClick); window.removeEventListener("keydown", onEsc); };
  }, []);

  const styles = useMemo(() => `
    .ff-header{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #eee}
    .ff-h-wrap{max-width:1140px;margin:0 auto;padding:10px 16px;display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center}
    .brand{display:flex;align-items:center;gap:8px;text-decoration:none}
    .brand span{font-weight:900;color:#ff6b35;font-size:18px;letter-spacing:.3px}

    .nav{display:flex;justify-content:center}
    .nav ul{display:flex;gap:22px;margin:0;padding:0;list-style:none}
    .nav a{text-decoration:none;color:#333;font-weight:600}
    .nav a.active{color:#ff6b35}

    .right{display:flex;align-items:center;gap:12px}
    .search{display:flex;align-items:center;border:1px solid #e6e6ea;border-radius:22px;height:36px;overflow:hidden}
    .search input{border:none;outline:none;padding:0 12px;width:260px;background:#fff}
    .search button{border:none;background:#f4f4f6;height:36px;width:40px;cursor:pointer}

    /* ICON + BADGE */
    .icon-box{position:relative;display:inline-grid;place-items:center;width:36px;height:36px;border-radius:12px;
      background:#fff;box-shadow:0 6px 14px rgba(0,0,0,.08), inset 0 0 0 1px #eee;color:#333;text-decoration:none}
    .icon-box .ico{font-size:18px;line-height:1}
    .icon-box .badge{
      position:absolute;right:-4px;top:-6px;min-width:18px;height:18px;padding:0 5px;display:grid;place-items:center;
      border-radius:12px;font-size:11px;font-weight:700;line-height:1;background:#ffe8e0;color:#d24c1f;border:1px solid #ffb199;
      box-shadow:0 2px 6px rgba(0,0,0,.15);
    }

    /* USER */
    .user{position:relative}
    .user-btn{display:flex;align-items:center;gap:8px;border:1px solid #eee;background:#fafafa;border-radius:99px;padding:6px 12px;cursor:pointer}
    .avatar{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#ff6b35;color:#fff;font-weight:800}
    .uname{max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700}

    .dropdown{position:absolute;right:0;top:calc(100% + 8px);min-width:190px;background:#fff;border:1px solid #eee;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden}
    /* Đồng bộ hoá style cho link & button để 3 dòng trông y hệt nhau */
    .dropdown a,.dropdown button{
      display:block;width:100%;padding:12px 16px;background:none;border:none;text-decoration:none;cursor:pointer;
      color:#222;text-align:left;font-weight:700;letter-spacing:.2px;font-family:inherit;
    }
    .dropdown a:hover,.dropdown button:hover{background:#f8f4f3}

    @media (max-width:940px){ .nav{display:none} .search input{width:160px} }

    /* dark */
    .dark .ff-header{background:#111;border-color:#333}
    .dark .nav a{color:#ddd}.dark .nav a.active{color:#ffb199}
    .dark .search{border-color:#333}.dark .search input{background:transparent;color:#ddd}
    .dark .search button{background:#222;color:#eee}
    .dark .icon-box{background:#151515;box-shadow:0 6px 14px rgba(0,0,0,.25), inset 0 0 0 1px #333;color:#eee}
    .dark .user-btn{background:#1a1a1a;border-color:#333}
    .dark .dropdown{background:#151515;border-color:#333}
    .dark .dropdown a,.dark .dropdown button{color:#eee}
    .dark .dropdown a:hover,.dark .dropdown button:hover{background:#222}
  `, []);

  useEffect(() => {
    const id = "ff-header-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id; s.innerHTML = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  const onSearch = (e) => {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  const first = (user?.name || user?.email || "U").slice(0,1).toUpperCase();

  return (
    <header className="ff-header">
      <div className="ff-h-wrap">
        <Link to="/" className="brand" aria-label="FoodFast">
          <span role="img" aria-label="logo">🍔</span>
          <span>FoodFast</span>
        </Link>

        <nav className="nav">
          <ul>
            <li><NavLink to="/" end className={({isActive})=>isActive?"active":""}>Home</NavLink></li>
            <li><NavLink to="/menu" className={({isActive})=>isActive?"active":""}>Menu</NavLink></li>
            <li><NavLink to="/favorites" className={({isActive})=>isActive?"active":""}>Favorites</NavLink></li>
            <li><NavLink to="/orders" className={({isActive})=>isActive?"active":""}>Orders</NavLink></li>
            <li><NavLink to="/admin" className={({isActive})=>isActive?"active":""}>Admin</NavLink></li>
          </ul>
        </nav>

        <div className="right">
          <form className="search" onSubmit={onSearch}>
            <input placeholder="Search Here..." value={q} onChange={(e)=>setQ(e.target.value)} />
            <button type="submit" title="Search">🔍</button>
          </form>

          <NavLink to="/favorites" className="icon-box" title="Favorites">
            <span className="ico" role="img" aria-label="heart">❤️</span>
            {favCount > 0 && <span className="badge">{favCount}</span>}
          </NavLink>

          <NavLink to="/cart" className="icon-box" title="Cart">
            <span className="ico" role="img" aria-label="cart">🛒</span>
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </NavLink>

          {!user ? (
            <NavLink to="/signin" className={({isActive})=>isActive?"active":""}>Sign In</NavLink>
          ) : (
            <div className="user" ref={ddRef}>
              <button type="button" className="user-btn" onClick={(e)=>{e.stopPropagation(); setOpen(v=>!v);}}>
                <span className="avatar">{first}</span>
                <span className="uname">{user.name || user.email}</span>
                <span>▾</span>
              </button>
              {open && (
                <div className="dropdown">
                  <NavLink onClick={()=>setOpen(false)} to="/history">My Orders</NavLink>
                  <NavLink onClick={()=>setOpen(false)} to="/profile">Settings</NavLink>
                  <button onClick={()=>{ signOut(); setOpen(false); navigate("/signin"); }}>Sign Out</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
