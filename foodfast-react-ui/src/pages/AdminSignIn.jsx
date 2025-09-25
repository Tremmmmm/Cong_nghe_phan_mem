import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminSignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const auth = useAuth();

  // Demo cho tiện test; muốn để trống thì đổi '' là xong
  const [email, setEmail] = useState("admin@foodfast.com");
  const [pass, setPass] = useState("123456");
  const [loading, setLoading] = useState(false);

  // Nếu bị chặn bởi RequireAuth thì quay lại chỗ cũ, mặc định vào trang quản trị
  const redirectTo = location.state?.from?.pathname || "/admin/orders";

  // === COPY GIAO DIỆN từ SignIn.jsx ===
  const styles = useMemo(
    () => `
    .auth-hero{
      min-height: calc(100vh - 140px);
      display: grid; place-items: center;
      background: #f4f4f6;
      background-image: url("data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' opacity='0.2'>
          <defs>
            <pattern id='p' width='160' height='120' patternUnits='userSpaceOnUse'>
              <g fill='none' stroke='#cfcfd6' stroke-width='1.5'>
                <circle cx='20' cy='20' r='10'/>
                <circle cx='120' cy='60' r='8'/>
                <rect x='60' y='20' width='20' height='20' rx='4' />
                <path d='M20 80c18 0 18 20 36 20s18-20 36-20 18 20 36 20'/>
              </g>
            </pattern>
          </defs>
          <rect width='100%' height='100%' fill='url(%23p)'/>
        </svg>
      `)}");
    }
    .auth-card{
      width: min(680px, 92vw);
      padding: 48px 28px;
      margin: 28px 0;
      background: rgba(255,255,255,0.65);
      border: 1px solid #eee;
      border-radius: 18px;
      backdrop-filter: blur(2px);
      box-shadow: 0 10px 30px rgba(0,0,0,.06);
    }
    .auth-title{
      text-align:center; font-size:40px; font-weight:800; color:#19243a; margin: 4px 0 8px;
    }
    .zigzag{
      width: 120px; height: 12px; margin: 0 auto 26px; background:
      linear-gradient(135deg, #ffb54d 25%, transparent 25%) -6px 0/12px 12px,
      linear-gradient(225deg, #ffb54d 25%, transparent 25%) -6px 0/12px 12px,
      linear-gradient(315deg, #ffb54d 25%, transparent 25%) 0px 0/12px 12px,
      linear-gradient(45deg,  #ffb54d 25%, transparent 25%) 0px 0/12px 12px;
    }
    .form{ width:min(520px, 90%); margin:0 auto; display:grid; gap:14px; }
    .input{
      height:44px; border-radius:12px; border:1px solid #e6e6ea; padding:0 14px;
      background:#fff; outline:none; font-size:14px;
      box-shadow: inset 0 3px 6px rgba(0,0,0,.06);
    }
    .btn{
      margin: 6px auto 0;
      height:44px; min-width:140px; padding:0 18px;
      border-radius:26px; border:none; cursor:pointer; color:#fff; font-weight:700;
      background: linear-gradient(135deg, #ffa62b, #ff7a59);
      box-shadow: 0 6px 14px rgba(255,122,89,.35);
    }
    .btn[disabled]{ opacity:.6; cursor:not-allowed }
    .links{ text-align:center; margin-top:18px; color:#444; }
    .links a{ color:#ff7a59; font-weight:700; text-decoration:none }
    .footer-mini{ margin-top:36px; border-top:1px solid #eee; padding-top:18px; text-align:center; color:#777; font-size:14px; }
    .dark .auth-card{ background: rgba(24,24,28,.7); border-color:#333; }
    .dark .auth-title{ color:#f3f3f7 }
    .dark .input{ background:#111; color:#eee; border-color:#444 }
    .dark .footer-mini{ border-color:#333; color:#aaa }
    `,
    []
  );

  useEffect(() => {
    const id = "auth-style-admin";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !pass.trim()) {
      toast.show("Vui lòng nhập Email và Password", "error");
      return;
    }
    try {
      setLoading(true);
      const res = await auth.signIn({ email, password: pass });
      if (res?.user?.isAdmin) {
        toast.show("Đăng nhập admin thành công", "success");
        navigate(redirectTo, { replace: true });
      } else {
        toast.show("Tài khoản này không phải admin", "error");
      }
    } catch (err) {
      toast.show("Đăng nhập thất bại", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-hero">
      <div className="auth-card">
        <h1 className="auth-title">Admin Sign In</h1>
        <div className="zigzag" />

        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Enter your Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="links">
          Về trang chủ <Link to="/">Click Here</Link>
        </div>

        <div className="footer-mini">
          Demo: admin@foodfast.com / 123456 • Quản trị đơn hàng FoodFast
        </div>
      </div>
    </section>
  );
}
