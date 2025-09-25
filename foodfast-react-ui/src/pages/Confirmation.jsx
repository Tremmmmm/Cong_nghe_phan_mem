import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";

export default function Confirmation() {
  const styles = useMemo(
    () => `
    .confirm-wrap{max-width:800px;margin:40px auto;text-align:center;padding:20px}
    .confirm-title{font-size:32px;font-weight:800;color:#222;margin-bottom:14px}
    .confirm-sub{font-size:18px;font-weight:600;margin-bottom:8px;color:#333}
    .confirm-text{font-size:15px;color:#666;margin-bottom:30px}
    .confirm-img{max-width:380px;margin:0 auto 24px;display:block}
    .confirm-btn{background:#ff7a59;color:#fff;border:none;padding:12px 28px;
                 font-size:16px;font-weight:600;border-radius:30px;
                 cursor:pointer;text-decoration:none;display:inline-block}
    .confirm-btn:hover{background:#ff5722}
    .dark .confirm-title{color:#f3f3f7}
    .dark .confirm-sub{color:#ddd}
    .dark .confirm-text{color:#aaa}
    `,
    []
  );

  useEffect(() => {
    const id = "confirm-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.innerHTML = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  return (
    <div className="confirm-wrap">
      <div className="confirm-title">Congratulations....!!!!</div>
      <div className="confirm-sub">Your order has been placed successfully.</div>
      <div className="confirm-text">
        We'll be there in 45 mins, be ready with your payment.<br />
        In the meantime, you may explore our menu.
      </div>

      <img
        src="/assets/images/Delivery.png"
        alt="Fast Delivery"
        className="confirm-img"
      />

      <Link to="/menu" className="confirm-btn">Menu</Link>
    </div>
  );
}
