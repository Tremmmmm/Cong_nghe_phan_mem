// Dữ liệu "Database" giả lập
let MERCHANT_DB = [
    { id: 'm001', name: 'Burger King Fast Food', status: 'Active', ordersToday: 45, owner: 'admin@foodfast.com', phone: '0901234567', address: '123 Đường A, Quận 1', contract: '2023-01-01 / 2024-12-31' },
    { id: 'm002', name: 'Phở Lý Quốc Sư', status: 'Inactive', ordersToday: 0, owner: 'pho.ls@gmail.com', phone: '0907654321', address: '456 Đường B, Quận 3', contract: '2022-05-15 / 2024-05-15' },
    { id: 'm003', name: 'Trà Sữa KOI', status: 'Pending', ordersToday: 12, owner: 'koi@milk.com', phone: '0988998899', address: '789 Đường C, Quận 5', contract: 'N/A' },
    { id: 'm004', name: 'Cơm Tấm Cali', status: 'Active', ordersToday: 88, owner: 'tam.cali@corp.com', phone: '0912121212', address: '101 Đường D, Quận 10', contract: '2023-11-01 / 2025-11-01' },
];

const DELAY = 500; // Độ trễ giả lập mạng

// Helper để tạo ID ngẫu nhiên
const generateId = () => 'm' + (Math.random() * 10000 | 0).toString().padStart(4, '0');

// --------------------------------------------------------
// CÁC HÀM MÔ PHỎNG API
// --------------------------------------------------------

/**
 * [GET] Lấy danh sách Merchant
 * @param {string} filterStatus - Lọc theo trạng thái (tùy chọn)
 * @returns {Promise<Array>}
 */
export async function fetchMerchants(filterStatus = '') {
    return new Promise((resolve) => {
        setTimeout(() => {
            let result = MERCHANT_DB;
            if (filterStatus) {
                result = result.filter(m => m.status === filterStatus);
            }
            // MÔ PHỎNG TRẢ VỀ DỮ LIỆU
            resolve(result); 
        }, DELAY);
    });
}

/**
 * [POST] Thêm Merchant mới
 * @param {object} newMerchantData - Dữ liệu Merchant cần tạo
 * @returns {Promise<object>}
 */
export async function createMerchant(newMerchantData) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newMerchant = { 
                id: generateId(), 
                ordersToday: 0,
                status: 'Pending', // Mặc định là chờ duyệt
                ...newMerchantData
            };
            MERCHANT_DB.push(newMerchant);
            // MÔ PHỎNG TRẢ VỀ MERCHANT VỪA TẠO
            resolve(newMerchant); 
        }, DELAY);
    });
}

/**
 * [PUT/PATCH] Cập nhật Merchant
 * @param {string} merchantId - ID Merchant
 * @param {object} updates - Các trường cần cập nhật
 * @returns {Promise<object>}
 */
export async function updateMerchant(merchantId, updates) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = MERCHANT_DB.findIndex(m => m.id === merchantId);
            if (index === -1) {
                // MÔ PHỎNG LỖI 404
                reject({ error: 'Merchant not found' });
                return;
            }

            const updatedMerchant = { ...MERCHANT_DB[index], ...updates };
            MERCHANT_DB[index] = updatedMerchant;

            // MÔ PHỎNG TRẢ VỀ MERCHANT ĐÃ CẬP NHẬT
            resolve(updatedMerchant);
        }, DELAY);
    });
}

/**
 * [DELETE] Xóa Merchant
 * @param {string} merchantId - ID Merchant
 * @returns {Promise<boolean>}
 */
export async function deleteMerchant(merchantId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const initialLength = MERCHANT_DB.length;
            MERCHANT_DB = MERCHANT_DB.filter(m => m.id !== merchantId);
            
            if (MERCHANT_DB.length === initialLength) {
                reject({ error: 'Merchant not found' });
                return;
            }
            
            // MÔ PHỎNG TRẢ VỀ THÀNH CÔNG
            resolve(true); 
        }, DELAY);
    });
}