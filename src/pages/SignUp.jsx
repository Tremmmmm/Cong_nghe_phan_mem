import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isPhoneVN } from "../utils/validators";

export default function SignUp() {
  const navigate = useNavigate();
  const toast = useToast();
  const auth = useAuth();

  // State khớp với cấu trúc db.json
  const [form, setForm] = useState({
    username: "",   // Tên đăng nhập
    name: "",       // Họ tên hiển thị
    email: "",
    phone: "",
    pass1: "",
    pass2: "",
    street: "",     // Số nhà, đường
    ward: "",       // Phường/Xã
    city: "TP. Hồ Chí Minh" // Mặc định
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // --- 1. CSS STYLES (Responsive Mobile/Desktop - Grid Layout) ---
  const styles = useMemo(() => `
    .auth-hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      padding: 20px;
      font-family: 'Segoe UI', Roboto, sans-serif;
    }

    .auth-card { 
      width: 100%; 
      max-width: 800px; /* Mở rộng chiều ngang để chứa 2 cột */
      padding: 40px; 
      background: #fff; 
      border: 1px solid #eee; 
      border-radius: 16px; 
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
    }

    .auth-header { text-align: center; margin-bottom: 30px; }
    .auth-title { font-size: 28px; font-weight: 800; color: #ee4d2d; margin-bottom: 10px; }
    .auth-subtitle { color: #666; font-size: 14px; }

    /* Grid System */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr; /* 2 cột đều nhau */
      gap: 20px;
    }
    .full-width { grid-column: span 2; } /* Ô nào muốn dài hết dòng */

    .form-group { margin-bottom: 5px; }
    .label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #444; }
    
    .input, .select { 
      width: 100%; 
      height: 42px; 
      border-radius: 8px; 
      border: 1px solid #e1e1e1; 
      padding: 0 12px; 
      background: #fff; 
      outline: none; 
      font-size: 14px; 
      transition: 0.2s; 
      box-sizing: border-box;
    }
    .input:focus, .select:focus { 
      border-color: #ff7a59; 
      box-shadow: 0 0 0 3px rgba(255,122,89,0.1); 
    }

    .err { color: #e74c3c; font-size: 12px; margin-top: 4px; font-weight: 500; }

    .btn { 
      margin-top: 20px; 
      width: 100%;
      height: 48px; 
      border-radius: 8px; 
      border: none; 
      cursor: pointer; 
      color: #fff; 
      font-weight: 700; 
      font-size: 16px; 
      background: linear-gradient(135deg, #ff8e61, #ee4d2d); 
      box-shadow: 0 4px 15px rgba(238, 77, 45, 0.3); 
      transition: opacity 0.2s; 
    }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .links { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
    .links a { color: #ee4d2d; font-weight: 700; text-decoration: none; }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .auth-card { padding: 25px 20px; }
      .form-grid { grid-template-columns: 1fr; gap: 15px; } /* Về 1 cột */
      .full-width { grid-column: span 1; }
    }
  `, []);

  useEffect(() => {
    const id = "auth-style-signup";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error khi user gõ lại
    if (errors[e.target.name]) {
        setErrors({...errors, [e.target.name]: ''});
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const { name, username, email, phone, street, ward, city, pass1, pass2 } = form;

    // --- Validate ---
    const errs = {};
    if (!name.trim()) errs.name = 'Vui lòng nhập họ tên';
    if (!username.trim()) errs.username = 'Vui lòng nhập Username';
    if (!email.trim()) errs.email = 'Vui lòng nhập email';
    if (phone && !isPhoneVN(phone)) errs.phone = 'SĐT không hợp lệ';
    if (!street.trim()) errs.street = 'Nhập số nhà/tên đường';
    if (!ward.trim()) errs.ward = 'Nhập phường/xã';
    if (!pass1) errs.pass1 = 'Nhập mật khẩu';
    if (pass1 !== pass2) errs.pass2 = 'Mật khẩu không khớp';

    setErrors(errs);
    if (Object.keys(errs).length) return;

    // --- Prepare Data chuẩn DB.JSON ---
    // User Customer: address là object { street, ward, city }
    const addressObj = {
      street: street,
      ward: ward,
      city: city
    };

    try {
      setLoading(true);
      
      // Gọi hàm signUp của AuthContext
      // Lưu ý: AuthContext cần hỗ trợ nhận object address. 
      // Nếu AuthContext của bạn chỉ nhận string, bạn cần vào đó sửa lại logic mapping.
      // Nhưng thường ta truyền payload gì nó sẽ lưu cái đó.
      await auth.signUp({ 
        username,
        name, 
        email, 
        phone, 
        address: addressObj, // Truyền object address
        password: pass1,
        role: "customer"     // Mặc định là khách hàng
      });

      toast.show("Đăng ký thành công!", "success");
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      toast.show(err.message || "Đăng ký thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-hero">
      <div className="auth-card">
        <div className="auth-header">
            <h1 className="auth-title">Đăng Ký Tài Khoản</h1>
            <p className="auth-subtitle">Trở thành thành viên để đặt món nhanh chóng</p>
        </div>
        
        <form onSubmit={submit}>
            <div className="form-grid">
                {/* Cột 1: Thông tin cá nhân */}
                <div className="form-group full-width">
                    <label className="label">Họ và tên</label>
                    <input className="input" name="name" placeholder="Ví dụ: Nguyễn Văn An" value={form.name} onChange={handleChange} />
                    {errors.name && <div className="err">{errors.name}</div>}
                </div>

                <div className="form-group">
                    <label className="label">Tên đăng nhập (Username)</label>
                    <input className="input" name="username" placeholder="user123" value={form.username} onChange={handleChange} />
                    {errors.username && <div className="err">{errors.username}</div>}
                </div>

                <div className="form-group">
                    <label className="label">Số điện thoại</label>
                    <input className="input" name="phone" type="tel" placeholder="09xxxx" value={form.phone} onChange={handleChange} />
                    {errors.phone && <div className="err">{errors.phone}</div>}
                </div>

                <div className="form-group full-width">
                    <label className="label">Email</label>
                    <input className="input" name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange} />
                    {errors.email && <div className="err">{errors.email}</div>}
                </div>

                {/* Cột 2: Mật khẩu & Địa chỉ */}
                <div className="form-group">
                    <label className="label">Mật khẩu</label>
                    <input className="input" name="pass1" type="password" value={form.pass1} onChange={handleChange} />
                    {errors.pass1 && <div className="err">{errors.pass1}</div>}
                </div>

                <div className="form-group">
                    <label className="label">Nhập lại mật khẩu</label>
                    <input className="input" name="pass2" type="password" value={form.pass2} onChange={handleChange} />
                    {errors.pass2 && <div className="err">{errors.pass2}</div>}
                </div>
                
                <div className="full-width" style={{borderTop: '1px solid #eee', margin: '10px 0'}}></div>
                <div className="full-width"><label className="label" style={{color:'#ee4d2d'}}>Địa chỉ giao hàng mặc định</label></div>

                <div className="form-group full-width">
                    <label className="label">Số nhà, Tên đường</label>
                    <input className="input" name="street" placeholder="Ví dụ: 3 Nguyễn Trãi" value={form.street} onChange={handleChange} />
                    {errors.street && <div className="err">{errors.street}</div>}
                </div>

                <div className="form-group">
                    <label className="label">Phường / Xã</label>
                    <input className="input" name="ward" placeholder="Ví dụ: Phường Chợ Quán" value={form.ward} onChange={handleChange} />
                    {errors.ward && <div className="err">{errors.ward}</div>}
                </div>

                <div className="form-group">
                    <label className="label">Thành phố</label>
                    <select className="select" name="city" value={form.city} onChange={handleChange}>
                        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option> 
                    </select>
                </div>
            </div>

            <button className="btn" type="submit" disabled={loading}>
                {loading ? "Đang xử lý..." : "Đăng Ký Ngay"}
            </button>
        </form>

        <div className="links">
          Bạn đã có tài khoản? <Link to="/signin">Đăng nhập</Link>
        </div>
      </div>
    </section>
  );
}