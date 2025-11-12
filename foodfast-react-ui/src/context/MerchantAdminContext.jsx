import { createContext, useContext, useState } from 'react';

const MerchantAdminCtx = createContext(null);

export function MerchantAdminProvider({ children }) {
  // Lưu trữ ID của merchant mà Admin Server đang chọn
const [selectedMerchantId, setSelectedMerchantId] = useState(null);

const selectMerchant = (merchantId) => {
    setSelectedMerchantId(merchantId);
    console.log(`Merchant selected for admin view: ${merchantId}`);
};
const clearSelection = () => {
    setSelectedMerchantId(null);
    console.log("Admin merchant selection cleared.");
};

return (
    <MerchantAdminCtx.Provider value={{ selectedMerchantId, selectMerchant, clearSelection }}>
      {children}
    </MerchantAdminCtx.Provider>
);
}

export function useMerchantAdmin() {
  const context = useContext(MerchantAdminCtx);
  if (!context) {
    throw new Error('useMerchantAdmin must be used within a MerchantAdminProvider');
  }
  return context;
}