import { useEffect, useMemo, useState } from "react"; // Giữ lại dòng này
// import { formatVND } from "../utils/format.js"; // Có thể bỏ nếu không dùng
import { useToast } from "../context/ToastContext.jsx";
import { useMerchantAdmin } from "../context/MerchantAdminContext.jsx"; // Sẽ tạo file này ở bước 2
import { useNavigate } from 'react-router-dom';

// Dữ liệu Merchant giả lập
const MERCHANT_LIST = [
    { id: 'm001', name: 'Burger King Fast Food', status: 'Active', ordersToday: 45, owner: 'admin@foodfast.com' },
    { id: 'm002', name: 'Phở Lý Quốc Sư', status: 'Inactive', ordersToday: 0, owner: 'pho.ls@gmail.com' },
    { id: 'm003', name: 'Trà Sữa KOI', status: 'Pending', ordersToday: 12, owner: 'koi@milk.com' },
    { id: 'm004', name: 'Cơm Tấm Cali', status: 'Active', ordersToday: 88, owner: 'tam.cali@corp.com' },
]; 

export default function AdminServerRestaurant() {
    const [merchants, setMerchants] = useState(MERCHANT_LIST);
    const [loading, setLoading] = useState(false);

    // ✅ KHAI BÁO HOOK BÊN TRONG COMPONENT
    const navigate = useNavigate(); 
    const { selectedMerchantId, selectMerchant } = useMerchantAdmin(); 
    const toast = useToast();

    // ... (Giữ nguyên các đoạn useMemo, useEffect, styles)
    const styles = useMemo(
        // ... (CSS của bạn)
        () => `
        .admin-selector-wrap{max-width:1140px;margin:24px auto;padding:0 16px}
        .admin-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
        .admin-head h2{margin:0;font-size:24px}
        .list-grid{display:grid;gap:16px}
        .card{
            border:1px solid #eee;border-radius:14px;overflow:hidden;background:#fff;
            padding:16px;display:flex;align-items:center;justify-content:space-between;
        }
        .info-col{flex-grow:1}
        .name{font-weight:700;font-size:18px;margin-bottom:4px}
        .owner{color:#666;font-size:13px}
        .stats-col{display:flex;gap:20px;align-items:center}
        .stat-box{text-align:right;min-width:70px}
        .stat-label{font-size:12px;color:#999}
        .stat-value{font-weight:700;font-size:16px}
        .btn{border:none;background:#ff7a59;color:#fff;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:600}
        .ghost{border:1px solid #ddd;background:#fff;color:#111}
        .status-pill{
            display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;
            font-weight:600;margin-left:8px;
        }
        .status-pill.Active{background:#e6ffed;color:#1890ff}
        .status-pill.Inactive{background:#fff1f0;color:#f5222d}
        .status-pill.Pending{background:#fffbe6;color:#faad14}

        .dark .card{background:#151515;border-color:#333}
        .dark .owner{color:#aaa}
        .dark .ghost{background:#111;color:#eee;border-color:#333}
        .dark .status-pill.Active{background:#1f3d3d;color:#73d13d}
        .dark .status-pill.Inactive{background:#4d1c1c;color:#ff7875}
        .dark .status-pill.Pending{background:#4d3d1c;color:#ffc53d}
        `,
        []
    );

    useEffect(() => {
        const styleId = "admin-merchant-style";
        if (!document.getElementById(styleId)) {
            const tag = document.createElement("style");
            tag.id = styleId;
            tag.innerHTML = styles;
            document.head.appendChild(tag);
        }
    }, [styles]);

    // Hành động xem chi tiết (Đã sửa để dùng navigate)
    const handleViewMerchant = (merchant) => {
        selectMerchant(merchant.id); 
        toast.show(`Admin đang quản lý Merchant: ${merchant.name}. (Chuyển trang)`, 'info');
        
        // 2. Chuyển hướng đến Route chi tiết
        navigate(`/admin/merchants/${merchant.id}`); 
    };

    // Hành động tạo cửa hàng (giả lập)
    const handleCreateMerchant = () => {
        setLoading(true); 
        setTimeout(() => {
            const newId = `m00${merchants.length + 1}`;
            const newMerchant = {
                id: newId, 
                name: `Merchant Mới #${merchants.length + 1}`, 
                status: 'Pending', 
                ordersToday: 0, 
                owner: 'new.owner@example.com' 
            };
            setMerchants(prev => [...prev, newMerchant]);
            toast.show(`Đã tạo Merchant: ${newMerchant.name}`, 'success');
            setLoading(false); 
        }, 1000);
    };

    const MerchantCard = (merchant) => {
        const isSelected = merchant.id === selectedMerchantId;
        return (
            <div 
                key={merchant.id} 
                className="card"
                // Thêm viền nếu đang được chọn để admin dễ nhận biết
                style={isSelected ? { border: '2px solid #ff7a59' } : {}}
            >
                <div className="info-col">
                    <div className="name">
                        {merchant.name}
                        <span className={`status-pill ${merchant.status}`}>{merchant.status}</span>
                    </div>
                    <div className="owner">Owner: {merchant.owner}</div>
                </div>
                
                <div className="stats-col">
                    <div className="stat-box">
                        <div className="stat-value">{merchant.ordersToday}</div>
                        <div className="stat-label">Đơn hôm nay</div>
                    </div>
                    <button 
                        className="btn" 
                        style={isSelected ? { background: '#10b981' } : {}}
                        onClick={() => handleViewMerchant(merchant)}
                        disabled={loading}
                    >
                        {isSelected ? 'Đang Quản lý' : 'Xem Merchant'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-selector-wrap">
            <div className="admin-head">
                <h2>Quản lý Cửa hàng Merchant</h2>
                <button 
                    className="btn" 
                    onClick={handleCreateMerchant}
                    disabled={loading}
                >
                    {loading ? 'Đang tạo...' : '➕ Tạo cửa hàng Merchant'}
                </button>
            </div>

            <div className="list-grid">
                {merchants.length === 0 && (
                    <p style={{padding: 20, textAlign: 'center', color: '#666'}}>
                        Chưa có cửa hàng Merchant nào được tạo.
                    </p>
                )}
                {merchants.map(MerchantCard)}
            </div>
        </div>
    );
}