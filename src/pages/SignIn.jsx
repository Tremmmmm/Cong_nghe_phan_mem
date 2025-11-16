import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const auth = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/";

  const styles = useMemo(
    () => `
    /* Layout căn giữa toàn màn hình */
    .auth-hero { 
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background: #fff; /* Nền trắng sạch sẽ */
      padding: 20px;
    }

    /* Thẻ Card bo tròn */
    .auth-card { 
      width: 100%; 
      max-width: 420px; /* Form gọn gàng */
      padding: 40px 30px; 
      background: #fff; 
      
      /* Tạo hiệu ứng khung nổi */
      border: 1px solid #eee; 
      border-radius: 24px; /* Bo tròn nhiều như hình */
      box-shadow: 0 10px 40px rgba(0,0,0,0.08); /* Đổ bóng mềm mại */
    }

    /* Mobile Optimization */
    @media (max-width: 600px) {
      .auth-hero {
         align-items: flex-start; /* Đẩy lên trên một chút */
         padding-top: 60px;
      }
      /* Trên mobile vẫn giữ khung bo tròn nhưng margin nhỏ lại */
      .auth-card {
         box-shadow: 0 5px 20px rgba(0,0,0,0.05);
      }
    }

    .auth-title { text-align: center; font-size: 32px; font-weight: 800; color: #19243a; margin-bottom: 10px; }
    
    .zigzag { 
      width: 80px; height: 10px; margin: 0 auto 30px; 
      background: linear-gradient(135deg,#ffb54d 25%,transparent 25%) -5px 0/10px 10px, 
                  linear-gradient(225deg,#ffb54d 25%,transparent 25%) -5px 0/10px 10px, 
                  linear-gradient(315deg,#ffb54d 25%,transparent 25%) 0px 0/10px 10px, 
                  linear-gradient(45deg, #ffb54d 25%,transparent 25%) 0px 0/10px 10px; 
      opacity: 0.8;
    }

    .form { display: grid; gap: 16px; }
    
    .input { 
      height: 48px; 
      border-radius: 12px; 
      border: 1px solid #e1e1e1; 
      padding: 0 16px; 
      background: #fff; 
      outline: none; 
      font-size: 15px; 
      transition: 0.2s;
    }
    .input:focus {
      border-color: #ff7a59;
      box-shadow: 0 0 0 4px rgba(255,122,89,0.1);
    }

    .btn { 
      margin-top: 12px; 
      height: 48px; 
      border-radius: 24px; 
      border: none; 
      cursor: pointer; 
      color: #fff; 
      font-weight: 700; 
      font-size: 16px;
      background: linear-gradient(135deg,#ff8e61,#ff7a59); 
      box-shadow: 0 8px 20px rgba(255,122,89,0.3);
      transition: transform 0.2s;
    }
    .btn:active { transform: scale(0.98); }
    .btn[disabled] { opacity: 0.6; cursor: not-allowed; }

    .links { text-align: center; margin-top: 24px; font-size: 14px; color: #666; }
    .links a { color: #ff7a59; font-weight: 700; text-decoration: none; }
    
    .dark .auth-hero, .dark .auth-card { background: #111; border-color: #333; }
    .dark .auth-title { color: #eee; }
    .dark .input { background: #222; border-color: #444; color: #fff; }
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
      const result = await auth.login({ email: username, password });
      const user = result.user;

      toast.show(`Chào mừng, ${user.name || user.username || "bạn"}!`, "success");

      if (user.role === "SuperAdmin") {
        navigate("/admin", { replace: true });
      } else if (user.role === "Merchant") {
        navigate("/merchant", { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      toast.show(err.message || "Đăng nhập thất bại. Sai thông tin.", "error");
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
          <input className="input" placeholder="Username hoặc Email" value={username} onChange={(e) => setUsername(e.target.value)} name="username" />
          <input className="input" type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} name="password" />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <div className="links">
          Chưa có tài khoản? <Link to="/signup">Đăng ký ngay</Link>
        </div>
        
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#999" }}>
          (Demo: <b>svadmin</b>/123, <b>resadmin</b>/123)
        </div>
      </div>
    </section>
  );
}