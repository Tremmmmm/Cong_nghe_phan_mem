// src/components/MenuItem.jsx
export default function MenuItem({ item, onAdd }) {
  return (
    <div className="card">
      <img className="card-img" src={item.image} alt={item.name} />
      <div className="card-body">
        <h3 className="card-title">{item.name}</h3>
        <p className="card-text" style={{opacity:.75}}>{item.description}</p>
        <div className="card-actions">
          <strong>{item.price.toLocaleString('vi-VN')}₫</strong>
          <button className="btn" onClick={() => onAdd(item)}>Thêm</button>
        </div>
      </div>
    </div>
  )
}
