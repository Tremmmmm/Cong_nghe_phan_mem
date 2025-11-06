import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const AuthCtx = createContext(null);
const LS_KEY = 'ff_user_v3'; // Key mới để lưu phiên đăng nhập

// --- CẤU HÌNH API ---
// Đảm bảo port 5181 khớp với lệnh chạy json-server của bạn
const API_URL = 'http://localhost:5181/users'; 
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Khôi phục phiên đăng nhập từ localStorage khi F5
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(LS_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      localStorage.removeItem(LS_KEY);
    }
    setLoading(false);
  }, []);

  // 2. Hàm Đăng nhập (Gọi API tới db.json)
  const signIn = async ({ email, password }) => {
    try {
      // 💡 Tìm user trong db.json khớp cả username (hoặc email) VÀ password
      // Lưu ý: json-server hỗ trợ filter bằng query params
      // Chúng ta tìm theo 'username' vì trong db.json bạn đặt là 'username' cho admin
      let response = await fetch(`${API_URL}?username=${email}&password=${password}`);
      let users = await response.json();

      // Nếu không tìm thấy bằng username, thử tìm bằng email (cho khách hàng cũ nếu có)
      if (users.length === 0) {
         response = await fetch(`${API_URL}?email=${email}&password=${password}`);
         users = await response.json();
      }

      if (users.length > 0) {
        const userDat = users[0];
        // 💡 Bổ sung các cờ (flag) tiện ích để dễ kiểm tra sau này
        const finalUser = {
            ...userDat,
            isAdmin: userDat.role === 'SuperAdmin' || userDat.role === 'Merchant',
            isSuperAdmin: userDat.role === 'SuperAdmin',
            isMerchant: userDat.role === 'Merchant'
        };

        setUser(finalUser);
        localStorage.setItem(LS_KEY, JSON.stringify(finalUser));
        return { user: finalUser };
      } else {
        throw new Error('Sai tên đăng nhập hoặc mật khẩu');
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // 3. Hàm Đăng ký (Gọi API POST để tạo user mới)
  const signUp = async (userData) => {
      try {
          // Kiểm tra xem username/email đã tồn tại chưa
          const checkRes = await fetch(`${API_URL}?username=${userData.email}`);
          const existing = await checkRes.json();
          if (existing.length > 0) {
              throw new Error('Tên đăng nhập/Email đã tồn tại');
          }

          // Tạo user mới với role mặc định là 'Customer'
          const newUser = {
              ...userData,
              username: userData.email, // Dùng email làm username cho khách hàng
              role: 'Customer'
          };

          const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newUser)
          });

          if (!response.ok) throw new Error('Đăng ký thất bại');
          
          const createdUser = await response.json();
          // Tự động đăng nhập sau khi đăng ký thành công
          const finalUser = { ...createdUser, isAdmin: false, isSuperAdmin: false, isMerchant: false };
          setUser(finalUser);
          localStorage.setItem(LS_KEY, JSON.stringify(finalUser));
          
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
  
  // 5. Hàm cập nhật thông tin (Gọi API PATCH)
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
              // Giữ lại các cờ tiện ích
              const finalUser = {
                  ...updatedUser,
                  isAdmin: updatedUser.role === 'SuperAdmin' || updatedUser.role === 'Merchant',
                  isSuperAdmin: updatedUser.role === 'SuperAdmin',
                  isMerchant: updatedUser.role === 'Merchant'
              };
              setUser(finalUser);
              localStorage.setItem(LS_KEY, JSON.stringify(finalUser));
          }
      } catch (error) {
          console.error("Update user error:", error);
      }
  }

  // Giá trị context cung cấp ra bên ngoài
  const value = {
    user,
    currentUser: user, // Alias
    login: signIn,     // Alias
    signIn,
    signUp,
    signOut: logout,   // Alias
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

// ================= ROUTE GUARDS (BỘ BẢO VỆ) =================

// 1. Guard: Yêu cầu đăng nhập (bất kỳ ai)
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null; // Hoặc loading spinner
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }
  return children;
}

// 2. Guard: Bắt buộc là SUPER ADMIN
export function RequireServerAdmin({ children }) {
  const { user, isSuperAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  // Kiểm tra đúng role từ DB
  if (!isSuperAdmin) { 
    return <Navigate to="/" replace />; // Không đủ quyền -> về trang chủ
  }
  return children;
}

// 3. Guard: Bắt buộc là MERCHANT ADMIN
export function RequireRestaurantAdmin({ children }) {
  const { user, isMerchant, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;

  if (!user) {
    return <Navigate to="/restaurant/login" replace state={{ from: location }} />;
  }
  // Kiểm tra đúng role từ DB
  if (!isMerchant) {
    return <Navigate to="/" replace />;
  }
  // Kiểm tra thêm: Merchant phải có merchantId hợp lệ
  if (!user.merchantId) {
      console.error("Lỗi: Tài khoản Merchant này thiếu merchantId!");
      return <Navigate to="/" replace />;
  }

  return children;
}

// 4. Guard: Bất kỳ Admin nào (dùng cho các trang chung nếu cần)
export function RequireAdmin({ children }) {
    const { user, isSuperAdmin, isMerchant } = useAuth();
    const location = useLocation();
    if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;
    if (!isSuperAdmin && !isMerchant) return <Navigate to="/" replace />;
    return children;
}

export const MerchantRoute = RequireRestaurantAdmin;
export const SuperAdminRoute = RequireServerAdmin;