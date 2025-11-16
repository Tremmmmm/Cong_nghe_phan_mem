import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchMenuItems } from '../utils/menuAPI.js';
import { fetchSettings } from '../utils/settingsAPI.js'; 
import { useCart } from "../context/CartContext.jsx";
import { useFav } from "../context/FavContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatVND } from "../utils/format.js";

const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = { mon: 'Thứ 2', tue: 'Thứ 3', wed: 'Thứ 4', thu: 'Thứ 5', fri: 'Thứ 6', sat: 'Thứ 7', sun: 'Chủ Nhật' };

export default function Menu() {
    const { merchantId } = useParams();

    const [storeSettings, setStoreSettings] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCurrentlyOpen, setIsCurrentlyOpen] = useState(false);
    
    // State quản lý mở rộng giờ hoạt động trên mobile
    const [isHoursExpanded, setIsHoursExpanded] = useState(false);

    const cart = useCart();
    const fav = useFav();
    const toast = useToast();

    // --- Load dữ liệu (Đã tối ưu để tránh lỗi race condition) ---
    const loadData = useCallback(async () => {
        if (!merchantId) return;
        
        setIsLoading(true);
        try {
            // Gọi song song cả 2 API để tiết kiệm thời gian
            const [menuData, settingsData] = await Promise.all([
                fetchMenuItems(merchantId, 'approved').catch(() => []), // Nếu lỗi menu thì trả về mảng rỗng
                fetchSettings(merchantId).catch(() => null)             // Nếu lỗi settings thì trả về null
            ]);

            setMenuItems(Array.isArray(menuData) ? menuData : []);
            setStoreSettings(settingsData);
        } catch (error) {
            console.error("Lỗi tải dữ liệu trang Menu:", error);
        } finally {
            setIsLoading(false);
        }
    }, [merchantId]);

    // Gọi loadData khi vào trang
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Tự động cập nhật trạng thái đóng/mở mỗi 60s (Polling)
    useEffect(() => {
        if (!merchantId) return;
        const interval = setInterval(() => {
            fetchSettings(merchantId)
                .then(data => { if (data) setStoreSettings(data); })
                .catch(err => console.warn("Polling error:", err));
        }, 60000); // Tăng lên 60s để đỡ spam server
        return () => clearInterval(interval);
    }, [merchantId]);

    // Tính toán logic Đóng/Mở cửa
    useEffect(() => {
        if (!storeSettings) { 
            setIsCurrentlyOpen(false); // Mặc định đóng nếu chưa có data
            return; 
        }
        if (storeSettings.isManuallyClosed) { 
            setIsCurrentlyOpen(false); 
            return; 
        }
        
        const now = new Date();
        const currentDayIndex = now.getDay();
        const currentDayKey = DAYS_OF_WEEK[currentDayIndex];
        const currentHour = now.getHours();
        
        const todaySchedule = storeSettings.operatingHours?.[currentDayKey];
        if (todaySchedule && typeof todaySchedule.open === 'number' && typeof todaySchedule.close === 'number') {
            const isOpen = currentHour >= todaySchedule.open && currentHour < todaySchedule.close;
            setIsCurrentlyOpen(isOpen);
        } else { 
            setIsCurrentlyOpen(false); 
        }
    }, [storeSettings]);

    // --- Styles ---
    const styles = useMemo(() => `
    .menu-wrap{max-width:1140px;margin:24px auto;padding:0 16px}
    .menu-head { margin-top: 20px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
    .menu-head h2 { font-size: 22px; margin: 0 0 4px; color: #333; }
    .store-addr { font-size: 13px; color: #666; margin-bottom: 4px; }
    .store-status { font-size: 13px; font-weight: 600; }

    /* GIỜ HOẠT ĐỘNG */
    .operating-hours-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 12px; padding: 12px; margin-bottom: 20px; }
    .hours-desktop-grid { display: flex; gap: 10px; flex-wrap: wrap; }
    .hours-mobile-summary { display: none; }

    @media (max-width: 639px) {
        .hours-desktop-grid { display: none; flex-direction: column; gap: 8px; margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 10px; }
        .hours-desktop-grid.expanded { display: flex; }
        .hours-mobile-summary { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; cursor: pointer; font-size: 13px; font-weight: 600; color: #444; }
        .chevron { transition: transform 0.2s; font-size: 10px; margin-left: 6px; }
        .chevron.rotated { transform: rotate(180deg); }
        .hour-item { width: 100%; flex-direction: row; justify-content: space-between; padding: 8px 12px; }
    }

    .hour-item { display: flex; flex-direction: column; align-items: center; padding: 8px 12px; background: #fff; border-radius: 8px; border: 1px solid #eee; min-width: 70px; }
    .hour-day { font-size: 12px; font-weight: 700; color: #666; }
    .hour-time { font-size: 11px; color: #888; }
    .hour-item.today { border-color: #ff7a59; background: #fff5f2; }
    .hour-item.today .hour-day { color: #ff7a59; }

    /* GRID & CARD */
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .card { border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: #fff; display: flex; flex-direction: column; position: relative; }
    .thumb { aspect-ratio: 16/10; width: 100%; object-fit: cover; }
    .body { padding: 12px; flex-grow: 1; display: flex; flex-direction: column; }
    .name { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
    .desc { font-size: 13px; color: #666; margin-bottom: 10px; flex-grow: 1; }
    .row { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
    .price { font-weight: 800; color: #ff7a59; }
    .btn { border: none; background: #ff7a59; color: #fff; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .heart { border: 1px solid #eee; background: #fff; color: #ccc; padding: 6px; border-radius: 8px; cursor: pointer; font-size: 18px; margin-right: 8px; }
    .heart.active { color: #e74c3c; background: #fff5f5; border-color: #ffdada; }
    .section-title { font-size: 18px; font-weight: 700; margin: 24px 0 12px; color: #333; border-left: 4px solid #ff7a59; padding-left: 10px; }

    @media (max-width: 639px) {
        .grid { grid-template-columns: 1fr; gap: 12px; }
        .card { flex-direction: row; height: 110px; }
        .thumb { width: 110px; height: 100%; aspect-ratio: 1/1; flex-shrink: 0; }
        .desc {font-size: 13px; color: #666; margin-bottom: 10px; flex-grow: 1; }
        .body { padding: 10px; justify-content: space-between; }
        .menu-head { margin-top: 10px; }
    }

    .store-closed-alert { background:#fff4f4; color:#d63031; border:1px solid #ffcaca; padding:10px; border-radius:8px; text-align:center; margin-bottom:16px; font-size: 13px; font-weight:600; }
    .closed-overlay { position:absolute; inset:0; background:rgba(255,255,255,0.7); z-index:5; display:flex; align-items:center; justify-content:center; }
    .closed-tag { background:#333; color:#fff; padding:4px 10px; border-radius:20px; font-weight:600; font-size:12px; }
    
    .dark .menu-wrap { color: #eee; }
    .dark .card { background: #151515; border-color: #333; }
    .dark .operating-hours-box { background: #1f1f1f; border-color: #333; }
    .dark .hour-item { background: #2a2a2a; border-color: #333; }
    .dark .hours-mobile-summary { color: #eee; }
    `, []);

    useEffect(() => {
        const styleId = "menu-page-style";
        if (!document.getElementById(styleId)) {
            const tag = document.createElement("style");
            tag.id = styleId;
            tag.innerHTML = styles;
            document.head.appendChild(tag);
        }
    }, [styles]);

    const singles = useMemo(() => menuItems.filter(item => item.category === 'single'), [menuItems]);
    const combos = useMemo(() => menuItems.filter(item => item.category === 'combo'), [menuItems]);
    
    // Ảnh thế thân (Data URI để không bị lỗi 404)
    const ph = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'%3E%3Crect width='400' height='250' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%23aaa'%3E🍽️ Món ăn%3C/text%3E%3C/svg%3E";

    const Card = (item) => {
        const isFav = fav.has(item.id);

        // Hàm xử lý thêm vào giỏ riêng biệt
        const handleAddToCart = (e) => {
            e.preventDefault(); // Chặn hành vi mặc định của trình duyệt (reload)
            e.stopPropagation(); // Chặn sự kiện nổi bọt lên thẻ cha (để không bị click vào thẻ Card)
            
            if (!isCurrentlyOpen) return; // Chặn nếu đang đóng cửa

            cart.add(item, merchantId); 
        };

        // Hàm xử lý yêu thích
        const handleToggleFav = (e) => {
            e.preventDefault();
            e.stopPropagation();
            fav.toggle(item.id);
        };

        return (
            <div key={item.id} className="card">
                {!isCurrentlyOpen && <div className="closed-overlay"><span className="closed-tag">Đang đóng cửa</span></div>}
                
                <img 
                    className="thumb" 
                    src={item.image || ph} 
                    alt={item.name} 
                    loading="lazy" 
                    onError={(e)=>{e.target.src=ph}} 
                />
                
                <div className="body">
                    <div className="name">{item.name}</div>
                    <div className="desc">{item.desc}</div>
                    <div className="row">
                        <div className="price">{formatVND(item.price || 0)}</div>
                        <div style={{display:'flex', gap:8}}>
                            
                            {/* Nút Tim */}
                            <button 
                                type="button" 
                                className={`heart ${isFav ? "active" : ""}`} 
                                onClick={handleToggleFav}
                            >
                                {isFav ? "♥" : "♡"}
                            </button>

                            {/* Nút Thêm - Đã sửa */}
                            <button 
                                type="button" 
                                className="btn" 
                                disabled={!isCurrentlyOpen} 
                                onClick={handleAddToCart}
                            >
                                + Thêm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) return <div style={{padding: 60, textAlign: 'center', color: '#666'}}>Đang tải thực đơn... (Vui lòng chờ nếu Server đang khởi động)</div>;
    if (!merchantId) return <div style={{padding: 60, textAlign: 'center'}}>Vui lòng chọn một nhà hàng.</div>;

    const currentDayIndex = new Date().getDay();
    const todayKey = DAYS_OF_WEEK[currentDayIndex];
    const todaySchedule = storeSettings?.operatingHours?.[todayKey];
    const todayString = todaySchedule && typeof todaySchedule.open === 'number' 
        ? `${todaySchedule.open}h - ${todaySchedule.close}h` 
        : 'Đóng cửa';

    return (
        <main className="menu-wrap">
            <div className="menu-head">
                <div>
                    <h2>{storeSettings?.storeName || 'Thực đơn nhà hàng'}</h2>
                    <div className="store-addr">📍 {storeSettings?.address || 'Chưa cập nhật địa chỉ'}</div>
                    <div className="store-status">
                        ⏱️ {isCurrentlyOpen ? <span style={{color:'#27ae60'}}>Đang mở cửa</span> : <span style={{color:'#e74c3c'}}>Đang đóng cửa</span>}
                    </div>
                </div>
            </div>

            {!isCurrentlyOpen && (
                <div className="store-closed-alert">Nhà hàng hiện đang đóng cửa. Bạn có thể xem thực đơn nhưng chưa thể đặt món.</div>
            )}

            {/* --- KHUNG GIỜ HOẠT ĐỘNG --- */}
            {storeSettings?.operatingHours && (
                <div className="operating-hours-box">
                    <div className="hours-mobile-summary" onClick={() => setIsHoursExpanded(!isHoursExpanded)}>
                        <span>📅 Hôm nay ({DAY_LABELS[todayKey]}) mở cửa từ: <span style={{color:'#ff7a59'}}>{todayString}</span></span>
                        <span className={`chevron ${isHoursExpanded ? 'rotated' : ''}`}>▼</span>
                    </div>

                    <div className={`hours-desktop-grid ${isHoursExpanded ? 'expanded' : ''}`}>
                        {DAYS_OF_WEEK.map((dayKey) => {
                            const schedule = storeSettings.operatingHours[dayKey];
                            const isOpenDay = schedule && typeof schedule.open === 'number';
                            return (
                                <div key={dayKey} className={`hour-item ${dayKey === todayKey ? 'today' : ''}`}>
                                    <span className="hour-day">{DAY_LABELS[dayKey]}</span>
                                    <span className="hour-time">
                                        {isOpenDay ? `${schedule.open}h - ${schedule.close}h` : 'Nghỉ'}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {singles.length > 0 && <section><h3 className="section-title">Món lẻ ({singles.length})</h3><div className="grid">{singles.map(Card)}</div></section>}
            {combos.length > 0 && <section><h3 className="section-title">Combo ({combos.length})</h3><div className="grid">{combos.map(Card)}</div></section>}
            {menuItems.length === 0 && <p style={{textAlign:'center', padding: 40, color:'#999'}}>Nhà hàng chưa cập nhật thực đơn hoặc đang tải...</p>}
        </main>
    );
}