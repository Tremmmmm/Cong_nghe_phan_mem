import { useMemo, useState, useEffect } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useNavigate } from 'react-router-dom'
import { placeOrder, createPayment, capturePayment } from '../utils/api'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrderCtx } from '../context/OrderContext.jsx'
import { calcDiscount, normalizeCode, coupons, CODE_PATTERN } from '../utils/coupons'

function VND(n){ return (n||0).toLocaleString('vi-VN') + '₫' }
const PHONE_VN = /^0\d{9,10}$/

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
  const [appliedCode, setAppliedCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [payment, setPayment] = useState('COD')

  // dropdown gợi ý
  const [suggOpen, setSuggOpen] = useState(false)
  const [suggIndex, setSuggIndex] = useState(-1)

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState('idle')

  // auto hủy mã khi sửa input khác mã đang áp
  useEffect(() => {
    const code = normalizeCode(couponCode)
    if (appliedCode && code !== appliedCode) {
      setAppliedCode('')
      setDiscount(0)
    }
  }, [couponCode, appliedCode])

  // tính lại giảm khi subtotal / mã áp đổi
  useEffect(() => {
    if (!appliedCode) { setDiscount(0); return; }
    setDiscount(calcDiscount(appliedCode, subtotal))
  }, [subtotal, appliedCode])

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

  // áp mã (có thể truyền codeOverride khi chọn gợi ý)
  const onApplyCoupon = (codeOverride) => {
    const raw = codeOverride ?? couponCode
    const code = normalizeCode(raw)
    if (!code) { show('Vui lòng nhập mã khuyến mãi.', 'info'); return }
    if (!CODE_PATTERN.test(code)) { show('Mã không đúng định dạng (chỉ chữ & số).', 'error'); return }
    if (!Object.prototype.hasOwnProperty.call(coupons, code)) { show('Mã không tồn tại.', 'error'); return }

    const off = calcDiscount(code, subtotal)
    if (off <= 0) {
      const c = coupons[code]
      if (c && subtotal < (c.min || 0)) show(`Đơn tối thiểu ${VND(c.min)} để dùng mã này.`, 'info')
      else show('Mã không còn hiệu lực hoặc không áp dụng.', 'error')
      return
    }

    setAppliedCode(code)
    setCouponCode(code)  // đồng bộ input
    setDiscount(off)
    setSuggOpen(false)
    show(`Áp dụng mã ${code} thành công. Giảm ${VND(off)}.`, 'success')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    if (!items.length) return show('Giỏ hàng trống', 'error')
    if (!validate())   return show('Vui lòng kiểm tra lại các trường!', 'error')

    try {
      setLoading(true)
      setState('idle')

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
        couponCode: appliedCode, // chỉ lưu mã đã áp
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

      if (payment === 'ONLINE') {
        const p = await createPayment({ orderId: oid, amount: finalTotal, method: 'CARD' })
        await capturePayment(p.id)
      }

      show(`Đặt hàng thành công! Mã đơn: ${oid}`, 'success')
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
    .coupon-row{position:relative;display:flex;gap:8px;align-items:center}
    .btn-primary{height:40px;border-radius:10px;border:none;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .btn-primary[disabled]{opacity:.6;cursor:not-allowed}
    .sugg{position:absolute;left:0;right:120px;top:44px;z-index:10;background:#fff;border:1px solid #eee;border-radius:10px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.08)}
    .sugg-item{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;cursor:pointer}
    .sugg-item:hover,.sugg-item.active{background:#ffefe9}
    .sugg-code{font-weight:800}
    .sugg-meta{font-size:12px;opacity:.8}
    .sugg-min{font-size:12px;opacity:.7}
    .dark .sugg{background:#151515;border-color:#333}
    .dark .sugg-item:hover,.dark .sugg-item.active{background:#2a1c17}
  `

  // điều kiện enable nút Áp dụng cho code đang gõ
  const codeNormalized = normalizeCode(couponCode)
  const formatOK = !!codeNormalized && CODE_PATTERN.test(codeNormalized)
  const exists = formatOK && Object.prototype.hasOwnProperty.call(coupons, codeNormalized)
  const minOk = exists ? (subtotal >= (coupons[codeNormalized].min || 0)) : false
  const canApply = !appliedCode && formatOK && exists && minOk

  // ==== GỢI Ý: chỉ hiện các mã ĐỦ min; lọc theo code HOẶC label; bỏ ký tự lạ ====
  const all = Object.entries(coupons).map(([code, info]) => ({ code, ...info }))
  const qRaw = normalizeCode(couponCode)
  const q = qRaw.replace(/[^A-Z0-9]/g, '') // chỉ chữ & số; "VD: ..." => rỗng

  const eligible = all.filter(x => (subtotal >= (x.min || 0)))
  const suggestions = eligible
    .filter(x => {
      if (!q) return true
      const inCode = x.code.includes(q)
      const inLabel = (x.label || '').toUpperCase().includes(q)
      return inCode || inLabel
    })
    .sort((a,b)=> (a.min||0) - (b.min||0))

  // sự kiện bàn phím trong ô input mã
  const onCouponKeyDown = (e) => {
    if (!suggOpen || !suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSuggIndex(i => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSuggIndex(i => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      if (suggIndex >= 0) {
        e.preventDefault()
        const pick = suggestions[suggIndex]
        setCouponCode(pick.code)
        onApplyCoupon(pick.code)
      }
    } else if (e.key === 'Escape') {
      setSuggOpen(false)
    }
  }

  // click chọn gợi ý
  const onPickSuggestion = (code) => {
    setCouponCode(code)
    onApplyCoupon(code)
  }

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
            <div className="coupon-row">
              <input
                className="inp"
                placeholder="VD: FF10 / SAVE50K / FREESHIP"
                value={couponCode}
                onFocus={()=>{ setSuggOpen(true); setSuggIndex(-1); }}
                onBlur={()=> setTimeout(()=>setSuggOpen(false), 120)}  // trễ chút để kịp click
                onChange={e=>{ setCouponCode(e.target.value); setSuggOpen(true); setSuggIndex(-1); }}
                onKeyDown={onCouponKeyDown}
                style={{flex:1}}
              />

              <button
                type="button"
                className="btn-primary"
                onClick={()=>onApplyCoupon()}
                disabled={!canApply}
                title={
                  !normalizeCode(couponCode) ? 'Nhập/Chọn một mã để áp dụng'
                  : (!formatOK ? 'Mã chỉ gồm chữ và số'
                  : (!exists ? 'Mã không tồn tại'
                  : (!minOk ? `Đơn tối thiểu ${VND(coupons[codeNormalized].min)} để dùng mã này` : '')))}
              >
                Áp dụng
              </button>

              {suggOpen && suggestions.length > 0 && (
                <div className="sugg">
                  {suggestions.slice(0, 6).map((s, idx) => (
                    <div
                      key={s.code}
                      className={`sugg-item ${idx===suggIndex ? 'active':''}`}
                      onMouseEnter={()=>setSuggIndex(idx)}
                      onMouseDown={(e)=>{ e.preventDefault(); onPickSuggestion(s.code); }}
                      title={s.label}
                    >
                      <div>
                        <div className="sugg-code">{s.code}</div>
                        <div className="sugg-meta">{s.label}</div>
                      </div>
                      <div className="sugg-min">{s.min ? `≥ ${VND(s.min)}` : 'Không yêu cầu tối thiểu'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* gợi ý lỗi nhanh khi CHƯA áp mã */}
            {!appliedCode && codeNormalized && !formatOK && <span className="err">Mã chỉ gồm chữ và số.</span>}
            {!appliedCode && formatOK && !exists && <span className="err">Mã không tồn tại.</span>}
            {!appliedCode && exists && !minOk && <span className="err">Đơn tối thiểu {VND(coupons[codeNormalized].min)} để dùng mã này.</span>}
          </div>

          <button className="btn" type="submit" disabled={loading || !items.length}>
            {loading ? 'Đang đặt hàng…' : 'Đặt hàng'}
          </button>
        </form>

        <div className="card">
          <h3>Tóm tắt đơn</h3>
          <div className="row"><span>Tạm tính</span><span>{VND(subtotal)}</span></div>
          <div className="row"><span>Khuyến mãi {appliedCode ? `(${appliedCode})` : ''}</span><span>-{VND(discount)}</span></div>
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
