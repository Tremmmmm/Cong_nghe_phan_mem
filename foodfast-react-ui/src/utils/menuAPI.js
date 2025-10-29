// File: src/utils/menuAPI.js

// 💡 URL CỦA JSON-SERVER CHO MENU ITEMS
const API_URL = 'http://localhost:5181/menuItems'; // Đảm bảo cổng đúng

/**
 * [GET] Lấy danh sách món ăn
 * @param {string} filterStatus - Lọc theo trạng thái (vd: 'approved', 'pending')
 * @returns {Promise<Array>}
 */
export async function fetchMenuItems(filterStatus = '') {
    try {
        let url = API_URL;
        if (filterStatus) {
            // json-server hỗ trợ lọc qua query parameter
            url += `?status=${encodeURIComponent(filterStatus)}`;
        }
        const response = await fetch(`${url}${filterStatus ? '&' : '?'}cacheBust=${Date.now()}`); // Thêm cache busting
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
 * [POST] Thêm món ăn mới (mặc định status là 'pending')
 * @param {object} newItemData - Dữ liệu món ăn (name, description, price, image, category)
 * @returns {Promise<object>}
 */
export async function createMenuItem(newItemData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newItemData,
                status: 'pending' // 💡 Mặc định chờ duyệt
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error creating menu item:", error);
        throw error;
    }
}

/**
 * [PATCH] Cập nhật món ăn (có thể cần duyệt lại)
 * @param {string} itemId - ID món ăn
 * @param {object} updates - Các trường cần cập nhật
 * @returns {Promise<object>}
 */
export async function updateMenuItem(itemId, updates) {
    try {
        // QUAN TRỌNG: Quy trình duyệt lại khi sửa
        // Ở đây, để đơn giản, ta giả định mọi cập nhật đều cần duyệt lại
        const payload = {
            ...updates,
            status: 'pending' // 💡 Reset về pending để Admin duyệt lại
        };
        // Nếu bạn chỉ muốn duyệt lại khi sửa thông tin nhạy cảm (tên, mô tả, ảnh),
        // bạn cần thêm logic kiểm tra 'updates' ở đây.

        const response = await fetch(`${API_URL}/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error updating menu item ${itemId}:`, error);
        throw error;
    }
}

/**
 * [PATCH] Chỉ cập nhật trạng thái (Dùng cho Admin duyệt)
 * @param {string} itemId - ID món ăn
 * @param {'approved' | 'rejected'} newStatus - Trạng thái mới
 * @returns {Promise<object>}
 */
export async function updateMenuItemStatus(itemId, newStatus) {
     if (newStatus !== 'approved' && newStatus !== 'rejected') {
         throw new Error("Invalid status for approval/rejection.");
     }
    try {
        const response = await fetch(`${API_URL}/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }), // Chỉ cập nhật status
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error updating menu item status ${itemId}:`, error);
        throw error;
    }
}


/**
 * [DELETE] Xóa món ăn
 * @param {string} itemId - ID món ăn
 * @returns {Promise<boolean>}
 */
export async function deleteMenuItem(itemId) {
    try {
        const response = await fetch(`${API_URL}/${itemId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error deleting menu item ${itemId}:`, error);
        throw error;
    }
}