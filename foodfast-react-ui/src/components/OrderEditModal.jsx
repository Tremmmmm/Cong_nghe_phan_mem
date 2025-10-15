// src/components/OrderEditModal.jsx
import { useEffect, useMemo, useState } from "react";
import { formatVND } from "../utils/format";
const VND = (n) => formatVND(n);

export default function OrderEditModal({ open, order, onClose, onSave }) {
  const [rows, setRows] = useState([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!order) return;
    const init = (order.items || []).map((it, idx) => {
      const p = Number(it.price ?? 0);
      return {
        key: it.id ?? idx,
        name: it.name || it.title || `Món #${idx + 1}`,
        qty: Number(it.qty ?? it.quantity ?? 1), // giữ nguyên, KHÔNG cho sửa
        price: p,
        priceStr: String(p),                      // dùng chuỗi để nhập liệu mượt
        outOfStock: !!it.outOfStock,
        _origPrice: p,
      };
    });
    setRows(init);
    setNote(order.modifyNote || "");
  }, [order]);

  const summary = useMemo(() => {
    const kept = rows.filter((r) => !r.outOfStock);
    const total = kept.reduce((s, r) => s + r.qty * Number(r.price || 0), 0);
    const changes = rows.filter(
      (r) => !r.outOfStock && Number(r.price) !== Number(r._origPrice)
    );
    const removed = rows.filter((r) => r.outOfStock);
    return { total, kept, changes, removed };
  }, [rows]);

  if (!open || !order) return null;

  return (
    <div className="ff-modal-backdrop" onClick={onClose}>
      <div className="ff-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ff-modal__head">
          <b>Chỉnh sửa đơn #{order.code || order.id}</b>
        </div>

        <div className="ff-modal__body">
          <div className="ff-edit-table">
            <div className="ff-edit-row ff-edit-row--head">
              <div className="c1">Món</div>
              <div className="c3">Giá</div>
              <div className="c4">Hết món</div>
            </div>

            {rows.map((r, i) => (
              <div className="ff-edit-row" key={r.key}>
                <div className="c1">
                  {r.name}
                  <span className="muted base12" style={{ marginLeft: 6 }}>
                    × {r.qty}
                  </span>
                </div>

                <div className="c3">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={r.priceStr}
                    onChange={(e) => {
                      // chỉ giữ số; cho phép rỗng
                      const raw = e.target.value.replace(/\D/g, "");
                      setRows((list) =>
                        list.map((it, idx) =>
                          idx === i ? { ...it, priceStr: raw } : it
                        )
                      );
                    }}
                    onBlur={() => {
                      // normalize khi rời ô: rỗng -> 0
                      setRows((list) =>
                        list.map((it, idx) => {
                          if (idx !== i) return it;
                          const n =
                            it.priceStr === "" ? 0 : Number(it.priceStr);
                          return { ...it, price: n, priceStr: String(n) };
                        })
                      );
                    }}
                  />
                  <div className="muted base12">gốc: {VND(r._origPrice)}</div>
                </div>

                <div className="c4">
                  <label className="chk">
                    <input
                      type="checkbox"
                      checked={r.outOfStock}
                      onChange={(e) =>
                        setRows((list) =>
                          list.map((it, idx) =>
                            idx === i
                              ? { ...it, outOfStock: e.target.checked }
                              : it
                          )
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt12">
            <label className="muted base12 block mb6">
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="ff-input"
              placeholder="VD: Hết món X, đổi thành Y; điều chỉnh giá do size lớn…"
            />
          </div>

          <div className="ff-sum">
            <div>
              Món giữ lại: <b>{summary.kept.length}</b>
            </div>
            <div>
              Món hết hàng: <b>{summary.removed.length}</b>
            </div>
            <div>
              Tổng mới: <b>{VND(summary.total)}</b>
            </div>
          </div>
        </div>

        <div className="ff-modal__foot">
          <button className="ff-btn ff-btn--ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            className="ff-btn"
            onClick={() => {
              // đảm bảo đồng bộ giá trước khi lưu nếu còn ô nào rỗng
              const normalized = rows.map((r) => {
                const n = r.priceStr === "" ? 0 : Number(r.priceStr);
                return { ...r, price: n, priceStr: String(n) };
              });
              const kept = normalized.filter((r) => !r.outOfStock);
              const total = kept.reduce(
                (s, r) => s + r.qty * Number(r.price || 0),
                0
              );

              const payload = {
                items: normalized.map((r) => ({
                  name: r.name,
                  qty: r.qty, // giữ nguyên số lượng gốc
                  price: r.price,
                  outOfStock: r.outOfStock || undefined,
                })),
                finalTotal: total,
                modified: true,
                modification: {
                  removedItems: normalized
                    .filter((r) => r.outOfStock)
                    .map((r) => ({
                      name: r.name,
                      qty: r.qty,
                      price: r._origPrice,
                    })),
                  priceChanges: normalized
                    .filter(
                      (r) => !r.outOfStock && Number(r.price) !== r._origPrice
                    )
                    .map((r) => ({
                      name: r.name,
                      from: r._origPrice,
                      to: r.price,
                    })),
                  note: note?.trim() || null,
                  adjustedAt: new Date().toISOString(),
                },
                updatedAt: new Date().toISOString(),
              };
              onSave(payload);
            }}
          >
            Lưu thay đổi
          </button>
        </div>

        <style>{`
          .ff-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px}
          .ff-modal{background:#fff;max-width:760px;width:100%;border-radius:16px;border:1px solid #eee;box-shadow:0 10px 30px rgba(0,0,0,.15);overflow:hidden}
          .ff-modal__head{padding:12px 16px;border-bottom:1px solid #eee}
          .ff-modal__body{padding:12px 16px;max-height:70vh;overflow:auto}
          .ff-modal__foot{padding:12px 16px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end}
          .ff-edit-table{display:grid;gap:8px}
          .ff-edit-row{display:grid;grid-template-columns:1fr 180px 90px;gap:8px;align-items:flex-start}
          .ff-edit-row--head{font-weight:700;color:#555}
          .ff-edit-row .c3{display:grid;grid-template-rows:32px auto;align-items:start}
          .ff-edit-row input[type="text"]{width:100%;height:32px;border:1px solid #ddd;border-radius:8px;padding:0 8px;box-sizing:border-box}
          .chk{display:flex;align-items:center;justify-content:center;height:32px}
          .ff-input{width:100%;border:1px solid #ddd;border-radius:10px;padding:8px;box-sizing:border-box}
          .ff-sum{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;padding:10px;border:1px dashed #eee;border-radius:12px;background:#fafafa}
          .muted{color:#777}
          .block{display:block}
          .mb6{margin-bottom:6px}
          .mt12{margin-top:12px}
          .base12{font-size:12px}
          @media (max-width:640px){
            .ff-edit-row{grid-template-columns:1fr 160px 72px}
            .ff-modal{max-width:96vw}
          }
          .dark .ff-modal{background:#151515;border-color:#333}
          .dark .ff-input{background:#121212;border-color:#333;color:#eee}
        `}</style>
      </div>
    </div>
  );
}
