// src/components/MenuItem.jsx
import { formatVND } from "../utils/format";

export default function MenuItem({ item, onAdd }) {
  return (
    <div className="card">
      <img className="card-img" src={item.image} alt={item.name} />
      <div className="card-body">
        <h3 className="card-title">{item.name}</h3>
        <p className="card-text" style={{ opacity: 0.75 }}>{item.description}</p>
        <div className="card-actions">
          <strong>{formatVND(item.price)}</strong>
          <button className="btn" onClick={() => onAdd(item)}>Thêm</button>
        </div>
      </div>
    </div>
  );
}
