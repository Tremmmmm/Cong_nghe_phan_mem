    import React, { useState, useEffect, useMemo, useCallback } from 'react';
    import { useParams } from 'react-router-dom'; // 💡 1. Import useParams
    import { fetchMenuItems } from '../utils/menuAPI.js';
    import { fetchSettings } from '../utils/settingsAPI.js'; 
    import { useCart } from "../context/CartContext.jsx";
    import { useFav } from "../context/FavContext.jsx";
    import { useToast } from "../context/ToastContext.jsx";
    import { formatVND } from "../utils/format.js";

    const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const DAY_LABELS = { mon: 'Thứ 2', tue: 'Thứ 3', wed: 'Thứ 4', thu: 'Thứ 5', fri: 'Thứ 6', sat: 'Thứ 7', sun: 'Chủ Nhật' };

    export default function Menu() {
        // 💡 2. Lấy merchantId từ URL (ví dụ: /merchant/m001/menu -> merchantId = "m001")
        const { merchantId } = useParams();

        const [storeSettings, setStoreSettings] = useState(null);
        const [menuItems, setMenuItems] = useState([]);
        const [isLoading, setIsLoading] = useState(true);
        const [isCurrentlyOpen, setIsCurrentlyOpen] = useState(false);

        const cart = useCart();
        const fav = useFav();
        const toast = useToast();

        // --- Load dữ liệu (Menu + Settings) ---
        const loadData = useCallback(async () => {
            if (!merchantId) return; // Nếu không có ID thì không tải (hoặc tải tất cả tùy logic)
            
            setIsLoading(true);
            try {
                // 💡 3. Tải song song cả Menu và Settings của merchant đó
                const [menuData, settingsData] = await Promise.all([
                    fetchMenuItems(merchantId, 'approved'), // Chỉ lấy món đã duyệt của merchant này
                    fetchSettings(merchantId)
                ]);

                setMenuItems(menuData);
                setStoreSettings(settingsData);

            } catch (error) {
                console.error("Lỗi tải dữ liệu menu:", error);
                toast.show('Không thể tải thông tin cửa hàng.', 'error');
            } finally {
                setIsLoading(false);
            }
        }, [merchantId, toast]);

        useEffect(() => {
            loadData();
        }, [loadData]);

        // --- Polling cập nhật trạng thái (mỗi 30s) ---
        useEffect(() => {
            if (!merchantId) return;
            const interval = setInterval(() => {
                console.log("Polling store settings...");
                // Gọi riêng lẻ để cập nhật thầm lặng không hiện loading
                fetchSettings(merchantId).then(data => {
                    if (data) setStoreSettings(data);
                });
            }, 30000); 
            return () => clearInterval(interval);
        }, [merchantId]);

        // --- Tính toán trạng thái Mở/Đóng cửa ---
        useEffect(() => {
            if (!storeSettings) {
                setIsCurrentlyOpen(true); // Mặc định mở nếu chưa có settings để không chặn khách
                return;
            }
            // 1. Kiểm tra đóng thủ công
            if (storeSettings.isManuallyClosed) {
                setIsCurrentlyOpen(false);
                return;
            }
            // 2. Kiểm tra theo giờ
            const now = new Date();
            const currentDayIndex = now.getDay(); // 0 (Sun) - 6 (Sat)
            const currentDayKey = DAYS_OF_WEEK[currentDayIndex];
            const currentHour = now.getHours();

            const todaySchedule = storeSettings.operatingHours?.[currentDayKey];
            
            if (todaySchedule && typeof todaySchedule.open === 'number' && typeof todaySchedule.close === 'number') {
                const isOpen = currentHour >= todaySchedule.open && currentHour < todaySchedule.close;
                setIsCurrentlyOpen(isOpen);
            } else {
                // Nếu không có lịch cho hôm nay, coi như đóng hoặc mở tùy chính sách
                setIsCurrentlyOpen(false); 
            }
        }, [storeSettings]);


        // --- Styles (Giữ nguyên) ---
       const styles = useMemo(() => `
    .menu-wrap{max-width:1140px;margin:24px auto;padding:0 16px}
    
    /* --- HERO & HEADER --- */
    .menu-head { margin-top: 20px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
    .menu-head h2 { font-size: 22px; margin: 0 0 4px; color: #333; }
    .store-addr { font-size: 13px; color: #666; margin-bottom: 4px; }
    .store-status { font-size: 13px; font-weight: 600; }

    /* --- GIỜ HOẠT ĐỘNG (DESKTOP) --- */
    .operating-hours-box { 
        background: #f9f9f9; border: 1px solid #eee; border-radius: 12px; padding: 12px; margin-bottom: 20px; 
    }
    .hours-desktop-grid { 
        display: flex; gap: 10px; flex-wrap: wrap; /* Desktop hiện hết */
    }
    
    /* --- GIỜ HOẠT ĐỘNG (MOBILE CSS) --- */
    .hours-mobile-summary { display: none; } /* Ẩn trên desktop */

    @media (max-width: 639px) {
        /* Ẩn danh sách đầy đủ mặc định */
        .hours-desktop-grid { 
            display: none; 
            flex-direction: column; gap: 8px; margin-top: 10px;
            border-top: 1px dashed #ddd; padding-top: 10px;
        }
        /* Hiện danh sách khi có class expanded */
        .hours-desktop-grid.expanded { display: flex; }

        /* Hiện thanh tóm tắt có thể bấm được */
        .hours-mobile-summary {
            display: flex; justify-content: space-between; align-items: center;
            padding: 8px 4px; cursor: pointer;
            font-size: 13px; font-weight: 600; color: #444;
        }
        .chevron { transition: transform 0.2s; font-size: 10px; margin-left: 6px; }
        .chevron.rotated { transform: rotate(180deg); }
        
        .hour-item { width: 100%; flex-direction: row; justify-content: space-between; padding: 8px 12px; }
    }

    /* Item ngày tháng chung */
    .hour-item { 
        display: flex; flex-direction: column; align-items: center; 
        padding: 8px 12px; background: #fff; border-radius: 8px; border: 1px solid #eee; 
        min-width: 70px; 
    }
    .hour-day { font-size: 12px; font-weight: 700; color: #666; }
    .hour-time { font-size: 11px; color: #888; }
    
    .hour-item.today { border-color: #ff7a59; background: #fff5f2; }
    .hour-item.today .hour-day { color: #ff7a59; }


    /* --- GRID MÓN ĂN --- */
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

    /* Mobile Responsive Cards */
    @media (max-width: 639px) {
        .grid { grid-template-columns: 1fr; gap: 12px; }
        .card { flex-direction: row; height: 110px; }
        .thumb { width: 110px; height: 100%; aspect-ratio: 1/1; flex-shrink: 0; }
        .desc { display: none; }
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

        // --- Placeholder Image ---
        const ph = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'%3E%3Crect width='400' height='250' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%23aaa'%3E🍽️ Món ăn%3C/text%3E%3C/svg%3E";

        // --- Card Component ---
        const Card = (item) => {
            const isFav = fav.has(item.id);
            return (
                <div key={item.id} className="card">
                    {!isCurrentlyOpen && (
                        <div className="closed-overlay">
                            <span className="closed-tag">Đang đóng cửa</span>
                        </div>
                    )}
                    <img className="thumb" src={item.image || ph} alt={item.name} loading="lazy" 
                        onError={(e)=>{e.target.src=ph}} />
                    <div className="body">
                        <div className="name">{item.name}</div>
                        <div className="desc">{item.desc}</div>
                        <div className="row">
                            <div className="price">{formatVND(item.price || 0)}</div>
                            <div style={{display:'flex', gap:8}}>
                                <button
                                    type="button"
                                    className={`heart ${isFav ? "active" : ""}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        fav.toggle(item.id);
                                    }}
                                    >
                                    {isFav ? "♥" : "♡"}
                                    </button>

                                    <button
                                    type="button"
                                    className="btn"
                                    disabled={!isCurrentlyOpen}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        cart.add(item, merchantId);
                                        toast.show(`Đã thêm ${item.name}`, 'success');
                                    }}
                                    >
                                    + Thêm
                                    </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        if (isLoading) {
            return <div style={{padding: 60, textAlign: 'center', color: '#666'}}>Đang tải thực đơn...</div>;
        }

        if (!merchantId) {
            return <div style={{padding: 60, textAlign: 'center'}}>Vui lòng chọn một nhà hàng để xem thực đơn.</div>;
        }

        const currentDayIndex = new Date().getDay();
        const todayKey = DAYS_OF_WEEK[currentDayIndex];

        return (
            <main  className="menu-wrap" >
                {/* Header thông tin cửa hàng */}
                <div className="menu-head">
                    <div>
                        <h2>{storeSettings?.storeName || 'Thực đơn nhà hàng'}</h2>
                        <div className="store-info">
                            {storeSettings?.address && <p>📍 {storeSettings.address}</p>}
                            <p>⏱️ {isCurrentlyOpen ? <span style={{color:'#27ae60', fontWeight:'bold'}}>Đang mở cửa</span> : <span style={{color:'#e74c3c', fontWeight:'bold'}}>Đang đóng cửa</span>}</p>
                        </div>
                    </div>
                </div>

                {/* Thông báo đóng cửa */}
                {!isCurrentlyOpen && (
                    <div className="store-closed-alert">
                        Nhà hàng hiện đang đóng cửa. Bạn vẫn có thể xem thực đơn nhưng chưa thể đặt món lúc này.
                    </div>
                )}

                {/* Giờ hoạt động */}
                {storeSettings?.operatingHours && (
                    <div className="operating-hours-box">
                        {DAYS_OF_WEEK.map((dayKey, index) => {
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
                )}

                {/* Danh sách món */}
                {singles.length > 0 && (
                    <section>
                        <h3 className="section-title">Món lẻ ({singles.length})</h3>
                        <div className="grid">{singles.map(Card)}</div>
                    </section>
                )}

                {combos.length > 0 && (
                    <section>
                        <h3 className="section-title">Combo tiết kiệm ({combos.length})</h3>
                        <div className="grid">{combos.map(Card)}</div>
                    </section>
                )}

                {menuItems.length === 0 && (
                    <p style={{textAlign:'center', padding: 40, color:'#999'}}>Nhà hàng chưa cập nhật thực đơn.</p>
                )}
             
            </main>
        );
    }