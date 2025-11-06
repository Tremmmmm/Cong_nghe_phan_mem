import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const auth = useAuth();

  // Đặt tên rõ ràng cho state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/";

  const styles = useMemo(
    () => `
    .auth-hero{ min-height: calc(100vh - 140px); display:grid; place-items:center; background:#f4f4f6; }
    .auth-card{ width:min(680px,92vw); padding:48px 28px; margin:28px 0; background:#fff; border:1px solid #eee; border-radius:18px; box-shadow:0 10px 30px rgba(0,0,0,.06) }
    .auth-title{ text-align:center; font-size:40px; font-weight:800; color:#19243a; margin:4px 0 8px }
    .zigzag{ width:120px; height:12px; margin:0 auto 26px; background:
      linear-gradient(135deg,#ffb54d 25%,transparent 25%) -6px 0/12px 12px,
      linear-gradient(225deg,#ffb54d 25%,transparent 25%) -6px 0/12px 12px,
      linear-gradient(315deg,#ffb54d 25%,transparent 25%) 0px 0/12px 12px,
      linear-gradient(45deg, #ffb54d 25%,transparent 25%) 0px 0/12px 12px; }
    .form{ width:min(520px,90%); margin:0 auto; display:grid; gap:14px }
    .input{ height:44px; border-radius:12px; border:1px solid #e6e6ea; padding:0 14px; background:#fff; outline:none; font-size:14px; box-shadow: inset 0 3px 6px rgba(0,0,0,.06) }
    .btn{ margin:6px auto 0; height:44px; min-width:140px; padding:0 18px; border-radius:26px; border:none; cursor:pointer; color:#fff; font-weight:700; background:linear-gradient(135deg,#ffa62b,#ff7a59); box-shadow:0 6px 14px rgba(255,122,89,.35) }
    .btn[disabled]{ opacity:.6; cursor:not-allowed }
    .links{ text-align:center; margin-top:18px; color:#444 }
    .links a{ color:#ff7a59; font-weight:700; text-decoration:none }
    `,
    []
  );

  useEffect(() => {
    const id = "auth-style-signin";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.show("Vui lòng nhập Username và Password", "error");
      return;
    }
    try {
      setLoading(true);

      // 🔧 GỌI ĐÚNG CHỮ KÝ HÀM: truyền OBJECT { email, password }
      // Ở backend JSON bạn đang dùng 'username', còn AuthContext map 'email' -> username
      const { user } = await auth.login({ email: username, password });

      toast.show(`Chào mừng, ${user.username || user.name || "user"}!`, "success");

      // Điều hướng theo role
      if (user.role === "SuperAdmin") {
        navigate("/admin/merchants");
      } else if (user.role === "Merchant") {
        const mid = user.merchantId;               // lấy merchantId từ user (db.json)
        navigate(`/admin/settingrestaurant?mid=${encodeURIComponent(mid)}`, { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      toast.show("Đăng nhập thất bại. Sai Username hoặc Password.", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-hero">
      <div className="auth-card">
        <h1 className="auth-title">Đăng Nhập</h1>
        <div className="zigzag" />
        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Enter your Username (vd: svadmin, resadmin)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            name="username"
          />
          <input
            className="input"
            type="password"
            placeholder="Password (vd: 123)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            name="password"
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Đăng nhập"}
          </button>
        </form>

        <div className="links">
          New Registration <Link to="/signup">Click Here</Link>
        </div>

        <div style={{ textAlign: "center", marginTop: 15, fontSize: 13, color: "#666" }}>
          <p>Demo accounts:</p>
          <p>Super Admin: <b>svadmin</b> / <b>123</b></p>
          <p>Merchant 1: <b>resadmin</b> / <b>123</b></p>
        </div>
      </div>
    </section>
  );
}
