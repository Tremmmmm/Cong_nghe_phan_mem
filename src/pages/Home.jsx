import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMerchants, fetchMenuItems } from '../utils/merchantAPI.js'; 
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Định danh duy nhất cho style của trang này
const STYLE_ID = "home-page-style";

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

  // SỬA: Đóng khung (scope) tất cả các class bằng tiền tố 'home-'
  const styles = useMemo(() => `
    .home-wrap { max-width: 1200px; margin: 0 auto; padding: 16px; background: #ffffff; min-height: 100vh; }
    
    .home-hero { 
        background: linear-gradient(135deg, #ff7a59 0%, #ffb199 100%); 
        padding: 24px 20px; border-radius: 12px; margin-bottom: 20px; 
        text-align: center; color: #000000ff; box-shadow: 0 4px 15px rgba(255, 122, 89, 0.3);
    }
    .home-hero h1 { font-size: 24px; font-weight: 800; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px; }
    .home-hero p { font-size: 14px; opacity: 0.9; margin: 0; }

    .home-section-title { font-size: 18px; font-weight: 700; color: #333; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
    .home-section-title::before { content: ''; display: block; width: 4px; height: 18px; background: #ff7a59; border-radius: 2px; }

    /* --- MERCHANT LIST (CAROUSEL) --- */
    .home-merchant-scroll-container {
        display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none;
    }
    .home-merchant-scroll-container::-webkit-scrollbar { display: none; }

    /* 💡 THẺ NHÀ HÀNG (MOBILE FIRST - UI/UX TỐI ƯU) */
    .home-merchant-item {
        min-width: 150px; width: 150px; /* Kích thước nhỏ gọn cho mobile */
        background: #fff; border-radius: 8px; overflow: hidden;
        text-decoration: none; color: inherit;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05); transition: transform 0.2s;
        border: 1px solid #eee;
        display: flex; flex-direction: column;
    }
    .home-merchant-item:active { transform: scale(0.98); }

    .home-merchant-logo-box {
        width: 100%; height: 100px; /* Chiều cao logo vừa phải */
        background: #f9f9f9; display: flex; align-items: center; justify-content: center;
        border-bottom: 1px solid #f0f0f0; overflow: hidden; position: relative;
    }
    .home-merchant-logo { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }

    .home-merchant-info { padding: 8px 10px; flex-grow: 1; display: flex; flex-direction: column; }
    
    .home-merchant-name { 
        font-size: 13px; font-weight: 700; color: #222; margin-bottom: 4px; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
    }
    .home-merchant-addr { 
        font-size: 11px; color: #777; margin-bottom: 6px; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
    }
    
    .home-status-tag { 
        font-size: 13px; font-weight: 700; padding: 2px 6px; border-radius: 4px; 
        display: inline-block; text-transform: uppercase; width: fit-content; margin-top: auto;
    }
    .home-status-open { color: #00b14f; background: #e6f9ee; }
    .home-status-closed { color: #e74c3c; background: #fdedec; }

    /* --- DISH GRID --- */
    .home-dish-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    
    .home-dish-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; border: 1px solid #eee; }
    .home-dish-img-link { display: block; position: relative; padding-top: 100%; }
    .home-dish-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
    .home-dish-body { padding: 10px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .home-dish-title { font-size: 13px; font-weight: 600; color: #333; margin: 0 0 4px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .home-dish-merchant { font-size: 13px; color: #888; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .home-dish-price { font-size: 14px; font-weight: 700; color: #ff7a59; }

    .home-user-welcome { background: #fff; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 16px; color: #555; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 8px; }
    .home-user-welcome strong { color: #ff7a59; }

    /* --- DESKTOP STYLE (Min-width 768px) --- */
    @media (min-width: 768px) {
        .home-hero { padding: 40px; margin-bottom: 30px; }
        .home-hero h1 { font-size: 36px; margin-bottom: 10px; }
        .home-section-title { font-size: 24px; margin: 40px 0 20px; }
        
        /* Desktop Merchant Card to hơn */
        .home-merchant-item { min-width: 220px; width: 220px; border-radius: 12px; }
        .home-merchant-item:hover { transform: translateY(-5px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
        .home-merchant-logo-box { height: 140px; }
        .home-merchant-item:hover .home-merchant-logo { transform: scale(1.05); }
        .home-merchant-info { padding: 12px 15px; }
        .home-merchant-name { font-size: 16px; }
        .home-merchant-addr { font-size: 13px; margin-bottom: 10px; }
        .home-status-tag { font-size: 12px; padding: 4px 8px; }

        .home-dish-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .home-dish-title { font-size: 18px; }
        .home-dish-price { font-size: 16px; }
    }

    .dark .home-wrap { background: #121212; }
    .dark .home-merchant-item, .dark .home-dish-card, .dark .home-user-welcome { background: #1e1e1e; border-color: #333; }
    .dark .home-section-title { color: #eee; }
    .dark .home-merchant-name, .dark .home-dish-title { color: #eee; }
    .dark .home-merchant-addr { color: #aaa; }
  `, []);

  // SỬA: Thêm logic cleanup để gỡ style khi component unmount
  useEffect(() => {
    const head = document.head;
    let tag = document.getElementById(STYLE_ID);

    if (!tag) {
      tag = document.createElement("style");
      tag.id = STYLE_ID;
      tag.innerHTML = styles;
      head.appendChild(tag);
    }
    
    // Hàm cleanup: Gỡ bỏ thẻ style khi component bị gỡ (unmount)
    return () => {
        const cleanupTag = document.getElementById(STYLE_ID);
        if (cleanupTag) {
            cleanupTag.remove();
        }
    };
  }, [styles]); // styles là dependency vì nó chứa nội dung CSS cần inject

  if (loading) return <div style={{textAlign: 'center', padding: '50px', color: '#888'}}>Wait a moment...</div>;
  if (error) return <div style={{textAlign: 'center', padding: '50px', color: '#e74c3c'}}>{error}</div>;

  const currentHour = new Date().getHours();
  const currentDayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

  return (
    <div className="home-wrap">
      {user && (
        <div className="home-user-welcome">
          <span>👋 Chào <strong>{user.name || user.email}</strong>, hôm nay bạn muốn ăn gì?</span>
        </div>
      )}
      
      <div className="home-hero">
        <h1>FastFood</h1>
        <p>Giao đồ ăn thần tốc - Món ngon tận cửa</p>
      </div>

      {/* --- LIST QUÁN ĂN --- */}
      <h2 className="home-section-title">Thương hiệu nổi bật</h2>
      <div className="home-merchant-scroll-container">
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
                className="home-merchant-item"
              >
                <div className="home-merchant-logo-box">
                    <img 
                        src={merchant.logo || '/assets/images/placeholder_restaurant.png'} 
                        alt={merchant.storeName} 
                        className="home-merchant-logo" 
                        onError={(e) => { e.target.src = '/assets/images/placeholder_restaurant.png'; }} 
                        loading="lazy"
                    />
                </div>
                <div className="home-merchant-info">
                  <div className="home-merchant-name" title={merchant.storeName}>{merchant.storeName}</div>
                  <div className="home-merchant-addr" title={merchant.address}>
                      📍 {merchant.address || "Chưa cập nhật địa chỉ"}
                  </div>
                  
                  {isOpen ? (
                      <span className="home-status-tag home-status-open">● Đang mở</span>
                  ) : (
                      <span className="home-status-tag home-status-closed">● Đóng cửa</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* --- LIST MÓN ĂN --- */}
      <h2 className="home-section-title">Món ngon gần bạn</h2>
      <div className="home-dish-grid">
          {menuItems.length === 0 ? (
            <p style={{color: '#999', fontSize: 14, padding: 10}}>Chưa có món nào.</p>
          ) : (
            menuItems.map((item) => (
              <div key={item.id} className="home-dish-card">
                <Link 
                  to={`/merchant/${item.merchantId}/menu`}
                  className="home-dish-img-link"
                >
                  <img 
                    src={item.image || '/assets/images/menu/placeholder.png'} 
                    alt={item.name} 
                    className="home-dish-img" 
                    loading="lazy"
                    onError={(e) => { e.target.src = '/assets/images/menu/placeholder.png'; }}
                  />
                </Link>

                <div className="home-dish-body">
                  <h4 className="home-dish-title">{item.name}</h4>
                  <div className="home-dish-merchant">
                      <span style={{fontSize: 10}}>🏠</span>
                      <span>{merchants.find(m => m.id === item.merchantId)?.storeName || 'Quán ngon'}</span>
                  </div>
                  <div className="home-dish-price">
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