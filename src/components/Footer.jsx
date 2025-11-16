import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const styles = useMemo(
    () => `
    .ff-footer{
      background:#f4f4f6; border-top:1px solid #e9e9ef; margin-top: auto; /* Đẩy footer xuống đáy nếu trang ngắn */
    }
    .ff-footer .wrap{
      max-width:1140px; margin:0 auto; padding:40px 16px;
      display:grid; grid-template-columns: 1.5fr 1fr 1fr; /* Chia cột thoáng hơn */
      gap:30px;
    }
    .ff-brand{
      display:flex; flex-direction:column; gap:12px; color:#555; align-items: flex-start;
    }
    .ff-brand div{ margin:0;font-size:24px;line-height:1;font-weight:900;color:#;font-family: 'Times New Roman', Times, serif;}
    .ff-brand-logo{ height:40px; width:auto; object-fit: contain; }
    
    .ff-title{
      font-weight:800; font-size:18px; color:#222; margin-bottom:12px;
      font-family: ui-serif, Georgia, "Times New Roman", serif;
    }
    .ff-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction: column; gap:10px; color:#444; }
    .ff-link{ color:#555; text-decoration:none; font-size: 15px; transition: color 0.2s; }
    .ff-link:hover{ color:#ff7a59; text-decoration: underline; }
    
    .ff-footnote{ text-align:center; padding:20px 16px; color:#888; font-size: 14px; border-top:1px solid #e9e9ef; background: #efeff1; }

    /* --- RESPONSIVE MOBILE --- */
    /* Khi màn hình nhỏ hơn 768px (tablet dọc & điện thoại), ẩn hoàn toàn footer */
    @media (max-width: 768px) {
      .ff-footer {
         display: none; 
      }
    }

    /* dark mode */
    .dark .ff-footer{ background:#121214; border-top-color:#2a2a2f; }
    .dark .ff-brand, .dark .ff-list, .dark .ff-link{ color:#d1d1d6; }
    .dark .ff-title{ color:#f3f3f7; }
    .dark .ff-footnote{ color:#a9a9b2; border-top-color:#2a2a2f; background: #0c0c0e; }
    `,
    []
  );

  useEffect(() => {
    const id = "ff-footer-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  return (
    <footer className="ff-footer">
      <div className="wrap">
        {/* Brand */}
        <div className="ff-brand">
          <img className="ff-brand-logo" src="/assets/images/logo.png" alt="FoodFast" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <div>FASTFOOD</div>
          <p style={{fontSize: 14, margin:0, lineHeight: 1.5}}>
            Đặt món nhanh chóng, giao hàng tận nơi với công nghệ Drone tiên tiến.
          </p>
        </div> 

        {/* Links */}
        <div>
          <div className="ff-title">Khám phá</div>
          <ul className="ff-list">
            <li><Link className="ff-link" to="/">Trang chủ</Link></li>
            <li><Link className="ff-link" to="/">Về chúng tôi</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className="ff-title">Chính sách</div>
          <ul className="ff-list">
            <li><Link className="ff-link" to="/">Điều khoản sử dụng</Link></li>
            <li><Link className="ff-link" to="/">Chính sách bảo mật</Link></li>
            <li><Link className="ff-link" to="/">Hỗ trợ khách hàng</Link></li>
          </ul>
        </div>
      </div>

      <div className="ff-footnote">© 2025 FoodFast Delivery. All rights reserved.</div>
    </footer>
  );
}