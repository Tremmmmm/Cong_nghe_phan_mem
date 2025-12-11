// File: src/utils/merchantAPI.js

// 💡 Lấy link từ biến môi trường (ưu tiên) hoặc dùng localhost (dự phòng)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5181';

const API_URL_SETTINGS = `${API_BASE_URL}/restaurantSettings`;
const API_URL_MENUITEMS = `${API_BASE_URL}/menuItems`;
const API_URL_MERCHANTS = `${API_BASE_URL}/merchants`;
const API_URL_USERS = `${API_BASE_URL}/users`;

// --------------------------------------------------------
// CÁC HÀM GỌI API
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

        const mergedMerchants = settingsData.map(setting => {
            const contract = merchantsMap.get(setting.id) || {}
            return {
                ...contract,   // status, owner, ...
                ...setting,    // storeName, address, ...
            }
            })

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
// LOGIC CREATE/DELETE (Đã sửa lỗi quan trọng ở phần tạo User)
// --------------------------------------------------------

export async function createMerchant(newMerchantData) {
    const newMerchantId = `m_${Date.now()}`;
    const defaultName = newMerchantData.name || `Cửa hàng Mới (từ Admin) #${newMerchantId.slice(-4)}`;
    const newUserId = `u_${Date.now()}`;
    const newUsername = newMerchantData.owner || `merchant_${newMerchantId.slice(-4)}`;
    
    const merchantPayload = {
        ...newMerchantData,
        id: newMerchantId,
        owner: newUsername,
        name: defaultName, // 💡 Thêm name vào merchantPayload
        status: 'Active', // 💡 SỬA: Active để hiện trên Home
        ordersToday: 0,
    };
    
    const settingsPayload = {
        id: newMerchantId,
        storeName: defaultName, // 💡 Đã dùng defaultName
        address: 'Chưa cập nhật địa chỉ',
        phone: '',
        logo: '',
        isManuallyClosed: false, // 💡 Mặc định MỞ
        operatingHours: {}
    };

    const userPayload = {
        id: newUserId,
        username: newUsername,
        password: "123", // Mật khẩu mặc định
        name: `Admin (${defaultName})`,
        role: 'Merchant',
        merchantId: newMerchantId
    };

    try { 
        const [merchantRes, settingsRes, userRes] = await Promise.all([
            // 1. Tạo Merchant (Hợp đồng)
            fetch(API_URL_MERCHANTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merchantPayload),
            }),
            // 2. Tạo Settings (Cấu hình)
            fetch(API_URL_SETTINGS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsPayload)
            }),
            // 3. Tạo User (Tài khoản) - BẮT BUỘC LÀ POST
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
        
        // Chỉ xóa user nếu tìm thấy user đó
        const res3 = userIdToDelete 
            ? fetch(`${API_URL_USERS}/${userIdToDelete}`, { method: 'DELETE' })
            : Promise.resolve({ ok: true }); // Giả lập thành công nếu ko có user

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

// --------------------------------------------------------
// LOGIC ĐĂNG KÝ MỚI (Dành cho trang RegisterMerchant.jsx)
// --------------------------------------------------------
export async function registerMerchant(form) {
  // Chuẩn hoá email
    const email = String(form.email || "").trim().toLowerCase();

    // 1. Kiểm tra email đã tồn tại user nào chưa
    const checkRes = await fetch(`${API_URL_USERS}?email=${encodeURIComponent(email)}`);
    const existing = await checkRes.json();
    if (existing.length > 0) {
        throw new Error("Email này đã được đăng ký!");
    }

    // 2. Tạo ID mới
    const merchantId = `m_${Date.now()}`;
    const userId = `u_${Date.now()}`;

    // Form RegisterMerchant sau khi handleSubmit đã ghép sẵn:
    // fullAddress => form.address
    const fullAddress = form.address || "";

    // 3. Merchant contract (bảng /merchants) – MẶC ĐỊNH CHƯA ACTIVE
    const merchantPayload = {
        id: merchantId,
        name: form.storeName,
        owner: form.ownerName,
        phone: form.phone,
        address: fullAddress,
        city: form.city,
        ward: form.ward,
        street: form.street,
        status: "Pending",      // ❗ mới đăng ký -> chờ duyệt, KHÔNG Active ngay
        ordersToday: 0,
        contract: "",           // có thể để trống, sau Admin cập nhật
    };

    // 4. Cài đặt cửa hàng (bảng /restaurantSettings)
    const defaultHours = {
    mon: { open: 7, close: 22 },
    tue: { open: 7, close: 22 },
    wed: { open: 7, close: 22 },
    thu: { open: 7, close: 22 },
    fri: { open: 7, close: 22 },
    sat: { open: 7, close: 22 },
    sun: { open: 7, close: 22 },
    };

    const settingsPayload = {
        id: merchantId,
        storeName: form.storeName,
        address: fullAddress,
        phone: form.phone,
        logo: "",
        isManuallyClosed: true,   // ❗ MẶC ĐỊNH ĐANG ĐÓNG → KHÔNG lên trang bán hàng
        operatingHours: defaultHours,
    };

    // 5. Tài khoản Restaurant Admin (bảng /users)
    const userPayload = {
        id: userId,
        username: email,          // đăng nhập bằng email
        email,
        password: form.password,
        name: form.ownerName,
        phone: form.phone,
        role: "Merchant",         // ❗ KHÔNG phải SuperAdmin
        merchantId: merchantId,
    };

    // 6. Gửi 3 request song song
    const [resUser, resMerchant, resSettings] = await Promise.all([
        fetch(API_URL_USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPayload),
        }),
        fetch(API_URL_MERCHANTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merchantPayload),
        }),
        fetch(API_URL_SETTINGS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsPayload),
        }),
    ]);

    if (!resUser.ok || !resMerchant.ok || !resSettings.ok) {
        console.error("registerMerchant error", { resUser, resMerchant, resSettings });
        throw new Error("Không thể đăng ký cửa hàng. Vui lòng thử lại.");
    }

    const createdMerchant = await resMerchant.json();
    return createdMerchant;
    }