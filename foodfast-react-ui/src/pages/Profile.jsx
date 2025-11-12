import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isPhoneVN } from '../utils/validators';

const LS_PROFILE = 'ff_profile_v1';     // lưu theo email (cục bộ)
const LS_ACC_IDX = 'ff_account_idx_v1'; // index usernameLower -> email

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { show } = useToast();

  // form tổng hợp
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // đổi mật khẩu (demo)
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [errors, setErrors] = useState({});

  // Prefill: ưu tiên LS_PROFILE, fallback user context
  useEffect(() => {
    const uEmail = user?.email || '';
    if (!uEmail) return;
    try {
      const all = JSON.parse(localStorage.getItem(LS_PROFILE) || '{}');
      const pf = all[uEmail] || {};
      setName(pf.name ?? user?.name ?? '');
      setAddress(pf.address ?? user?.address ?? '');
      setEmail(uEmail);
      setPhone(pf.phone ?? user?.phone ?? '');
    } catch {
      setName(user?.name ?? '');
      setAddress(user?.address ?? '');
      setEmail(uEmail);
      setPhone(user?.phone ?? '');
    }
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const css = useMemo(() => `
    .pf-wrap{max-width:1080px;margin:24px auto;padding:0 16px; box-sizing:border-box}
    .pf-grid{display:grid;grid-template-columns:repeat(2, minmax(300px,1fr));gap:16px;align-items:start}
    .pf-card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px;overflow:hidden; box-sizing:border-box}
    .pf-title{font-size:18px;font-weight:900;margin:0 0 10px}
    .pf-input{width:100%;height:40px;border:1px solid #e6e6ea;border-radius:10px;padding:0 12px;outline:none;margin-bottom:6px; box-sizing:border-box}
    .pf-err{color:#c24a26;font-size:12px;margin:0 0 8px}
    .pf-btn{height:40px;border:none;border-radius:20px;background:#ff7a59;color:#fff;font-weight:800;cursor:pointer;padding:0 18px}
    .pf-actions{display:flex;gap:8px;flex-wrap:wrap}
    .pf-btn.ghost{background:#fff; color:#333; border:1px solid #e6e6ea}
    .dark .pf-card{background:#151515;border-color:#333}
    .dark .pf-input{background:#111;color:#eee;border-color:#333}
    .dark .pf-btn.ghost{background:#111;color:#eee;border-color:#333}
    @media (max-width:980px){ .pf-grid{grid-template-columns:1fr;} }
  `, []);

  // validate email cơ bản
  const isEmail = (s) => /\S+@\S+\.\S+/.test(String(s||'').trim());

  const onSaveProfile = () => {
    const es = {};
    if (!name.trim()) es.name = 'Vui lòng nhập họ và tên';
    if (!email.trim()) es.email = 'Vui lòng nhập email';
    else if (!isEmail(email)) es.email = 'Email không hợp lệ';
    if (phone && !isPhoneVN(phone)) es.phone = 'Số điện thoại không hợp lệ (VN)';
    if (!address.trim()) es.address = 'Vui lòng nhập địa chỉ';
    setErrors(es);
    if (Object.keys(es).length) return;

    // cập nhật vào AuthContext (để toàn app phản ánh ngay)
    if (typeof updateUser === 'function') {
      updateUser({ name: name.trim(), email: email.trim(), phone: String(phone || '').trim(), address: address.trim() });
    }

    // lưu bản cục bộ theo email, migrate key nếu đổi email
    try {
      const all = JSON.parse(localStorage.getItem(LS_PROFILE) || '{}');
      const oldKey = user?.email || email.trim();
      if (oldKey && all[oldKey] && oldKey !== email.trim()) delete all[oldKey];
      all[email.trim()] = { name: name.trim(), address: address.trim(), phone: String(phone || '').trim() };
      localStorage.setItem(LS_PROFILE, JSON.stringify(all));
    } catch {}

    // ✅ cập nhật index username→email để đăng nhập bằng tên
    try {
      const idx = JSON.parse(localStorage.getItem(LS_ACC_IDX) || '{}');
      // xoá các key cũ đang trỏ tới email này (nếu có)
      Object.keys(idx).forEach(k => { if (idx[k] === email.trim()) delete idx[k] })
      idx[name.trim().toLowerCase()] = email.trim()
      localStorage.setItem(LS_ACC_IDX, JSON.stringify(idx))
    } catch {}

    show('Đã cập nhật thông tin');
  };

  const updatePassword = () => {
    if (!newPw || newPw.length < 6) return show('Mật khẩu mới tối thiểu 6 ký tự', 'error');
    if (newPw !== confirmPw) return show('Mật khẩu nhập lại chưa khớp', 'error');
    // demo: không có backend, chỉ mock OK
    show('Đổi mật khẩu thành công');
    setOldPw(''); setNewPw(''); setConfirmPw('');
  };

  return (
    <section className="pf-wrap">
      <style>{css}</style>
      <h2 style={{margin:'0 0 14px'}}>Thông tin cá nhân</h2>

      <div className="pf-grid">
        {/* Cập nhật thông tin */}
        <div className="pf-card">
          <div className="pf-title">Cập nhật thông tin</div>

          <input
            className="pf-input"
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="Họ và tên"
            autoComplete="name"
          />
          {errors.name && <div className="pf-err">{errors.name}</div>}

          <input
            className="pf-input"
            value={address}
            onChange={e=>setAddress(e.target.value)}
            placeholder="Địa chỉ"
            autoComplete="street-address"
          />
          {errors.address && <div className="pf-err">{errors.address}</div>}

          <input
            className="pf-input"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="email"
          />
          {errors.email && <div className="pf-err">{errors.email}</div>}

          <input
            className="pf-input"
            value={phone}
            onChange={e=>setPhone(e.target.value)}
            onBlur={(e)=> setErrors(er=>({ ...er, phone: (!e.target.value || isPhoneVN(e.target.value)) ? null : 'Số điện thoại không hợp lệ (VN)' })) }
            placeholder="Số điện thoại"
            inputMode="tel"
            autoComplete="tel"
          />
          {errors.phone && <div className="pf-err">{errors.phone}</div>}

          <div className="pf-actions" style={{marginTop:6}}>
            <button className="pf-btn" onClick={onSaveProfile}>Cập nhật</button>
            <button className="pf-btn ghost" onClick={()=>{
              // reset về dữ liệu từ user (re-prefill)
              setName(user?.name ?? '');
              setAddress(user?.address ?? '');
              setEmail(user?.email ?? '');
              setPhone(user?.phone ?? '');
              setErrors({});
            }}>Hoàn tác</button>
          </div>
        </div>

        {/* Đổi mật khẩu */}
        <div className="pf-card">
          <div className="pf-title">Đổi mật khẩu</div>
          <input className="pf-input" value={oldPw} onChange={e=>setOldPw(e.target.value)} placeholder="Mật khẩu hiện tại" type="password"/>
          <input className="pf-input" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Mật khẩu mới" type="password"/>
          <input className="pf-input" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Nhập lại mật khẩu mới" type="password"/>
          <div className="pf-actions">
            <button className="pf-btn" onClick={updatePassword}>Cập nhật mật khẩu</button>
            <button className="pf-btn ghost" onClick={()=>{ setOldPw(''); setNewPw(''); setConfirmPw(''); }}>Xoá ô</button>
          </div>
        </div>
      </div>
    </section>
  );
}
