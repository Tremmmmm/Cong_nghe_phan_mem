import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'react-qr-code'

// Hàm format tiền tệ riêng để tránh phụ thuộc
function formatVND(n){
  try{
    return (n||0).toLocaleString('vi-VN',{style:'currency',currency:'VND'})
  }catch{
    return `${n} ₫`
  }
}

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
            headerLogo: '/assets/VNPAY_1.svg',
          },
    [method]
  )

  // 💡 FIX LỖI QR ĐỔI LIÊN TỤC: Dùng useMemo để cố định payload
  // Chỉ tạo lại khi orderId hoặc amount thay đổi, không phụ thuộc thời gian trôi
  const qrPayload = useMemo(() => {
      return JSON.stringify({
        gateway: method,
        orderId: orderId || '',
        amount,
        ts: Date.now(), // Chỉ lấy thời gian lúc tạo modal
      });
  }, [method, orderId, amount]);

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

  // Mô tả mặc định nếu chưa truyền
  const defaultDesc =
    `Khách hàng: ${customerName || '—'}\n` +
    `Nội dung: Thanh toán đơn hàng trên FastFood\n`

  const descText = (description || defaultDesc).trim()

  const hh = Math.floor(timeLeft / 3600)
  const mm = Math.floor((timeLeft % 3600) / 60)
  const ss = timeLeft % 60

  const css = `
  .pm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:3000; padding: 16px;}
  .pm-card{background:#fff;border-radius:16px;border:1px solid var(--panel-border);max-width:900px;width:100%;overflow:hidden; display: flex; flex-direction: column; max-height: 90vh;}
  
  .pm-head{display:flex;align-items:center;gap:12px;padding:12px 18px;font-weight:900;background:var(--head-bg);color:var(--head-color); flex-shrink: 0;}
  .pm-head img{width:32px;height:32px;object-fit:contain}
  
  /* Layout chính: Desktop 2 cột, Mobile 1 cột cuộn */
  .pm-page{display:grid;grid-template-columns:1fr 1fr; overflow: hidden; flex-grow: 1;}
  
  .pm-left{padding:20px; overflow-y: auto;}
  .pm-right{padding:20px;display:flex;align-items:center;justify-content:center;background:var(--panel-grad); color: #fff;}

  .pm-box{border:1px solid #eee;border-radius:12px;padding:16px;background:#fff}
  .pm-title{font-weight:800;margin:0 0 12px; font-size: 16px;}
  
  .pm-field{padding:10px 0;border-top:1px solid #f0f0f0}
  .pm-field:first-of-type{border-top:none; padding-top: 0;}
  .pm-label{font-size:12px;color:#666;margin-bottom:4px}
  .pm-value{font-weight:700; font-size: 14px;}
  .pm-desc{font-size:13px;white-space:pre-line; line-height: 1.4;}
  
  .pm-amount-row{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #f0f0f0}
  .pm-amount{font-size:20px;font-weight:900;color:var(--head-color)}
  
  .pm-expire{margin-top:16px;background:var(--subtle);border:1px solid var(--panel-border);padding:12px;border-radius:12px; text-align: center;}
  .pm-expire-title{font-weight:700;margin-bottom:8px; font-size: 13px;}
  .pm-hms{display:flex;gap:8px; justify-content: center;}
  .pm-chip{background:#fff;color:var(--head-color);border-radius:8px;text-align:center;padding:6px 10px;border:1px solid rgba(0,0,0,.05); min-width: 50px;}
  .pm-chip b{display:block;font-size:16px; line-height: 1;}
  .pm-chip .unit{font-size:10px;opacity:.8; margin-top: 2px;}
  .pm-note{font-size:11px;opacity:.7;margin-top:8px}
  
  .pm-backlink{
    display:block;width:100%;text-align:center;background:none;border:none;cursor:pointer;
    font-weight:600;font-size:14px;color:#666;
    padding:12px 0 0;margin-top:auto;transition:all .2s;
  }
  .pm-backlink:hover{opacity:.8;text-decoration:underline}
  
  .qr-wrap{width:100%;max-width:320px;display:flex;flex-direction:column;align-items:center;gap:16px; text-align: center;}
  .qr-title{font-weight:800; font-size: 16px;}
  .qr-frame{background:#fff;border-radius:16px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.15);}
  .qr-note{font-size:13px;opacity:.9; line-height: 1.4;}
  
  /* --- MOBILE RESPONSIVE --- */
  @media(max-width: 768px) {
      .pm-page { 
          grid-template-columns: 1fr; 
          grid-template-rows: auto auto; 
          overflow-y: auto; /* Cho phép cuộn toàn bộ modal trên mobile */
      }
      .pm-left { order: 2; padding: 16px; }
      .pm-right { order: 1; padding: 24px 16px; } /* Đưa QR lên đầu để dễ quét */
      
      .qr-frame { padding: 12px; } /* Giảm padding QR frame */
      .qr-inner svg { width: 180px !important; height: 180px !important; } /* Thu nhỏ QR chút */
  }`

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
        }}
      >
        {/* Header */}
        <div className="pm-head">
          <img src={theme.headerLogo} alt={theme.brand} />
          <span>Cổng thanh toán {theme.brand}</span>
        </div>

        <div className="pm-page">
          
          {/* RIGHT (QR CODE) - Đưa lên trước trong HTML nhưng dùng order để xếp lại nếu cần, 
             nhưng ở mobile ta muốn QR hiện trước nên ta dùng flex order hoặc để nguyên grid layout mobile */}
          <div className="pm-right">
            <div className="qr-wrap">
              <div className="qr-title">Quét mã để thanh toán</div>
              <div className="qr-frame">
                  <QRCode
                    value={qrPayload}
                    size={200} // Kích thước mặc định vừa phải
                    level="M"
                    fgColor="#000"
                    bgColor="#fff"
                    style={{ display: 'block', width: '100%', height: 'auto' }} // Responsive QR
                  />
              </div>
              <div className="qr-note">
                Mở App <b>{theme.brand}</b> để quét mã.
                <br/>Đơn hàng sẽ tự động xác nhận sau vài giây.
              </div>
            </div>
          </div>

          {/* LEFT (INFO) */}
          <div className="pm-left">
            <div className="pm-box">
              <div className="pm-field">
                <div className="pm-label">Nhà cung cấp</div>
                <div className="pm-value">FoodFast</div>
              </div>

              <div className="pm-field">
                <div className="pm-label">Mã đơn hàng</div>
                <div className="pm-value" style={{fontFamily: 'monospace', fontSize: 15}}>{orderId || '—'}</div>
              </div>

              <div className="pm-field">
                <div className="pm-label">Nội dung</div>
                <div className="pm-value pm-desc">{descText}</div>
              </div>

              <div className="pm-amount-row">
                <span className="pm-label">Tổng thanh toán</span>
                <span className="pm-amount">{formatVND(amount)}</span>
              </div>
            </div>

            <div className="pm-expire">
              <div className="pm-expire-title">Thời gian còn lại:</div>
              <div className="pm-hms">
                <div className="pm-chip"><b>{String(mm).padStart(2,'0')}</b><div className="unit">Phút</div></div>
                <div className="pm-chip"><b>{String(ss).padStart(2,'0')}</b><div className="unit">Giây</div></div>
              </div>
              <div className="pm-note">Giao dịch sẽ tự động huỷ khi hết giờ.</div>
            </div>

            <button type="button" className="pm-backlink" onClick={onClose}>
              ← Hủy thanh toán
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}