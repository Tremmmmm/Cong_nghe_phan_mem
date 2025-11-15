import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
// 💡 Import 2 hàm API mới
import { fetchMerchantSettingById, fetchMerchantContractById } from '../utils/merchantAPI.js'; 

export default function AdminMerchantDetail() {
    const { merchantId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    
    const [merchant, setMerchant] = useState(null); // Dữ liệu gộp
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadMerchantData() {
            setLoading(true);
            try {
                // 💡 GỌI CẢ 2 API SONG SONG
                const [settingsData, contractData] = await Promise.all([
                    fetchMerchantSettingById(merchantId), // Lấy /restaurantSettings/:id
                    fetchMerchantContractById(merchantId) // Lấy /merchants/:id
                ]);

                // Gộp 2 object lại
                const mergedData = { 
                    ...contractData, // Dữ liệu pháp lý (từ /merchants)
                    ...settingsData, // Dữ liệu cài đặt (từ /restaurantSettings)
                    id: merchantId   // Đảm bảo ID đúng
                };
                
                setMerchant(mergedData);

            } catch (error) {
                console.error("Lỗi tải chi tiết merchant:", error);
                toast.show('Không tìm thấy merchant hoặc có lỗi xảy ra.', 'error');
                navigate('/admin/merchants', { replace: true });
            } finally {
                setLoading(false);
            }
        }
        
        loadMerchantData();
    }, [merchantId, navigate, toast]);

    if (loading || !merchant) {
        return <div style={{padding: 30, textAlign: 'center'}}>Đang tải chi tiết merchant...</div>;
    }

    // 💡 Giao diện Read-Only cho Super Admin
    return (
        <div style={{ maxWidth: 800, margin: '24px auto', padding: 20 }}>
            <button 
                onClick={() => navigate('/admin/merchants')}
                style={{ marginBottom: 20, padding: 8, background: 'none', border: '1px solid #ccc', borderRadius: 8, cursor: 'pointer' }}
            >
                ← Quay lại Danh sách
            </button>
            
            {/* 💡 Dùng 'name' từ /merchants hoặc 'storeName' từ /restaurantSettings */}
            <h1 style={{fontSize: 32, marginBottom: 10}}>{merchant.name || merchant.storeName}</h1>
            <p style={{color: '#666', marginBottom: 20}}>
                Quản lý chi tiết hồ sơ và hợp đồng (ID: {merchant.id})
            </p>

            {/* ⬇️ THÔNG TIN PHÁP LÝ (TỪ /merchants) */}
            <div style={sectionStyle}>
                <h2>Thông tin Pháp lý & Hợp đồng</h2>
                    
                {renderReadOnlyField('Hợp đồng (Bắt đầu/Kết thúc)', merchant.contract)}
                {renderReadOnlyField('Chủ sở hữu (ID Tài khoản)', merchant.owner)}
            </div>
            
            {/* ⬇️ THÔNG TIN TRẠNG THÁI (TỪ /restaurantSettings) */}
            <div style={sectionStyle}>
                <h2>Trạng thái Hoạt động</h2>
                <p>
                    <strong>Trạng thái:</strong> 
                    <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 999, 
                        marginLeft: 10,
                        background: merchant.isManuallyClosed ? '#fff1f0' : '#e6ffed', 
                        color: merchant.isManuallyClosed ? '#e74c3c' : '#27ae60' 
                    }}>
                        {merchant.isManuallyClosed ? 'Đã khóa (Tạm đóng)' : 'Đang hoạt động'}
                    </span>
                </p>
            </div>

            {/* ⬇️ THÔNG TIN CỬA HÀNG (TỪ /restaurantSettings) */}
            <div style={sectionStyle}>
                <h2>Thông tin Cửa hàng</h2>
                {renderReadOnlyField('Tên quán', merchant.storeName)}
                {renderReadOnlyField('Địa chỉ', merchant.address)}
                {renderReadOnlyField('Số điện thoại', merchant.phone)}
                {renderReadOnlyField('Logo URL', merchant.logo, true)}
                {merchant.logo && (
                    <img src={merchant.logo} alt="Logo" style={{maxWidth: 150, borderRadius: 8, marginTop: 10}} />
                )}
            </div>

             {/* ⬇️ THÔNG TIN GIỜ MỞ CỬA (TỪ /restaurantSettings) */}
            <div style={sectionStyle}>
                <h2>Giờ Hoạt động </h2>
                {merchant.operatingHours ? (
                    Object.entries(merchant.operatingHours).map(([day, hours]) => (
                        renderReadOnlyField(
                            day.charAt(0).toUpperCase() + day.slice(1), 
                            `Mở: ${hours.open}h - Đóng: ${hours.close}h`
                        )
                    ))
                ) : (
                    <p>Chưa cập nhật giờ hoạt động.</p>
                )}
            </div>
        </div>
    );
}

// Hàm render field READ-ONLY
const renderReadOnlyField = (label, value, isUrl = false) => (
    <div key={label} style={{ marginBottom: 15 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: 14, color: '#333' }}>
            {label}
        </label>
        {isUrl ? (
            <a href={value} target="_blank" rel="noopener noreferrer" style={{color: '#3498db', wordBreak: 'break-all'}}>
                {value || 'N/A'}
            </a>
        ) : (
            <p style={{ 
                margin: 0, 
                padding: 10, 
                border: '1px solid #eee', 
                borderRadius: 8, 
                background: '#f7f7f7',
                color: '#111'
            }}>
                {value || 'N/A'}
            </p>
        )}
    </div>
);

// CSS cho chi tiết
const sectionStyle = {
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    background: '#fff'
};