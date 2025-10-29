// File: src/pages/RestaurantSettings.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../context/ToastContext.jsx';
// 💡 IMPORT API MỚI
import { fetchSettings, updateSettings, patchSettings } from '../utils/settingsAPI.js'; 


const DAYS_OF_WEEK = [
    { key: 'mon', label: 'Thứ 2' },
    { key: 'tue', label: 'Thứ 3' },
    { key: 'wed', label: 'Thứ 4' },
    { key: 'thu', label: 'Thứ 5' },
    { key: 'fri', label: 'Thứ 6' },
    { key: 'sat', label: 'Thứ 7' },
    { key: 'sun', label: 'Chủ Nhật' },
];

export default function RestaurantSettings() {
    // 💡 State ban đầu là null hoặc một object rỗng chờ load
    //const [settings, setSettings] = useState(null); 
    const [settings, setSettings] = useState({
        storeName: '',
        address: '',
        phone: '',
        isManuallyClosed: false,
        operatingHours: {
            mon: { open: null, close: null },
            tue: { open: null, close: null },
            wed: { open: null, close: null },
            thu: { open: null, close: null },
            fri: { open: null, close: null },
            sat: { open: null, close: null },
            sun: { open: null, close: null }
        }
    }); 
    const [isLoading, setIsLoading] = useState(true); // Bắt đầu là true để load
    const [isSaving, setIsSaving] = useState(false); // State riêng cho nút Save
    const toast = useToast();

    // 💡 LOAD CÀI ĐẶT TỪ API KHI MOUNT
    useEffect(() => {
        async function loadInitialSettings() {
            setIsLoading(true);
            try {
                const data = await fetchSettings();
                setSettings(data);
            } catch (error) {
                toast.show('❌ Lỗi tải cài đặt cửa hàng.', 'error');
                // Có thể set state mặc định nếu lỗi
                setSettings({ storeName: '', address: '', phone: '', isManuallyClosed: false, operatingHours: {} }); 
            } finally {
                setIsLoading(false);
            }
        }
        loadInitialSettings();
    }, []); // Chỉ chạy 1 lần

    // --- Xử lý Cập nhật Input (Giữ nguyên) ---
    const handleInfoChange = useCallback((e) => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleHourChange = useCallback((dayKey, type, value) => {
        const hour = parseInt(value, 10);

        // Xử lý khi input bị xóa hoặc nhập giá trị không hợp lệ
        if (value === '' || isNaN(hour) || hour < 0 || hour > 23) {
            // Quyết định cách xử lý giá trị rỗng/không hợp lệ:
            // Lựa chọn 1: Xóa giờ đó (set thành null hoặc undefined)
            setSettings(prev => {
                const currentOperatingHours = prev.operatingHours || {};
                const currentDayHours = currentOperatingHours[dayKey] || {};
                // Tạo object mới cho ngày đó, loại bỏ key 'open' hoặc 'close'
                const updatedDayHours = { ...currentDayHours };
                delete updatedDayHours[type]; // Hoặc set thành null: updatedDayHours[type] = null;
                
                // Nếu cả open và close đều bị xóa, có thể xóa luôn key của ngày đó
                if (Object.keys(updatedDayHours).length === 0) {
                    const updatedOperatingHours = { ...currentOperatingHours };
                    delete updatedOperatingHours[dayKey];
                    return { ...prev, operatingHours: updatedOperatingHours };
                    } else {
                        return {
                        ...prev,
                        operatingHours: {
                            ...currentOperatingHours,
                            [dayKey]: updatedDayHours
                        }
                    };
                }
            });
            return; // Dừng hàm tại đây
        }

        // Nếu giá trị hợp lệ, cập nhật state một cách an toàn
        setSettings(prev => {
            // Cung cấp object rỗng mặc định nếu operatingHours chưa có
            const currentOperatingHours = prev.operatingHours || {}; 
            // Cung cấp object rỗng mặc định nếu ngày đó chưa có lịch
            const currentDayHours = currentOperatingHours[dayKey] || {}; 

            return {
                ...prev,
                operatingHours: {
                    ...currentOperatingHours, // Giờ có thể yên tâm spread
                    [dayKey]: {
                        ...currentDayHours, // Giờ có thể yên tâm spread
                        [type]: hour // Set giá trị giờ mới
                    }
                }
            };
        });
    }, []); // Dependency

    // --- Xử lý Toggle Đóng/Mở Thủ Công (GỌI API PATCH) ---
    const handleToggleManualClose = async () => {
        if (!settings) return;
        const newState = !settings.isManuallyClosed;
        setIsSaving(true); // Dùng isSaving cho nút này
        try {
            // 1. Gọi API PATCH chỉ cập nhật trạng thái này
            await patchSettings({ isManuallyClosed: newState }); // Vẫn gọi API

            // 2. ✅ CẬP NHẬT STATE CỤC BỘ ĐÚNG CÁCH:
            //    Không dùng kết quả trả về từ API nữa.
            //    Giữ lại toàn bộ state cũ, chỉ thay đổi isManuallyClosed.
            setSettings(prev => ({
                ...prev, // Giữ lại storeName, address, operatingHours,...
                isManuallyClosed: newState // Chỉ cập nhật lại isManuallyClosed
            }));

            toast.show(newState ? '🟠 Cửa hàng đã TẠM ĐÓNG.' : '🟢 Cửa hàng đã MỞ LẠI.', 'info');
        } catch (error) {
            toast.show('❌ Lỗi cập nhật trạng thái đóng/mở.', 'error');
            // Nếu API lỗi, state settings sẽ không bị thay đổi
        } finally {
            setIsSaving(false);
        }
    };

    // --- Xử lý Lưu Tổng (GỌI API PUT - Giữ nguyên logic này) ---
    const handleSaveSettings = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            // Khi lưu tổng, dùng PUT và cập nhật toàn bộ state với response là hợp lý
            const updated = await updateSettings(settings);
            setSettings(updated); 
            toast.show('✅ Đã lưu cài đặt thành công!', 'success');
        } catch (error) {
            toast.show('❌ Lỗi! Không thể lưu cài đặt.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

// --- CSS Nội tuyến (Giữ nguyên) ---
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

    // 💡 HIỂN THỊ LOADING KHI CHƯA CÓ DỮ LIỆU
    if (isLoading) {
        return <div style={{ padding: 30, textAlign: 'center' }}>Đang tải cài đặt...</div>;
    }
    
    // 💡 Xử lý trường hợp không load được settings
    if (!settings) {
         return <div style={{ padding: 30, textAlign: 'center', color: 'red' }}>Không thể tải cài đặt cửa hàng.</div>;
    }

    return (
        <div style={styles.wrap}>
            <h1 style={{ textAlign: 'center', marginBottom: 30 }}>Cài đặt Cửa hàng</h1>

            {/* --- Trạng thái Đóng/Mở Thủ công --- */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Trạng thái Hoạt động</h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, color: settings.isManuallyClosed ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
                        {settings.isManuallyClosed ? '🔴 ĐANG TẠM ĐÓNG CỬA  ' : '🟢 Đang hoạt động theo lịch'}
                    </p>
                <button
                        style={{ ...styles.button, ...styles.closeButton   }} //Xóa ,display: 'none' nếu muốn hiển thị button này
                        onClick={handleToggleManualClose}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Đang xử lý...' : (settings.isManuallyClosed ? 'Mở cửa lại' : 'Tạm đóng cửa')}
                    </button>
                </div>
                <p style={{ fontSize: 13, color: '#666', marginTop: 5 }}>
                    Sử dụng nút này khi bạn cần đóng cửa đột xuất (quá tải, hết hàng, nghỉ lễ...). Trạng thái này sẽ ghi đè lên lịch hoạt động bên dưới.
                </p>
            </div>

            {/* --- Cập nhật Thông tin Cơ bản --- */}
            <div style={styles.section}>
                {/* ... (Các input: storeName, address, phone) ... */}
                 <h2 style={styles.sectionTitle}>Thông tin Cơ bản</h2>
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>Tên cửa hàng:</label>
                    <input type="text" name="storeName" value={settings.storeName} onChange={handleInfoChange} style={styles.input} />
                </div>
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>Địa chỉ:</label>
                    <input type="text" name="address" value={settings.address} onChange={handleInfoChange} style={styles.input} />
                </div>
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>Số điện thoại:</label>
                    <input type="tel" name="phone" value={settings.phone} onChange={handleInfoChange} style={styles.input} />
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
                        // Sử dụng ?? '' để hiển thị chuỗi rỗng nếu giá trị là null/undefined
                        value={settings.operatingHours?.[day.key]?.open ?? ''} 
                        onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
                        style={styles.hourInput}
                    />
                    <input
                        type="number"
                        min="0" max="23"
                        value={settings.operatingHours?.[day.key]?.close ?? ''} // Tương tự cho giờ đóng
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
                    disabled={isSaving} // Dùng isSaving
                >
                    {isSaving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                </button>
            </div>
        </div>
    );
}