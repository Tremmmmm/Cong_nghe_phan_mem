// MỚI — src/pages/Profile.jsx
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const LS_PROFILE = 'ff_profile_v1' // lưu theo email

export default function Profile() {
  const { user } = useAuth()
  const { show } = useToast()
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // load profile theo email
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
    savePart({ address })
    show('Đã cập nhật địa chỉ')
  }
  const updatePhone = () => {
    savePart({ phone })
    show('Đã cập nhật số điện thoại')
  }
  const updatePassword = () => {
    if (!newPw || newPw !== confirmPw) return show('Mật khẩu nhập lại chưa khớp', 'error')
    // demo: không có backend, chỉ mock OK
    show('Đổi mật khẩu thành công')
    setOldPw(''); setNewPw(''); setConfirmPw('')
  }

  const css = useMemo(() => `
    .pf-wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .pf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
    .pf-card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px;box-shadow:0 6px 18px rgba(0,0,0,.05)}
    .pf-title{font-size:22px;font-weight:900;margin:0 0 10px}
    .pf-input{width:100%;height:40px;border:1px solid #e6e6ea;border-radius:10px;padding:0 12px;outline:none;margin-bottom:10px}
    .pf-btn{height:40px;border:none;border-radius:20px;background:#ff7a59;color:#fff;font-weight:800;cursor:pointer;padding:0 18px}
    .dark .pf-card{background:#151515;border-color:#333}
    .dark .pf-input{background:#111;color:#eee;border-color:#333}
  `, [])

  return (
    <section className="pf-wrap">
      <style>{css}</style>
      <h2 style={{margin:'0 0 14px'}}>Settings</h2>
      <div className="pf-grid">
        <div className="pf-card">
          <div className="pf-title">Update Address</div>
          <input className="pf-input" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Enter your new address"/>
          <button className="pf-btn" onClick={updateAddress}>Update Address</button>
        </div>
        <div className="pf-card">
          <div className="pf-title">Contact Details</div>
          <input className="pf-input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Enter your new mobile number"/>
          <button className="pf-btn" onClick={updatePhone}>Update Contact Number</button>
        </div>
        <div className="pf-card">
          <div className="pf-title">Change Password</div>
          <input className="pf-input" value={oldPw} onChange={e=>setOldPw(e.target.value)} placeholder="Old Password" type="password"/>
          <input className="pf-input" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="New Password" type="password"/>
          <input className="pf-input" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Confirm Password" type="password"/>
          <button className="pf-btn" onClick={updatePassword}>Update Password</button>
        </div>
      </div>
    </section>
  )
}
