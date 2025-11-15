import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'react-qr-code'

// 💡 ĐÃ SỬA: Bỏ dòng import từ public gây lỗi
// import momoLogo from '../public/assets/momo-2.svg'
// import vnpayLogo from '../public/assets/VNPAY_1.svg'

export default function PaymentModal({
  open = false,
  method = 'MOMO',          // 'MOMO' | 'VNPAY'
  amount = 0,
  orderId = '',
  customerName = '',
  description = '',
  durationSec = 60,         // tổng thời gian giữ phiên
  autoConfirmSec = 25,      // thời gian “vừa phải” để auto confirm
  onConfirm,
  onClose,
  onTimeout,
}) {
  const [timeLeft, setTimeLeft] = useState(durationSec)
  const startRef = useRef(null)
  const autoRef = useRef(null)

  // === Theme màu cho từng cổng ===
  const theme = useMemo(
    () =>
      method === 'MOMO'
        ? {
            brand: 'MoMo',
            headBg: '#ffe6f1',
            headColor: '#b1006b',
            panelGrad: 'linear-gradient(135deg,#ff3aa7 0%,#ff73a1 60%,#ff4e8b 100%)',
            panelBorder: '#ffd6e7',
            subtle: '#fff0f6',
            helpLink: '#b1006b',
            chipBg: '#ffe1ef',
            chipText: '#b1006b',
            // 💡 ĐÃ SỬA: Dùng đường dẫn chuỗi trực tiếp từ thư mục public
            headerLogo: '/assets/momo-2.svg', 
          }
        : {
            brand: 'VNPay',
            headBg: '#e6f0ff',
            headColor: '#0a5bd8',
            panelGrad: 'linear-gradient(135deg,#0a5bd8 0%,#2f7bea 60%,#66a3ff 100%)',
            panelBorder: '#d6e4ff',
            subtle: '#eef5ff',
            helpLink: '#0a5bd8',
            chipBg: '#e7f0ff',
            chipText: '#0a5bd8',
            // 💡 ĐÃ SỬA: Dùng đường dẫn chuỗi trực tiếp từ thư mục public
            headerLogo: '/assets/VNPAY_1.svg',
          },
    [method]
  )

  // === Countdown + auto confirm ===
  useEffect(() => {
    if (!open) return
    setTimeLeft(durationSec)
    startRef.current = Date.now()

    const timer = setInterval(() => {
      const remain = durationSec - Math.floor((Date.now() - startRef.current) / 1000)
      const safe = Math.max(0, remain)
      setTimeLeft(safe)
      if (safe === 0) {
        clearInterval(timer)
        onTimeout?.()
      }
    }, 1000)

    autoRef.current = setTimeout(() => {
      onConfirm?.()
    }, Math.max(5, autoConfirmSec) * 1000)

    return () => {
      clearInterval(timer)
      if (autoRef.current) clearTimeout(autoRef.current)
    }
  }, [open, durationSec, autoConfirmSec, onConfirm, onTimeout])

  // ESC để đóng
  useEffect(() => {
    if (!open) return
    const keyHandler = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', keyHandler)
    return () => window.removeEventListener('keydown', keyHandler)
  }, [open, onClose])

  if (!open) return null

  // Payload QR (demo FE)
  const qrPayload = JSON.stringify({
    gateway: method,
    orderId: orderId || '',
    amount,
    ts: Date.now(),
  })

  // Mô tả mặc định nếu chưa truyền
  const defaultDesc =
    `Khách hàng: ${customerName || '—'}\n` +
    `Nội dung: Thanh toán tại ${theme.brand}`

  const descText = (description || defaultDesc).trim()

  const hh = Math.floor(timeLeft / 3600)
  const mm = Math.floor((timeLeft % 3600) / 60)
  const ss = timeLeft % 60

  const css = `
  .pm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000}
  .pm-card{background:#fff;border-radius:16px;border:1px solid var(--panel-border);max-width:980px;width:94%;overflow:hidden}
  .pm-head{display:flex;align-items:center;gap:12px;padding:10px 18px;font-weight:900;background:var(--head-bg);color:var(--head-color)}
  .pm-head img{width:36px;height:36px;object-fit:contain}
  .pm-page{display:grid;grid-template-columns:360px 1fr}
  .pm-left{padding:16px}
  .pm-right{padding:16px;display:flex;align-items:center;justify-content:center;border-left:1px solid var(--panel-border);background:var(--panel-grad)}
  .pm-box{border:1px solid #eee;border-radius:12px;padding:14px 14px 6px;background:#fff}
  .pm-title{font-weight:800;margin:0 0 10px}
  .pm-field{padding:10px 2px;border-top:1px solid #f0f0f0}
  .pm-field:first-of-type{border-top:none}
  .pm-label{font-size:12px;color:#6b7280;margin-bottom:6px}
  .pm-value{font-weight:700}
  .pm-desc{font-size:13px;white-space:pre-line}
  .pm-amount-row{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0}
  .pm-amount{font-size:24px;font-weight:900;color:var(--head-color)}
  .pm-expire{margin-top:12px;background:var(--subtle);border:1px solid var(--panel-border);padding:10px;border-radius:12px}
  .pm-expire-title{font-weight:700;margin-bottom:10px}
  .pm-hms{display:flex;gap:12px}
  .pm-chip{flex:1;background:var(--chip-bg);color:var(--chipText,#111);border-radius:10px;text-align:center;padding:10px 0;border:1px solid rgba(0,0,0,.05)}
  .pm-chip b{display:block;font-size:18px}
  .pm-chip .unit{font-size:12px;opacity:.9}
  .pm-note{font-size:12px;opacity:.85;margin-top:8px}
  .pm-backlink{
    display:block;width:100%;text-align:center;background:none;border:none;cursor:pointer;
    font-weight:600;font-size:14px;color:var(--backlink-color);
    padding:8px 0;margin:12px 0 6px 0;transition:all .2s;
  }
  .pm-backlink:hover{opacity:.8;text-decoration:underline}
  .qr-wrap{width:100%;max-width:420px;border-radius:16px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:12px;color:#fff}
  .qr-title{font-weight:900}
  .qr-frame{position:relative;background:#fff;border-radius:16px;padding:22px;border:4px solid rgba(255,255,255,.9);box-shadow:0 8px 24px rgba(0,0,0,.08);display:flex;justify-content:center;align-items:center}
  .qr-inner{position:relative;display:inline-block;padding:8px;background:#fff;border-radius:12px;z-index:1}
  .qr-note{font-size:12px;opacity:.95;text-align:center}
  .qr-help{font-size:12px;opacity:.95;text-align:center;margin-top:2px}
  .qr-help a{color:var(--help-link);font-weight:700;text-decoration:none}
  .qr-help a:hover{text-decoration:underline}
  @media(max-width:820px){.pm-page{grid-template-columns:1fr}.pm-right{border-left:none;border-top:1px solid var(--panel-border)}}
  `

  return (
    <div className="pm-backdrop" role="dialog" aria-modal="true">
      <style>{css}</style>
      <div
        className="pm-card"
        style={{
          ['--panel-border']: theme.panelBorder,
          ['--head-bg']: theme.headBg,
          ['--head-color']: theme.headColor,
          ['--panel-grad']: theme.panelGrad,
          ['--subtle']: theme.subtle,
          ['--help-link']: theme.helpLink,
          ['--chipText']: theme.chipText,
          ['--backlink-color']: theme.headColor, 
        }}
      >
        {/* Header */}
        <div className="pm-head">
          <img src={theme.headerLogo} alt={theme.brand} />
          <span>Cổng thanh toán {theme.brand}</span>
        </div>

        <div className="pm-page">
          {/* LEFT */}
          <div className="pm-left">
            <div className="pm-box">
              <h3 className="pm-title">Thông tin đơn hàng</h3>

              <div className="pm-field">
                <div className="pm-label">Nhà cung cấp</div>
                <div className="pm-value">{theme.brand} Payment</div>
              </div>

              <div className="pm-field">
                <div className="pm-label">Mã đơn hàng</div>
                <div className="pm-value">{orderId || '—'}</div>
              </div>

              <div className="pm-field">
                <div className="pm-label">Mô tả</div>
                <div className="pm-value pm-desc">{descText}</div>
              </div>

              <div className="pm-amount-row">
                <span className="pm-label">Số tiền</span>
                <span className="pm-amount">{formatVND(amount)}</span>
              </div>
            </div>

            <div className="pm-expire">
              <div className="pm-expire-title">Đơn hàng sẽ hết hạn sau:</div>
              <div className="pm-hms">
                <div className="pm-chip"><b>{String(hh).padStart(2,'0')}</b><div className="unit">Giờ</div></div>
                <div className="pm-chip"><b>{String(mm).padStart(2,'0')}</b><div className="unit">Phút</div></div>
                <div className="pm-chip"><b>{String(ss).padStart(2,'0')}</b><div className="unit">Giây</div></div>
              </div>
              <div className="pm-note">Quay về sẽ huỷ phiên thanh toán.</div>
            </div>

            <button type="button" className="pm-backlink" onClick={onClose}>
              ← Quay về
            </button>
          </div>

          {/* RIGHT */}
          <div className="pm-right">
            <div className="qr-wrap">
              <div className="qr-title">Quét mã QR để thanh toán</div>
              <div className="qr-frame">
                <div className="qr-inner">
                  <QRCode
                    value={qrPayload}
                    size={236}
                    level="M"
                    fgColor="#000"
                    bgColor="#fff"
                    style={{ display: 'block' }}
                  />
                </div>
              </div>
              <div className="qr-note">
                Sử dụng App {theme.brand} hoặc ứng dụng ngân hàng hỗ trợ QR để quét mã.
              </div>
              <div className="qr-help">
                Gặp khó khăn khi thanh toán? <a href="#help">Xem hướng dẫn</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatVND(n){
  try{
    return (n||0).toLocaleString('vi-VN',{style:'currency',currency:'VND'})
  }catch{
    return `${n} ₫`
  }
}