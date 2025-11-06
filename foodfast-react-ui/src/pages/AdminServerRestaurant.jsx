import { useEffect, useMemo, useState, useCallback } from "react";
// import { formatVND } from "../utils/format.js"; // Có thể bỏ nếu không dùng
import { useToast } from "../context/ToastContext.jsx";
import { useMerchantAdmin } from "../context/MerchantAdminContext.jsx"; // Sẽ tạo file này ở bước 2
import { useNavigate } from 'react-router-dom';
import { 
    fetchMerchants, 
    createMerchant, 
    updateMerchant, // Import hàm cập nhật
    deleteMerchant 
} from "../utils/merchantAPI.js"; 

export default function AdminServerRestaurant() {
    const [merchants, setMerchants] = useState([]); // ⬅️ State ban đầu là rỗng
    const [loading, setLoading] = useState(true);

    
    // ✅ KHAI BÁO HOOK BÊN TRONG COMPONENT
    const [merchantToDelete, setMerchantToDelete] = useState(null);
    const navigate = useNavigate(); 
    const { selectedMerchantId, selectMerchant } = useMerchantAdmin(); 
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
                const data = await fetchMerchants(); // Gọi API
                setMerchants(data);
            } catch (error) {
                toast.show('Lỗi tải danh sách Merchant.', 'error');
            } finally {
                setLoading(false);
            }
        }
        loadMerchants();
    }, []);

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


// 💡 BỔ SUNG: Logic Kích hoạt/Vô hiệu hóa (GỌI API)
const handleToggleActive = (merchantId, currentStatus) => {
    if (currentStatus !== 'Active' && currentStatus !== 'Inactive') {
        toast.show('Chỉ có thể Kích hoạt/Vô hiệu hóa Merchant đang Active hoặc Inactive.', 'error');
        return;
    }
    
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    
    // 1. Gọi API để cập nhật trạng thái
    updateMerchant(merchantId, { status: newStatus })
        .then(updatedMerchant => {
            // 2. Cập nhật State FE bằng dữ liệu trả về từ API
            setMerchants(prev => prev.map(m =>
                m.id === merchantId ? updatedMerchant : m
            ));
            toast.show(`🔄 Merchant ID: ${merchantId} đã chuyển sang trạng thái ${newStatus}.`, 'info');
        })
        .catch(() => toast.show(`Lỗi chuyển trạng thái sang ${newStatus}. Vui lòng thử lại.`, 'error'));
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
                    {/* 💡 NÚT HÀNH ĐỘNG DUYỆT (CHỈ HIỆN KHI status === 'Pending') */}
                    {merchant.status === 'Pending' && (
                        <>
                            <button 
                                className="btn" 
                                style={{background:'#2ecc71'}} // Màu xanh lá cho duyệt
                                onClick={() => handleApproveMerchant(merchant.id)} 
                                disabled={loading}
                            >
                                Duyệt
                            </button>
                            <button 
                                className="btn ghost" 
                                onClick={() => handleRejectMerchant(merchant.id)}
                                disabled={loading}
                            >
                                Từ chối
                            </button>
                        </>
                    )}

                    {/* 💡 NÚT HÀNH ĐỘNG KÍCH HOẠT/VÔ HIỆU HÓA (CHỈ HIỆN KHI Active/Inactive) */}
                    {(merchant.status === 'Active' || merchant.status === 'Inactive') && (
                        <button 
                            className="btn ghost"
                            // ... Logic Toggle Active/Inactive
                            onClick={() => handleToggleActive(merchant.id, merchant.status)}
                            disabled={loading}
                        >
                            {merchant.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                    )}
                    <button 
                        className="btn ghost" // Sử dụng class ghost để phân biệt
                        onClick={() => handleConfirmDelete(merchant)} // Mở hộp thoại xác nhận
                        disabled={loading}
                    >
                        Xóa
                    </button>
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
        <> 
        <style>{styles}</style>
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