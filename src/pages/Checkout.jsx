import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrders } from "../context/OrderContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Checkout() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const { create } = useOrders();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    note: "",
    payMethod: "cod", // cod | banking
  });

  const styles = useMemo(() => `
    .ck-wrap{max-width:1100px;margin:24px auto;padding:0 16px;display:grid;grid-template-columns:2fr 1.2fr;gap:18px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px}
    .title{font-size:20px;font-weight:800;margin:0 0 12px}
    .grid{display:grid;gap:12px}
    .input, .textarea, .select{border:1px solid #e6e6ea;border-radius:12px;padding:10px 12px;font-size:14px;background:#fff}
    .textarea{min-height:88px;resize:vertical}
    .row{display:flex;align-items:center;gap:10px}
    .summary-item{display:grid;grid-template-columns:1fr auto;gap:10px;padding:8px 0;border-bottom:1px dashed #eee}
    .total{display:flex;justify-content:space-between;font-weight:800;margin-top:10px}
    .btn{background:#ff7a59;color:#fff;border:none;border-radius:12px;padding:12px 14px;font-weight:700;cursor:pointer;width:100%}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .empty{padding:14px;border:1px dashed #ddd;border-radius:12px;background:#fff}
    @media (max-width:900px){.ck-wrap{grid-template-columns:1fr}}
    .dark .card{background:#151515;border-color:#333}
    .dark .input,.dark .textarea,.dark .select{background:#111;border-color:#444;color:#eee}
  `, []);

  useEffect(() => {
    const id = "ck-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  const bind = (k) => ({
    value: form[k],
    onChange: (e) => setForm({ ...form, [k]: e.target.value })
  });

  const validate = () => {
    if (items.length === 0) return "Giỏ hàng đang trống.";
    if (!form.name.trim()) return "Vui lòng nhập họ tên.";
    if (!form.phone.trim()) return "Vui lòng nhập số điện thoại.";
    if (!form.address.trim()) return "Vui lòng nhập địa chỉ giao hàng.";
    return "";
  };

  const submit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.show(err, "error"); return; }

    const order = create({
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      name: form.name, phone: form.phone, address: form.address, note: form.note,
      payMethod: form.payMethod,
      items: items.map(it => ({ id: it.id, name: it.name, price: it.price, qty: it.qty, image: it.image })),
      total
    });

    clear();
    toast.show("Đặt hàng thành công!", "success");
    navigate("/confirmation", { replace: true, state: { orderId: order.id } });
  };

  if (items.length === 0) {
    return (
      <div className="ck-wrap" style={{gridTemplateColumns:'1fr'}}>
        <div className="empty">Giỏ hàng trống. Vui lòng thêm món trước khi thanh toán.</div>
      </div>
    );
  }

  return (
    <div className="ck-wrap">
      {/* LEFT: Form */}
      <form className="card grid" onSubmit={submit}>
        <h3 className="title">Thông tin giao hàng</h3>
        <input className="input" placeholder="Họ tên" {...bind("name")} />
        <input className="input" placeholder="Số điện thoại" {...bind("phone")} />
        <input className="input" placeholder="Địa chỉ giao hàng" {...bind("address")} />
        <textarea className="textarea" placeholder="Ghi chú (không bắt buộc)" {...bind("note")} />
        <div>
          <div style={{fontWeight:700, marginBottom:8}}>Phương thức thanh toán</div>
          <div className="row">
            <label><input type="radio" name="pm" value="cod" checked={form.payMethod==="cod"} onChange={()=>setForm({...form, payMethod:"cod"})}/> Thanh toán khi nhận hàng (COD)</label>
          </div>
          <div className="row">
            <label><input type="radio" name="pm" value="bank" checked={form.payMethod==="bank"} onChange={()=>setForm({...form, payMethod:"bank"})}/> Chuyển khoản ngân hàng</label>
          </div>
        </div>
        <button className="btn" type="submit">Đặt hàng</button>
      </form>

      {/* RIGHT: Summary */}
      <div className="card">
        <h3 className="title">Tóm tắt đơn hàng</h3>
        {items.map(it => (
          <div className="summary-item" key={it.id}>
            <div>{it.name} × {it.qty}</div>
            <div>{(it.price * it.qty).toLocaleString()}₫</div>
          </div>
        ))}
        <div className="total"><span>Tổng cộng</span><span>{total.toLocaleString()}₫</span></div>
      </div>
    </div>
  );
}
