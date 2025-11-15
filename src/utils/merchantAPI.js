// File: src/utils/merchantAPI.js

// 💡 Lấy link từ biến môi trường (ưu tiên) hoặc dùng localhost (dự phòng)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5181';

const API_URL_SETTINGS = `${API_BASE_URL}/restaurantSettings`;
const API_URL_MENUITEMS = `${API_BASE_URL}/menuItems`;
const API_URL_MERCHANTS = `${API_BASE_URL}/merchants`;
const API_URL_USERS = `${API_BASE_URL}/users`;

// --------------------------------------------------------
// CÁC HÀM GỌI API (Giữ nguyên logic, chỉ đổi biến URL)
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

export async function updateMerchant(merchantId, updates) {
    try {
        const response = await fetch(`${API_URL_SETTINGS}/${merchantId}`, {
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
// LOGIC CREATE/DELETE (Đã sửa URL)
// --------------------------------------------------------

export async function createMerchant(newMerchantData) {
    const newMerchantId = `m_${Date.now()}`;
    const defaultName = newMerchantData.name || `Cửa hàng Mới #${newMerchantId.slice(-4)}`;
    const newUserId = `u_${Date.now()}`;
    const newUsername = newMerchantData.owner || `merchant_${newMerchantId.slice(-4)}`;
    
    const merchantPayload = {
        ...newMerchantData,
        id: newMerchantId,
        owner: newUsername,
        status: 'Pending',
        ordersToday: 0,
    };
    
    const settingsPayload = {
        id: newMerchantId,
        storeName: defaultName,
        address: 'Chưa cập nhật địa chỉ',
        phone: '',
        logo: '',
        isManuallyClosed: true,
        operatingHours: {}
    };

    const userPayload = {
        id: newUserId,
        username: newUsername,
        password: "123",
        name: `Admin (${defaultName})`,
        role: 'Merchant',
        merchantId: newMerchantId
    };

    try {
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
            fetch(API_URL_USERS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userPayload)
            })
        ]);

        if (!merchantRes.ok || !settingsRes.ok || !userRes.ok) {
            throw new Error('Tạo 1 trong 3 bản ghi thất bại');
        }

        const newMerchant = await merchantRes.json();
        const newSettings = await settingsRes.json();
        return { ...newMerchant, ...newSettings };

    } catch (error) {
        console.error("Error creating merchant:", error);
        throw error;
    }
}

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

export async function deleteMerchant(merchantId) {
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
        const res1 = fetch(`${API_URL_MERCHANTS}/${merchantId}`, { method: 'DELETE' });
        const res2 = fetch(`${API_URL_SETTINGS}/${merchantId}`, { method: 'DELETE' });
        const res3 = userIdToDelete 
            ? fetch(`${API_URL_USERS}/${userIdToDelete}`, { method: 'DELETE' })
            : Promise.resolve(true);

        const [response1, response2] = await Promise.all([res1, res2, res3]);

        if (!response1.ok && !response2.ok) {
             throw new Error(`Không thể xóa merchant`);
        }
        return true; 
    } catch (error) {
        console.error(`Error deleting merchant ${merchantId}:`, error);
        throw error;
    }
}