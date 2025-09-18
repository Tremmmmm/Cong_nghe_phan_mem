import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrders } from "../context/OrderContext.jsx";

function VND(n) { return (n ?? 0).toLocaleString("vi-VN") + "₫"; }

export default function DetailsHistory() {
  const { user } = useAuth();
  const { orders, findByUser } = useOrders();

  // Lấy order của user hiện tại (nếu có), không thì toàn bộ (demo)
  const myOrders = user ? findByUser(user.id, user.email) : orders;

  // Địa chỉ/phone “mặc định”: lấy từ order mới nhất của user (nếu user chưa lưu)
  const latest = myOrders[0];
  const name = user?.name || latest?.name || "Guest";
  const email = user?.email || latest?.userEmail || "";
  const phone = user?.phone || latest?.phone || "";
  const address = latest?.address || "";

  // Flatten: mỗi item = 1 row (đúng style demo)
  const rows = myOrders.flatMap((o, oi) =>
    (o.items || []).map((it, idx) => ({
      sn: `${oi + 1}.${idx + 1}`,
      orderId: o.id,
      date: o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "",
      img: it.image || "/assets/images/placeholder.png",
      name: it.name,
      price: it.price,
      qty: it.qty,
      totalItem: (it.price || 0) * (it.qty || 0),
    }))
  );

  const styles = useMemo(
    () => `
    .dh-hero{
      background:#f4f4f6;
      background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' opacity='0.18'>
          <defs><pattern id='p' width='160' height='120' patternUnits='userSpaceOnUse'>
            <g fill='none' stroke='#cfcfd6' stroke-width='1.5'>
              <circle cx='20' cy='20' r='10'/>
              <circle cx='120' cy='60' r='8'/>
              <rect x='60' y='20' width='20' height='20' rx='4' />
              <path d='M20 80c18 0 18 20 36 20s18-20 36-20 18 20 36 20'/>
            </g>
          </pattern></defs>
          <rect width='100%' height='100%' fill='url(%23p)'/>
        </svg>
      `)}");
      padding: 28px 0 48px;
    }
    .dh-wrap{max-width:1100px;margin:0 auto;padding:0 16px}
    .title{ text-align:center; font-size:32px; font-weight:800; color:#19243a; margin: 6px 0 10px;}
    .zigzag{ width:120px; height:12px; margin:0 auto 26px; background:
      linear-gradient(135deg,#ffb54d 25%,transparent 25%) -6px 0/12px 12px,
      linear-gradient(225deg,#ffb54d 25%,transparent 25%) -6px 0/12px 12px,
      linear-gradient(315deg,#ffb54d 25%,transparent 25%) 0px 0/12px 12px,
      linear-gradient(45deg, #ffb54d 25%,transparent 25%) 0px 0/12px 12px;}

    /* Bảng details */
    .detail-table{width:min(820px,100%);margin:0 auto 28px;border-collapse:collapse;background:#fff;border:1px solid #eee}
    .detail-table th,.detail-table td{border:1px solid #eee;padding:10px 12px;text-align:left}
    .detail-table th{background:#fafafa;font-weight:800}

    /* Bảng history */
    .history-title{ text-align:center; font-size:28px; font-weight:800; color:#19243a; margin:14px 0 10px;}
    .history-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee}
    .history-table th,.history-table td{border:1px solid #eee;padding:10px 12px}
    .history-table th{background:#fafafa}
    .thumb{width:74px;height:58px;object-fit:cover;border-radius:8px;background:#f2f2f2}
    .center{text-align:center}
    .right{text-align:right;font-weight:700}

    /* dark mode */
    .dark .title,.dark .history-title{color:#f3f3f7}
    .dark .detail-table,.dark .history-table{background:#151515;border-color:#333}
    .dark .detail-table th,.dark .history-table th{background:#1b1b1b}
    .dark .detail-table td,.dark .history-table td{border-color:#333;color:#e6e6ea}
    `,
    []
  );

  useEffect(() => {
    const id = "details-history-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  return (
    <section className="dh-hero">
      <div className="dh-wrap">
        <h1 className="title">My Details</h1>
        <div className="zigzag" />

        <table className="detail-table">
          <thead>
            <tr>
              <th style={{width:'25%'}}>Name</th>
              <th style={{width:'30%'}}>Email</th>
              <th style={{width:'20%'}}>Contact No.</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{name || "—"}</td>
              <td>{email || "—"}</td>
              <td>{phone || "—"}</td>
              <td>{address || "—"}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="history-title">{name}’s Orders History</h2>
        <div className="zigzag" style={{marginTop:6}} />

        {rows.length === 0 ? (
          <div style={{textAlign:'center',opacity:.8}}>Chưa có lịch sử đơn hàng.</div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th style={{width:70}}>S.No.</th>
                <th style={{width:110}}>Product</th>
                <th>Product Name</th>
                <th style={{width:120}} className="right">Price</th>
                <th style={{width:90}} className="center">Quantity</th>
                <th style={{width:140}} className="right">Total Price</th>
                <th style={{width:180}}>Order Id</th>
                <th style={{width:180}}>Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.orderId}-${i}`}>
                  <td className="center">{i + 1}</td>
                  <td className="center">
                    <img className="thumb" src={r.img} alt={r.name} />
                  </td>
                  <td>{r.name}</td>
                  <td className="right">{VND(r.price)}</td>
                  <td className="center">{r.qty}</td>
                  <td className="right">{VND(r.totalItem)}</td>
                  <td style={{fontFamily:'ui-monospace, Menlo, monospace'}}>{r.orderId}</td>
                  <td>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
