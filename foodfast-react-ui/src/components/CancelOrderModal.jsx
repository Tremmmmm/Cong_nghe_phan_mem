import { useState } from "react";

const REASONS = [
  { value: "out_of_stock", label: "Quán hết món" },
  { value: "closed", label: "Quán đóng cửa" },
  { value: "other", label: "Lý do khác" },
];

export default function CancelOrderModal({ open, order, onClose, onConfirm }) {
  const [reason, setReason] = useState("out_of_stock");
  const [note, setNote] = useState("");

  if (!open || !order) return null;

  return (
    <div className="ff-modal-backdrop" onClick={onClose}>
      <div className="ff-modal small" onClick={(e)=>e.stopPropagation()}>
        <div className="ff-modal__head">
          <b>Huỷ đơn #{order.code || order.id}</b>
        </div>
        <div className="ff-modal__body">
          <div className="muted" style={{marginBottom:8}}>Chọn lý do huỷ:</div>
          <div className="reason-list">
            {REASONS.map(r => (
              <label key={r.value} className="reason-item">
                <input
                  type="radio"
                  name="cancel_reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={()=>setReason(r.value)}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Ghi chú (tuỳ chọn)</label>
            <textarea
              rows={3}
              className="ff-input"
              value={note}
              onChange={(e)=>setNote(e.target.value)}
              placeholder="VD: Hết nguyên liệu chính, mở lại sau 30 phút…"
            />
          </div>
        </div>
        <div className="ff-modal__foot">
          <button className="ff-btn ff-btn--ghost" onClick={onClose}>Bỏ qua</button>
          <button
            className="ff-btn"
            onClick={() => onConfirm({ reason, note: note?.trim() || null })}
          >Huỷ đơn</button>
        </div>

        <style>{`
          .ff-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px}
          .ff-modal{background:#fff;max-width:520px;width:100%;border-radius:16px;border:1px solid #eee;box-shadow:0 10px 30px rgba(0,0,0,.15);overflow:hidden}
          .ff-modal.small{max-width:520px}
          .ff-modal__head{padding:12px 16px;border-bottom:1px solid #eee}
          .ff-modal__body{padding:12px 16px;max-height:70vh;overflow:auto}
          .ff-modal__foot{padding:12px 16px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end}
          .reason-list{display:flex;flex-direction:column;gap:8px}
          .reason-item{display:flex;gap:8px;align-items:center}
          .ff-input{width:100%;border:1px solid #ddd;border-radius:10px;padding:8px;box-sizing:border-box}
          .muted{color:#777}
          .dark .ff-modal{background:#151515;border-color:#333}
          .dark .ff-input{background:#121212;border-color:#333;color:#eee}
        `}</style>
      </div>
    </div>
  );
}
