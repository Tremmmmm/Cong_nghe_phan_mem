import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const AuthCtx = createContext(null);
const LS_KEY = 'ff_user_v3'; 
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 giờ (tính bằng mili-giây)

// Lấy URL API từ biến môi trường
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5181';
const API_URL = `${API_BASE_URL}/users`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Khôi phục phiên đăng nhập (CÓ KIỂM TRA THỜI GIAN)
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(LS_KEY);
      if (storedData) {
        const { user: storedUser, expiry } = JSON.parse(storedData);
        
        // Kiểm tra nếu phiên còn hạn
        if (expiry && new Date().getTime() < expiry) {
            setUser(storedUser);
        } else {
            // Hết hạn -> Xóa và đăng xuất ngầm
            console.log("Phiên đăng nhập đã hết hạn.");
            localStorage.removeItem(LS_KEY);
        }
      }
    } catch (e) {
      localStorage.removeItem(LS_KEY);
    }
    setLoading(false);
  }, []);

  // 2. Hàm Đăng nhập (Lưu kèm thời gian hết hạn)
  const signIn = async ({ email, password }) => {
    try {
      let response = await fetch(`${API_URL}?username=${email}&password=${password}`);
      let users = await response.json();

      if (users.length === 0) {
         response = await fetch(`${API_URL}?email=${email}&password=${password}`);
         users = await response.json();
      }

      if (users.length > 0) {
        const userDat = users[0];
        const finalUser = {
            ...userDat,
            isAdmin: userDat.role === 'SuperAdmin' || userDat.role === 'Merchant',
            isSuperAdmin: userDat.role === 'SuperAdmin',
            isMerchant: userDat.role === 'Merchant'
        };

        setUser(finalUser);
        
        // 💡 LƯU SESSION KÈM THỜI GIAN HẾT HẠN
        const sessionData = {
            user: finalUser,
            expiry: new Date().getTime() + SESSION_DURATION
        };
        localStorage.setItem(LS_KEY, JSON.stringify(sessionData));
        
        return { user: finalUser };
      } else {
        throw new Error('Sai tên đăng nhập hoặc mật khẩu');
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // 3. Hàm Đăng ký (Cũng lưu session)
  const signUp = async (userData) => {
      try {
          const checkRes = await fetch(`${API_URL}?username=${userData.email}`);
          const existing = await checkRes.json();
          if (existing.length > 0) throw new Error('Tên đăng nhập/Email đã tồn tại');

          const newUser = { ...userData, username: userData.email, role: 'Customer' };
          const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newUser)
          });

          if (!response.ok) throw new Error('Đăng ký thất bại');
          
          const createdUser = await response.json();
          const finalUser = { ...createdUser, isAdmin: false, isSuperAdmin: false, isMerchant: false };
          
          setUser(finalUser);
          
          // Lưu session
          const sessionData = { user: finalUser, expiry: new Date().getTime() + SESSION_DURATION };
          localStorage.setItem(LS_KEY, JSON.stringify(sessionData));
          
          return { ok: true, user: finalUser };
      } catch (error) {
          console.error("Signup error:", error);
          throw error;
      }
  }

  // 4. Hàm Đăng xuất
  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_KEY);
  };
  
  // 5. Hàm cập nhật (Giữ nguyên logic nhưng lưu lại session mới)
  const updateUser = async (patch) => {
      if (!user?.id) return;
      try {
          const response = await fetch(`${API_URL}/${user.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patch)
          });
          if (response.ok) {
              const updatedUser = await response.json();
              const finalUser = {
                  ...updatedUser,
                  isAdmin: updatedUser.role === 'SuperAdmin' || updatedUser.role === 'Merchant',
                  isSuperAdmin: updatedUser.role === 'SuperAdmin',
                  isMerchant: updatedUser.role === 'Merchant'
              };
              setUser(finalUser);
              // Cập nhật lại localStorage nhưng giữ nguyên thời gian hết hạn cũ (hoặc gia hạn mới tùy bạn)
              const oldSession = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
              const sessionData = { 
                  user: finalUser, 
                  expiry: oldSession.expiry || (new Date().getTime() + SESSION_DURATION) 
              };
              localStorage.setItem(LS_KEY, JSON.stringify(sessionData));
          }
      } catch (error) {
          console.error("Update user error:", error);
      }
  }

  const value = {
    user,
    currentUser: user,
    login: signIn,
    signIn,
    signUp,
    signOut: logout,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isMerchant: user?.role === 'Merchant',
    isSuperAdmin: user?.role === 'SuperAdmin',
  };

  return (
    <AuthCtx.Provider value={value}>
      {!loading && children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ================= ROUTE GUARDS (GIỮ NGUYÊN) =================
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null; 
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  return children;
}

export function RequireServerAdmin({ children }) {
  const { user, isSuperAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return children;
}

export function RequireRestaurantAdmin({ children }) {
  const { user, isMerchant, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/restaurant/login" replace state={{ from: location }} />;
  if (!isMerchant) return <Navigate to="/" replace />;
  if (!user.merchantId) { console.error("Lỗi: Thiếu merchantId!"); return <Navigate to="/" replace />; }
  return children;
}

export function RequireAdmin({ children }) {
    const { user, isSuperAdmin, isMerchant } = useAuth();
    const location = useLocation();
    if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;
    if (!isSuperAdmin && !isMerchant) return <Navigate to="/" replace />;
    return children;
}

export const MerchantRoute = RequireRestaurantAdmin;
export const SuperAdminRoute = RequireServerAdmin;