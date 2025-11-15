// File: src/utils/menuAPI.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5181';
const API_URL = `${API_BASE_URL}/menuItems`;

export async function fetchMenuItems(merchantId, filterType = 'all') {
    try {
        let url = new URL(API_URL);
        if (merchantId) {
            url.searchParams.append('merchantId', merchantId);
        }
        
        if (filterType === 'approved') {
            url.searchParams.append('status', 'approved');
        } else if (filterType === 'pending') {
            url.searchParams.append('status', 'pending');
        }
        
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
                status: 'pending'
            }),
        });
        if (!response.ok) throw new Error(`HTTP error!`);
        return await response.json();
    } catch (error) {
        console.error("Error creating menu item:", error);
        throw error;
    }
}

export async function updateMenuItem(itemId, updates) {
    try {
        const payload = { ...updates, status: 'pending' };
        const response = await fetch(`${API_URL}/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`HTTP error!`);
        return await response.json();
    } catch (error) {
        console.error(`Error updating menu item ${itemId}:`, error);
        throw error;
    }
}

export async function deleteMenuItem(itemId) {
    try {
        const response = await fetch(`${API_URL}/${itemId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP error!`);
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
        if (!response.ok) throw new Error(`HTTP error!`);
        return await response.json();
    } catch (error) {
        console.error(`Error updating menu item status ${itemId}:`, error);
        throw error;
    }
}