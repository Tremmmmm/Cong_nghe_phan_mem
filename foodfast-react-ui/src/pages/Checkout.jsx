// src/pages/Checkout.jsx
import { useMemo, useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useNavigate } from 'react-router-dom'
import { placeOrder } from '../utils/api'
import { useAuth } from '../context/AuthContext.jsx'

function VND(n){ return (n||0).toLocaleString('vi-VN') + '₫' }

// Quy tắc mã giảm giá (demo)
function calcDiscount(subtotal, code){
  const c = (code||'').trim().toUpperCase()
  if (!c) return 0
  if (c === 'SAVE50K') return Math.min(50000, subtotal)
  if (c === 'SALE10')  return Math.min(Math.round(subtotal*0.10), 100000)
  if (c === 'FREESHIP') return Math.min(15000, subtotal)
  return 0
}

export default function Checkout(){
  const { user } = useAuth()
  const { items, clear } = useCart()
  const { show } = useToast()
  const nav = useNavigate()

  const subtotal = useMemo(
    () => items.reduce((s,i)=> s + (i.price||0)*(i.qty||0), 0),
    [items]
  )

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [couponCode, setCouponCode] = useState('')

  const discount = useMemo(() => calcDiscount(subtotal, couponCode), [subtotal, couponCode])
  const finalTotal = Math.max(0, subtotal - discount)

  const submit = async (e) => {
    e.preventDefault()
    if (!items.length) return show('Giỏ hàng trống', 'error')
    if (!name || !phone || !address) return show('Điền đủ thông tin giao hàng', 'error')

    const order = {
      // có thể bỏ id này để json-server tự sinh nếu bạn muốn
      id: Math.random().toString(36).slice(2,6),

      // thông tin user để lọc đơn
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,

      // thông tin giao hàng
      customerName: name,
      phone,
      address,

      // LƯU KÈM ẢNH MÓN (image/img/photo nếu có)
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        image: i.image || i.img || i.photo || ''  // <— thêm ảnh
      })),

      // tiền
      total: subtotal,
      discount,
      finalTotal,
      couponCode: (couponCode || '').trim().toUpperCase(),

      // khác
      createdAt: Date.now(),
      status: 'new'
    }

    await placeOrder(order)    // POST lên /orders
    clear()
    show('Đặt hàng thành công!')
    nav('/confirmation', { replace: true })
  }

  const css = `
    .co-wrap{max-width:900px;margin:24px auto;padding:0 16px}
    .co-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px}
    .field{display:grid;gap:8px;margin-bottom:10px}
    .inp{height:40px;border:1px solid #e6e6ea;border-radius:10px;padding:0 12px}
    .btn{height:42px;border:none;border-radius:22px;background:#ff7a59;color:#fff;font-weight:800;cursor:pointer;width:100%}
    .row{display:flex;justify-content:space-between;margin:6px 0}
    .sum{font-weight:900;font-size:18px}
    .dark .card{background:#151515;border-color:#333}
    .dark .inp{background:#111;color:#eee;border-color:#333}
    @media (max-width:860px){ .co-grid{grid-template-columns:1fr;}}
  `

  return (
    <section className="co-wrap">
      <style>{css}</style>
      <h2>Checkout</h2>
      <div className="co-grid">
        <form className="card" onSubmit={submit}>
          <div className="field">
            <label>Họ tên</label>
            <input className="inp" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Số điện thoại</label>
            <input className="inp" value={phone} onChange={e=>setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Địa chỉ</label>
            <input className="inp" value={address} onChange={e=>setAddress(e.target.value)} />
          </div>
          <div className="field">
            <label>Mã khuyến mãi</label>
            <input
              className="inp"
              placeholder="VD: SAVE50K / SALE10 / FREESHIP"
              value={couponCode}
              onChange={e=>setCouponCode(e.target.value)}
            />
          </div>
          <button className="btn" type="submit">Đặt hàng</button>
        </form>

        <div className="card">
          <h3>Tóm tắt đơn</h3>
          <div className="row"><span>Tạm tính</span><span>{VND(subtotal)}</span></div>
          <div className="row"><span>Khuyến mãi</span><span>-{VND(discount)}</span></div>
          <div className="row sum"><span>Thanh toán</span><span>{VND(finalTotal)}</span></div>
          <hr/>
          {items.map((i)=>(
            <div key={i.id} className="row">
              <span>{i.name} ×{i.qty}</span>
              <span>{VND((i.price||0)*(i.qty||0))}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
