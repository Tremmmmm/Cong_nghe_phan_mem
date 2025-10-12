// src/pages/SignUp.jsx
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
    .auth-hero{min-height: calc(100vh - 140px); display:grid; place-items:center; background:#f4f4f6;
      background-image: url("data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' opacity='0.2'>
          <defs><pattern id='p' width='160' height='120' patternUnits='userSpaceOnUse'>
            <g fill='none' stroke='#cfcfd6' stroke-width='1.5'>
              <circle cx='20' cy='20' r='10'/>
              <circle cx='120' cy='60' r='8'/>
              <rect x='60' y='20' width='20' height='20' rx='4' />
              <path d='M20 80c18 0 18 20 36 20s18-20 36-20 18 20 36 20'/>
            </g>
          </pattern></defs>
          <rect width='100%' height='100%' fill='url(%23p)'/>
        </svg>
      `)}"); }
    .auth-card{ width:min(760px, 94vw); padding:48px 28px; margin:28px 0; background:rgba(255,255,255,.65); border:1px solid #eee; border-radius:18px; backdrop-filter:blur(2px); box-shadow:0 10px 30px rgba(0,0,0,.06);}
    .auth-title{ text-align:center; font-size:40px; font-weight:800; color:#19243a; margin:4px 0 8px;}
    .zigzag{ width:120px; height:12px; margin:0 auto 26px; background:
      linear-gradient(135deg, #ffb54d 25%, transparent 25%) -6px 0/12px 12px,
      linear-gradient(225deg, #ffb54d 25%, transparent 25%) -6px 0/12px 12px,
      linear-gradient(315deg, #ffb54d 25%, transparent 25%) 0px 0/12px 12px,
      linear-gradient(45deg,  #ffb54d 25%, transparent 25%) 0px 0/12px 12px;}
    .form{ width:min(560px, 92%); margin:0 auto; display:grid; gap:14px;}
    .input{ height:44px; border-radius:12px; border:1px solid #e6e6ea; padding:0 14px; background:#fff; outline:none; font-size:14px; box-shadow: inset 0 3px 6px rgba(0,0,0,.06);}
    .err{ color:#c24a26; font-size:12px; margin:-6px 2px 6px }
    .btn{ margin: 6px auto 0; height:44px; min-width:160px; padding:0 22px; border-radius:26px; border:none; cursor:pointer; color:#fff; font-weight:700;
      background: linear-gradient(135deg, #ffa62b, #ff7a59); box-shadow: 0 6px 14px rgba(255,122,89,.35);}
    .btn[disabled]{ opacity:.6; cursor:not-allowed }
    .links{ text-align:center; margin-top:18px; color:#444; }
    .links a{ color:#ff7a59; font-weight:700; text-decoration:none }
    .dark .auth-card{ background: rgba(24,24,28,.7); border-color:#333; }
    .dark .auth-title{ color:#f3f3f7 }
    .dark .input{ background:#111; color:#eee; border-color:#444 }
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
    const { name, email, phone, pass1, pass2 } = form;

    // validate tối thiểu
    const errs = {};
    if (!name) errs.name = 'Vui lòng nhập tên';
    if (!email) errs.email = 'Vui lòng nhập email';
    if (phone && !isPhoneVN(phone)) errs.phone = 'Số điện thoại không hợp lệ (VN)';
    if (!pass1) errs.pass1 = 'Nhập mật khẩu';
    if (!pass2) errs.pass2 = 'Nhập lại mật khẩu';
    if (pass1 && pass2 && pass1 !== pass2) errs.pass2 = 'Mật khẩu nhập lại không khớp';

    setErrors(errs);
    if (Object.keys(errs).length) {
      return; // dừng nếu có lỗi
    }

    try {
      setLoading(true);
      // map đúng API của AuthContext bạn: signUp({ name, email, phone, password })
      await auth.signUp({ name, email, phone, password: pass1 });
      toast.show("Đăng ký thành công", "success");
      navigate("/", { replace: true });
    } catch (err) {
      toast.show("Đăng ký thất bại", "error");
      console.error(err);
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
          <input className="input" placeholder="Enter your Name" {...bind("name")} />
          {errors.name && <div className="err">{errors.name}</div>}

          <input className="input" placeholder="Enter your Address" {...bind("address")} />

          <input className="input" placeholder="Enter your Email ID" {...bind("email")} />
          {errors.email && <div className="err">{errors.email}</div>}

          <input className="input" placeholder="Enter your Mobile number" inputMode="tel" {...bind("phone", {
            onBlur: (e) => setErrors(er => ({ ...er, phone: (!e.target.value || isPhoneVN(e.target.value)) ? null : 'Số điện thoại không hợp lệ (VN)' }))
          })} />
          {errors.phone && <div className="err">{errors.phone}</div>}

          <input className="input" type="password" placeholder="Enter your Password" {...bind("pass1")} />
          {errors.pass1 && <div className="err">{errors.pass1}</div>}

          <input className="input" type="password" placeholder="Re-Enter your Password" {...bind("pass2")} />
          {errors.pass2 && <div className="err">{errors.pass2}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        <div className="links">
          Already Registered <Link to="/signin">Click Here</Link>
        </div>
      </div>
    </section>
  );
}
