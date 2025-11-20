import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'; // 💡 Thêm useLocation

// --- Layouts ---
import Header from './components/Header.jsx'; 
import Footer from './components/Footer.jsx';
import ResLayout from './admin/ResLayout.jsx'; 
import AdminLayout from './admin/AdminLayout.jsx'; 

// --- Pages (Public) ---
import Home from './pages/Home.jsx';
import Menu from './pages/Menu.jsx';
import Favorites from './pages/Favorites.jsx';
import Cart from './pages/Cart.jsx';
import SearchResults from './pages/SearchResults.jsx';
import Confirmation from './pages/Confirmation.jsx';
import DetailsHistory from './pages/DetailsHistory.jsx';
import DroneTracker from './pages/DroneTracker.jsx';

// --- Pages (Auth) ---
import SignIn from './pages/SignIn.jsx'; 
import SignUp from './pages/SignUp.jsx';

// --- Pages (Customer - Cần Đăng nhập) ---
import Profile from './pages/Profile.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/CustomerOrders.jsx';
import ConfirmCloseSession from './pages/ConfirmCloseSession.jsx';

// --- Pages (Merchant Admin) ---
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminOrders from './pages/AdminOrders.jsx';
import SettingRestaurant from './pages/RestaurantSettings.jsx'; 
import RestaurantMenu from './pages/RestaurantMenuManager.jsx';
import RestaurantOrders from './pages/RestaurantOrders.jsx';
import DroneOrders from './pages/DroneOrders.jsx';

// --- Pages (Super Admin) ---
import AdminServerDashboard from './pages/AdminServerDashboard.jsx';
import AdminServerRestaurant from './pages/AdminServerRestaurant.jsx';
import AdminUsers from './admin/AdminUsers.jsx';
import AdminMerchantDetail from './pages/AdminMerchantDetail.jsx';

// --- Guards ---
import { 
  RequireAuth, 
  MerchantRoute, 
  SuperAdminRoute 
} from './context/AuthContext.jsx';

// 💡 SỬA LAYOUT ĐỂ ẨN HEADER/FOOTER TRÊN MOBILE
function AppLayout() {
  const location = useLocation();
  
  // Danh sách các trang cần ẩn Header/Footer trên mobile
  const isAuthPage = [
    '/signin', 
    '/signup', 
    '/admin/login', 
    '/restaurant/login'
  ].includes(location.pathname);

  // CSS chỉ áp dụng khi màn hình nhỏ hơn 768px (Mobile)
  const mobileStyles = `
    @media (max-width: 768px) {
      .mobile-hidden-auth {
        display: none !important;
      }
      /* Nếu Header bị ẩn, main có thể cần bỏ padding-top nếu có */
      .auth-page-container {
        padding-top: 0 !important;
        width: 100%;
        background: #fff; /* Đảm bảo nền trắng khớp với form */
      }
    }
  `;

  return (
    <>
      <style>{mobileStyles}</style>
      
      {/* Header: Bị ẩn trên mobile nếu là trang Auth */}
      <div className={isAuthPage ? "mobile-hidden-auth" : ""}>
        <Header />
      </div>

      {/* Main Content */}
      <main className={isAuthPage ? "auth-page-container" : ""}>
        <Outlet />
      </main>

      {/* Footer: Bị ẩn trên mobile nếu là trang Auth */}
      <div className={isAuthPage ? "mobile-hidden-auth" : ""}>
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ===== 1. PUBLIC LAYOUT & ROUTES ===== */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/merchant/:merchantId/menu" element={<Menu />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/history" element={<DetailsHistory />} />
        <Route path="/orders/:id/tracking" element={<DroneTracker />}  /> 

        {/* --- Auth --- */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin/login" element={<SignIn />} /> 
        <Route path="/restaurant/login" element={<SignIn />} />

        {/* --- Customer Routes --- */}
        <Route path="/checkout" element={ <RequireAuth> <Checkout /> </RequireAuth> } />
        <Route path="/orders" element={ <RequireAuth> <Orders /> </RequireAuth> } />
        <Route path="/profile" element={ <RequireAuth> <Profile /> </RequireAuth> } />
        <Route path="/checkout/confirm" element={ <RequireAuth> <ConfirmCloseSession /> </RequireAuth> } />
      </Route>

      {/* ===== 2. MERCHANT ADMIN PANEL ===== */}
      <Route
        path="/merchant"
        element={
          <MerchantRoute>
            <ResLayout />
          </MerchantRoute>
        }
      > 
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="kitchen" element={<RestaurantOrders />} />
        <Route path="menu" element={<RestaurantMenu />} />
        <Route path="settings" element={<SettingRestaurant />} />
        <Route path="drone" element={<DroneOrders />} />
        <Route path="drone/:id" element={<DroneTracker />} />
      </Route>

      {/* ===== 3. SUPER ADMIN PANEL ===== */}
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} /> 
        <Route path="dashboard" element={<AdminServerDashboard />} />
        <Route path="merchants" element={<AdminServerRestaurant />} />
        <Route path="merchants/:merchantId" element={<AdminMerchantDetail />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="drone" element={<DroneOrders />} />
        <Route path="drone/:id" element={<DroneTracker />} />
      </Route>

      {/* ===== 4. FALLBACKS ===== */}
      <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/merchant/*" element={<Navigate to="/merchant/dashboard" replace />} />  
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}