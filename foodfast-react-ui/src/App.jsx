// src/App.jsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'

// Layout
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

// Pages (Public)
import Home from './pages/Home.jsx'
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
import AdminDashboard from './pages/AdminDashboard.jsx'
// NEW
import AdminUsers from './admin/AdminUsers.jsx'

// Admin shell layout (sidebar)
import AdminLayout from './admin/AdminLayout.jsx'

// Restaurant (Kitchen)
import RestaurantOrders from './pages/RestaurantOrders.jsx'

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

export default function App() {
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

        {/* Admin Panel (nested dưới AdminLayout) */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          {/* NEW: Users */}
          <Route path="users" element={<AdminUsers />} />

          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          {/* NEW: Kitchen / Restaurant nằm trong Admin */}
          <Route path="restaurant" element={<RestaurantOrders />} />
        </Route>

        {/* Fallback: /admin -> /admin/dashboard */}
        <Route path="/admin*" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Fallback chung */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
