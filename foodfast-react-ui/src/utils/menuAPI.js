// File: src/utils/menuAPI.js
const API_URL = 'http://localhost:5181/menuItems';

/**
 * [GET] Lấy danh sách món ăn
 * @param {string} merchantId - (BẮT BUỘC) ID của merchant để lọc món ăn của họ
 * @param {'all' | 'approved' | 'pending'} filterType - Loại lọc trạng thái
 */
export async function fetchMenuItems(merchantId, filterType = 'all') {
    // Nếu không có merchantId, không thể lấy menu (trừ khi là Super Admin muốn lấy tất cả)
    // Ở đây ta tạm yêu cầu bắt buộc để an toàn.
    // if (!merchantId) throw new Error("Thiếu merchantId khi gọi API fetchMenuItems");

    try {
        let url = new URL(API_URL);
        // Luôn lọc theo merchantId nếu được cung cấp
        if (merchantId) {
            url.searchParams.append('merchantId', merchantId);
        }
        
        // Thêm bộ lọc trạng thái
        if (filterType === 'approved') {
            url.searchParams.append('status', 'approved');
        } else if (filterType === 'pending') {
            url.searchParams.append('status', 'pending');
        }
        
        // Thêm cache busting để tránh trình duyệt cache
        url.searchParams.append('cacheBust', Date.now());

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error fetching menu items:", error);
        throw error;
    }
}

/**
 * [POST] Thêm món ăn mới
 * @param {object} newItemData - Dữ liệu món ăn, BẮT BUỘC phải chứa 'merchantId'
 */
export async function createMenuItem(newItemData) {
    if (!newItemData.merchantId) {
        throw new Error("Dữ liệu món mới thiếu 'merchantId'");
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newItemData,
                status: 'pending' // Mặc định chờ duyệt
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error creating menu item:", error);
        throw error;
    }
}

// ... (Các hàm updateMenuItem, deleteMenuItem, updateMenuItemStatus giữ nguyên như file gốc của bạn)
/**
 * [PATCH] Cập nhật món ăn
 */
export async function updateMenuItem(itemId, updates) {
    try {
        // Reset về 'pending' khi sửa để duyệt lại
        const payload = { ...updates, status: 'pending' };
        const response = await fetch(`${API_URL}/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error updating menu item ${itemId}:`, error);
        throw error;
    }
}

export async function deleteMenuItem(itemId) {
    try {
        const response = await fetch(`${API_URL}/${itemId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return true;
    } catch (error) {
        console.error(`Error deleting menu item ${itemId}:`, error);
        throw error;
    }
}

export async function updateMenuItemStatus(itemId, newStatus) {
    if (newStatus !== 'approved' && newStatus !== 'rejected') {
        throw new Error("Invalid status.");
    }
    try {
        const response = await fetch(`${API_URL}/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error updating menu item status ${itemId}:`, error);
        throw error;
    }
}
// /**
//  * 💡 [PATCH] Cập nhật trạng thái ẩn/hiện (Available)
//  * @param {string} itemId - ID món ăn
//  * @returns {Promise<object>}
//  */
// // export async function toggleMenuItemAvailability(itemId, isAvailable) {
//     try {
//         const response = await fetch(`${API_URL}/${itemId}`, {
//             method: 'PATCH',
//             headers: { 'Content-Type': 'application/json' },
//             // Chỉ gửi trường isAvailable, không reset status về pending
//             body: JSON.stringify({ isAvailable: !!isAvailable }), // Đảm bảo là boolean
//         });
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         const data = await response.json();
//         return data;
//     } catch (error) {
//         console.error(`Error toggling availability for item ${itemId}:`, error);
//         throw error;
//     }
// }