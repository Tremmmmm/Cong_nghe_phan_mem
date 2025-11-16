import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isPhoneVN } from "../utils/validators";

export default function SignUp() {
  const navigate = useNavigate();
  const toast = useToast();
  const auth = useAuth();

  const [form, setForm] = useState({
    name: "", address: "", email: "", phone: "", pass1: "", pass2: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const styles = useMemo(
    () => `
    .auth-hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      padding: 20px;
    }

    .auth-card { 
      width: 100%; 
      max-width: 480px; 
      padding: 40px 30px; 
      background: #fff; 
      
      /* Khung bo tròn nổi bật */
      border: 1px solid #eee; 
      border-radius: 24px; 
      box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    }

    @media (max-width: 600px) {
      .auth-hero {
         align-items: flex-start;
         padding-top: 40px;
      }
      .auth-card {
         padding: 30px 20px;
      }
    }

    .auth-title { text-align: center; font-size: 32px; font-weight: 800; color: #19243a; margin-bottom: 10px; }
    .zigzag { width: 80px; height: 10px; margin: 0 auto 30px; background: linear-gradient(135deg,#ffb54d 25%,transparent 25%) -5px 0/10px 10px, linear-gradient(225deg,#ffb54d 25%,transparent 25%) -5px 0/10px 10px, linear-gradient(315deg,#ffb54d 25%,transparent 25%) 0px 0/10px 10px, linear-gradient(45deg, #ffb54d 25%,transparent 25%) 0px 0/10px 10px; opacity: 0.8; }
    .form { display: grid; gap: 14px; }
    .input { height: 46px; border-radius: 12px; border: 1px solid #e1e1e1; padding: 0 16px; background: #fff; outline: none; font-size: 14px; transition: 0.2s; }
    .input:focus { border-color: #ff7a59; box-shadow: 0 0 0 4px rgba(255,122,89,0.1); }
    .err { color: #e74c3c; font-size: 12px; margin: -8px 0 4px 4px; font-weight: 500; }
    .btn { margin-top: 16px; height: 48px; border-radius: 24px; border: none; cursor: pointer; color: #fff; font-weight: 700; font-size: 16px; background: linear-gradient(135deg, #ff8e61, #ff7a59); box-shadow: 0 8px 20px rgba(255,122,89,0.3); transition: transform 0.2s; }
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
    const id = "auth-style-signup";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  const bind = (k, extra = {}) => ({
    value: form[k],
    onChange: (e) => setForm({ ...form, [k]: e.target.value }),
    ...extra,
  });

  const submit = async (e) => {
    e.preventDefault();
    const { name, email, phone, address, pass1, pass2 } = form;

    const errs = {};
    if (!name) errs.name = 'Vui lòng nhập tên';
    if (!email) errs.email = 'Vui lòng nhập email';
    if (phone && !isPhoneVN(phone)) errs.phone = 'Số điện thoại không hợp lệ (VN)';
    if (!pass1) errs.pass1 = 'Nhập mật khẩu';
    if (!pass2) errs.pass2 = 'Nhập lại mật khẩu';
    if (pass1 && pass2 && pass1 !== pass2) errs.pass2 = 'Mật khẩu nhập lại không khớp';

    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setLoading(true);
      await auth.signUp({ name, email, phone, address, password: pass1 });
      toast.show("Đăng ký thành công", "success");
      navigate("/", { replace: true });
    } catch (err) {
      toast.show("Đăng ký thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-hero">
      <div className="auth-card">
        <h1 className="auth-title">Đăng Ký</h1>
        <div className="zigzag" />
        <form className="form" onSubmit={submit}>
          <input className="input" placeholder="Enter your Name" autoComplete="name" {...bind("name")} />
          {errors.name && <div className="err">{errors.name}</div>}
          <input className="input" placeholder="Enter your Address" autoComplete="street-address" {...bind("address")} />
          <input className="input" placeholder="Enter your Email ID" autoComplete="email" {...bind("email")} />
          {errors.email && <div className="err">{errors.email}</div>}
          <input className="input" placeholder="Enter your Mobile number" inputMode="tel" autoComplete="tel" {...bind("phone")} />
          {errors.phone && <div className="err">{errors.phone}</div>}
          <input className="input" type="password" placeholder="Enter your Password" autoComplete="new-password" {...bind("pass1")} />
          {errors.pass1 && <div className="err">{errors.pass1}</div>}
          <input className="input" type="password" placeholder="Re-Enter your Password" autoComplete="new-password" {...bind("pass2")} />
          {errors.pass2 && <div className="err">{errors.pass2}</div>}
          <button className="btn" type="submit" disabled={loading}>{loading ? "Signing Up..." : "Đăng Ký"}</button>
        </form>
        <div className="links">Already Registered <Link to="/signin">Click Here</Link></div>
      </div>
    </section>
  );
}