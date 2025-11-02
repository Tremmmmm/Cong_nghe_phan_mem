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
import PaymentModal from '../components/PaymentModal.jsx'

function VND(n){ return formatVND(n) }

// cố định mode giao
const DELIVERY_MODE = 'DRONE'

// ====== Toạ độ cho Drone Mission ======
const DEFAULT_RESTAURANT_LL = { lat: 10.776889, lng: 106.700806 }

// Thử parse "lat,lng" nếu người dùng dán trực tiếp
function parseLatLngFromText(text) {
  const m = String(text || '').match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/)
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[3])
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat, lng }
  }
  return null
}

// Đoán nhanh theo từ khoá quận/huyện (demo – không cần API geocode)
function guessLatLngFromAddress(addr) {
  const s = String(addr || '').toLowerCase()

  // Ưu tiên: nếu user dán "lat,lng" vào địa chỉ → dùng luôn
  const fromText = parseLatLngFromText(s)
  if (fromText) return fromText

  if (s.includes('quận 1') || s.includes('q1') || s.includes('bến thành')) {
    return { lat: 10.776889, lng: 106.700806 }
  }
  if (s.includes('quận 3') || s.includes('q3')) {
    return { lat: 10.784000, lng: 106.684000 }
  }
  if (s.includes('bình thạnh')) {
    return { lat: 10.808000, lng: 106.700000 }
  }
  if (s.includes('thủ đức') || s.includes('thu duc')) {
    return { lat: 10.850000, lng: 106.769000 }
  }
  if (s.includes('quận 7') || s.includes('q7') || s.includes('phú mỹ hưng')) {
    return { lat: 10.737000, lng: 106.721000 }
  }

  // fallback: một điểm hợp lệ quanh trung tâm TP.HCM để không bị thiếu toạ độ
  const jitter = () => (Math.random() - 0.5) * 0.01 // ~1km
  return { lat: 10.78 + jitter(), lng: 106.69 + jitter() }
}

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

  // ----- PAYMENT METHOD (VNPAY / MOMO) -----
  const [paymentMethod, setPaymentMethod] = useState('MOMO') // default theo yêu cầu demo

  // Modal state
  const [showPayModal, setShowPayModal] = useState(false)
  const [pendingOrder, setPendingOrder] = useState(null)

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

  // ===== SUBMIT: mở modal, CHƯA tạo đơn =====
  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    if (!items.length) return show('Giỏ hàng trống', 'error')
    if (!validate())   return show('Vui lòng kiểm tra lại các trường!', 'error')

    try {
      setLoading(true)
      setState('idle')

      const session = await ensureSession()

      // Tạo khung order (pending – chưa gửi)
      const localId = Math.random().toString(36).slice(2,6)
      const baseOrder = {
        id: localId,
        sessionId: session?.id || null,
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        customerName: name.trim(),
        phone: String(phone).trim(),
        address: address.trim(),

        deliveryMode: DELIVERY_MODE,      // Drone
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

        createdAt: Date.now(),

        // toạ độ để mission không thiếu
        restaurantLocation: DEFAULT_RESTAURANT_LL,
        customerLocation: guessLatLngFromAddress(address),

        status: 'new',
      }

      // mở modal – chờ user xác nhận
      setPendingOrder(baseOrder)
      setShowPayModal(true)
    } catch (err) {
      console.error(err)
      setState('error')
      show('Đặt hàng thất bại. Vui lòng thử lại.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ===== Handlers từ PaymentModal =====
  async function handlePaid() {
    if (!pendingOrder) return
    try {
      const gateway = paymentMethod // 'VNPAY' | 'MOMO'
      const order = {
        ...pendingOrder,
        payment: gateway,
        payment_status: 'paid',                // FE-only
        payment_txn_id: 'MOCK-' + Date.now(),  // FE-only
      }

      const created = await placeOrder(order)
      clear()
      setState('success')
      setShowPayModal(false)

      const oid = created?.id || order.id
      try { sessionStorage.setItem('lastOrderId', String(oid)) } catch {}
      try { sessionStorage.setItem('lastDeliveryMode', DELIVERY_MODE) } catch {}
      try { sessionStorage.setItem('lastPaymentMethod', gateway) } catch {}

      // nhớ thông tin người nhận cho lần sau
      try {
        localStorage.setItem('lastName', pendingOrder.customerName)
        localStorage.setItem('lastPhone', pendingOrder.phone)
        localStorage.setItem('lastAddress', pendingOrder.address)
      } catch {}

      if (user && saveAsDefault && typeof updateUser === 'function') {
        updateUser({ name: pendingOrder.customerName, phone: pendingOrder.phone, address: pendingOrder.address })
      }

      try {
        const cur = JSON.parse(localStorage.getItem(REC_ADDR_KEY) || '[]') || []
        const norm = pendingOrder.address.trim()
        const next = [norm, ...cur.filter(x => x && x !== norm)].slice(0, 3)
        localStorage.setItem(REC_ADDR_KEY, JSON.stringify(next))
        setRecentAddr(next)
      } catch {}

      markOrderAsCurrent(oid)
      show(`Thanh toán thành công! Mã đơn: ${oid}`, 'success')
      nav(`/confirmation?id=${encodeURIComponent(oid)}`, { replace: true })
    } catch (err) {
      console.error(err)
      setState('error')
      show('Có lỗi khi tạo đơn sau thanh toán.', 'error')
    }
  }

  function handleClose() {
    setShowPayModal(false)
    show('Bạn đã hủy thanh toán.', 'info')
    nav('/cart')
  }

  function handleTimeout() {
    setShowPayModal(false)
    show('Thanh toán thất bại do quá thời gian. Vui lòng thử lại.', 'error')
    nav('/cart')
  }

  // ====== styles & helpers ======
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
    setCouponCode(code)
    setSuggOpen(false)
    setSuggIndex(-1)
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

            <label style={{display:'flex',gap:8,alignItems:'center',marginTop:6,fontSize:13,opacity:.9}}>
              <input type="checkbox" checked={saveAsDefault} onChange={e=>setSaveAsDefault(e.target.checked)} />
              Lưu thông tin nhận hàng (tên, SĐT, địa chỉ)
            </label>
          </div>

          <div className="field">
            <label>Phương thức giao hàng</label>
            <div className="chip" title="Giao nhanh bằng drone (cố định)">
              <input type="radio" checked readOnly />
              Drone <span className="muted">~20–30′</span>
            </div>
          </div>

          {/* PAYMENT METHODS */}
          <div className="field">
            <label>Phương thức thanh toán</label>
            <div className="radio-row">
              <label className="chip" title="Thanh toán online qua VNPay">
                <input
                  type="radio"
                  name="pm"
                  checked={paymentMethod === 'VNPAY'}
                  onChange={()=>setPaymentMethod('VNPAY')}
                />
                VNPay
              </label>
              <label className="chip" title="Thanh toán online qua MoMo">
                <input
                  type="radio"
                  name="pm"
                  checked={paymentMethod === 'MOMO'}
                  onChange={()=>setPaymentMethod('MOMO')}
                />
                MoMo
              </label>
            </div>
          </div>

          {/* Coupon */}
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
                disabled={!(!appliedCode && !!normalizeCode(couponCode) && CODE_PATTERN.test(normalizeCode(couponCode)) && Object.prototype.hasOwnProperty.call(coupons, normalizeCode(couponCode)))}
              >
                Áp dụng
              </button>

              {suggOpen && (
                <div className="sugg">
                  {Object.entries(coupons).map(([code, info])=>(
                    <div
                      key={code}
                      className="sugg-item"
                      onMouseDown={(e)=>{ e.preventDefault(); onPickSuggestion(code); }}
                      title={info.label}
                    >
                      <div>
                        <div className="sugg-code">{code}</div>
                        <div className="sugg-meta">{info.label}</div>
                      </div>
                      <div className="sugg-min">{info.min ? `≥ ${VND(info.min)}` : 'Không yêu cầu tối thiểu'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button className="btn" type="submit" disabled={loading || !items.length}>
            {loading ? 'Đang mở cổng thanh toán…' : 'Thanh toán & đặt hàng'}
          </button>
        </form>

        <div className="card">
          <h3>Tóm tắt đơn</h3>
          <div className="row"><span>Tạm tính</span><span>{VND(subtotal)}</span></div>

          {appliedCode && appliedCode !== 'FREESHIP' && discount > 0 && (
            <div className="row">
              <span>Khuyến mãi ({appliedCode})</span>
              <span>-{VND(discount)}</span>
            </div>
          )}

          <div className="row"><span>Giao hàng</span><span>Drone (nhanh)</span></div>

          <div className="row">
            <span>Vận chuyển</span>
            <span>{isFreeShip ? (<><span style={{marginRight:8}}><s>{VND(shippingFee)}</s></span><strong>0 ₫</strong></>) : VND(shippingFee)}</span>
          </div>

          <div className="row sum"><span>Thanh toán</span><span>{VND(finalTotal)}</span></div>
          <hr/>
          {items.map((i)=>(<div key={i.id} className="row"><span>{i.name} ×{i.qty}</span><span>{VND((i.price||0)*(i.qty||0))}</span></div>))}
        </div>
      </div>

      {/* Payment Modal (UI như MoMo/VNPay) */}
      <PaymentModal
        open={showPayModal}
        method={paymentMethod}                 // 'MOMO' | 'VNPAY'
        amount={finalTotal}
        orderId={pendingOrder?.id}
        customerName={name}                    // ⬅️ lấy từ ô "Họ tên"
        description={`Khách hàng: ${name}\nNội dung: Thanh toán tại FoodFast`}  // ⬅️ mô tả chuẩn
        durationSec={60}                       // tổng thời gian đếm ngược (tuỳ chọn)
        autoConfirmSec={25}                    // tự xác nhận “vừa phải” (tuỳ chọn)
        onConfirm={handlePaid}
        onClose={handleClose}
        onTimeout={handleTimeout}
      />
    </section>
  )
}
