const API_URL = 'http://localhost:5181/merchantSettings';

// [GET] Lấy cài đặt theo ID cửa hàng
export const fetchSettings = async (merchantId) => {
  if (!merchantId) throw new Error("Thiếu merchantId khi gọi API fetchSettings");
  
  try {
      const res = await fetch(`${API_URL}/${merchantId}`);
      if (!res.ok) {
          if (res.status === 404) return null; // Chưa có cài đặt -> trả về null
          throw new Error(`Lỗi tải cài đặt (Status: ${res.status})`);
      }
      return await res.json();
  } catch (error) {
      console.error("Error fetching settings:", error);
      throw error;
  }
};

// [PUT] Cập nhật cài đặt (Ghi đè hoặc tạo mới nếu chưa có)
export const updateSettings = async (merchantId, data) => {
    if (!merchantId) throw new Error("Thiếu merchantId khi gọi API updateSettings");
    
    // Đảm bảo data gửi lên có ID trùng với merchantId
    const payload = { ...data, id: merchantId };
    
    try {
        const res = await fetch(`${API_URL}/${merchantId}`, {
            method: 'PUT', // PUT sẽ tạo mới nếu ID chưa tồn tại (với json-server)
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Lỗi lưu cài đặt (Status: ${res.status})`);
        return await res.json();
    } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
    }
};

// [PATCH] Cập nhật một phần (Ví dụ: chỉ bật/tắt trạng thái đóng cửa)
export const patchSettings = async (merchantId, partialData) => {
   if (!merchantId) throw new Error("Thiếu merchantId khi gọi API patchSettings");
   
   try {
       const res = await fetch(`${API_URL}/${merchantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialData),
      });
      if (!res.ok) {
          // Nếu lỗi 404 (chưa có bản ghi để patch), thử dùng PUT để tạo mới
          if (res.status === 404) {
              console.warn("Settings not found for PATCH, trying PUT to create...");
              return await updateSettings(merchantId, partialData);
          }
          throw new Error(`Lỗi cập nhật trạng thái (Status: ${res.status})`);
      }
      return await res.json();
   } catch (error) {
       console.error("Error patching settings:", error);
       throw error;
   }
};