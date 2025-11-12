// utils/merchantAPI.js
const API_URL = 'http://192.168.1.205:5181';
//Bạn phải thay localhost bằng địa chỉ IP của máy tính trong cùng mạng Wi-Fi (ví dụ: http://192.168.1.10:3001).
export const fetchMerchants = async () => {
  const response = await fetch(`${API_URL}/merchants`);
  if (!response.ok) throw new Error('Failed to fetch merchants');
  return response.json();
};

export const fetchMenuItems = async () => {
  const response = await fetch(`${API_URL}/menuItems`);
  if (!response.ok) throw new Error('Failed to fetch menu items');
  return response.json();
};
