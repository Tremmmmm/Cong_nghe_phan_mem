// src/pages/Checkout.jsx
import { useMemo, useState, useEffect } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useNavigate } from 'react-router-dom'
import { placeOrder } from '../utils/api'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrderCtx } from '../context/OrderContext.jsx'
import { calcDiscount, normalizeCode, coupons, CODE_PATTERN } from '../utils/coupons'
import { formatVND } from '../utils/format'
import { isPhoneVN } from '../utils/validators'

function VND(n){ return formatVND(n) }

// cố định mode giao & thanh toán
const DELIVERY_MODE = 'DRONE'
const PAYMENT_METHOD = 'COD'

// key lưu địa chỉ gần đây
const REC_ADDR_KEY = 'ff_recent_addresses'

export default function Checkout(){
  const { user, updateUser } = useAuth()
  const { items, clear } = useCart()
  const { show } = useToast()
  const nav = useNavigate()
  const { ensureSession, markOrderAsCurrent } = useOrderCtx()

  const subtotal = useMemo(
    () => items.reduce((s,i)=> s + (i.price||0)*(i.qty||0), 0),
    [items]
  )

  // Prefill từ user hoặc localStorage
  const [name, setName] = useState(user?.name ?? localStorage.getItem('lastName') ?? '')
  const [phone, setPhone] = useState(user?.phone ?? localStorage.getItem('lastPhone') ?? '')
  const [address, setAddress] = useState(user?.address ?? localStorage.getItem('lastAddress') ?? '')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCode, setAppliedCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [saveAsDefault, setSaveAsDefault] = useState(true)

  // địa chỉ gần đây
  const [recentAddr, setRecentAddr] = useState(() => {
    try { return JSON.parse(localStorage.getItem(REC_ADDR_KEY) || '[]') || [] }
    catch { return [] }
  })

  // nếu user cập nhật sau, mà ô đang trống thì tự điền
  useEffect(() => {
    if (!user) return
    if (!name && user.name) setName(user.name)
    if (!phone && user.phone) setPhone(user.phone)
    if (!address && user.address) setAddress(user.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // dropdown gợi ý
  const [suggOpen, setSuggOpen] = useState(false)
  const [suggIndex, setSuggIndex] = useState(-1)

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState('idle')

  // === Phí ship cố định cho Drone
  const shippingFee = useMemo(() => 20000, [])

  // === Miễn phí ship khi dùng FREESHIP
  const isFreeShip = appliedCode === 'FREESHIP'
  const shippingDiscount = isFreeShip ? shippingFee : 0

  // === Tổng thanh toán
  const finalTotal = Math.max(0, subtotal - discount + shippingFee - shippingDiscount)

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
    if (!appliedCode) { setDiscount(0); return }
    if (appliedCode === 'FREESHIP') { setDiscount(0); return }
    setDiscount(calcDiscount(appliedCode, subtotal))
  }, [subtotal, appliedCode])

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Vui lòng nhập họ tên'
    if (!isPhoneVN((phone||'').trim())) e.phone = 'Số điện thoại không hợp lệ (VN)'
    if (!address.trim()) e.address = 'Vui lòng nhập địa chỉ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // áp mã (có thể truyền codeOverride khi chọn gợi ý)
  const onApplyCoupon = (codeOverride) => {
    const raw = codeOverride ?? couponCode
    const code = normalizeCode(raw)
    if (!code) { show('Vui lòng nhập mã khuyến mãi.', 'info'); return }
    if (!CODE_PATTERN.test(code)) { show('Mã chỉ đúng chữ & số.', 'error'); return }
    if (!Object.prototype.hasOwnProperty.call(coupons, code)) { show('Mã không tồn tại.', 'error'); return }

    const off = (code === 'FREESHIP') ? 0 : calcDiscount(code, subtotal)
    if (off <= 0 && code !== 'FREESHIP') {
      const c = coupons[code]
      if (c && subtotal < (c.min || 0)) show(`Đơn tối thiểu ${VND(c.min)} để dùng mã này.`, 'info')
      else show('Mã không còn hiệu lực hoặc không áp dụng.', 'error')
      return
    }

    setAppliedCode(code)
    setCouponCode(code)
    setDiscount(off)
    setSuggOpen(false)
    if (code === 'FREESHIP') show('Áp dụng FREESHIP: miễn phí vận chuyển.', 'success')
    else show(`Áp dụng mã ${code} thành công. Giảm ${VND(off)}.`, 'success')
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
        phone: String(phone).trim(),
        address: address.trim(),
        deliveryMode: DELIVERY_MODE,
        items: items.map(i => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          image: i.image || i.img || i.photo || ''
        })),
        total: subtotal,
        discount,
        shippingFee,
        shippingDiscount,
        finalTotal,
        couponCode: appliedCode,
        payment: PAYMENT_METHOD,
        createdAt: Date.now(),
        status: 'pending',
        payment_status: 'unpaid'
      }

      const created = await placeOrder(order)
      clear()
      setState('success')
      const oid = created?.id || order.id
      try { sessionStorage.setItem('lastOrderId', String(oid)) } catch {}
      try { sessionStorage.setItem('lastDeliveryMode', DELIVERY_MODE) } catch {}
      // nhớ thông tin người nhận cho lần sau
      try {
        localStorage.setItem('lastName', name.trim())
        localStorage.setItem('lastPhone', String(phone).trim())
        localStorage.setItem('lastAddress', address.trim())
      } catch {}

      // cập nhật hồ sơ nếu tick lưu
      if (user && saveAsDefault && typeof updateUser === 'function') {
        updateUser({ name: name.trim(), phone: String(phone).trim(), address: address.trim() })
      }

      // cập nhật "địa chỉ gần đây"
      try {
        const cur = JSON.parse(localStorage.getItem(REC_ADDR_KEY) || '[]') || []
        const norm = address.trim()
        const next = [norm, ...cur.filter(x => x && x !== norm)].slice(0, 3)
        localStorage.setItem(REC_ADDR_KEY, JSON.stringify(next))
        setRecentAddr(next)
      } catch {}

      markOrderAsCurrent(oid)
      show(`Đặt hàng thành công! Mã đơn: ${oid}`, 'success')
      nav(`/confirmation?id=${encodeURIComponent(oid)}`, { replace: true })
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

    /* Coupon suggestions */
    .coupon-row{position:relative;display:flex;gap:8px;align-items:center}
    .btn-primary{height:40px;border-radius:10px;border:none;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .btn-primary[disabled]{opacity:.6;cursor:not-allowed}
    .sugg{position:absolute;left:0;right:120px;top:44px;z-index:10;background:#fff;border:1px solid #eee;border-radius:10px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.08)}
    .sugg-item{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;cursor:pointer;color:#222}
    .sugg-item:hover,.sugg-item.active{background:#ffefe9}
    /* ép nền sáng kể cả dark mode (tránh đen thui) */
    .dark .sugg{background:#fff;border-color:#eee}
    .dark .sugg-item:hover,.dark .sugg-item.active{background:#ffefe9}

    .sugg-code{font-weight:800}
    .sugg-meta{font-size:12px;opacity:.8}
    .sugg-min{font-size:12px;opacity:.7}

    .radio-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    .chip{display:inline-flex;gap:8px;align-items:center;border:1px solid #e6e6ea;padding:8px 12px;border-radius:999px;cursor:pointer}
    .chip input{accent-color:#ff7a59}
    .muted{opacity:.75}

    /* địa chỉ gần đây */
    .addr-recent{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center}
    .chip-sm{padding:4px 10px;border-radius:999px}
    .addr-chip{background:#fafafa;border:1px solid #e6e6ea}
    .addr-chip:hover{background:#ffefe9}
    .dark .addr-chip{background:#222;border-color:#444;color:#eee}
  `

  const codeNormalized = normalizeCode(couponCode)
  const formatOK = !!codeNormalized && CODE_PATTERN.test(codeNormalized)
  const exists = formatOK && Object.prototype.hasOwnProperty.call(coupons, codeNormalized)
  const minOk = exists ? (subtotal >= (coupons[codeNormalized].min || 0)) : false

  // Bật nút khi mã hợp lệ & tồn tại (không cần đủ min ở bước này)
  const canApply = !appliedCode && formatOK && exists

  const all = Object.entries(coupons).map(([code, info]) => ({ code, ...info }))
  const qRaw = normalizeCode(couponCode)
  const q = qRaw.replace(/[^A-Z0-9]/g, '')
  const eligible = all.filter(x => (subtotal >= (x.min || 0)))
  const suggestions = eligible
    .filter(x => {
      if (!q) return true
      const inCode = x.code.includes(q)
      const inLabel = (x.label || '').toUpperCase().includes(q)
      return inCode || inLabel
    })
    .sort((a,b)=> (a.min||0) - (b.min||0))

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
        // Chọn gợi ý -> chỉ gán vào input, không auto-apply
        e.preventDefault()
        const pick = suggestions[suggIndex]
        setCouponCode(pick.code)
        setSuggOpen(false)
        setSuggIndex(-1)
      }
    } else if (e.key === 'Escape') {
      setSuggOpen(false)
    }
  }

  const onPickSuggestion = (code) => {
    // Chỉ điền mã + đóng dropdown, để người dùng bấm "Áp dụng"
    setCouponCode(code)
    setSuggOpen(false)
    setSuggIndex(-1)
  }

  // hiển thị “Khuyến mãi” chỉ khi mã giảm tiền (không phải FREESHIP)
  const showDiscountLine = appliedCode && appliedCode !== 'FREESHIP' && discount > 0

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
            <input className="inp" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} />
            {errors.name && <span className="err">{errors.name}</span>}
          </div>

          <div className="field">
            <label>Số điện thoại</label>
            <input className="inp" type="tel" autoComplete="tel" placeholder="0xxxxxxxxx" value={phone} onChange={e=>setPhone(e.target.value)} />
            {errors.phone && <span className="err">{errors.phone}</span>}
          </div>

          <div className="field">
            <label>Địa chỉ</label>
            <input className="inp" autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)} />
            {errors.address && <span className="err">{errors.address}</span>}

            {/* địa chỉ gần đây */}
            {recentAddr.length > 0 && (
              <div className="addr-recent">
                <span className="muted" style={{marginRight:6}}>Gần đây:</span>
                {recentAddr.map((a, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="chip chip-sm addr-chip"
                    onClick={()=>setAddress(a)}
                    title={a}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

            {/* Checkbox lưu mặc định */}
            <label style={{display:'flex',gap:8,alignItems:'center',marginTop:6,fontSize:13,opacity:.9}}>
              <input type="checkbox" checked={saveAsDefault} onChange={e=>setSaveAsDefault(e.target.checked)} />
              Lưu thông tin nhận hàng (tên, SĐT, địa chỉ)
            </label>
          </div>

          {/* Phương thức giao hàng (cố định: Drone) */}
          <div className="field">
            <label>Phương thức giao hàng</label>
            <div className="chip" title="Giao nhanh bằng drone (cố định)">
              <input type="radio" checked readOnly />
              Drone <span className="muted">~20–30′</span>
            </div>
          </div>

          {/* Phương thức thanh toán (cố định: COD) */}
          <div className="field">
            <label>Phương thức thanh toán</label>
            <div className="chip" title="Thanh toán khi nhận hàng (cố định)">
              <input type="radio" checked readOnly />
              Thanh toán khi nhận hàng (COD)
            </div>
          </div>

          <div className="field">
            <label>Mã khuyến mãi</label>
            <div className="coupon-row">
              <input
                className="inp"
                placeholder="VD: FF10 / SAVE50K / FREESHIP"
                value={couponCode}
                onFocus={()=>{ setSuggOpen(true); setSuggIndex(-1); }}
                onBlur={()=> setTimeout(()=>setSuggOpen(false), 120)}
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
                  !codeNormalized ? 'Nhập/Chọn một mã để áp dụng'
                  : (!formatOK ? 'Mã chỉ gồm chữ & số'
                  : (!exists ? 'Mã không tồn tại' : ''))}
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

          {/* Khuyến mãi chỉ hiện khi không phải FREESHIP */}
          {appliedCode && appliedCode !== 'FREESHIP' && discount > 0 && (
            <div className="row">
              <span>Khuyến mãi ({appliedCode})</span>
              <span>-{VND(discount)}</span>
            </div>
          )}

          <div className="row"><span>Giao hàng</span><span>Drone (nhanh)</span></div>

          <div className="row">
            <span>
              Vận chuyển
              {isFreeShip && (
                <span className="badge" style={{
                  fontSize:12,padding:'2px 8px',borderRadius:999,marginLeft:8,
                  background:'#ffefe9',fontWeight:800
                }}>FREESHIP</span>
              )}
            </span>
            <span>
              {isFreeShip ? (
                <>
                  <span style={{marginRight:8}}><s>{VND(shippingFee)}</s></span>
                  <strong>{VND(0)}</strong>
                </>
              ) : VND(shippingFee)}
            </span>
          </div>

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
