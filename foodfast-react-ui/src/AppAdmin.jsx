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

        {/* Admin login */}
        <Route path="/admin/login" element={<AdminSignIn />} />

        {/* ========= ADMIN GROUP (nested) ========= */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminServerDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="restaurant_managerment" element={<AdminServerRestaurant />} />
          <Route path="merchants/:merchantId" element={<AdminMerchantDetail />} />

          {/* Drone cho Admin */}
          <Route path="drone" element={<DroneOrders />} />
          <Route path="drone/:id" element={<DroneTracker />} />

          <Route path="restaurant" element={<RestaurantOrders />} />

          {/* ✅ Fallback CHỈ CHO KHỐI /admin */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
        {/* ========= END ADMIN GROUP ========= */}

        {/* Trang theo dõi dành cho user */}
        <Route path="/orders/:id/tracking" element={<DroneTracker />} />

        {/* Fallback toàn site */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
