// src/pages/Profile.jsx
// PHIÊN BẢN WEB - ĐÃ CẬP NHẬT CẤU TRÚC ĐỊA CHỈ

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isPhoneVN } from '../utils/validators';

const LS_PROFILE = 'ff_profile_v1';
const LS_ACC_IDX = 'ff_account_idx_v1';

// 💡 Cấu trúc địa chỉ mặc định
const defaultAddress = { street: '', ward: '', city: 'TP. Hồ Chí Minh' };

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { show } = useToast();

  const [name, setName] = useState('');
  // 💡 SỬA 1: Thay đổi state 'address' thành object
  const [address, setAddress] = useState(defaultAddress); 
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [errors, setErrors] = useState({});

  // 💡 SỬA 2: Cập nhật logic prefill
  useEffect(() => {
    const uEmail = user?.email || '';
    if (!uEmail) return;
    try {
      const all = JSON.parse(localStorage.getItem(LS_PROFILE) || '{}');
      const pf = all[uEmail] || {};
      setName(pf.name ?? user?.name ?? '');
      // Đảm bảo address là một object
      const userAddr = user?.address || {};
      setAddress({
        street: pf.address?.street ?? userAddr.street ?? '',
        ward: pf.address?.ward ?? userAddr.ward ?? '', // Dùng 'ward'
        city: pf.address?.city ?? userAddr.city ?? 'TP. Hồ Chí Minh',
      });
      setEmail(uEmail);
      setPhone(pf.phone ?? user?.phone ?? '');
    } catch {
      setName(user?.name ?? '');
      setAddress(user?.address || defaultAddress); // Fallback
      setEmail(uEmail);
      setPhone(user?.phone ?? '');
    }
  }, [user]); // Đã bỏ user.email để an toàn hơn

  // (CSS giữ nguyên như file của bạn)
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

  const isEmail = (s) => /\S+@\S+\.\S+/.test(String(s||'').trim());

  // 💡 SỬA 3: Helper để cập nhật address object
  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  // 💡 SỬA 4: Cập nhật logic onSaveProfile
  const onSaveProfile = () => {
    const es = {};
    if (!name.trim()) es.name = 'Vui lòng nhập họ và tên';
    if (!email.trim()) es.email = 'Vui lòng nhập email';
    else if (!isEmail(email)) es.email = 'Email không hợp lệ';
    if (phone && !isPhoneVN(phone)) es.phone = 'Số điện thoại không hợp lệ (VN)';
    
    // Validate 3 trường address mới
    if (!address.street.trim()) es.address_street = 'Vui lòng nhập Số nhà, Tên đường';
    if (!address.ward.trim()) es.address_ward = 'Vui lòng nhập Phường';
    if (!address.city.trim()) es.address_city = 'Vui lòng nhập Thành phố';

    setErrors(es);
    if (Object.keys(es).length) return;

    // Chuẩn bị payload mới
    const cleanAddress = {
        street: address.street.trim(),
        ward: address.ward.trim(),
        city: address.city.trim(),
    };
    const payload = { 
        name: name.trim(), 
        email: email.trim(), 
        phone: String(phone || '').trim(), 
        address: cleanAddress // Gửi đi object
    };

    if (typeof updateUser === 'function') {
      updateUser(payload);
    }

    // (Logic lưu localStorage giữ nguyên, nhưng giờ sẽ lưu object address)
    try {
      const all = JSON.parse(localStorage.getItem(LS_PROFILE) || '{}');
      const oldKey = user?.email || email.trim();
      if (oldKey && all[oldKey] && oldKey !== email.trim()) delete all[oldKey];
      
      // Chỉ lưu các trường profile, không lưu email
      all[email.trim()] = { 
          name: payload.name, 
          address: payload.address, 
          phone: payload.phone 
      };
      localStorage.setItem(LS_PROFILE, JSON.stringify(all));
    } catch {}

    // (Logic lưu index username giữ nguyên)
    try {
      const idx = JSON.parse(localStorage.getItem(LS_ACC_IDX) || '{}');
      Object.keys(idx).forEach(k => { if (idx[k] === email.trim()) delete idx[k] })
      idx[name.trim().toLowerCase()] = email.trim()
      localStorage.setItem(LS_ACC_IDX, JSON.stringify(idx))
    } catch {}

    show('Đã cập nhật thông tin');
  };

  const updatePassword = () => {
    // (Logic đổi mật khẩu giữ nguyên)
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

          {/* 💡 SỬA 5: Thay 1 input address bằng 3 input */}
          <input
            className="pf-input"
            value={address.street}
            onChange={e => handleAddressChange('street', e.target.value)}
            placeholder="Số nhà, Tên đường"
            autoComplete="street-address"
          />
          {errors.address_street && <div className="pf-err">{errors.address_street}</div>}

          <input
            className="pf-input"
            value={address.ward}
            onChange={e => handleAddressChange('ward', e.target.value)}
            placeholder="Phường"
            autoComplete="address-level3" 
          />
          {errors.address_ward && <div className="pf-err">{errors.address_ward}</div>}

          <input
            className="pf-input"
            value={address.city}
            onChange={e => handleAddressChange('city', e.target.value)}
            placeholder="Thành phố (VD: TP. Hồ Chí Minh)"
            autoComplete="address-level2"
          />
          {errors.address_city && <div className="pf-err">{errors.address_city}</div>}
          {/* --- Kết thúc thay đổi --- */}

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
              // 💡 SỬA 6: Cập nhật logic Hoàn tác
              setName(user?.name ?? '');
              setAddress(user?.address || defaultAddress);
              setEmail(user?.email ?? '');
              setPhone(user?.phone ?? '');
              setErrors({});
            }}>Hoàn tác</button>
          </div>
        </div>

        {/* Đổi mật khẩu (Giữ nguyên) */}
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