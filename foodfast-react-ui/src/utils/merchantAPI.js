// File: src/utils/merchantAPI.js
// 💡 PHIÊN BẢN ĐÃ SỬA LỖI API VÀ LOGIC CREATE/DELETE

// 💡 URL CỦA JSON-SERVER (Giữ nguyên)
const API_URL_SETTINGS = 'http://localhost:5181/restaurantSettings'; 
const API_URL_MENUITEMS = 'http://localhost:5181/menuItems';
const API_URL_MERCHANTS = 'http://localhost:5181/merchants';
// 💡 THÊM 1: Thêm đường dẫn tới /users
const API_URL_USERS = 'http://localhost:5181/users';

// 💡 Thêm export hằng số này để file khác (như AdminServerRestaurant.jsx) có thể dùng
export const API_BASE_URL = 'http://localhost:5181';

// --------------------------------------------------------
// CÁC HÀM GỌI API (Phần này code của bạn đã đúng)
// --------------------------------------------------------
export async function fetchMerchants() {
    try {
        const [settingsResponse, merchantsResponse] = await Promise.all([
            fetch(API_URL_SETTINGS),
            fetch(API_URL_MERCHANTS)
        ]);

        if (!settingsResponse.ok || !merchantsResponse.ok) {
            throw new Error('Không thể tải song song 2 nguồn dữ liệu merchant');
        }

        const settingsData = await settingsResponse.json(); 
        const merchantsData = await merchantsResponse.json(); 
        const merchantsMap = new Map(merchantsData.map(m => [m.id, m]));

        const mergedMerchants = settingsData.map(setting => ({
            ...merchantsMap.get(setting.id), 
            ...setting                      
        }));

        return mergedMerchants; 
    } catch (error) {
        console.error("Error fetching and merging merchants:", error);
        throw error; 
    }
}
// ... (Hàm fetchMerchantSettingById)
export async function fetchMerchantSettingById(merchantId) {
    try {
        const response = await fetch(`${API_URL_SETTINGS}/${merchantId}`);
        if (!response.ok) {
            if (response.status === 404) return {}; 
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching merchant settings ${merchantId}:`, error);
        throw error;
    }
}
// ... (Hàm fetchMerchantContractById)
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
// ... (Hàm fetchMenuItems)
export async function fetchMenuItems() {  
    try {
        const response = await fetch(API_URL_MENUITEMS); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching menu items:", error);
        throw error;
    }
}
// ... (Hàm updateMerchant)
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


// --------------------------------------------------------
// 💡 CÁC HÀM ĐÃ SỬA LỖI
// --------------------------------------------------------

/**
 * [POST] Thêm Merchant mới
 * 💡 SỬA LỖI: Hàm này phải tạo 3 bản ghi (settings, merchant, user)
 */
export async function createMerchant(newMerchantData) {
    // 1. Tạo ID Merchant (dùng cho cả 3 bảng)
    const newMerchantId = `m_${Date.now()}`;
    const defaultName = newMerchantData.name || `Cửa hàng Mới #${newMerchantId.slice(-4)}`;
    
    // 💡 TẠO THÔNG TIN USER MỚI
    const newUserId = `u_${Date.now()}`; // ID riêng cho user
    const newUsername = newMerchantData.owner || `merchant_${newMerchantId.slice(-4)}`;
    
    // 2. Payload cho /merchants (bảng "pháp lý")
    const merchantPayload = {
        ...newMerchantData,
        id: newMerchantId,
        owner: newUsername, // Dùng username mới làm owner
        status: 'Pending',
        ordersToday: 0,
    };
    
    // 3. Payload cho /restaurantSettings (bảng "hoạt động")
    const settingsPayload = {
        id: newMerchantId, // ID phải khớp với /merchants
        storeName: defaultName,
        address: 'Chưa cập nhật địa chỉ',
        phone: '',
        logo: '',
        isManuallyClosed: true,
        operatingHours: {}
    };

    // 💡 THÊM 2: Payload cho /users (bảng "tài khoản")
    const userPayload = {
        id: newUserId,
        username: newUsername,
        password: "123", // 💡 Mật khẩu mặc định
        name: `Admin (${defaultName})`, // Tên tài khoản
        role: 'Merchant',
        merchantId: newMerchantId // 💡 Liên kết tài khoản này với cửa hàng
    };

    try {
        // 💡 THÊM 3: Gọi cả 3 API POST song song
        const [merchantRes, settingsRes, userRes] = await Promise.all([
            fetch(API_URL_MERCHANTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merchantPayload),
            }),
            fetch(API_URL_SETTINGS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsPayload)
            }),
            // 💡 GỌI API THỨ 3
            fetch(API_URL_USERS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userPayload)
            })
        ]);

        if (!merchantRes.ok || !settingsRes.ok || !userRes.ok) {
            throw new Error('Tạo 1 trong 3 bản ghi (merchant, settings, user) thất bại');
        }

        // 5. Trả về dữ liệu đã gộp (giống fetchMerchants)
        const newMerchant = await merchantRes.json();
        const newSettings = await settingsRes.json();
        return { ...newMerchant, ...newSettings }; // Trả về 1 merchant hoàn chỉnh

    } catch (error) {
        console.error("Error creating merchant (and user):", error);
        throw error;
    }
}

/**
 * [GET] Lấy chi tiết 1 Merchant bằng ID
 * 💡 SỬA LỖI: Hàm này phải gộp dữ liệu (giống fetchMerchants)
 */
export async function fetchMerchantById(merchantId) {
    try {
        const [setting, contract] = await Promise.all([
            fetchMerchantSettingById(merchantId),
            fetchMerchantContractById(merchantId) 
        ]);
        return { ...contract, ...setting }; 
    } catch (error) {
        console.error(`Error fetching merged merchant ${merchantId}:`, error);
        throw error;
    }
}

/**
 * [DELETE] Xóa Merchant
 * 💡 SỬA LỖI: Hàm này phải xóa ở cả 3 bảng
 */
export async function deleteMerchant(merchantId) {
    // 💡 Lưu ý: Cần tìm user liên quan đến merchantId này để xóa
    let userIdToDelete = null;
    try {
        const usersRes = await fetch(`${API_URL_USERS}?merchantId=${merchantId}`);
        const users = await usersRes.json();
        if (users.length > 0) {
            userIdToDelete = users[0].id;
        }
    } catch (e) {
        console.error("Không tìm thấy user để xóa", e);
    }
    
    try {
        // 1. Xóa ở /merchants
        const res1 = fetch(`${API_URL_MERCHANTS}/${merchantId}`, { 
            method: 'DELETE',
        });
        // 2. Xóa ở /restaurantSettings
        const res2 = fetch(`${API_URL_SETTINGS}/${merchantId}`, {
            method: 'DELETE',
        });
        // 3. Xóa user (nếu tìm thấy)
        const res3 = userIdToDelete 
            ? fetch(`${API_URL_USERS}/${userIdToDelete}`, { method: 'DELETE' })
            : Promise.resolve(true); // (Tạo 1 promise rỗng nếu không có user)

        const [response1, response2, response3] = await Promise.all([res1, res2, res3]);

        if (!response1.ok && !response2.ok) { // Chỉ cần 1 trong 2 (merchant/setting) OK
             throw new Error(`Không thể xóa merchant (Cả 2 API đều lỗi)`);
        }
        
        return true; 
    } catch (error) {
        console.error(`Error deleting merchant ${merchantId}:`, error);
        throw error;
    }
}