import { Routes, Route, Navigate, Outlet } from 'react-router-dom'

// Layout
import Header from './components/HeaderAdmin.jsx'
import Footer from './components/Footer.jsx'

// Pages (Public)
import Home from './pages/Homeadmin.jsx'
import Menu from './pages/Menu.jsx'
import Favorites from './pages/Favorites.jsx'
import Cart from './pages/Cart.jsx'
import SearchResults from './pages/SearchResults.jsx'
import Confirmation from './pages/Confirmation.jsx'
import DetailsHistory from './pages/DetailsHistory.jsx'
import Profile from './pages/Profile.jsx'
import ConfirmCloseSession from './pages/ConfirmCloseSession.jsx'

// Auth pages
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'

// Feature pages
import Checkout from './pages/Checkout.jsx'
import Orders from './pages/Orders.jsx'

// Admin pages (nội dung)
import AdminOrders from './pages/AdminOrders.jsx'
import AdminSignIn from './pages/AdminSignIn.jsx'
import AdminServerRestaurant from './pages/AdminServerRestaurant.jsx'
import AdminServerDashboard from './pages/AdminServerDashboard.jsx'
import AdminUsers from './admin/AdminUsers.jsx'
import AdminMerchantDetail from './pages/AdminMerchantDetail.jsx'
// Admin shell layout (sidebar) 
import AdminLayout from './admin/AdminLayout.jsx'

// Restaurant (Kitchen)
import RestaurantOrders from './pages/RestaurantOrders.jsx'

// NEW: Drone pages
import DroneOrders from './pages/DroneOrders.jsx'
import DroneTracker from './pages/DroneTracker.jsx'

// Guards
import { RequireAuth, RequireAdmin } from './context/AuthContext.jsx'

// layout giữ Header/Footer cố định
function AppLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  )
}

export default function AppAdmin() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/history" element={<DetailsHistory />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/checkout/confirm"
          element={
            <RequireAuth>
              <ConfirmCloseSession />
            </RequireAuth>
          }
        />

        {/* Auth (user) */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <Orders />
            </RequireAuth>
          }
        />  
        {/* Admin login (nếu có) */}
        <Route path="/admin/login" element={<AdminSignIn />} />

        {/* Admin Panel (nested dưới ResLayout) */}
        <Route
        path="/admin"
        element={
            <RequireAdmin>
              <AdminLayout /> 
              </RequireAdmin>
              }
              >
                <Route path="users" element={<AdminUsers />} />
                <Route index element={<Navigate to="dashboard" replace />} /> 
                <Route path="dashboard" element={<AdminServerDashboard />} /> {/* Thay dashboard_restaurant thành dashboard */}
{/* <Route path="orders" element={<AdminOrders />} />*/} 

            {/* 1. ROUTE DANH SÁCH MERCHANT (Admin Server Selection) */}
<Route path="restaurant_managerment" element={<AdminServerRestaurant />} />

            {/* 2. ROUTE CHI TIẾT MERCHANT (Admin Server Viewing) */}
            {/* Khi Admin chọn 1 Merchant, họ sẽ được đưa đến đường dẫn này */}
            {/* :merchantId là tham số bắt buộc */}
            <Route path="merchants/:merchantId" element={<AdminMerchantDetail />} />

{/* NEW: danh sách Drone chuyên biệt */}
            <Route path="drone" element={<DroneOrders />} />
              <Route path="restaurant" element={<RestaurantOrders />} />
            </Route>

        {/* NEW: Trang theo dõi chi tiết 1 đơn Drone */}
        <Route path="/orders/:id/tracking" element={<DroneTracker />}  />

        {/* Fallbacks */}
        <Route path="/admin*" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
