import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
// trang này sẽ cần chỉnh sửa nhé
export default function Home() {
  const styles = useMemo(() => `
    .hero{position:relative;overflow:hidden;padding:46px 0 34px;background:#f4f4f6;
      background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600' opacity='0.16'>
          <defs><pattern id='p' width='160' height='120' patternUnits='userSpaceOnUse'>
            <g fill='none' stroke='#cfcfd6' stroke-width='1.2'>
              <circle cx='20' cy='20' r='10'/><circle cx='120' cy='60' r='8'/>
              <rect x='60' y='20' width='20' height='20' rx='4'/>
              <path d='M20 80c18 0 18 20 36 20s18-20 36-20 18 20 36 20'/>
            </g></pattern></defs><rect width='100%' height='100%' fill='url(%23p)'/>
        </svg>`)}");
    }
    .hero .wrap{max-width:1140px;margin:0 auto;padding:0 16px;display:grid;grid-template-columns:1.2fr 1fr;gap:28px;align-items:center}
    .eyebrow{font-size:18px;color:#2a3345;margin:0 0 6px}
    .h1{margin:0;font-size:57px;line-height:1.1;font-weight:900;color:#ff6b35;font-family: 'Times New Roman', Times, serif;}
    .accent{margin:0.5;color:#1a2233;display:block}
    .sub{margin:12px 0 22px;color:#444;font-size:15.5px;max-width:560px}
    .cta{display:inline-block;background:#ff7a59;color:#fff;text-decoration:none;padding:12px 22px;border-radius:30px;font-weight:700;box-shadow:0 6px 18px rgba(255,122,89,.35)}
    .figure{max-width:520px;margin:0 0 0 auto}
    .shot{aspect-ratio:1.2/1;overflow:hidden;border-radius:50% / 38%;box-shadow:0 30px 60px rgba(0,0,0,.25),0 10px 18px rgba(0,0,0,.12);background:#111}
    .shot img{width:100%;height:100%;object-fit:cover;display:block}
    .cap{margin:16px 6% 0 6%}
    .cap h4{margin:0 0 6px;font-size:18px;color:#1e2537;font-weight:800}
    .cap p{margin:0;color:#555;font-size:13.8px;line-height:1.55}
    @media (max-width:980px){ .hero .wrap{grid-template-columns:1fr} .figure{margin:24px auto 0} .h1{font-size:42px}}
    @media (max-width:540px){ .h1{font-size:34px}}
    .dark .hero{background:#121214}.dark .h1{color:#f3f3f7}.dark .sub{color:#c9c9cf}
    .dark .cap h4{color:#f0f0f4}.dark .cap p{color:#bdbdc5}
  `, []);

  useEffect(() => {
    const id = "home-hero-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  return (
    <section className="hero">
      <div className="wrap">

        <figure className="figure">
          <div className="shot">
            <img
            src="/assets/images/menu/cheeseburger.webp"
            alt="Cheese Burger"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 980px) 100vw, 520px"
            onError={(e)=>{ e.currentTarget.src="/assets/images/menu/cheeseburger.webp"; }}
          />
          </div>
          <figcaption className="cap">
            <h4 >Cheese Burger</h4>
            <p>Burger bò phô mai béo ngậy cùng với bí quyết sốt độc quyền của chúng tôi tạo nên hương vị mới lạ</p>
          </figcaption>
        </figure>
        <div>
          <div className="eyebrow">Chào mừng bạn đến với</div>
          <h1 className="h1">Cửa hàng của</h1>
          <h1 className="h1">chúng tôi</h1> 
          <span className="accent">Chúng tôi cung cấp cho các bạn những món ăn nhanh và đầy đủ dưỡng chất cho một ngày tuyệt vời. </span>
           
        </div>
      </div>
    </section>
  );
}
