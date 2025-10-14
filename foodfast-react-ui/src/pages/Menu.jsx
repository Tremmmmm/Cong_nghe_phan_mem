import { useEffect, useMemo } from "react";
import MENU_ALL, { SINGLES, COMBOS } from "../data/menuData";
import { useCart } from "../context/CartContext.jsx";
import { useFav } from "../context/FavContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatVND } from "../utils/format";

export default function Menu() {
  const styles = useMemo(
    () => `
    .menu-wrap{max-width:1140px;margin:24px auto;padding:0 16px}
    .menu-head{display:flex;align-items:end;gap:12px;margin-bottom:8px}
    .menu-head h2{margin:0;font-size:22px}
    .menu-sub{color:#666;margin-bottom:18px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .card{border:1px solid #eee;border-radius:14px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
    .thumb{aspect-ratio:16/10;background:#f6f6f6;display:block;width:100%;object-fit:cover}
    .body{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
    .name{font-weight:700}
    .desc{color:#666;font-size:14px;min-height:36px}
    .price{font-weight:700}
    .row{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .btn{border:none;background:#111;color:#fff;border-radius:10px;padding:10px 12px;cursor:pointer}
    .ghost{border:1px solid #ddd;background:#fff;color:#111}
    /* Tim đỏ */
    .heart{border:1px solid #ffb3b3;background:#fff;color:#b00000;padding:10px 12px;border-radius:10px;display:inline-flex;gap:6px;align-items:center}
    .heart.active{background:#ffe5e5;border-color:#ff9b9b}
    .section{margin-top:28px}
    @media (max-width:1024px){.grid{grid-template-columns:repeat(2,1fr)}}
    @media (max-width:620px){.grid{grid-template-columns:1fr}}
    .dark .card{background:#151515;border-color:#333}
    .dark .desc{color:#aaa}
    .dark .ghost,.dark .heart{background:#111;border-color:#555;color:#eee}
    .dark .heart.active{background:#331717;border-color:#aa5555}
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
      font-family: 'Times New Roman', Times, serif;
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
    `,
    []
  );

  useEffect(() => {
    const styleId = "menu-hero-style";
    if (!document.getElementById(styleId)) {
      const tag = document.createElement("style");
      tag.id = styleId;
      tag.innerHTML = styles;
      document.head.appendChild(tag);
    }
  }, [styles]);

  const cart = useCart();
  const fav = useFav();
  const toast = useToast();

  const ph =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'>
        <rect width='100%' height='100%' fill='#f1f1f1'/>
        <text x='50%' y='50%' text-anchor='middle' fill='#bbb' font-size='20' font-family='Arial'>Food Image</text>
      </svg>`
    );

  const handleAddCart = (item) => {
    cart.add({ id: item.id, name: item.name, price: item.price, image: item.image });
    toast.show(`Đã thêm ${item.name} vào giỏ`, 'success');
  };

  const handleToggleFav = (item) => {
    const wasFav = fav.has(item.id);
    fav.toggle(item.id);
    toast.show(wasFav ? `Đã bỏ lưu ${item.name}` : `Đã lưu ${item.name}`, 'info');
  };

  const Card = (item) => {
    const isFav = fav.has(item.id);
    return (
      <div key={item.id} className="card">
        <img className="thumb" src={item.image || ph} alt={item.name} />
        <div className="body">
          <div className="name">{item.name}</div>
          <div className="desc">{item.desc}</div>
          <div className="row">
            <div className="price">{formatVND(item.price || 0)}</div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost" onClick={() => handleAddCart(item)}>
                Thêm vào giỏ
              </button>
              <button
                className={`heart ${isFav ? "active" : ""}`}
                onClick={() => handleToggleFav(item)}
                title={isFav ? "Bỏ lưu" : "Lưu vào yêu thích"}
              >
                <span role="img" aria-label="heart">❤️</span>
                {isFav ? "Đã lưu" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
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
                onError={e => { e.currentTarget.src = ph; }}
              />
            </div>
            <figcaption className="cap">
              <h4>Cheese Burger</h4>
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
      <div className="menu-wrap">
        <div className="menu-head">
          <h2>Thực đơn</h2>
          <span style={{ color: "#999" }}>— {MENU_ALL.length} món</span>
        </div>
        <div className="menu-sub">Món lẻ hiển thị trước, sau đó là các combo.</div>

        <section className="section">
          <h3 style={{ margin: "0 0 10px 2px" }}>Món lẻ</h3>
          <div className="grid">{SINGLES.map(Card)}</div>
        </section>

        <section className="section">
          <h3 style={{ margin: "20px 0 10px 2px" }}>Combo</h3>
          <div className="grid">{COMBOS.map(Card)}</div>
        </section>
      </div>
    </>
  );
}