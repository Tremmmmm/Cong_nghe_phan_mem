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

      setMerchants(merchantsData.filter(m =>m.status === 'Active'));
      setMenuItems(menuItemsData.slice(0, 8)); // Lấy 8 món gợi ý

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
    .home-wrap { max-width: 1200px; margin: 0 auto; padding: 16px; background: #ffffffff; min-height: 100vh; }
    
    /* --- Hero Banner --- */
    .hero { 
        background: linear-gradient(135deg, #eb9a2f 0%, #f7c37e 100%); 
        padding: 30px 20px; 
        border-radius: 16px; 
        margin-bottom: 24px; 
        text-align: center; 
        color: #fff;
        box-shadow: 0 4px 15px rgba(255, 122, 89, 0.3);
    }
    .hero h1 { font-size: 28px; font-weight: 800; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; }
    .hero p { font-size: 15px; opacity: 0.9; margin: 0; }

    .section-title { font-size: 18px; font-weight: 700; color: #333; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
    .section-title::before { content: ''; display: block; width: 4px; height: 18px; background: #ff7a59; border-radius: 2px; }

    /* --- Merchant List (Scroll ngang) --- */
    .merchant-scroll-container {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 12px; /* Chừa chỗ cho scrollbar */
        scrollbar-width: none; /* Ẩn scrollbar Firefox */
    }
    .merchant-scroll-container::-webkit-scrollbar { display: none; } /* Ẩn scrollbar Chrome */

    .merchant-item {
        min-width: 140px;
        width: 140px;
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        transition: transform 0.2s;
    }
    .merchant-item:active { transform: scale(0.98); }
    
    .merchant-logo-box {
        width: 100%;
        height: 100px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid #f0f0f0;
    }
    .merchant-logo {
        width: 80%;
        height: 80%;
        object-fit: contain;
    }
    .merchant-info { padding: 8px; text-align: center; }
    .merchant-name { font-size: 13px; font-weight: 700; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
    .merchant-status { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .status-open { color: #27ae60; background: #eafaf1; }
    .status-closed { color: #e74c3c; background: #fdedec; }

    /* --- Dish Grid (2 cột mobile, 4 cột PC) --- */
    .dish-grid { 
        display: grid; 
        grid-template-columns: repeat(2, 1fr); 
        gap: 12px; 
    }
    @media (min-width: 768px) {
        .dish-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .merchant-item { min-width: 180px; width: 180px; }
        .merchant-logo-box { height: 120px; }
    }

    .dish-card { 
        background: #fff; 
        border-radius: 8px; 
        overflow: hidden; 
        box-shadow: 0 2px 6px rgba(0,0,0,0.05); 
        display: flex; 
        flex-direction: column;
    }
    .dish-img-link { display: block; position: relative; padding-top: 100%; /* Vuông */ }
    .dish-img { 
        position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
        object-fit: cover; 
    }
    .dish-body { padding: 10px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .dish-title { font-size: 14px; font-weight: 600; color: #333; margin: 0 0 4px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .dish-merchant { font-size: 11px; color: #888; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
    .dish-price { font-size: 15px; font-weight: 700; color: #ff7a59; }

    .user-welcome { background: #fff; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; color: #555; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; }
    .user-welcome strong { color: #ff7a59; }

    /* Dark mode */
    .dark .home-wrap { background: #121212; }
    .dark .merchant-item, .dark .dish-card, .dark .user-welcome { background: #1e1e1e; }
    .dark .section-title { color: #eee; }
    .dark .merchant-name, .dark .dish-title { color: #eee; }
    .dark .merchant-logo-box { border-bottom-color: #333; background: #252525; }
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

      {/* --- LIST QUÁN ĂN (Carousel ngang) --- */}
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
                  {isOpen ? (
                      <span className="merchant-status status-open">Mở cửa</span>
                  ) : (
                      <span className="merchant-status status-closed">Đóng cửa</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* --- LIST MÓN ĂN (Grid 2 cột) --- */}
      <h2 className="section-title">Gợi ý hôm nay</h2>
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