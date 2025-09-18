import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * Trang SearchResults:
 * - Đọc từ khóa từ ?q=
 * - Lọc danh sách MOCK_ITEMS (bạn có thể thay bằng data thật/API)
 * - Hiển thị kết quả đơn giản, không phụ thuộc component khác
 */

const MOCK_ITEMS = [
  { id: 1, name: "Combo1 Burger + Coke", price: 59000 },
  { id: 2, name: "Combo2 Chicken + Fries", price: 69000 },
  { id: 3, name: "Beef Burger", price: 45000 },
  { id: 4, name: "Cheese Pizza", price: 99000 },
  { id: 5, name: "Fried Chicken", price: 52000 },
];

export default function SearchResults() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const q = (params.get("q") || "").trim();

  const results = useMemo(() => {
    if (!q) return [];
    const kw = q.toLowerCase();
    return MOCK_ITEMS.filter((x) => x.name.toLowerCase().includes(kw));
  }, [q]);

  return (
    <div style={{maxWidth: 920, margin: "24px auto", padding: "0 16px"}}>
      <h2 style={{marginBottom: 6}}>Search Results</h2>
      <div style={{color:"#666", marginBottom: 16}}>
        {q ? <>Keyword: <b>{q}</b></> : "Type something in the search bar above"}
      </div>

      {!q ? (
        <div style={{opacity:.8}}>Hint: thử gõ “combo1”, “chicken”, “pizza”…</div>
      ) : results.length === 0 ? (
        <div>Không tìm thấy kết quả nào.</div>
      ) : (
        <ul style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:12}}>
          {results.map(item => (
            <li key={item.id} style={{border:"1px solid #eee", padding:"12px 14px", borderRadius:10}}>
              <div style={{fontWeight:600, marginBottom:6}}>{item.name}</div>
              <div style={{opacity:.8}}>Price: {item.price.toLocaleString()}₫</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
