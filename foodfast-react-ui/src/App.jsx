import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// --- Layouts ---
import Header from './components/Header.jsx'; // Layout Public
import Footer from './components/Footer.jsx';
import ResLayout from './admin/ResLayout.jsx'; // Layout cho Merchant
import AdminLayout from './admin/AdminLayout.jsx'; // Layout cho Super Admin

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
import SignIn from './pages/SignIn.jsx'; // Dùng chung cho cả 3
import SignUp from './pages/SignUp.jsx';

// --- Pages (Customer - Cần Đăng nhập) ---
import Profile from './pages/Profile.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import ConfirmCloseSession from './pages/ConfirmCloseSession.jsx';

// --- Pages (Merchant Admin - 'resadmin') ---
import AdminDashboard from './pages/AdminDashboard.jsx'; // Dashboard của Merchant
import AdminOrders from './pages/AdminOrders.jsx'; // Order của Merchant
import SettingRestaurant from './pages/RestaurantSettings.jsx'; 
import RestaurantMenu from './pages/RestaurantMenuManager.jsx';
import RestaurantOrders from './pages/RestaurantOrders.jsx'; // Kitchen view
import DroneOrders from './pages/DroneOrders.jsx'; // Drone view

// --- Pages (Super Admin - 'svadmin') ---
import AdminServerDashboard from './pages/AdminServerDashboard.jsx';
import AdminServerRestaurant from './pages/AdminServerRestaurant.jsx';
import AdminUsers from './admin/AdminUsers.jsx';
import AdminMerchantDetail from './pages/AdminMerchantDetail.jsx';

// --- Guards (Từ AuthContext.jsx MỚI) ---
import { 
  RequireAuth, 
  MerchantRoute, 
  SuperAdminRoute 
} from './context/AuthContext.jsx'; // Import các Guard xịn

// Layout Public (Header/Footer)
function AppLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
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
        {/* Trang tracking có thể public hoặc protected, tuỳ bạn */}
        <Route path="/orders/:id/tracking" element={<DroneTracker />}  /> 

        {/* --- Auth (Dùng chung cho mọi vai trò) --- */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Gộp trang login admin vào chung 1 trang SignIn */}
        <Route path="/admin/login" element={<SignIn />} /> 
        <Route path="/restaurant/login" element={<SignIn />} />

        {/* --- Customer Routes (Cần đăng nhập) --- */}
        <Route path="/checkout" element={ <RequireAuth> <Checkout /> </RequireAuth> } />
        <Route path="/orders" element={ <RequireAuth> <Orders /> </RequireAuth> } />
        <Route path="/profile" element={ <RequireAuth> <Profile /> </RequireAuth> } />
        <Route path="/checkout/confirm" element={ <RequireAuth> <ConfirmCloseSession /> </RequireAuth> } />
      </Route>

      {/* ===== 2. MERCHANT ADMIN PANEL (/merchant) ===== */}
      {/* Các route này CHỈ dành cho Merchant (vd: 'resadmin') */}
      <Route
        path="/merchant"
        element={
          <MerchantRoute>
            <ResLayout /> {/* Sử dụng Layout Sidebar của Merchant */}
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
      </Route>

      {/* ===== 3. SUPER ADMIN PANEL (/admin) ===== */}
      {/* Các route này CHỈ dành cho Super Admin (vd: 'svadmin') */}
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <AdminLayout /> {/* Sử dụng Layout Sidebar của Super Admin */}
          </SuperAdminRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} /> 
        <Route path="dashboard" element={<AdminServerDashboard />} />
        <Route path="merchants" element={<AdminServerRestaurant />} />
        <Route path="merchants/:merchantId" element={<AdminMerchantDetail />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="drone" element={<DroneOrders />} />
        {/* <Route path="restaurant" element={<RestaurantOrders />} /> */}
      </Route>

      {/* ===== 4. FALLBACKS ===== */}
      {/* Nếu gõ /admin... mà không khớp, về dashboard (của vai trò tương ứng) */}
      <Route path="/admin*" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/merchant*" element={<Navigate to="/merchant/dashboard" replace />} />
      {/* Gõ linh tinh thì về trang chủ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}