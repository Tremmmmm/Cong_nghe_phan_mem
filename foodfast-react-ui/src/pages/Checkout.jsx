import { useMemo, useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useNavigate } from 'react-router-dom'
import { placeOrder, createPayment, capturePayment } from '../utils/api'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrderCtx } from '../context/OrderContext.jsx'

function VND(n){ return (n||0).toLocaleString('vi-VN') + '₫' }
const PHONE_VN = /^0\d{9,10}$/  // 0 + 9–10 số

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
  const { ensureSession, markOrderAsCurrent } = useOrderCtx()

  const subtotal = useMemo(
    () => items.reduce((s,i)=> s + (i.price||0)*(i.qty||0), 0),
    [items]
  )

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [payment, setPayment] = useState('COD')

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState('idle') // idle | success | error

  const discount = useMemo(() => calcDiscount(subtotal, couponCode), [subtotal, couponCode])
  const finalTotal = Math.max(0, subtotal - discount)

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Vui lòng nhập họ tên'
    if (!PHONE_VN.test((phone||'').trim())) e.phone = 'Số điện thoại không hợp lệ (bắt đầu bằng 0, 10–11 số)'
    if (!address.trim()) e.address = 'Vui lòng nhập địa chỉ'
    if (!['COD','ONLINE'].includes(payment)) e.payment = 'Chọn phương thức thanh toán'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return;
    if (!items.length) return show('Giỏ hàng trống', 'error')
    if (!validate())   return show('Vui lòng kiểm tra lại các trường!', 'error')

    try {
      setLoading(true)
      setState('idle')

      // đảm bảo có session mở (PoC) — để trong try cho an toàn
      const session = await ensureSession()

      const order = {
        id: Math.random().toString(36).slice(2,6),
        sessionId: session?.id || null,
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        customerName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        items: items.map(i => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          image: i.image || i.img || i.photo || ''
        })),
        total: subtotal,
        discount,
        finalTotal,
        couponCode: (couponCode || '').trim().toUpperCase(),
        payment,
        createdAt: Date.now(),
        status: 'pending',
        payment_status: 'unpaid'
      }

      const created = await placeOrder(order)
      clear()
      setState('success')
      const oid = created?.id || order.id
      try { sessionStorage.setItem('lastOrderId', String(oid)) } catch {}
      markOrderAsCurrent(oid)

      // Payment mock: ONLINE → capture giả
      if (payment === 'ONLINE') {
        const p = await createPayment({ orderId: oid, amount: finalTotal, method: 'CARD' })
        await capturePayment(p.id)
      }

      show(`Đặt hàng thành công! Mã đơn: ${oid}`, 'success')

      // ✅ Điều hướng: lịch sử đơn + nhắc đóng session
      nav(`/orders?focus=${encodeURIComponent(oid)}&promptClose=1`, { replace: true })
    } catch (err) {
      console.error(err)
      setState('error')
      show('Đặt hàng thất bại. Vui lòng thử lại.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const css = `
    .co-wrap{max-width:900px;margin:24px auto;padding:0 16px}
    .co-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px}
    .field{display:grid;gap:6px;margin-bottom:10px}
    .inp,.sel{height:40px;border:1px solid #e6e6ea;border-radius:10px;padding:0 12px}
    .err{color:#c24a26;font-size:12px;margin-top:2px}
    .btn{height:42px;border:none;border-radius:22px;background:#ff7a59;color:#fff;font-weight:800;cursor:pointer;width:100%}
    .btn[disabled]{opacity:.6;cursor:not-allowed}
    .row{display:flex;justify-content:space-between;margin:6px 0}
    .sum{font-weight:900;font-size:18px}
    .banner{margin-bottom:10px;padding:10px;border-radius:10px;font-weight:700}
    .ok{background:#eaf7ea;border:1px solid #cce9cc;color:#2a7e2a}
    .bad{background:#fde8e8;border:1px solid #f9c7c7;color:#b80d0d}
    .dark .card{background:#151515;border-color:#333}
    .dark .inp,.dark .sel{background:#111;color:#eee;border-color:#333}
    @media (max-width:860px){ .co-grid{grid-template-columns:1fr;}}
  `

  return (
    <section className="co-wrap">
      <style>{css}</style>
      <h2>Checkout</h2>

      {state === 'success' && <div className="banner ok">✅ Đặt hàng thành công!</div>}
      {state === 'error'   && <div className="banner bad">❌ Có lỗi khi đặt hàng. Thử lại nhé.</div>}

      <div className="co-grid">
        <form className="card" onSubmit={submit} noValidate>
          <div className="field">
            <label>Họ tên</label>
            <input className="inp" value={name} onChange={e=>setName(e.target.value)} />
            {errors.name && <span className="err">{errors.name}</span>}
          </div>

          <div className="field">
            <label>Số điện thoại</label>
            <input className="inp" placeholder="0xxxxxxxxx" value={phone} onChange={e=>setPhone(e.target.value)} />
            {errors.phone && <span className="err">{errors.phone}</span>}
          </div>

          <div className="field">
            <label>Địa chỉ</label>
            <input className="inp" value={address} onChange={e=>setAddress(e.target.value)} />
            {errors.address && <span className="err">{errors.address}</span>}
          </div>

          <div className="field">
            <label>Phương thức thanh toán</label>
            <select className="sel" value={payment} onChange={e=>setPayment(e.target.value)}>
              <option value="COD">Thanh toán khi nhận hàng (COD)</option>
              <option value="ONLINE">Online (mock)</option>
            </select>
            {errors.payment && <span className="err">{errors.payment}</span>}
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

          <button className="btn" type="submit" disabled={loading || !items.length}>
            {loading ? 'Đang đặt hàng…' : 'Đặt hàng'}
          </button>
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
