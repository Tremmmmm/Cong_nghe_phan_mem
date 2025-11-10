import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMerchantAdmin } from '../context/MerchantAdminContext.jsx';
import { useToast } from '../context/ToastContext.jsx';


export default function AdminMerchantDetail() {
    const { merchantId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { selectedMerchantId, clearSelection } = useMerchantAdmin();
    
    // Tìm Merchant đang được chọn
    const initialMerchant = ALL_MERCHANTS.find(m => m.id === merchantId);

    const [merchant, setMerchant] = useState(initialMerchant);
    const [formData, setFormData] = useState(merchant || {});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!merchant) {
            toast.show('Merchant không tồn tại.', 'error');
            navigate('/admin/restaurant_managerment', { replace: true });
        }
        // Đảm bảo Merchant đang được chọn trong Context khớp với trang này
        if (selectedMerchantId !== merchantId) {
             // Logic trong thực tế: Tải lại dữ liệu Merchant từ API bằng merchantId
        }
    }, [merchant, merchantId, selectedMerchantId, navigate, toast]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = () => {
        // 💡 Giả lập lưu dữ liệu và cập nhật State
        setMerchant(formData); 
        
        // 💡 Trong thực tế: Gọi API PUT/PATCH để cập nhật Merchant
        
        toast.show(`✅ Đã cập nhật Merchant: ${formData.name}`, 'success');
        setIsEditing(false);
    };

    if (!merchant) return null;

    return (
        <div style={{ maxWidth: 800, margin: '24px auto', padding: 20 }}>
            <button 
                onClick={() => { clearSelection(); navigate('/admin/restaurant_managerment'); }}
                style={{ marginBottom: 20, padding: 8, background: 'none', border: '1px solid #ccc', borderRadius: 8, cursor: 'pointer' }}
            >
                ← Quay lại Danh sách Merchant
            </button>
            
            <h1 style={{fontSize: 32, marginBottom: 10}}>{merchant.name} ({merchant.id})</h1>
            <p style={{color: '#666', marginBottom: 20}}>Quản lý chi tiết hồ sơ và hợp đồng.</p>

            {/* Thông tin Hợp đồng và Trạng thái */}
            <div style={sectionStyle}>
                <h2>Thông tin Pháp lý & Hợp đồng</h2>
                <p><strong>Trạng thái:</strong> <span style={{ padding: '4px 10px', borderRadius: 999, background: merchant.status === 'Active' ? '#e6ffed' : '#fff1f0', color: merchant.status === 'Active' ? '#27ae60' : '#e74c3c' }}>{merchant.status}</span></p>
                <p><strong>Hợp đồng (Bắt đầu/Kết thúc):</strong> {merchant.contract || 'Chưa xác định'}</p>
                <p><strong>Chủ sở hữu:</strong> {merchant.owner}</p>
            </div>

            {/* Thông tin Cơ bản (Có thể chỉnh sửa) */}
            <div style={sectionStyle}>
                <h2>Cập nhật Thông tin Cơ bản</h2>
                <form>
                    {renderField('name', 'Tên quán', formData.name, handleChange, isEditing)}
                    {renderField('address', 'Địa chỉ chính xác', formData.address, handleChange, isEditing)}
                    {renderField('phone', 'Số điện thoại liên hệ', formData.phone, handleChange, isEditing)}
                    
                    <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                        {isEditing ? (
                            <>
                                <button type="button" onClick={handleSave} style={{...buttonStyle, background: '#10b981'}}>Lưu thay đổi</button>
                                <button type="button" onClick={() => { setIsEditing(false); setFormData(merchant); }} style={buttonStyle}>Hủy</button>
                            </>
                        ) : (
                            <button type="button" onClick={() => setIsEditing(true)} style={buttonStyle}>Chỉnh sửa</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

// Hàm render Field
const renderField = (name, label, value, onChange, isEditing) => (
    <div key={name} style={{ marginBottom: 15 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 5 }}>{label}</label>
        <input
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            readOnly={!isEditing}
            style={{ 
                width: '100%', 
                padding: 10, 
                border: isEditing ? '1px solid #3498db' : '1px solid #eee', 
                borderRadius: 8, 
                background: isEditing ? '#fff' : '#f7f7f7'
            }}
        />
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
const buttonStyle = {
    padding: '10px 15px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    background: '#3498db',
    color: '#fff'
};