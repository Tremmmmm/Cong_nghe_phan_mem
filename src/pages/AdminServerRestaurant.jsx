import { useEffect, useMemo, useState, useCallback } from "react";
// import { formatVND } from "../utils/format.js"; // Có thể bỏ nếu không dùng
import { useToast } from "../context/ToastContext.jsx"; 
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext.jsx";
import { 
    fetchMerchants, 
    createMerchant, 
    updateMerchant, // Import hàm cập nhật
    deleteMerchant,
    // 💡 1. Import API_BASE_URL từ file API
    API_BASE_URL 
} from "../utils/merchantAPI.js";

export default function AdminServerRestaurant() {
    const [merchants, setMerchants] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [merchantToDelete, setMerchantToDelete] = useState(null);
    
    const navigate = useNavigate();  
    const { currentUser } = useAuth();
    const toast = useToast();

    const styles = useMemo( 
        () => `
        .admin-selector-wrap{max-width:1140px;margin:24px auto;padding:0 16px}
        
        /* 💡 HEADER */
        .admin-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px; flex-wrap: wrap;}
        .admin-head h2{margin:0;font-size:24px; flex: 1 1 100%;} /* Tiêu đề full width */
        .admin-head button { flex: 1 1 auto; max-width: 250px; } /* Nút bấm co giãn */

        /* 💡 LIST - Mobile 1 cột */
        .list-grid{display:grid;gap:16px; grid-template-columns: 1fr;}
        @media (min-width: 768px) {
            .list-grid{grid-template-columns: repeat(2, minmax(300px, 1fr));} /* Desktop 2 cột */
        }
        
        /* 💡 CARD STYLE */
        .card{
            border:1px solid #eee;border-radius:14px;overflow:hidden;background:#fff;
            padding:16px;display:flex;align-items:center;justify-content:space-between;
            flex-direction: column; /* Xếp hàng dọc trên mobile */
        }
        .info-col{flex-grow:1; width: 100%;}
        .name{font-weight:700;font-size:18px;margin-bottom:4px}
        .owner{color:#666;font-size:13px}
        
        /* 💡 STATS/ACTIONS COLUMN */
        .stats-col{
            display:flex;
            gap:10px; /* Giảm gap */
            align-items:center;
            width: 100%; /* Full width trên mobile */
            justify-content: flex-end;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #eee;
        }

        .btn{border:none;background:#ff7a59;color:#fff;border-radius:10px;padding:8px 12px;cursor:pointer;font-weight:600; font-size: 13px;}
        .ghost{border:1px solid #ddd;background:#fff;color:#111; padding: 8px 12px;}
        .status-pill{
            display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;
            font-weight:600;margin-left:8px;
            white-space: nowrap; /* Tránh xuống dòng */
        }
        .status-pill.Active{background:#e6ffed;color:#1890ff}
        .status-pill.Inactive, .status-pill.Closed{background:#fff1f0;color:#f5222d}
        .status-pill.Pending{background:#fffbe6;color:#faad14}

        .dark .card{background:#151515;border-color:#333}
        .dark .owner{color:#aaa}
        .dark .ghost{background:#111;color:#eee;border-color:#333}
        .dark .status-pill.Active{background:#1f3d3d;color:#73d13d}
        .dark .status-pill.Inactive, .dark .status-pill.Closed{background:#4d1c1c;color:#ff7875}
        .dark .status-pill.Pending{background:#4d3d1c;color:#ffc53d}
        
        .modal-content{
            background:#fff;padding:25px;border-radius:12px;width:100%;max-width:400px;
            box-shadow:0 5px 15px rgba(0,0,0,0.3);
        }
        .dark .modal-content{background:#222;color:#eee;}

        /* 💡 MOBILE OVERRIDES */
        @media (max-width: 600px) {
            .admin-head button { 
                flex: 1 1 48%; /* Nút tạo merchant chiếm 1/2 màn hình */
                max-width: 100%;
            }
            .stats-col button {
                flex: 1 1 auto; /* Các nút hành động không full width nữa, để chúng co giãn */
                min-width: 80px;
            }
        }
        `,
        []
    );
    // Dùng style object cho tiện
    const modalOverlayStyle = useMemo(()=>({
        position:'fixed', top:0, left:0, right:0, bottom:0,
        background:'rgba(0,0,0,0.5)', display:'grid', placeItems:'center', zIndex:1000
    }), []);
    const modalContentStyle = useMemo(()=>({
        background:'#fff', padding:'25px', borderRadius:'12px', width:'100%', maxWidth:'400px',
        boxShadow:'0 5px 15px rgba(0,0,0,0.3)'
    }), []);

    useEffect(() => {
        async function loadMerchants() {
            try {
                // Đang gọi fetchMerchants (trỏ đến /restaurantSettings)
                const data = await fetchMerchants(); 
                setMerchants(data);
            } catch (error) {
                toast.show('Lỗi tải danh sách Merchant.', 'error');
            } finally {
                setLoading(false);
            }
        }
        loadMerchants();
    }, [toast]);

    // Hành động xem chi tiết (Đã sửa để dùng navigate)
    const handleViewMerchant = (merchant) => {
        // Dùng storeName (hoặc id) để thông báo
        toast.show(`Admin đang xem Merchant: ${merchant.storeName || merchant.id}.`, 'info');
        navigate(`/admin/merchants/${merchant.id}`);  
    };

    // Hành động tạo cửa hàng (giả lập)
    // 💡 SỬA LẠI HÀM NÀY
    const handleCreateMerchant = async () => {
        setLoading(true);
        
        // 1. Chuẩn bị dữ liệu cơ bản
        // (ID, tên... sẽ được tạo bên trong hàm createMerchant)
        const newMerchantData = {
            owner: 'new.owner@example.com' 
            // Bạn có thể thêm 'name' ở đây nếu muốn
            // name: `Cửa hàng Mới (từ Admin)` 
        };
        
        try {
            // 2. CHỈ GỌI MỘT HÀM createMerchant
            // (Vì file merchantAPI.js đã tự tạo cả 2 bản ghi)
            const finalNewEntry = await createMerchant(newMerchantData);

            // 3. Cập nhật UI
            setMerchants(prev => [...prev, finalNewEntry]);
            toast.show(`✅ Đã tạo Merchant: ${finalNewEntry.storeName}`, 'success');

        } catch (error) {
            console.error("Lỗi tạo Merchant:", error);
            toast.show('Lỗi tạo Merchant. Vui lòng thử lại.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Hành động xóa (GỌI API DELETE)
    const handleDeleteMerchant = useCallback(() => {
        if (!merchantToDelete) return;
        
        deleteMerchant(merchantToDelete.id) // GỌI API DELETE
            .then(() => {
                // Cập nhật FE sau khi BE xác nhận xóa
                setMerchants(prev => prev.filter(m => m.id !== merchantToDelete.id)); 
                toast.show(`✅ Đã xóa Merchant: ${merchantToDelete.name}.`, 'success');
            })
            .catch(() => toast.show('Lỗi xóa Merchant. Vui lòng thử lại.', 'error'))
            .finally(() => setMerchantToDelete(null));
    }, [merchantToDelete, toast]);


    // Hành động thay đổi trạng thái (GỌI API PUT/PATCH)
    const handleApproveMerchant = (merchantId) => {
        updateMerchant(merchantId, { status: 'Active' }) // GỌI API PATCH
            .then(updatedMerchant => {
                setMerchants(prev => prev.map(m =>
                    m.id === merchantId ? updatedMerchant : m
                ));
                toast.show(`✅ Đã DUYỆT Merchant ID: ${merchantId}.`, 'success');
            })
            .catch(() => toast.show('Lỗi duyệt Merchant.', 'error'));
    };


const handleRejectMerchant = (merchantId) => {
    // 1. Gọi API để cập nhật trạng thái
    updateMerchant(merchantId, { status: 'Rejected' })
        .then(updatedMerchant => {
            // 2. Cập nhật State FE bằng dữ liệu trả về từ API
            setMerchants(prev => prev.map(m =>
                m.id === merchantId ? updatedMerchant : m
            ));
            toast.show(`❌ Đã TỪ CHỐI Merchant ID: ${merchantId}. Chuyển sang Rejected.`, 'warning');
        })
        .catch(() => toast.show('Lỗi từ chối Merchant. Vui lòng thử lại.', 'error'));
};

const handleCancelDelete = () => setMerchantToDelete(null); // Hàm helper
    const handleConfirmDelete = (merchant) => setMerchantToDelete(merchant); // Hàm helper


    // 💡 SỬA LẠI: Logic "Khóa/Mở" cửa hàng (dùng isManuallyClosed)
    const handleToggleLock = (merchantId, isCurrentlyClosed) => {
        const newClosedState = !isCurrentlyClosed; 
        
        updateMerchant(merchantId, { isManuallyClosed: newClosedState })
            .then(updatedMerchantSettings => {
                // Cập nhật lại state với dữ liệu setting mới
                setMerchants(prev => prev.map(m =>
                    m.id === merchantId ? { ...m, ...updatedMerchantSettings } : m
                ));
                if (newClosedState) {
                    toast.show(`❌ Đã TẠM KHÓA Merchant ID: ${merchantId}.`, 'warning');
                } else {
                    toast.show(`✅ Đã MỞ KHÓA Merchant ID: ${merchantId}.`, 'success');
                }
            })
            .catch(() => toast.show(`Lỗi cập nhật trạng thái. Vui lòng thử lại.`, 'error'));
    };


    // 💡 SỬA LẠI: Card hiển thị đúng thông tin
    const MerchantCard = (merchant) => {
        
        const isLocked = merchant.isManuallyClosed; 
        
        return (
            // 💡 Thẻ chính giờ là Flex Column trên Mobile
            <div key={merchant.id} className="card">
                <div className="info-col">
                    <div className="name">
                        {merchant.storeName || merchant.name} 
                        
                        <span 
                            // 💡 Hiển thị trạng thái Locked/Active dựa trên isManuallyClosed
                            className={`status-pill ${isLocked ? 'Inactive Closed' : 'Active'}`} 
                            title="Trạng thái "
                        >
                            {/* 💡 SỬA: Hiển thị trạng thái duyệt API hoặc trạng thái khóa thủ công */}
                            {(merchant.status !== 'Active' && merchant.status !== 'Pending') ? 'Bị từ chối' : (isLocked ? 'Đã khóa' : 'Đang hoạt động')}
                        </span> 
                    </div>
                    {/* 💡 Hiển thị owner (từ /merchants) */}
                    <div className="owner">Owner: {merchant.owner || 'N/A'}</div> 
                </div>
                
                {/* 💡 STATS-COL: Chứa các nút bấm */}
                <div className="stats-col">
                    {/* 💡 NÚT KHÓA/MỞ */}
                    <button 
                        className="btn ghost"
                        onClick={() => handleToggleLock(merchant.id, merchant.isManuallyClosed)}
                        disabled={loading}
                        style={isLocked ? {borderColor: '#e74c3c', color: '#e74c3c'} : {borderColor: '#2ecc77', color: '#2ecc77'}}
                    >
                        {isLocked ? 'Mở khóa' : 'Tạm khóa'}
                    </button>
                    
                    <button 
                        className="btn ghost"
                        onClick={() => handleConfirmDelete(merchant)} 
                        disabled={loading}
                    >
                        Xóa
                    </button>
                    <button 
                        className="btn"
                        onClick={() => handleViewMerchant(merchant)}
                        disabled={loading}
                    >
                        Xem Merchant
                    </button>
                </div>
            </div>
        );
    };

    return (
        <> 
        {/* 💡 Inject style CSS String */}
        <style>{styles}</style>
        <div className="admin-selector-wrap">
            <div className="admin-head">
                    <div>
                    <h2>Quản lý Cửa hàng Merchant</h2>
                    <div style={{ fontSize: 14, color: '#333' }}>
                            Đã đăng nhập với tư cách: <b>{currentUser.name} (SuperAdmin)</b>
                            </div>
                    </div>
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
        {/* HỘP THOẠI XÁC NHẬN XÓA (Modal) */}
        {merchantToDelete && (
            <div style={modalOverlayStyle}>
                <div style={modalContentStyle}>
                    <h3 style={{marginTop:0}}>Xác nhận xóa Merchant</h3>
                    <p>
                        Bạn có chắc chắn muốn <b> XÓA </b> cửa hàng 
                        <b> {merchantToDelete.name} ({merchantToDelete.id})</b> không? 
                        Hành động này không thể hoàn tác.
                    </p>
                    <div style={{display:'flex', justifyContent:'flex-end', gap:10}}>
                        <button 
                            className="btn ghost" 
                            onClick={handleCancelDelete}
                        >
                            Hủy
                        </button>
                        <button 
                            className="btn" 
                            style={{background:'#e74c3c'}} // Màu đỏ cho hành động nguy hiểm
                            onClick={handleDeleteMerchant}
                        >
                            Xóa ngay
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}