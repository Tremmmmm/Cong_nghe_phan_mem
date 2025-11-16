import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMerchants, fetchMenuItems } from '../utils/merchantAPI.js'; 
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Home() {
  const [merchants, setMerchants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [merchantsData, menuItemsData] = await Promise.all([
          fetchMerchants(),
          fetchMenuItems()
      ]);

      setMerchants(merchantsData.filter(m => m.status === 'Active'));
      setMenuItems(menuItemsData.slice(0, 8));

    } catch (err) {
      setError('Không thể tải dữ liệu trang chủ.');
      console.error("Failed to fetch home data:", err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const styles = useMemo(() => `
    .home-wrap { max-width: 1200px; margin: 0 auto; padding: 16px; background: #ffffff; min-height: 100vh; }
    
    .hero { 
        background: linear-gradient(135deg, #ff7a59 0%, #ffb199 100%); 
        padding: 24px 20px; border-radius: 12px; margin-bottom: 20px; 
        text-align: center; color: #fff; box-shadow: 0 4px 15px rgba(255, 122, 89, 0.3);
    }
    .hero h1 { font-size: 24px; font-weight: 800; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px; }
    .hero p { font-size: 14px; opacity: 0.9; margin: 0; }

    .section-title { font-size: 18px; font-weight: 700; color: #333; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
    .section-title::before { content: ''; display: block; width: 4px; height: 18px; background: #ff7a59; border-radius: 2px; }

    /* --- MERCHANT LIST (CAROUSEL) --- */
    .merchant-scroll-container {
        display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none;
    }
    .merchant-scroll-container::-webkit-scrollbar { display: none; }

    /* 💡 THẺ NHÀ HÀNG (MOBILE FIRST - UI/UX TỐI ƯU) */
    .merchant-item {
        min-width: 150px; width: 150px; /* Kích thước nhỏ gọn cho mobile */
        background: #fff; border-radius: 8px; overflow: hidden;
        text-decoration: none; color: inherit;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05); transition: transform 0.2s;
        border: 1px solid #eee;
        display: flex; flex-direction: column;
    }
    .merchant-item:active { transform: scale(0.98); }

    .merchant-logo-box {
        width: 100%; height: 100px; /* Chiều cao logo vừa phải */
        background: #f9f9f9; display: flex; align-items: center; justify-content: center;
        border-bottom: 1px solid #f0f0f0; overflow: hidden; position: relative;
    }
    .merchant-logo { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }

    .merchant-info { padding: 8px 10px; flex-grow: 1; display: flex; flex-direction: column; }
    
    .merchant-name { 
        font-size: 13px; font-weight: 700; color: #222; margin-bottom: 4px; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
    }
    .merchant-addr { 
        font-size: 11px; color: #777; margin-bottom: 6px; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
    }
    
    .status-tag { 
        font-size: 13px; font-weight: 700; padding: 2px 6px; border-radius: 4px; 
        display: inline-block; text-transform: uppercase; width: fit-content; margin-top: auto;
    }
    .status-open { color: #00b14f; background: #e6f9ee; }
    .status-closed { color: #e74c3c; background: #fdedec; }

    /* --- DISH GRID --- */
    .dish-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    
    .dish-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; border: 1px solid #eee; }
    .dish-img-link { display: block; position: relative; padding-top: 100%; }
    .dish-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
    .dish-body { padding: 10px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .dish-title { font-size: 13px; font-weight: 600; color: #333; margin: 0 0 4px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .dish-merchant { font-size: 13px; color: #888; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dish-price { font-size: 14px; font-weight: 700; color: #ff7a59; }

    .user-welcome { background: #fff; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 16px; color: #555; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 8px; }
    .user-welcome strong { color: #ff7a59; }

    /* --- DESKTOP STYLE (Min-width 768px) --- */
    @media (min-width: 768px) {
        .hero { padding: 40px; margin-bottom: 30px; }
        .hero h1 { font-size: 36px; margin-bottom: 10px; }
        .section-title { font-size: 24px; margin: 40px 0 20px; }
        
        /* Desktop Merchant Card to hơn */
        .merchant-item { min-width: 220px; width: 220px; border-radius: 12px; }
        .merchant-item:hover { transform: translateY(-5px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
        .merchant-logo-box { height: 140px; }
        .merchant-item:hover .merchant-logo { transform: scale(1.05); }
        .merchant-info { padding: 12px 15px; }
        .merchant-name { font-size: 16px; }
        .merchant-addr { font-size: 13px; margin-bottom: 10px; }
        .status-tag { font-size: 12px; padding: 4px 8px; }

        .dish-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .dish-title { font-size: 18px; }
        .dish-price { font-size: 16px; }
    }

    .dark .home-wrap { background: #121212; }
    .dark .merchant-item, .dark .dish-card, .dark .user-welcome { background: #1e1e1e; border-color: #333; }
    .dark .section-title { color: #eee; }
    .dark .merchant-name, .dark .dish-title { color: #eee; }
    .dark .merchant-addr { color: #aaa; }
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

  if (loading) return <div style={{textAlign: 'center', padding: '50px', color: '#888'}}>Wait a moment...</div>;
  if (error) return <div style={{textAlign: 'center', padding: '50px', color: '#e74c3c'}}>{error}</div>;

  const currentHour = new Date().getHours();
  const currentDayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

  return (
    <div className="home-wrap">
      {user && (
        <div className="user-welcome">
          <span>👋 Chào <strong>{user.name || user.email}</strong>, hôm nay bạn muốn ăn gì?</span>
        </div>
      )}
      
      <div className="hero">
        <h1>FoodFast</h1>
        <p>Giao đồ ăn thần tốc - Món ngon tận cửa</p>
      </div>

      {/* --- LIST QUÁN ĂN --- */}
      <h2 className="section-title">Thương hiệu nổi bật</h2>
      <div className="merchant-scroll-container">
        {merchants.length === 0 ? (
          <p style={{color: '#999', fontSize: 14, padding: 10}}>Chưa có quán nào.</p>
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
                className="merchant-item"
              >
                <div className="merchant-logo-box">
                    <img 
                        src={merchant.logo || '/assets/images/placeholder_restaurant.png'} 
                        alt={merchant.storeName} 
                        className="merchant-logo" 
                        onError={(e) => { e.target.src = '/assets/images/placeholder_restaurant.png'; }} 
                        loading="lazy"
                    />
                </div>
                <div className="merchant-info">
                  <div className="merchant-name" title={merchant.storeName}>{merchant.storeName}</div>
                  <div className="merchant-addr" title={merchant.address}>
                      📍 {merchant.address || "Chưa cập nhật địa chỉ"}
                  </div>
                  
                  {isOpen ? (
                      <span className="status-tag status-open">● Đang mở</span>
                  ) : (
                      <span className="status-tag status-closed">● Đóng cửa</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* --- LIST MÓN ĂN --- */}
      <h2 className="section-title">Món ngon gần bạn</h2>
      <div className="dish-grid">
          {menuItems.length === 0 ? (
            <p style={{color: '#999', fontSize: 14, padding: 10}}>Chưa có món nào.</p>
          ) : (
            menuItems.map((item) => (
              <div key={item.id} className="dish-card">
                <Link 
                  to={`/merchant/${item.merchantId}/menu`}
                  className="dish-img-link"
                >
                  <img 
                    src={item.image || '/assets/images/menu/placeholder.png'} 
                    alt={item.name} 
                    className="dish-img" 
                    loading="lazy"
                    onError={(e) => { e.target.src = '/assets/images/menu/placeholder.png'; }}
                  />
                </Link>

                <div className="dish-body">
                  <h4 className="dish-title">{item.name}</h4>
                  <div className="dish-merchant">
                      <span style={{fontSize: 10}}>🏠</span>
                      <span>{merchants.find(m => m.id === item.merchantId)?.storeName || 'Quán ngon'}</span>
                  </div>
                  <div className="dish-price">
                        {item.price ? item.price.toLocaleString('vi-VN') : 0}đ
                  </div>
                </div>
              </div>
            ))
          )}
      </div> 
    </div>
  );
}