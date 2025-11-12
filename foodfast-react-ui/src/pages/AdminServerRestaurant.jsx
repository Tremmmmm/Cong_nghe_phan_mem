import { useEffect, useMemo, useState, useCallback } from "react";
// import { formatVND } from "../utils/format.js"; // Có thể bỏ nếu không dùng
import { useToast } from "../context/ToastContext.jsx"; 
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext.jsx";
import { 
    fetchMerchants, 
    createMerchant, 
    updateMerchant, // Import hàm cập nhật
    deleteMerchant 
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
        .modal-overlay{
            position:fixed;top:0;left:0;right:0;bottom:0;f
            background:rgba(0,0,0,0.5);display:grid;place-items:center;z-index:1000;
        }
        .modal-content{
            background:#fff;padding:25px;border-radius:12px;width:100%;max-width:400px;
            box-shadow:0 5px 15px rgba(0,0,0,0.3);
        }
        .dark .modal-content{background:#222;color:#eee;}
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
    const handleCreateMerchant = () => {
        setLoading(true); 
        const newMerchantData = {
            name: `Merchant Mới (API) #${merchants.length + 1}`, 
            owner: 'new.owner@example.com' 
        };
        
        createMerchant(newMerchantData) // GỌI API
            .then(newMerchant => {
                setMerchants(prev => [...prev, newMerchant]);
                toast.show(`✅ Đã tạo Merchant: ${newMerchant.name}`, 'success');
            })
            .catch(() => toast.show('Lỗi tạo Merchant.', 'error'))
            .finally(() => setLoading(false));
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
        
        // Lấy trạng thái Khóa (từ /restaurantSettings)
        const isLocked = merchant.isManuallyClosed; 
        
        return (
            <div key={merchant.id} className="card">
                <div className="info-col">
                    <div className="name">
                        {/* 💡 Dùng storeName (từ settings) hoặc name (từ merchants) */}
                        {merchant.storeName || merchant.name} 
                        
                        {/* 💡 Hiển thị cả 2 trạng thái */}
                        <span 
                            className={`status-pill ${isLocked ? 'Closed' : 'Active'}`} 
                            title="Trạng thái "
                        >
                            {isLocked ? 'Đã khóa' : 'Đang hoạt động'}
                        </span> 
                    </div>
                    {/* 💡 Hiển thị owner (từ /merchants) */}
                    <div className="owner">Owner: {merchant.owner || 'N/A'}</div> 
                </div>
                
                <div className="stats-col">
                    {/* ... (Các nút duyệt/từ chối, nếu bạn vẫn cần) ... */}
                    
                    {/* 💡 NÚT KHÓA/MỞ (Nghiệp vụ Super Admin) */}
                    <button 
                        className="btn ghost"
                        onClick={() => handleToggleLock(merchant.id, merchant.isManuallyClosed)}
                        disabled={loading}
                        style={isLocked ? {borderColor: '#2ecc71', color: '#2ecc71'} : {}}
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