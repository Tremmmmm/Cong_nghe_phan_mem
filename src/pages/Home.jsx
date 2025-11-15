import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// 💡 QUAN TRỌNG: Bây giờ chúng ta dùng lại import từ file API đã sửa
import { fetchMerchants, fetchMenuItems } from '../utils/merchantAPI.js'; 
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Home() {
  const [merchants, setMerchants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi API thông qua file merchantAPI.js (đã được bạn sửa link server chuẩn)
      const [merchantsData, menuItemsData] = await Promise.all([
          fetchMerchants(),
          fetchMenuItems()
      ]);

      setMerchants(merchantsData);
      
      // Lấy 8 món đầu tiên để hiển thị
      // Kiểm tra kỹ dữ liệu trả về có phải mảng không để tránh lỗi
      const safeMenuData = Array.isArray(menuItemsData) ? menuItemsData : [];
      setMenuItems(safeMenuData.slice(0, 8));

    } catch (err) {
      console.error("Failed to fetch home data:", err);
      setError('Không thể tải dữ liệu trang chủ.');
      // Không show toast lỗi ngay để tránh spam nếu server đang ngủ
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const styles = useMemo(() => `
    .home-wrap { max-width: 1140px; margin: 0 auto; padding: 20px 16px; }
    .hero { background: #fbe9e2; padding: 40px; border-radius: 18px; margin-bottom: 30px; text-align: center; }
    .hero h1 { font-size: 48px; font-weight: 900; color: #333; margin: 0 0 10px; }
    .hero p { font-size: 18px; color: #555; }

    .section-title { font-size: 28px; font-weight: 800; color: #333; margin-top: 40px; margin-bottom: 20px; }

    /* --- Style Merchant List --- */
    .merchant-list { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); 
        gap: 25px; 
    }
    .merchant-card { 
        background: #fff; 
        border: 1px solid #eee; 
        border-radius: 12px; 
        overflow: hidden; 
        cursor: pointer; 
        transition: transform .2s ease, box-shadow .2s ease; 
        box-shadow: 0 4px 12px rgba(0,0,0,.05);
        text-decoration: none; 
        color: inherit; 
        display: block; 
    }
    .merchant-card:hover { 
        transform: translateY(-5px); 
        box-shadow: 0 6px 16px rgba(0,0,0,.1); 
    }
    .merchant-logo-box { 
        height: 150px; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        background: #f9f9f9; 
        border-bottom: 1px solid #eee; 
        overflow: hidden; 
    }
    .merchant-logo { 
        width: 100%; 
        height: 100%; 
        object-fit: cover; 
    }
    .merchant-info { padding: 15px; }
    .merchant-name { font-size: 20px; font-weight: 700; color: #333; margin: 0 0 8px 0; }
    .merchant-address { font-size: 14px; color: #666; margin: 0 0 5px 0; }
    .merchant-hours { font-size: 13px; margin: 0; }

    /* --- Style Dish Grid --- */
    .dish-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
    .dish-card { border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.05); transition: box-shadow .2s ease; }
    .dish-card:hover { box-shadow: 0 6px 16px rgba(0,0,0,.1); }
    .dish-card-img-link { display: block; position: relative; }
    .dish-card-img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; }
    .dish-card-body { padding: 12px 16px 16px; }
    .dish-card-title { font-size: 17px; font-weight: 700; margin: 0 0 4px; color: #111; }
    .dish-card-merchant { font-size: 13px; color: #666; margin: 0 0 10px; font-weight: 500; }
    .dish-card-footer { display: flex; justify-content: space-between; align-items: center; }
    .dish-card-price { font-size: 16px; font-weight: 700; color: #ff7a59; }
    .dish-card-desc { font-size: 13px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }

    .dark .hero { background: #221b18; }
    .dark .hero h1 { color: #eee; }
    .dark .hero p { color: #bbb; }
    .dark .section-title { color: #eee; }
    .dark .merchant-card, .dark .dish-card { background: #1a1a1a; border-color: #333; }
    .dark .merchant-logo-box { background: #222; border-color: #333; }
    .dark .merchant-name, .dark .dish-card-title { color: #eee; }
    .dark .merchant-address, .dark .dish-card-merchant { color: #bbb; }
    .dark .merchant-hours, .dark .dish-card-desc { color: #999; }
  `, []);

  useEffect(() => {
    const id = "home-page-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.innerHTML = styles;
      document.head.appendChild(s);
    }
  }, [styles]);

  if (loading) return <div className="home-wrap" style={{textAlign: 'center', padding: '50px'}}>Đang tải dữ liệu... (Nếu lâu quá, hãy F5 lại)</div>;
  if (error) return <div className="home-wrap" style={{textAlign: 'center', padding: '50px', color: 'red'}}>{error} <br/> <button onClick={loadData} style={{marginTop: 10, padding: '8px 16px'}}>Thử lại</button></div>;

  const currentHour = new Date().getHours();
  const currentDayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

  return (
    <div className="home-wrap">
      {user && (
        <div style={{ marginTop: '5px', padding: '10px', border: '1px solid #eee', borderRadius: '10px', background: '#f9f9f9', textAlign: 'center' }}>
          <p>Chào mừng, <strong>{user.name || user.email}</strong>! Bạn đã đăng nhập thành công.</p>
        </div>
      )}
      <div className="hero">
        <h1>Khám phá Quán ăn</h1>
        <p>Đặt món ngon từ các nhà hàng yêu thích của bạn!</p>
      </div>

      {/* --- LIST QUÁN ĂN --- */}
      <h2 className="section-title">Nhà hàng nổi bật</h2>
      <div className="merchant-list">
        {merchants.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Chưa có nhà hàng nào hoạt động.</p>
        ) : (
          merchants.map(merchant => {
            const openHour = merchant.operatingHours?.[currentDayKey]?.open;
            const closeHour = merchant.operatingHours?.[currentDayKey]?.close;
            const isOpen = openHour !== undefined && closeHour !== undefined && 
                          currentHour >= openHour && currentHour < closeHour && 
                          !merchant.isManuallyClosed;

            return (
              <Link 
                to={`/merchant/${merchant.id}/menu`}
                key={merchant.id} 
                className="merchant-card"
              >
                <div className="merchant-logo-box">
                    <img 
                        src={merchant.logo || 'public/assets/images/placeholder_restaurant.png'} 
                        alt={`${merchant.storeName} logo`} 
                        className="merchant-logo" 
                        onError={(e) => { e.target.src = 'public/assets/images/placeholder_restaurant.png'; }} 
                        loading="lazy"
                    />
                </div>
                <div className="merchant-info">
                  <h3 className="merchant-name">{merchant.storeName}</h3>
                  <p className="merchant-address">{merchant.address}</p>
                  {(openHour !== undefined && closeHour !== undefined) ? (
                      <p className="merchant-hours" style={{ color: isOpen ? '#27ae60' : '#e74c3c', fontWeight: '600' }}>
                        {isOpen ? `Đang mở cửa (Đóng lúc ${closeHour}h)` : 'Đang đóng cửa'}
                      </p>
                  ) : (
                      <p className="merchant-hours" style={{ color: '#999' }}>Chưa có giờ hoạt động</p>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* --- LIST MÓN ĂN --- */}
      <h2 className="section-title" style={{marginTop: '50px'}}>Món ngon gần bạn</h2>
      <div className="dish-grid">
          {menuItems.length === 0 ? (
            <p>Chưa có món ăn nào.</p>
          ) : (
            menuItems.map((item) => (
              <div key={item.id} className="dish-card">
                <Link 
                  to={`/merchant/${item.merchantId}/menu`}
                  className="dish-card-img-link"
                >
                  <img 
                    src={item.image || 'public/assets/images/menu/placeholder.png'} 
                    alt={item.name} 
                    className="dish-card-img" 
                    loading="lazy"
                    onError={(e) => { e.target.src = 'public/assets/images/menu/placeholder.png'; }}
                  />
                </Link>

                <div className="dish-card-body">
                  <h4 className="dish-card-title">{item.name}</h4>
                  <p className="dish-card-merchant">
                      {merchants.find(m => m.id === item.merchantId)?.storeName || item.merchantName}
                  </p>  
                  
                  <div className="dish-card-footer">
                    <span className="dish-card-price">
                        {item.price ? item.price.toLocaleString('vi-VN') : 0}đ
                    </span>
                    <span className="dish-card-desc" title={item.desc}>
                      {item.desc || ''}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
      </div> 
    </div>
  );
}