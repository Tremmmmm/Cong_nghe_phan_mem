// File: src/utils/settingsAPI.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5181';
const API_URL = `${API_BASE_URL}/restaurantSettings`;

export const fetchSettings = async (merchantId) => {
  if (!merchantId) throw new Error("Thiếu merchantId");
  try {
      const res = await fetch(`${API_URL}/${merchantId}`);
      if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(`Lỗi tải cài đặt (Status: ${res.status})`);
      }
      return await res.json();
  } catch (error) {
      console.error("Error fetching settings:", error);
      throw error;
  }
};

export const updateSettings = async (merchantId, data) => {
    if (!merchantId) throw new Error("Thiếu merchantId");
    const payload = { ...data, id: merchantId };
    try {
        const res = await fetch(`${API_URL}/${merchantId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Lỗi lưu cài đặt`);
        return await res.json();
    } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
    }
};

export const patchSettings = async (merchantId, partialData) => {
   if (!merchantId) throw new Error("Thiếu merchantId");
   try {
       const res = await fetch(`${API_URL}/${merchantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialData),
      });
      if (!res.ok) {
          if (res.status === 404) {
              return await updateSettings(merchantId, partialData);
          }
          throw new Error(`Lỗi cập nhật trạng thái`);
      }
      return await res.json();
   } catch (error) {
       console.error("Error patching settings:", error);
       throw error;
   }
};