// File: src/utils/merchantAPI.js

// 💡 URL CỦA JSON-SERVER (Đảm bảo cổng khớp với lúc bạn chạy)
const API_URL_SETTINGS = 'http://localhost:5181/restaurantSettings'; 
const API_URL_MENUITEMS = 'http://localhost:5181/menuItems';
const API_URL_MERCHANTS = 'http://localhost:5181/merchants';

// --------------------------------------------------------
// CÁC HÀM GỌI API ĐẾN JSON-SERVER
// --------------------------------------------------------
/**
 * [GET] Lấy danh sách Merchant (ĐÃ GỘP DỮ LIỆU)
 * Hàm này sẽ lấy dữ liệu từ cả /merchants và /restaurantSettings
 * và gộp chúng lại dựa trên ID.
 */
export async function fetchMerchants() {
    try {
        // Gọi cả 2 API song song
        const [settingsResponse, merchantsResponse] = await Promise.all([
            fetch(API_URL_SETTINGS),
            fetch(API_URL_MERCHANTS)
        ]);

        if (!settingsResponse.ok || !merchantsResponse.ok) {
            throw new Error('Không thể tải song song 2 nguồn dữ liệu merchant');
        }

        const settingsData = await settingsResponse.json(); // Mảng settings
        const merchantsData = await merchantsResponse.json(); // Mảng contract/pháp lý

        // 💡 Gộp dữ liệu:
        // Biến merchantsData (pháp lý) thành 1 map để tra cứu nhanh
        const merchantsMap = new Map(merchantsData.map(m => [m.id, m]));

        // Gộp dữ liệu settings vào dữ liệu pháp lý
        const mergedMerchants = settingsData.map(setting => ({
            ...merchantsMap.get(setting.id), // Lấy data từ /merchants (owner, status, contract)
            ...setting                      // Lấy data từ /restaurantSettings (storeName, address, phone, logo, isManuallyClosed)
        }));

        return mergedMerchants; // Trả về mảng đã gộp

    } catch (error) {
        console.error("Error fetching and merging merchants:", error);
        throw error; 
    }
}
// ⬇️ BỔ SUNG HÀM NÀY
/**
 * [GET] Lấy thông tin cài đặt (operational) của 1 merchant
 * /restaurantSettings/:id
 */
export async function fetchMerchantSettingById(merchantId) {
    try {
        const response = await fetch(`${API_URL_SETTINGS}/${merchantId}`);
        if (!response.ok) {
            // Nếu 404, trả về object rỗng để hàm merge không bị lỗi
            if (response.status === 404) return {}; 
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching merchant settings ${merchantId}:`, error);
        throw error;
    }
}
/**
 * [GET] Lấy thông tin pháp lý (contract) của 1 merchant
 * /merchants/:id
 */
export async function fetchMerchantContractById(merchantId) {
    try {
        const response = await fetch(`${API_URL_MERCHANTS}/${merchantId}`);
        if (!response.ok) {
            if (response.status === 404) return {};
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching merchant contract ${merchantId}:`, error);
        throw error;
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
 * [GET] Lấy chi tiết 1 Merchant bằng ID
 */
export async function fetchMerchantById(merchantId) {
    try {
        const response = await fetch(`${API_URL}/${merchantId}`); // Gọi GET /restaurantSettings/:id
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; // Trả về 1 đối tượng merchant
    } catch (error) {
        console.error(`Error fetching merchant ${merchantId}:`, error);
        throw error;
    }
}
/**
 * [PATCH] Cập nhật Merchant (dùng để Khóa/Mở)
 * Super Admin chỉ cập nhật trạng thái 'isManuallyClosed' trên /restaurantSettings
 */
export async function updateMerchant(merchantId, updates) {
    try {
        const response = await fetch(`${API_URL_SETTINGS}/${merchantId}`, { // ⬅️ Chỉ update Settings
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates), 
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
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