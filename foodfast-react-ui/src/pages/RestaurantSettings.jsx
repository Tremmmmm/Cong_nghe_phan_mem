import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchSettings, updateSettings, patchSettings } from '../utils/settingsAPI.js'; // Đảm bảo đã import đủ

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Thứ 2' }, { key: 'tue', label: 'Thứ 3' }, { key: 'wed', label: 'Thứ 4' },
  { key: 'thu', label: 'Thứ 5' }, { key: 'fri', label: 'Thứ 6' }, { key: 'sat', label: 'Thứ 7' }, { key: 'sun', label: 'Chủ Nhật' },
];

// Cấu trúc dữ liệu mặc định
const DEFAULT_SETTINGS = {
    storeName: '', address: '', phone: '', logo: '', isManuallyClosed: false, // 💡 Thêm 'logo'
    operatingHours: {
        mon: { open: null, close: null }, tue: { open: null, close: null },
        wed: { open: null, close: null }, thu: { open: null, close: null },
        fri: { open: null, close: null }, sat: { open: null, close: null },
        sun: { open: null, close: null }
    }
};

export default function RestaurantSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();
  
  const { user, isMerchant } = useAuth();
  const merchantId = isMerchant ? user.merchantId : null;

  useEffect(() => {
    if (merchantId) {
        setIsLoading(true);
        fetchSettings(merchantId)
            .then(data => {
                // Nếu data tồn tại trong DB, dùng nó. Nếu không, giữ state default.
                // Đảm bảo các trường cũ trong DEFAULT_SETTINGS không bị mất
                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
                } else {
                    setSettings(prev => ({ ...prev, id: merchantId })); // Đảm bảo có ID cho PUT nếu chưa có
                }
            })
            .catch(() => toast.show('Lỗi tải cài đặt cửa hàng.', 'error'))
            .finally(() => setIsLoading(false));
    } else if (!isMerchant) {
        setIsLoading(false);
        toast.show("Bạn không có quyền truy cập trang này.", "error");
    }
  }, [merchantId, toast, isMerchant]); // Thêm isMerchant vào dependency

  const handleInfoChange = useCallback((e) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleHourChange = useCallback((dayKey, type, value) => {
    const hour = parseInt(value, 10);
    const val = (value === '' || isNaN(hour) || hour < 0 || hour > 23) ? null : hour;
    setSettings(prev => ({
      ...prev,
      operatingHours: { ...(prev.operatingHours || {}), [dayKey]: { ...(prev.operatingHours?.[dayKey] || {}), [type]: val } }
    }));
  }, []);

  const handleToggleManualClose = async () => {
    if (!merchantId) return;
    const newState = !settings.isManuallyClosed;
    setIsSaving(true);
    try {
      await patchSettings(merchantId, { isManuallyClosed: newState });
      setSettings(prev => ({ ...prev, isManuallyClosed: newState }));
      toast.show(newState ? '🟠 Cửa hàng đã TẠM ĐÓNG.' : '🟢 Cửa hàng đã MỞ LẠI.', 'info');
    } catch (error) {
      toast.show('❌ Lỗi cập nhật trạng thái.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!merchantId) return;
    setIsSaving(true);
    try {
      const updated = await updateSettings(merchantId, settings);
      setSettings(updated);
      toast.show('✅ Đã lưu cài đặt thành công!', 'success');
    } catch (error) {
      toast.show('❌ Lỗi! Không thể lưu cài đặt.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- CSS (Giữ nguyên) ---
  const styles = useMemo(() => {
    const isClosed = settings ? settings.isManuallyClosed : false;
    return { 
      wrap: { maxWidth: 800, margin: '24px auto', padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #eee' },
      section: { marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' },
      sectionTitle: { fontSize: 20, fontWeight: 700, marginBottom: 15, color: '#333' },
      fieldGroup: { marginBottom: 15 },
      label: { display: 'block', fontWeight: 600, marginBottom: 5, color: '#555' },
      input: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14 },
      button: { padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'background-color 0.2s' },
      saveButton: { background: '#27ae60', color: '#fff' },
      closeButton: { background: isClosed ? '#e74c3c' : '#f39c12', color: '#fff', marginLeft: 10 },
      hourRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
      hourLabel: { minWidth: 60, fontWeight: 500 },
      hourInput: { width: 60, padding: '5px 8px', border: '1px solid #ccc', borderRadius: 6 },
    };
  }, [settings]);

  if (!isMerchant) {
    return <div style={{ padding: 30, textAlign: 'center', color: 'red' }}>Truy cập bị từ chối. Bạn phải là Merchant để xem trang này.</div>;
  }
  if (isLoading) {
    return <div style={{ padding: 30, textAlign: 'center' }}>Đang tải cài đặt cửa hàng...</div>;
  }
  
  return (
    <div style={styles.wrap}>
      <h1 style={{ textAlign: 'center', marginBottom: 30 }}>Cài đặt Cửa hàng</h1>
      <h3 style={{ textAlign: 'center', marginTop: -20, marginBottom: 20, color: '#555' }}>
          ({merchantId})
      </h3>

      {/* --- Trạng thái Đóng/Mở Thủ công ---
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Trạng thái Hoạt động</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, color: settings.isManuallyClosed ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
            {settings.isManuallyClosed ? '🔴 ĐANG TẠM ĐÓNG CỬA' : '🟢 Đang hoạt động'}
          </p>
          <button
            style={{ ...styles.button, ...styles.closeButton }}
            onClick={handleToggleManualClose}
            disabled={isSaving}
          >
            {isSaving ? 'Đang xử lý...' : (settings.isManuallyClosed ? 'Mở cửa lại' : 'Tạm đóng cửa')}
          </button>
        </div>
      </div> */}

      {/* --- Cập nhật Thông tin Cơ bản --- */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Thông tin Cơ bản</h2>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tên cửa hàng:</label>
          <input type="text" name="storeName" value={settings.storeName || ''} onChange={handleInfoChange} style={styles.input} />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Địa chỉ:</label>
          <input type="text" name="address" value={settings.address || ''} onChange={handleInfoChange} style={styles.input} />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Số điện thoại:</label>
          <input type="tel" name="phone" value={settings.phone || ''} onChange={handleInfoChange} style={styles.input} />
        </div>
        {/* 💡 THÊM TRƯỜNG LOGO */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>URL Logo (Ví dụ: https://example.com/logo.png):</label>
          <input type="url" name="logo" value={settings.logo || ''} onChange={handleInfoChange} style={styles.input} placeholder="Dán URL hình ảnh logo của bạn vào đây" />
          {settings.logo && (
            <div style={{marginTop: '10px', textAlign: 'center'}}>
                <img src={settings.logo} alt="Logo Preview" style={{maxWidth: '100px', maxHeight: '80px', border: '1px solid #eee', padding: '5px'}} onError={(e)=>{e.target.style.display='none'}}/>
                <p style={{fontSize: '12px', color: '#777'}}>Xem trước logo</p>
            </div>
          )}
        </div>
      </div>

      {/* --- Thiết lập Giờ Hoạt động --- */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Giờ Hoạt động Hàng tuần</h2>
        {DAYS_OF_WEEK.map(day => (
          <div key={day.key} style={styles.hourRow}>
            <span style={styles.hourLabel}>{day.label}:</span>
            <span>Mở từ:</span>
            <input
              type="number"
              min="0" max="23"
              value={settings.operatingHours?.[day.key]?.open ?? ''}
              onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
              style={styles.hourInput}
            />
            <span>Đóng:</span>
            <input
              type="number"
              min="0" max="23"
              value={settings.operatingHours?.[day.key]?.close ?? ''}
              onChange={(e) => handleHourChange(day.key, 'close', e.target.value)}
              style={styles.hourInput}
            />
            <span>giờ</span>
          </div>
        ))}
      </div>

      {/* --- Nút Lưu Tổng --- */}
      <div style={{ textAlign: 'right' }}>
        <button
          style={{ ...styles.button, ...styles.saveButton }}
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Đang lưu...' : 'Lưu Thay đổi'}
        </button>
      </div>
    </div>
  );
}