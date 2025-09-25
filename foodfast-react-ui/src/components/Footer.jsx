import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const styles = useMemo(
    () => `
    .ff-footer{
      background:#f4f4f6; border-top:1px solid #e9e9ef;
    }
    .ff-footer .wrap{
      max-width:1140px; margin:0 auto; padding:28px 16px;
      display:grid; grid-template-columns:2fr 1.4fr 1fr 1fr; gap:28px;
    }
    .ff-brand{
      display:flex; flex-direction:column; gap:10px; color:#555;
    }
    .ff-brand-logo{ height:34px; width:auto; }
    .ff-title{
      font-weight:800; font-size:20px; color:#222; margin-bottom:8px;
      font-family: ui-serif, Georgia, "Times New Roman", serif;
    }
    .ff-list{ list-style:none; padding:0; margin:0; display:grid; gap:8px; color:#444; }
    .ff-link{ color:#444; text-decoration:none; }
    .ff-link:hover{ color:#ff7a59; }
    .ff-hours-li{ display:flex; align-items:center; gap:10px; }
    .ff-dot{
      width:18px; height:18px; border-radius:50%;
      background: radial-gradient(circle at 30% 30%, #ffcc8a, #ff7a59);
      display:inline-block;
    }
    .ff-footnote{ text-align:center; padding:14px 0 22px; color:#777; border-top:1px solid #e9e9ef; }
    /* responsive */
    @media (max-width:980px){
      .ff-footer .wrap{ grid-template-columns:1.5fr 1fr 1fr; }
      .ff-brand{ grid-column:1 / -1; }
    }
    @media (max-width:640px){
      .ff-footer .wrap{ grid-template-columns:1fr 1fr; }
    }
    @media (max-width:460px){
      .ff-footer .wrap{ grid-template-columns:1fr; }
    }
    /* dark mode */
    .dark .ff-footer{ background:#121214; border-top-color:#2a2a2f; }
    .dark .ff-brand, .dark .ff-list, .dark .ff-link{ color:#d1d1d6; }
    .dark .ff-title{ color:#f3f3f7; }
    .dark .ff-footnote{ color:#a9a9b2; border-top-color:#2a2a2f; }
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
        {/* Brand + tagline */}
        <div className="ff-brand">
          <img className="ff-brand-logo" src="/assets/images/logo.png" alt="FoodFast" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <div>You'll wonder how you ever lived without us.</div>
        </div>

        {/* Open Hours */}
        <div>
          <div className="ff-title">Open Hours</div>
          <ul className="ff-list">
            <li className="ff-hours-li"><span className="ff-dot" /> Mon–Thurs : 9am – 22pm</li>
            <li className="ff-hours-li"><span className="ff-dot" /> Fri–Sun : 11am – 22pm</li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <div className="ff-title">Links</div>
          <ul className="ff-list">
            <li><Link className="ff-link" to="/">Home</Link></li>
            <li><Link className="ff-link" to="/menu">Menu</Link></li>
            <li><Link className="ff-link" to="/favorites">Our Team</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className="ff-title">Company</div>
          <ul className="ff-list">
            <li><a className="ff-link" href="#" onClick={(e)=>e.preventDefault()}>Terms &amp; Conditions</a></li>
            <li><a className="ff-link" href="#" onClick={(e)=>e.preventDefault()}>Privacy Policy</a></li>
            <li><a className="ff-link" href="#" onClick={(e)=>e.preventDefault()}>Cookie Policy</a></li>
          </ul>
        </div>
      </div>

      <div className="ff-footnote">© 2025 FoodFast Delivery</div>
    </footer>
  );
}
