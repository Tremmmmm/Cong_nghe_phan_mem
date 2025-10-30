import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Dữ liệu menu (có thể sau này cũng lấy từ API)
// dữ liệu tĩnh: import MENU_ALL, { SINGLES, COMBOS } from "../data/menuData.js";  
import { fetchMenuItems } from '../utils/menuAPI.js';
// Context Hooks
import { useCart } from "../context/CartContext.jsx";
import { useFav } from "../context/FavContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
// Utilities
import { formatVND } from "../utils/format.js";
// 💡 IMPORT API ĐỂ LẤY CÀI ĐẶT CỬA HÀNG
import { fetchSettings } from '../utils/settingsAPI.js'; 

// --- Dữ liệu tĩnh cho ngày trong tuần ---
const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = { mon: 'Thứ 2', tue: 'Thứ 3', wed: 'Thứ 4', thu: 'Thứ 5', fri: 'Thứ 6', sat: 'Thứ 7', sun: 'Chủ Nhật' };
// -----------------------------------------

export default function Menu() {
    // --- State cho Cài đặt & Trạng thái Mở cửa ---
    const [storeSettings, setStoreSettings] = useState(null); // Lưu cài đặt load từ API
    const [isLoadingSettings, setIsLoadingSettings] = useState(true); // Trạng thái loading
    const [isCurrentlyOpen, setIsCurrentlyOpen] = useState(false); // Trạng thái mở cửa tính toán được

    // 💡 STATE MỚI CHO MENU ITEMS
    const [menuItems, setMenuItems] = useState([]);
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);

    // --- Context Hooks ---
    const cart = useCart();
    const fav = useFav();
    const toast = useToast();

    // --- Load Cài đặt Cửa hàng từ API ---
    const loadStoreSettings = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingSettings(true);
    try {
        const data = await fetchSettings();
        setStoreSettings(data);
    } catch (error) {
        console.error("Lỗi tải cài đặt cửa hàng cho Menu:", error);
        // Bạn vẫn có thể dùng `toast.show` ở đây bình thường
        if (showLoading) toast.show('Không thể tải thông tin cửa hàng.', 'error');
    } finally {
        if (showLoading) setIsLoadingSettings(false);
    }
}, []); 

    // --- Load lần đầu khi mount ---
    useEffect(() => {
        loadStoreSettings();
    }, [loadStoreSettings]); // Gọi hàm đã tách

    // 💡 THÊM useEffect ĐỂ TẢI LẠI KHI FOCUS TAB/CỬA SỔ
    useEffect(() => {
        const handleFocus = () => {
            console.log("Window focused, refetching settings...");
            loadStoreSettings(false); // Gọi lại hàm load, không hiển thị loading
        };

        window.addEventListener('focus', handleFocus);

        // Cleanup listener khi component unmount
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [loadStoreSettings]);

    // 💡 THÊM useEffect ĐỂ POLLING DỮ LIỆU TỰ ĐỘNG
    useEffect(() => {
        // Polling mỗi 10 giây để cập nhật trạng thái
        // Đây là cách đơn giản nhất ở mức POC để "đồng bộ"
        const pollingInterval = setInterval(() => {
            console.log("Polling for settings update...");
            loadStoreSettings(false); // Gọi lại hàm load, không hiển thị loading
        }, 10000); // 10.000ms = 10 giây

        // Cleanup interval khi component unmount
        return () => {
            clearInterval(pollingInterval);
        };
    }, [loadStoreSettings]);

    useEffect(() => {
        if (!storeSettings) {
            setIsCurrentlyOpen(false);
            return;
        }

        const checkOpenStatus = () => {
            console.log('--- Checking Status (Toggle Only) ---');
            console.log('Manually Closed Status:', storeSettings.isManuallyClosed);

            if (storeSettings.isManuallyClosed) {
                // Nếu chủ cửa hàng BẬT "Tạm đóng"
                console.log('Result: Manually Closed -> Setting isCurrentlyOpen = false');
                setIsCurrentlyOpen(false);
            } else {
                // Nếu chủ cửa hàng TẮT "Tạm đóng" (tức là mở cửa)
                console.log('Result: NOT Manually Closed -> Setting isCurrentlyOpen = true');
                setIsCurrentlyOpen(true);
            }
            console.log('-----------------------');
        };
        checkOpenStatus();
    }, [storeSettings]);

    // --- Tính toán Trạng thái Mở cửa Hiện tại ---
    // useEffect(() => {
    //     if (!storeSettings) {
    //         setIsCurrentlyOpen(false);
    //         return;
    //     }

    //     const checkOpenStatus = () => {
    //         // ---- THÊM LOG Ở ĐÂY ----
    //         console.log('--- Checking Status ---');
    //         console.log('Store Settings:', storeSettings); // Log cả object settings
    //         console.log('Manually Closed:', storeSettings?.isManuallyClosed);

    //         if (storeSettings.isManuallyClosed) {
    //             console.log('Result: Manually Closed -> Setting isCurrentlyOpen = false');
    //             setIsCurrentlyOpen(false);
    //             return; // Thoát nếu đóng thủ công
    //         }

    //         const now = new Date();
    //         const dayOfWeek = DAYS_OF_WEEK[now.getDay()]; // Lấy key ngày hiện tại (vd: 'mon')
    //         const hours = now.getHours(); // Lấy giờ hiện tại (0-23)
    //         const schedule = storeSettings.operatingHours?.[dayOfWeek]; // Lấy lịch của ngày hiện tại

    //         console.log('Current Time:', now.toLocaleTimeString());
    //         console.log('Current Day Key:', dayOfWeek);
    //         console.log('Current Hour:', hours);
    //         console.log('Schedule for Today:', schedule); // Log lịch của ngày hôm nay

    //         // Kiểm tra lịch trình
    //         if (schedule && typeof schedule.open === 'number' && typeof schedule.close === 'number' && hours >= schedule.open && hours < schedule.close) {
    //                 console.log(`Result: Within schedule (${schedule.open}-${schedule.close}) -> Setting isCurrentlyOpen = true`);
    //              setIsCurrentlyOpen(true); // Mở cửa
    //         } else {
    //                 console.log(`Result: Outside schedule or no schedule -> Setting isCurrentlyOpen = false`);
    //              setIsCurrentlyOpen(false); // Đóng cửa
    //         }
    //         console.log('-----------------------');
    //         // ---- KẾT THÚC LOG ----
    //     };

    //     checkOpenStatus();
    //     const intervalId = setInterval(checkOpenStatus, 60000);
    //     return () => clearInterval(intervalId);
    // }, [storeSettings]); // Chạy lại khi storeSettings thay đổi
    
    
        const styles = useMemo(
        () => `
    /* STYLE CHO TRANG MENU KHÁCH HÀNG */
        .menu-wrap{max-width:1140px;margin:24px auto;padding:0 16px}
        .menu-head{display:flex;align-items:end;gap:12px;margin-bottom:8px}
        .menu-head h2{margin:0;font-size:22px}
        .menu-sub{color:#666;margin-bottom:18px}
        /* --- Grid Layout --- */
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        /* --- Card Component --- */
        .card{border:1px solid #eee;border-radius:14px;overflow:hidden;background:#fff;display:flex;flex-direction:column;position:relative}
        .thumb{aspect-ratio:16/10;background:#f6f6f6;display:block;width:100%;object-fit:cover}
        .body{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
        .name{font-weight:700}
        .desc{color:#666;font-size:14px;min-height:36px}
        .price{font-weight:700}
        .row{display:flex;align-items:center;justify-content:space-between;gap:10px}

        /* --- Buttons --- */
        .btn{border:none;background:#111;color:#fff;border-radius:10px;padding:10px 12px;cursor:pointer}
        .ghost{border:1px solid #ddd;background:#fff;color:#111}
        /* Tim đỏ */
        .heart{border:1px solid #ffb3b3;background:#fff;color:#b00000;padding:10px 12px;border-radius:10px;display:inline-flex;gap:6px;align-items:center}
        .heart.active{background:#ffe5e5;border-color:#ff9b9b}
        .section{margin-top:28px}
        @media (max-width:1024px){.grid{grid-template-columns:repeat(2,1fr)}}
        @media (max-width:620px){.grid{grid-template-columns:1fr}}
        .dark .card{background:#151515;border-color:#333}
        .dark .desc{color:#aaa}
        .dark .ghost,.dark .heart{background:#111;border-color:#555;color:#eee}
        .dark .heart.active{background:#331717;border-color:#aa5555}

        /* --- Hero Section --- */
        .hero .wrap{max-width:1140px;margin:0 auto;padding:0 16px;display:grid;grid-template-columns:1.2fr 1fr;gap:28px;align-items:center}
    .eyebrow{font-size:18px;color:#2a3345;margin:0 0 6px}
    .h1{margin:0;font-size:57px;line-height:1.1;font-weight:900;color:#ff6b35;font-family: 'Times New Roman', Times, serif;}
    .accent{margin:8px;color:#1a2233;display:block} 
    .sub{margin:12px 0 22px;color:#444;font-size:15.5px;max-width:560px}
    .cta{display:inline-block;background:#ff7a59;color:#fff;text-decoration:none;padding:12px 22px;border-radius:30px;font-weight:700;box-shadow:0 6px 18px rgba(255,122,89,.35)}
    .figure{max-width:520px;margin:0 0 0 auto}
    .shot{aspect-ratio:1.2/1;overflow:hidden;border-radius:50% / 38%;box-shadow:0 30px 60px rgba(0,0,0,.25),0 10px 18px rgba(0,0,0,.12);background:#111}
    .shot img{width:100%;height:100%;object-fit:cover;display:block}
    .cap{margin:16px 6% 0 6%}
    .cap h4{margin:0 0 6px;font-size:18px;color:#1e2537;font-weight:800}
    .cap p{margin:0;color:#555;font-size:13.8px;line-height:1.55}
    @media (max-width:980px){ .hero .wrap{grid-template-columns:1fr} 
    .hero .figure{margin:24px auto 0} 
    .hero .h1{font-size:42px}}
    @media (max-width:540px){ .hero .h1{font-size:34px}}
    .dark .hero{background:#121214}
    .dark .h1{color:#f3f3f7}
    .dark .sub{color:#c9c9cf}
    .dark .cap h4{color:#f0f0f4}
    .dark .cap p{color:#bdbdc5}
    
    /* --- Operating Hours & Closed State --- */
        .operating-hours-box { 
            /* SỬA LẠI: Cho phép các item bên trong (h4, grid) xếp chồng lên nhau */
            display: block; 
            text-align: center; /* Tự căn giữa <h4> */
            margin-bottom: 25px;
            padding: 15px 20px;
            background: #ff7a59d8;
            border-radius: 8px;
            border: 1px solid #dee2e6;
        }
        .operating-hours-box h4 { 
            margin: 0 0 12px; /* Tăng khoảng cách dưới */
            font-size: 22px; 
            color: #343a40; 
        }

        /* CSS  Cho lưới các ngày */
        .operating-hours-grid {
            display: flex;
            flex-wrap: wrap; /* Cho phép xuống dòng */
            justify-content: center; /* Căn giữa các item */
            gap: 10px; /* Khoảng cách giữa các item */
        } 
        .operating-hours-item {
            display: flex;
            flex-direction: column; /* Xếp chồng (Day ở trên, Time ở dưới) */
            align-items: center;  /* Căn giữa theo chiều ngang */
            justify-content: center;
            padding: 6px 10px;
            border-radius: 6px;
            background: #ffffff;
            border: 1px solid #e9ecef;
            min-width: 90px; /* Đặt chiều rộng tối thiểu */
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .operating-hours-item .day-label {
            font-weight: 600; /* In đậm ngày */
            color: #343a40;
            font-size: 18px;
        }
        .operating-hours-item .time-label {
            font-size: 16px;
            color: #555;
        }


    .closed-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,.6); z-index: 10;
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-weight: 700; font-size: 24px; text-align: center; padding: 10px;
        border-radius: 14px;
        }
        .closed-overlay p { margin: 0; }

        .closed-banner {
        padding: 12px 15px; background: #fffbeb; color: #b45309; border-radius: 8px;
        font-weight: 500; margin: 10px auto 20px; text-align: center; max-width: 1140px;
        border: 1px solid #fde68a;
    }

    /* Dark mode */
    .dark .operating-hours-box { background:#1f2937; border-color:#374151; }
        .dark .operating-hours-box h4 { color:#e5e7eb; }
        /* CSS MỚI cho dark mode item */
        .dark .operating-hours-item { background: #2a3a4e; border-color: #374151; }
        .dark .operating-hours-item .day-label { color: #e5e7eb; }
        .dark .operating-hours-item .time-label { color: #cdd2d8; }

        .dark .closed-banner { background:#451a03; color:#fde68a; border-color:#713f12; }
        .dark .closed-overlay { background: rgba(0,0,0,.85); } 
    `,
    []
);
// Inject CSS vào head (chỉ chạy 1 lần)
    useEffect(() => {
        const styleId = "menu-hero-customer-style";
    console.log("Attempting to inject styles. Style ID:", styleId); // Log 1: Hook có chạy không?
    console.log("CSS Content:", styles); // Log 2: Biến styles có nội dung không?

    if (!document.getElementById(styleId)) {
        try {
            const tag = document.createElement("style");
            tag.id = styleId;
            tag.innerHTML = styles; // Lỗi cú pháp CSS ở đây cũng có thể gây vấn đề
            document.head.appendChild(tag);
            console.log("Style tag injected successfully."); // Log 3: Đã chèn thành công?
        } catch (e) {
            console.error("Error injecting style tag:", e); // Log 4: Có lỗi khi chèn không?
        }
    } else {
        console.log("Style tag already exists.");
    }
}, [styles]);

    // Placeholder image
    const ph =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'>
        <rect width='100%' height='100%' fill='#f1f1f1'/>
        <text x='50%' y='50%' text-anchor='middle' fill='#bbb' font-size='20' font-family='Arial'>Food Image</text>
        </svg>` 
    );
  // 💡 LOAD MENU ITEMS (CHỈ LẤY MÓN ĐÃ DUYỆT)
    useEffect(() => {
        async function loadMenu() {
            setIsLoadingMenu(true);
            try {
                // Chỉ fetch các món đã 'approved'
                const data = await fetchMenuItems('approved'); // Thay vì 'approved_available' dùng cho tạm ẩn
                setMenuItems(data);
            } catch (error) {
                toast.show('Lỗi tải thực đơn.', 'error');
            } finally {
                setIsLoadingMenu(false);
            }
        }
        loadMenu();
    }, []); // Chỉ load menu 1 lần

    // 💡 PHÂN LOẠI MENU ITEMS THÀNH SINGLE/COMBO TỪ DỮ LIỆU API
    const singles = useMemo(() => menuItems.filter(item => item.category === 'single'), [menuItems]);
    const combos = useMemo(() => menuItems.filter(item => item.category === 'combo'), [menuItems]);
    // --- Handlers ---
    const handleAddCart = (item) => {
        if (!isCurrentlyOpen) { 
            toast.show('Cửa hàng hiện đang đóng cửa, không thể thêm món.', 'error');
            return;
        }
        cart.add({ id: item.id, name: item.name, price: item.price, image: item.image });
        toast.show(`Đã thêm ${item.name} vào giỏ`, 'success');
    };

    const handleToggleFav = (item) => {
        const wasFav = fav.has(item.id);
        fav.toggle(item.id);
        toast.show(wasFav ? `Đã bỏ lưu ${item.name}` : `Đã lưu ${item.name}`, 'info');
    };

    // --- Component Card (Hiển thị món ăn) ---
    const Card = (item) => {
        const isFav = fav.has(item.id);
        return (
            <div key={item.id} className="card">
                {/* Lớp phủ khi đóng cửa */}
                {!isCurrentlyOpen && ( 
                    <div className="closed-overlay">
                        <p>Đang Đóng Cửa</p> 
                    </div>
                )}
                <img className="thumb" src={item.image || ph} alt={item.name} loading="lazy" />
                <div className="body">
                    <div className="name">{item.name}</div>
                    <div className="desc">{item.desc}</div>
                    <div className="row">
                        <div className="price">{formatVND(item.price || 0)}</div>
                        <div className="row" style={{ gap: 8 }}>
                            {/* Nút thêm vào giỏ (disable khi đóng) */}
                            <button
                                type="button"
                                className="btn ghost"
                                onClick={() => handleAddCart(item)}
                                disabled={!isCurrentlyOpen} 
                                style={!isCurrentlyOpen ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                            >
                                Thêm vào giỏ
                            </button>
                            {/* Nút yêu thích */}
                            <button
                                type="button"
                                className={`heart ${isFav ? "active" : ""}`}
                                onClick={() => handleToggleFav(item)}
                                title={isFav ? "Bỏ lưu" : "Lưu vào yêu thích"}
                            >
                                <span role="img" aria-label="heart">❤️</span>
                                {isFav ? "Đã lưu" : "Lưu"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Hàm Render Giờ Hoạt Động ---
    const renderOperatingHours = () => {
    // Chỉ render khi đã có settings
    if (!storeSettings || !storeSettings.operatingHours) return null; 

    return (
        <div className="operating-hours-box">
            <h4>Giờ hoạt động</h4>
            {/* THÊM 1 DIV BỌC CÁC NGÀY LẠI */}
            <div className="operating-hours-grid">
                {DAYS_OF_WEEK.map(dayKey => {
                    const day = DAY_LABELS[dayKey];
                    const schedule = storeSettings.operatingHours[dayKey];
                    const time = schedule && typeof schedule.open === 'number' 
                        ? `${schedule.open}:00 - ${schedule.close}:00` 
                        : 'Đóng cửa';
                    
                    // SỬA LẠI CLASSNAME VÀ CẤU TRÚC BÊN TRONG
                    return (
                        <div key={dayKey} className="operating-hours-item">
                            <span className="day-label">{day}</span> 
                            <span className="time-label">{time}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

    // --- Xử lý trạng thái Loading ban đầu ---
    if (isLoadingSettings || isLoadingMenu) {
        return <div style={{padding: 50, textAlign: 'center', fontSize: 18, color: '#666'}}>Đang tải thông tin và thực đơn...</div>;
    }
    
    // --- Render Giao diện Chính ---
    return (
        <>
            {/* Phần Hero Banner */}
            <section className="hero">
    <div className="wrap">
        <figure className="figure">
        <div className="shot">
            <img
            src="/assets/images/menu/cheeseburger.webp"
            alt="Cheese Burger"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 980px) 100vw, 520px"
            onError={e => { e.currentTarget.src = ph; }}
            />
        </div>
        <figcaption className="cap">
            <h4>Cheese Burger</h4>
            <p>Burger bò phô mai béo ngậy cùng với bí quyết sốt độc quyền của chúng tôi tạo nên hương vị mới lạ</p>
        </figcaption>
        </figure>
        <div>
        <div className="eyebrow">Chào mừng bạn đến với</div>
        <h1 className="h1">Cửa hàng của</h1>
        <h1 className="h1">chúng tôi</h1>
        <span className="accent">Chúng tôi cung cấp cho các bạn những món ăn nhanh và đầy đủ dưỡng chất cho một ngày tuyệt vời. </span>
        </div>
    </div>
    </section>
            
            {/* Thông báo Đóng cửa */}
            {!isCurrentlyOpen && storeSettings && ( 
                <div className="closed-banner">
                    {storeSettings.isManuallyClosed 
                        ? 'Cửa hàng đang tạm nghỉ. Mong bạn thông cảm và quay lại sau!' 
                        : 'Cửa hàng hiện đã đóng cửa. Vui lòng quay lại trong giờ hoạt động.'}
                </div>
            )}

            {/* Phần Nội dung Menu */}
            <div className="menu-wrap">
                {renderOperatingHours()}

                <div className="menu-head">
                    <h2>Thực đơn</h2>
                    {/* 💡 SỐ LƯỢNG MÓN LẤY TỪ API */}
                    <span style={{ color: "#999" }}>— {menuItems.length} món</span>
                </div>
                {/* ... */}

                {/* 💡 HIỂN THỊ MÓN LẺ TỪ API */}
                <section className="section">
                    <h3 style={{ margin: "0 0 10px 2px" }}>Món lẻ</h3>
                    {singles.length > 0 ? (
                        <div className="grid">{singles.map(Card)}</div>
                    ) : (<p>Chưa có món lẻ nào.</p>)}
                </section>

                {/* 💡 HIỂN THỊ COMBO TỪ API */}
                <section className="section">
                    <h3 style={{ margin: "20px 0 10px 2px" }}>Combo</h3>
                    {combos.length > 0 ? (
                        <div className="grid">{combos.map(Card)}</div>
                    ) : (<p>Chưa có combo nào.</p>)}
                </section>
            </div>
        </>
    );
}