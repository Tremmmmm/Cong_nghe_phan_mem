// File: src/utils/merchantAPI.js

// 💡 URL CỦA JSON-SERVER (Đảm bảo cổng khớp với lúc bạn chạy)
const API_URL = 'http://localhost:5181/merchants'; 
const API_URL_MENUITEMS = 'http://localhost:5181/menuitems';

// --------------------------------------------------------
// CÁC HÀM GỌI API ĐẾN JSON-SERVER
// --------------------------------------------------------

/**
 * [GET] Lấy danh sách Merchant
 */
export async function fetchMerchants() {
    try {
        const response = await fetch(API_URL); // Gọi GET /merchants
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; // Trả về mảng merchants
    } catch (error) {
        console.error("Error fetching merchants:", error);
        throw error; // Ném lỗi để component xử lý
    }
}
export async function fetchMenuItems() {  
    try {
        const response = await fetch(API_URL_MENUITEMS); // ⬅️ Gọi GET /menuitems
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; // Trả về mảng menuitems
    } catch (error) {
        console.error("Error fetching menu items:", error);
        throw error;
    }
}

/**
 * [POST] Thêm Merchant mới
 */
export async function createMerchant(newMerchantData) {
    try {
        const response = await fetch(API_URL, { // Gọi POST /merchants
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ordersToday: 0,
                status: 'Pending', // Trạng thái mặc định khi tạo mới
                ...newMerchantData 
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; // Trả về merchant vừa được tạo (có ID)
    } catch (error) {
        console.error("Error creating merchant:", error);
        throw error;
    }
}

/**
 * [PUT/PATCH] Cập nhật Merchant (Dùng PATCH để chỉ cập nhật các trường thay đổi)
 */
export async function updateMerchant(merchantId, updates) {
    try {
        const response = await fetch(`${API_URL}/${merchantId}`, { // Gọi PATCH /merchants/:id
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates), // Chỉ gửi các trường cần cập nhật
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; // Trả về merchant đã được cập nhật
    } catch (error) {
        console.error(`Error updating merchant ${merchantId}:`, error);
        throw error;
    }
}

/**
 * [DELETE] Xóa Merchant
 */
export async function deleteMerchant(merchantId) {
    try {
        const response = await fetch(`${API_URL}/${merchantId}`, { // Gọi DELETE /merchants/:id
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // DELETE thường không trả về body, chỉ cần kiểm tra response.ok
        return true; 
    } catch (error) {
        console.error(`Error deleting merchant ${merchantId}:`, error);
        throw error;
    }
}