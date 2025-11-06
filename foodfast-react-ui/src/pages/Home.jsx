import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMerchants, fetchMenuItems } from "../utils/merchantAPI";

export default function Home() {
  // ⬇️ SỬA LỖI: Đổi 'categories' thành 'merchants'
  const [merchants, setMerchants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dùng useMemo để chứa CSS (Giữ nguyên)
  const styles = useMemo(() => `
    .home-wrap {
      max-width: 1140px;
      margin: 24px auto;
      padding: 0 16px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 700;
      margin: 24px 0 16px;
    }
    .category-list {
      display: flex;
      gap: 20px;
      overflow-x: auto;
      padding-bottom: 16px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .category-list::-webkit-scrollbar {
      display: none;
    }
    .category-item {
      flex-shrink: 0;
      width: 80px;
      text-align: center;
      text-decoration: none;
      color: #333;
      transition: transform 0.2s ease;
    }
    .category-item:hover {
      transform: scale(1.05);
    }
    .category-item img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #eee;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      margin-bottom: 8px;
    }
    .category-item p {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    .dish-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }
    .dish-card {
      border: 1px solid #eee;
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      transition: box-shadow 0.2s ease;
    }
    .dish-card:hover {
      box-shadow: 0 6px 16px rgba(0,0,0,0.1);
    }
    .dish-card-img-link {
      display: block;
      position: relative;
    }
    .dish-card-img {
      width: 100%;
      aspect-ratio: 16 / 10;
      object-fit: cover;
      display: block;
    }
    .dish-card-body {
      padding: 12px 16px 16px;
    }
    .dish-card-title {
      font-size: 17px;
      font-weight: 700;
      margin: 0 0 4px;
      color: #111;
    }
    .dish-card-merchant {
      font-size: 13px;
      color: #666;
      margin: 0 0 10px;
      font-weight: 500;
    }
    .dish-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dish-card-price {
      font-size: 16px;
      font-weight: 700;
      color: #ff7a59;
    }
    .dish-card-rating {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    .dark .home-wrap { color: #eee; }
    .dark .category-item { color: #ddd; }
    .dark .category-item img { border-color: #333; }
    .dark .dish-card { background: #151515; border-color: #333; }
    .dark .dish-card-title { color: #eee; }
    .dark .dish-card-merchant { color: #aaa; }
    .dark .dish-card-rating { color: #ccc; }
    
  `, []);

  // useEffect này bây giờ đã chạy đúng
  useEffect(() => {
    setLoading(true);

    async function loadData() {
        try {
            const [merchantsData, menuItemsData] = await Promise.all([
                fetchMerchants(),
                fetchMenuItems()
            ]);
            
            setMerchants(merchantsData); // <-- Giờ đã CÓ setMerchants
            setMenuItems(menuItemsData);

        } catch (error) {
            console.error("Lỗi tải dữ liệu trang Home:", error);
        } finally {
            setLoading(false);
        }
    }

    loadData();
    
  }, []);

  return (
    <>
      <style>{styles}</style>
      
      <div className="home-wrap">
        {/* --- Phần Danh Mục (Hình tròn) --- */}
        <h2 className="section-title">Khám phá Quán ăn</h2>
        <div className="category-list">
          {loading ? (
            <p>Đang tải quán ăn...</p>
          ) : (
            // ⬇️ Giờ đã CÓ 'merchants' để map
            merchants.map((merchant) => (
              <Link 
                to={`/merchant/${merchant.id}`} 
                key={merchant.id} 
                className="category-item"
              >
                {/* ⚠️ LƯU Ý: merchant.logoUrl không có trong db.json,
                   sẽ dùng ảnh default.
                */}
                <img 
                  src={merchant.logoUrl || "/assets/images/default_merchant.png"} 
                  alt={merchant.name} 
                />
                <p>{merchant.name}</p>
              </Link>
            ))
          )}
        </div>

        {/* --- Phần Món Ăn Gợi Ý (Thẻ) --- */}
        <h2 className="section-title">Món ngon gần bạn</h2>
        <div className="dish-grid">
          {loading ? (
            <p>Đang tải món ăn...</p>
          ) : (
            menuItems.map((item) => (
              <div key={item.id} className="dish-card">
                
                {/* ⬇️ SỬA LẠI: Phục hồi <Link> */}
                <Link 
                  to={`/merchant/${item.merchantId}`}
                  className="dish-card-img-link"
                >
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="dish-card-img" 
                    loading="lazy"
                  />
                </Link>

                <div className="dish-card-body">
                  <h4 className="dish-card-title">{item.name}</h4>
                  
                  {/* Dùng 'merchantName' từ db.json */}
                  <p className="dish-card-merchant">{item.merchantName}</p>  
                  
                  <div className="dish-card-footer">
                    <span className="dish-card-price">{item.price.toLocaleString('vi-VN')}đ</span>
                    
                    {/* Dùng 'desc' từ db.json */}
                    <span className="dish-card-rating">
                      {item.desc ? item.desc.substring(0, 20) + '...' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}