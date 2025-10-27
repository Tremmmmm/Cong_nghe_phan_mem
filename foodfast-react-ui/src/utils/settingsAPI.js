// File: src/utils/settingsAPI.js

// 💡 URL CỦA JSON-SERVER CHO CÀI ĐẶT
const API_URL = 'http://localhost:5181/restaurantSettings'; // Endpoint cho đối tượng cài đặt

/**
 * [GET] Lấy cài đặt cửa hàng hiện tại
 * @returns {Promise<object>}
 */
export async function fetchSettings() {
    try {
        const response = await fetch(API_URL); // Gọi GET /restaurantSettings
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // json-server có thể trả về đối tượng trực tiếp nếu endpoint không phải mảng
        return data; 
    } catch (error) {
        console.error("Error fetching settings:", error);
        throw error;
    }
}

/**
 * [PUT] Cập nhật toàn bộ cài đặt cửa hàng
 * @param {object} updatedSettings - Đối tượng cài đặt đầy đủ
 * @returns {Promise<object>}
 */
export async function updateSettings(updatedSettings) {
    try {
        // Với đối tượng đơn lẻ, json-server dùng PUT để ghi đè toàn bộ
        const response = await fetch(API_URL, { 
            method: 'PUT', // Hoặc PATCH nếu json-server hỗ trợ cho object đơn lẻ
            headers: {
                'Content-Type': 'application/json',
            },
            // Đảm bảo gửi cả ID cố định nếu PUT yêu cầu
            body: JSON.stringify({ ...updatedSettings, id: "main_settings" }), 
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; // Trả về cài đặt đã được cập nhật
    } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
    }
}

/**
 * [PATCH] Cập nhật một phần cài đặt (ví dụ: chỉ trạng thái đóng/mở)
 * @param {object} partialUpdate - Đối tượng chỉ chứa các trường cần cập nhật
 * @returns {Promise<object>}
 */
export async function patchSettings(partialUpdate) {
    try {
        const response = await fetch(API_URL, { 
            method: 'PATCH', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(partialUpdate), 
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; 
    } catch (error) {
        console.error("Error patching settings:", error);
        throw error;
    }
}