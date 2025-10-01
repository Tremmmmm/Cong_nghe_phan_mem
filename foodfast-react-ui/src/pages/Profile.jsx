// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const LS_PROFILE = 'ff_profile_v1' // lưu theo email
const PHONE_VN = /^0\d{9,10}$/;

export default function Profile() {
  const { user } = useAuth()
  const { show } = useToast()
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  useEffect(() => {
    if (!user?.email) return
    try {
      const all = JSON.parse(localStorage.getItem(LS_PROFILE)) || {}
      const pf = all[user.email] || {}
      setAddress(pf.address || '')
      setPhone(pf.phone || '')
    } catch {}
  }, [user?.email])

  const savePart = (part) => {
    if (!user?.email) return
    const all = JSON.parse(localStorage.getItem(LS_PROFILE) || '{}')
    const cur = all[user.email] || {}
    const next = { ...cur, ...part }
    all[user.email] = next
    localStorage.setItem(LS_PROFILE, JSON.stringify(all))
  }

  const updateAddress = () => {
    if (!address.trim()) return show('Vui lòng nhập địa chỉ', 'error')
    savePart({ address })
    show('Đã cập nhật địa chỉ')
  }

  const updatePhone = () => {
    const s = (phone || '').trim()
    if (!PHONE_VN.test(s)) return show('Số điện thoại không hợp lệ (bắt đầu bằng 0, 10–11 số)', 'error')
    savePart({ phone: s })
    show('Đã cập nhật số điện thoại')
  }

  const updatePassword = () => {
    if (!newPw || newPw.length < 6) return show('Mật khẩu mới tối thiểu 6 ký tự', 'error')
    if (newPw !== confirmPw) return show('Mật khẩu nhập lại chưa khớp', 'error')
    // demo: không có backend, chỉ mock OK
    show('Đổi mật khẩu thành công')
    setOldPw(''); setNewPw(''); setConfirmPw('')
  }

  const clearProfile = () => {
    if (!user?.email) return
    const all = JSON.parse(localStorage.getItem(LS_PROFILE) || '{}')
    delete all[user.email]
    localStorage.setItem(LS_PROFILE, JSON.stringify(all))
    setAddress(''); setPhone('')
    show('Đã xoá dữ liệu hồ sơ cục bộ')
  }

  const css = useMemo(() => `
    .pf-wrap{max-width:1080px;margin:24px auto;padding:0 16px; box-sizing:border-box}
    .pf-grid{display:grid;grid-template-columns:repeat(3, minmax(280px,1fr));gap:16px;align-items:start}
    .pf-card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px;overflow:hidden; box-sizing:border-box}
    .pf-title{font-size:18px;font-weight:900;margin:0 0 10px}
    .pf-input{width:100%;height:40px;border:1px solid #e6e6ea;border-radius:10px;padding:0 12px;outline:none;margin-bottom:10px; box-sizing:border-box}
    .pf-btn{height:40px;border:none;border-radius:20px;background:#ff7a59;color:#fff;font-weight:800;cursor:pointer;padding:0 18px}
    .pf-actions{display:flex;gap:8px;flex-wrap:wrap}
    .pf-btn.ghost{background:#fff; color:#333; border:1px solid #e6e6ea}
    .dark .pf-card{background:#151515;border-color:#333}
    .dark .pf-input{background:#111;color:#eee;border-color:#333}
    .dark .pf-btn.ghost{background:#111;color:#eee;border-color:#333}
    @media (max-width:980px){ .pf-grid{grid-template-columns:repeat(2, minmax(260px,1fr));} }
    @media (max-width:640px){ .pf-grid{grid-template-columns:1fr;} }
  `, [])

  return (
    <section className="pf-wrap">
      <style>{css}</style>
      <h2 style={{margin:'0 0 14px'}}>Cài đặt tài khoản</h2>

      <div className="pf-grid">
        {/* Địa chỉ */}
        <div className="pf-card">
          <div className="pf-title">Cập nhật địa chỉ</div>
          <input
            className="pf-input"
            value={address}
            onChange={e=>setAddress(e.target.value)}
            placeholder="Nhập địa chỉ mới của bạn"
          />
          <div className="pf-actions">
            <button className="pf-btn" onClick={updateAddress}>Lưu địa chỉ</button>
            <button className="pf-btn ghost" onClick={()=>setAddress('')}>Xoá ô</button>
          </div>
        </div>

        {/* Liên hệ */}
        <div className="pf-card">
          <div className="pf-title">Thông tin liên hệ</div>
          <input
            className="pf-input"
            value={phone}
            onChange={e=>setPhone(e.target.value)}
            placeholder="Nhập số điện thoại mới"
            inputMode="tel"
          />
          <div className="pf-actions">
            <button className="pf-btn" onClick={updatePhone}>Lưu số điện thoại</button>
            <button className="pf-btn ghost" onClick={()=>setPhone('')}>Xoá ô</button>
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

      {/* Hành động phụ trợ */}
      <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
        <button className="pf-btn ghost" onClick={clearProfile}>Xoá dữ liệu hồ sơ (cục bộ)</button>
      </div>
    </section>
  )
}
